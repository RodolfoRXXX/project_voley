"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../../../..");
const frontendRoot = path.join(repositoryRoot, "volley-ranking-frontend", "src");
const functionsRoot = path.join(repositoryRoot, "volley-ranking-system", "functions");

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
