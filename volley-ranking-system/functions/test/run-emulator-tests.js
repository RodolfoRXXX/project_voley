"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  SYNTHETIC_SECRETS,
  assertSafeFirebaseTestEnvironment,
} = require("./guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("./fixtures/syntheticData");

const systemRoot = path.resolve(__dirname, "../..");
const isolatedConfigHome = fs.mkdtempSync(
  path.join(os.tmpdir(), "sportexa-e0-02-firebase-config-")
);
const isolatedWorkspace = fs.mkdtempSync(
  path.join(os.tmpdir(), "sportexa-e0-02-emulators-")
);
const blockedProxy = "http://127.0.0.1:9";

for (const name of [
  "firebase.test.json",
  "firestore.rules",
  "firestore.indexes.json",
]) {
  fs.copyFileSync(path.join(systemRoot, name), path.join(isolatedWorkspace, name));
}

const inheritedNames = [
  "HOME",
  "JAVA_HOME",
  "LANG",
  "LC_ALL",
  "PATH",
  "SystemRoot",
  "TEMP",
  "TMP",
  "TMPDIR",
];
const environment = {};
for (const name of inheritedNames) {
  if (process.env[name]) environment[name] = process.env[name];
}

Object.assign(environment, {
  CI: "1",
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
  TEST_FIREBASE_PROJECT_ID: SYNTHETIC_DATA.projectId,
  TEST_SECRET_SOURCE: "synthetic-inline",
  XDG_CONFIG_HOME: isolatedConfigHome,
  HTTP_PROXY: blockedProxy,
  HTTPS_PROXY: blockedProxy,
  ALL_PROXY: blockedProxy,
  NO_PROXY: "127.0.0.1,localhost,0.0.0.0,::1",
  http_proxy: blockedProxy,
  https_proxy: blockedProxy,
  all_proxy: blockedProxy,
  no_proxy: "127.0.0.1,localhost,0.0.0.0,::1",
  npm_config_update_notifier: "false",
  ...SYNTHETIC_SECRETS,
});

assertSafeFirebaseTestEnvironment(environment, { requireEmulators: false });

const firebaseExecutable = process.platform === "win32" ? "firebase.cmd" : "firebase";
const emulatorTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "emulatorSmoke.test.js"
);
const command = `node --test "${emulatorTestPath}"`;
const args = [
  "emulators:exec",
  "--project",
  SYNTHETIC_DATA.projectId,
  "--config",
  "firebase.test.json",
  "--only",
  "auth,firestore",
  command,
];

let result;
try {
  result = spawnSync(firebaseExecutable, args, {
    cwd: isolatedWorkspace,
    env: environment,
    stdio: "inherit",
  });
} finally {
  fs.rmSync(isolatedConfigHome, { recursive: true, force: true });
  fs.rmSync(isolatedWorkspace, { recursive: true, force: true });
}

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status || 1);
}
