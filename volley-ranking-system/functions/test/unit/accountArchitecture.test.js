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
  const bootstrap = `${userDomain}\n${repository}`;

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
