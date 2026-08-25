"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const Module = require("node:module");

const repositoryRoot = path.resolve(__dirname, "../../../..");
const frontendRoot = path.join(repositoryRoot, "volley-ranking-frontend", "src");
const functionsRoot = path.join(repositoryRoot, "volley-ranking-system", "functions");
const ts = require(path.join(
  repositoryRoot,
  "volley-ranking-frontend",
  "node_modules",
  "typescript"
));

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

function resolveLocalImport(specifier, fromFile, rootDir = frontendRoot) {
  if (!specifier || typeof specifier !== "string") return null;
  if (!specifier.startsWith(".") && !specifier.startsWith("@/") && !specifier.startsWith("/")) {
    return null;
  }

  const candidates = [];
  if (specifier.startsWith("@/")) {
    candidates.push(path.join(rootDir, specifier.slice(2)));
  } else if (specifier.startsWith("/")) {
    candidates.push(path.join(rootDir, specifier.slice(1)));
  } else {
    candidates.push(path.resolve(path.dirname(fromFile), specifier));
  }

  for (const candidate of candidates) {
    const checked = [
      candidate,
      `${candidate}.ts`,
      `${candidate}.tsx`,
      `${candidate}.js`,
      `${candidate}.jsx`,
      path.join(candidate, "index.ts"),
      path.join(candidate, "index.tsx"),
      path.join(candidate, "index.js"),
      path.join(candidate, "index.jsx"),
    ];
    const resolved = checked.find((possibleFile) => fs.existsSync(possibleFile));
    if (resolved) return resolved;
  }

  return null;
}

