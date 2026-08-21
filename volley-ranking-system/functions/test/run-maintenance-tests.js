"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  assertSafeFirebaseTestEnvironment,
} = require("./guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("./fixtures/syntheticData");
const {
  exitCodeForSpawnResult,
  removeTemporaryDirectory,
  spawnFirebaseCli,
} = require("./helpers/runnerTools");

const systemRoot = path.resolve(__dirname, "../..");
const blockedProxy = "http://127.0.0.1:9";

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
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:28080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:29099",
  HTTP_PROXY: blockedProxy,
  HTTPS_PROXY: blockedProxy,
  ALL_PROXY: blockedProxy,
  NO_PROXY: "127.0.0.1,localhost,0.0.0.0,::1",
  http_proxy: blockedProxy,
  https_proxy: blockedProxy,
  all_proxy: blockedProxy,
  no_proxy: "127.0.0.1,localhost,0.0.0.0,::1",
  npm_config_update_notifier: "false",
});

assertSafeFirebaseTestEnvironment(environment, {
  requiredEmulatorHosts: [
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_AUTH_EMULATOR_HOST",
  ],
  requireSyntheticSecrets: false,
});

const maintenanceTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "maintenanceRules.test.js"
);
const command = `node --test --test-concurrency=1 "${maintenanceTestPath}"`;
const args = [
  "emulators:exec",
  "--project",
  SYNTHETIC_DATA.projectId,
  "--config",
  "firebase.maintenance.test.json",
  "--only",
  "auth,firestore",
  command,
];

let result;
let isolatedConfigHome;
let isolatedWorkspace;
try {
  isolatedConfigHome = fs.mkdtempSync(
    path.join(os.tmpdir(), "sportexa-e0-09b-firebase-config-")
  );
  isolatedWorkspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "sportexa-e0-09b-emulators-")
  );

  for (const name of [
    "firebase.maintenance.test.json",
    "firestore.maintenance.rules",
  ]) {
    fs.copyFileSync(path.join(systemRoot, name), path.join(isolatedWorkspace, name));
  }

  environment.XDG_CONFIG_HOME = isolatedConfigHome;
  assertSafeFirebaseTestEnvironment(environment, {
    requiredEmulatorHosts: [
      "FIRESTORE_EMULATOR_HOST",
      "FIREBASE_AUTH_EMULATOR_HOST",
    ],
    requireSyntheticSecrets: false,
  });

  result = spawnFirebaseCli(args, {
    cwd: isolatedWorkspace,
    env: environment,
    stdio: "inherit",
  });
} finally {
  if (isolatedConfigHome) {
    removeTemporaryDirectory(isolatedConfigHome);
  }
  if (isolatedWorkspace) {
    removeTemporaryDirectory(isolatedWorkspace);
  }
}

process.exit(exitCodeForSpawnResult(result));