function collectReachableLocalSources(startFile, options = {}) {
  const { maxDepth = 25, rootDir = frontendRoot } = options;
  const reached = new Set();
  const queue = [{ filePath: startFile, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.depth > maxDepth) continue;
    if (!fs.existsSync(current.filePath)) continue;
    if (!current.filePath.startsWith(rootDir)) continue;
    if (reached.has(current.filePath)) continue;

    const ext = path.extname(current.filePath).toLowerCase();
    if (!/\.(?:ts|tsx|js|jsx)$/.test(ext)) {
      continue;
    }
    if (/\.test\.(?:ts|tsx|js|jsx)$/.test(current.filePath)) continue;
    if (current.filePath.includes("/__tests__/") || current.filePath.includes("\\__tests__\\")) continue;

    reached.add(current.filePath);

    const source = fs.readFileSync(current.filePath, "utf8");
    const importMatches = [...source.matchAll(/(?:import\s+(?:[^'";]*?\s+from\s+)?|import\s*\(\s*|require\s*\(\s*|export\s+.*?\s+from\s+)(["'])([^"']+)\1/gm)];

    for (const match of importMatches) {
      const specifier = match[2];
      if (!specifier || specifier.startsWith("firebase/") || specifier.startsWith("next/") || specifier.startsWith("react")) {
        continue;
      }

      const resolved = resolveLocalImport(specifier, current.filePath, rootDir);
      if (resolved && !reached.has(resolved)) {
        queue.push({ filePath: resolved, depth: current.depth + 1 });
      }
    }
  }

  return reached;
}

function findMatchesFirestoreReads(reachableFiles, rootDir = frontendRoot) {
  const hits = [];
  const localFiles = [...reachableFiles].filter((file) => file.startsWith(rootDir));

  for (const file of localFiles) {
    const source = fs.readFileSync(file, "utf8");
    const evidence = [
      /collection\s*\(\s*[^,)]*\s*,\s*["']matches["']/s,
      /doc\s*\(\s*[^,)]*\s*,\s*["']matches["']/s,
      /query\s*\(\s*collection\s*\(\s*[^,)]*\s*,\s*["']matches["']/s,
      /getDoc\s*\(\s*doc\s*\(\s*[^,)]*\s*,\s*["']matches["']/s,
      /getDocs\s*\(\s*query\s*\(\s*collection\s*\(\s*[^,)]*\s*,\s*["']matches["']/s,
      /onSnapshot\s*\(\s*collection\s*\(\s*[^,)]*\s*,\s*["']matches["']\s*\)/s,
      /onSnapshot\s*\(\s*query\s*\(\s*collection\s*\(\s*[^,)]*\s*,\s*["']matches["']\s*\)/s,
    ].find((pattern) => pattern.test(source));

    if (evidence) {
      hits.push({ file, evidence: evidence.toString() });
    }
  }

  return hits;
}

function loadAuthService(signInWithPopup) {
  const filename = path.join(frontendRoot, "services", "authService.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const testModule = new Module(filename, module);
  testModule.filename = filename;
  testModule.paths = Module._nodeModulePaths(path.dirname(filename));
  testModule.require = (request) => {
    if (request === "firebase/auth") {
      return {
        GoogleAuthProvider: class GoogleAuthProvider {},
        signInWithPopup,
        signOut: async () => undefined,
      };
    }
    if (request === "@/lib/firebase") return { auth: {} };
    return Module.prototype.require.call(testModule, request);
  };
  testModule._compile(compiled, filename);
  return testModule.exports;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

test("AuthProvider initializes account through the callable contract", () => {
  const provider = read("volley-ranking-frontend/src/components/providers/AuthProvider.tsx");

  assert.match(provider, /ensureMyAccount\(\)/);
  assert.doesNotMatch(provider, /firebase\/firestore/);
  assert.doesNotMatch(provider, /\b(?:onSnapshot|getDoc|setDoc|updateDoc|deleteDoc)\b/);
  assert.doesNotMatch(provider, /doc\s*\([^)]*["']users["']/s);
});

test("frontend has no direct writer for users documents", () => {
  const violations = sourceFiles(frontendRoot).filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /\b(?:setDoc|updateDoc|deleteDoc)\s*\(\s*doc\s*\([^)]*["']users["']/s.test(source);
  });

  assert.deepEqual(violations.map((file) => path.relative(repositoryRoot, file)), []);
});

test("bootstrap persistence is minimal and does not restore sports fields", () => {
  const userDomain = read("volley-ranking-system/functions/src/users/domain/user.js");
  const repository = read("volley-ranking-system/functions/src/users/infrastructure/firestoreUserRepository.js");
  const bootstrapFactory = userDomain.slice(
    userDomain.indexOf("function buildInitialUser"),
    userDomain.indexOf("function linkPerson")
  );
  const bootstrap = `${bootstrapFactory}\n${repository}`;

  for (const field of [
    "roles",
    "positions",
    "position",
    "onboarded",
    "commitment",
    "permissions",
    "personaId",
    "providerId",
    "emailVerified",
    "updatedAt",
  ]) {
    assert.doesNotMatch(bootstrap, new RegExp(`\\b${field}\\b`), `${field} leaked into bootstrap`);
  }
  assert.match(repository, /\.create\s*\(/);
  assert.doesNotMatch(repository, /\.set\s*\(/);
});

test("public account DTO is Firebase-free and exact", () => {
  const dtoType = read("volley-ranking-frontend/src/types/MyAccount.ts");
  const dtoMapper = read("volley-ranking-system/functions/src/users/application/accountDto.js");

  assert.doesNotMatch(dtoType, /firebase|firestore|Timestamp|createdAt/i);
  assert.doesNotMatch(dtoMapper, /FieldValue|Timestamp|createdAt|roles|onboarded/);
  for (const field of ["userId", "displayName", "accessEmail", "accountPhotoUrl"]) {
    assert.match(dtoType, new RegExp(`\\b${field}\\b`));
    assert.match(dtoMapper, new RegExp(`\\b${field}\\b`));
  }
});

test("only explicit account callables remain as user materialization authorities", () => {
  const exportsSource = fs.readFileSync(path.join(functionsRoot, "index.js"), "utf8");

  assert.match(exportsSource, /ensureMyAccount/);
  assert.match(exportsSource, /getMyAccount/);
  assert.doesNotMatch(exportsSource, /onUserCreate|completeOnboarding|onUserPendingAlertsSync/);
});

test("admin account error is recoverable and keeps private content hidden", () => {
  const layout = read("volley-ranking-frontend/src/app/(admin)/layout.tsx");
  const errorView = read(
    "volley-ranking-frontend/src/components/account/AccountInitializationError.tsx"
  );
  const errorStart = layout.indexOf('if (accountStatus === "accountError")');
  const readyGuard = layout.indexOf('accountStatus !== "ready"', errorStart);
  const errorBranch = layout.slice(errorStart, readyGuard);

  assert.ok(errorStart >= 0 && readyGuard > errorStart);
  assert.match(errorBranch, /<AccountInitializationError/);
  assert.match(errorBranch, /message=\{accountError\}/);
  assert.match(errorBranch, /onRetry=\{retryAccount\}/);
  assert.doesNotMatch(errorBranch, /AdminLayoutSkeleton|children/);
  assert.match(errorView, /role="alert"/);
  assert.match(errorView, /aria-live="assertive"/);
  assert.match(errorView, /onClick=\{onRetry\}/);
  assert.match(errorView, /Reintentar/);
});

test("mobile and desktop login expose the same authenticating guard", () => {
  const navbar = read("volley-ranking-frontend/src/components/layout/Navbar.tsx");
  const loginButtons = [...navbar.matchAll(/<button[\s\S]*?onClick=\{login\}[\s\S]*?<\/button>/g)];

  assert.equal(loginButtons.length, 2);
  for (const [button] of loginButtons) {
    assert.match(button, /disabled=\{authenticating\}/);
    assert.match(button, /authenticating \? "Autenticando…"/);
  }
  assert.match(loginButtons[1][0], /aria-disabled=\{authenticating\}/);
});

test("concurrent login calls share one popup and release after success", async () => {
  const firstPopup = deferred();
  let popupCalls = 0;
  const authService = loadAuthService(() => {
    popupCalls += 1;
    return firstPopup.promise;
  });

  const first = authService.loginWithGoogle();
  const second = authService.loginWithGoogle();
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(popupCalls, 1);
  firstPopup.resolve({ user: { uid: "synthetic-user" } });
  await Promise.all([first, second]);

  await authService.loginWithGoogle();
  assert.equal(popupCalls, 2);
});

test("login guard releases after cancellation without changing its error", async () => {
  let popupCalls = 0;
  const authService = loadAuthService(async () => {
    popupCalls += 1;
    if (popupCalls === 1) throw { code: "auth/popup-closed-by-user" };
    return { user: { uid: "synthetic-user" } };
  });

  await assert.rejects(
    authService.loginWithGoogle(),
    (error) => error instanceof authService.AuthFlowError
      && error.code === "popup-cancelled"
  );
  await authService.loginWithGoogle();
  assert.equal(popupCalls, 2);
});

test("login guard releases after an error and does not hide it", async () => {
  let popupCalls = 0;
  const authService = loadAuthService(async () => {
    popupCalls += 1;
    if (popupCalls === 1) throw { code: "auth/network-request-failed" };
    return { user: { uid: "synthetic-user" } };
  });

  await assert.rejects(
    authService.loginWithGoogle(),
    (error) => error instanceof authService.AuthFlowError
      && error.code === "network"
  );
  await authService.loginWithGoogle();
  assert.equal(popupCalls, 2);
});

test("centralized logout remains delegated to Firebase Auth", () => {
  const authService = read("volley-ranking-frontend/src/services/authService.ts");
  const provider = read("volley-ranking-frontend/src/components/providers/AuthProvider.tsx");

  assert.match(authService, /await signOut\(auth\)/);
  assert.match(provider, /await logoutFromFirebase\(\)/);
});

test("dashboard no longer mounts a global matches reader or the match-only state it depends on", () => {
  const dashboardFile = path.join(repositoryRoot, "volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx");
  const reachableFiles = collectReachableLocalSources(dashboardFile, { rootDir: path.join(repositoryRoot, "volley-ranking-frontend", "src") });
  const matchesReads = findMatchesFirestoreReads(reachableFiles, path.join(repositoryRoot, "volley-ranking-frontend", "src"));
  const dashboard = read("volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx");

  assert.deepEqual(matchesReads, []);
  assert.doesNotMatch(dashboard, /collection\s*\(\s*db\s*,\s*["']matches["']/s);
  assert.doesNotMatch(dashboard, /query\s*\(\s*collection\s*\(\s*db\s*,\s*["']matches["']/s);
  assert.doesNotMatch(dashboard, /where\s*\(\s*["']estado["']\s*,\s*["']in["']/s);
  assert.doesNotMatch(dashboard, /where\s*\(\s*["']__name__["']\s*,\s*["']in["']\s*\)/s);
  assert.doesNotMatch(dashboard, /const\s*\[\s*matches\s*,\s*setMatches\s*\]/s);
  assert.doesNotMatch(dashboard, /const\s*\[\s*groupsMap\s*,\s*setGroupsMap\s*\]/s);
  assert.doesNotMatch(dashboard, /matchesLoading\b\s*[:=]/s);
  assert.doesNotMatch(dashboard, /myUpcomingMatchesCount\b/s);
  assert.doesNotMatch(dashboard, /getDocs\s*\(\s*query\s*\(\s*collection\s*\(\s*db\s*,\s*["']matches["']/s);
});

test("dependency graph detector catches direct and indirect matches Firestore readers while allowing valid pendingAlerts listeners", () => {
  const tempRoot = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "e1-03-graph-"));
  const dashboardFile = path.join(tempRoot, "dashboard.tsx");
  const alertsFile = path.join(tempRoot, "services/alertsReader.ts");
  const firebaseFile = path.join(tempRoot, "lib/firebase.ts");

  fs.mkdirSync(path.dirname(alertsFile), { recursive: true });
  fs.mkdirSync(path.dirname(firebaseFile), { recursive: true });

  fs.writeFileSync(dashboardFile, `
    import { readMatches } from "@/lib/firebase";
    import { readAlerts } from "./services/alertsReader";
    export default function Dashboard() {
      readMatches();
      readAlerts();
      return null;
    }
  `);

  fs.writeFileSync(firebaseFile, `
    import { collection, query, where } from "firebase/firestore";
    export function readMatches() {
      return query(collection(db, "matches"), where("status", "==", "scheduled"));
    }
  `);

  fs.writeFileSync(alertsFile, `
    import { collection, onSnapshot } from "firebase/firestore";
    export function readAlerts() {
      return onSnapshot(collection(db, "pendingAlerts"), () => {});
    }
  `);

  const reachable = collectReachableLocalSources(dashboardFile, { rootDir: tempRoot });
  const violations = findMatchesFirestoreReads(reachable, tempRoot);

  assert.equal(violations.length, 1);
  assert.match(violations[0].file, /firebase\.ts$/);
  assert.ok(reachable.has(firebaseFile));
  assert.equal(findMatchesFirestoreReads(new Set([alertsFile]), tempRoot).length, 0);
  assert.equal(findMatchesFirestoreReads(new Set([dashboardFile]), tempRoot).length, 0);
});

test("dependency graph detector ignores matches text, props, and route names without Firestore access", () => {
  const tempRoot = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "e1-03-allowed-"));
  const dashboardFile = path.join(tempRoot, "dashboard.tsx");
  const routesFile = path.join(tempRoot, "routes.ts");

  fs.writeFileSync(dashboardFile, `
    export default function Dashboard() {
      const props = { matches: [] };
      const route = "/matches/123";
      const label = "matches";
      return props.matches.length ? route : label;
    }
  `);
  fs.writeFileSync(routesFile, `
    export const upcomingRoute = "/matches";
  `);

  const reachable = collectReachableLocalSources(dashboardFile, { rootDir: tempRoot });
  assert.deepEqual(findMatchesFirestoreReads(reachable, tempRoot), []);
  assert.ok(reachable.has(dashboardFile));
  assert.equal(findMatchesFirestoreReads(new Set([routesFile]), tempRoot).length, 0);
});

test("dependency graph detector would have rejected the earlier dashboard implementation pattern", () => {
  const tempRoot = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "e1-03-legacy-"));
  const dashboardFile = path.join(tempRoot, "dashboard.tsx");
  const legacyFile = path.join(tempRoot, "legacy/matchesWidget.ts");

  fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
  fs.writeFileSync(dashboardFile, `
    import { loadLegacyMatches } from "./legacy/matchesWidget";
    export default function Dashboard() {
      loadLegacyMatches();
      return null;
    }
  `);
  fs.writeFileSync(legacyFile, `
    import { collection, query, where } from "firebase/firestore";
    export function loadLegacyMatches() {
      return query(collection(db, "matches"), where("estado", "in", ["programado", "jugando"]));
    }
  `);

  const reachable = collectReachableLocalSources(dashboardFile, { rootDir: tempRoot });
  const hits = findMatchesFirestoreReads(reachable, tempRoot);
  assert.equal(hits.length, 1);
  assert.match(hits[0].file, /matchesWidget\.ts$/);
});
