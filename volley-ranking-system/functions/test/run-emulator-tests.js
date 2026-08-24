"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  SYNTHETIC_SECRETS,
  assertSafeFirebaseTestEnvironment,
} = require("./guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("./fixtures/syntheticData");
const {
  copyFunctionsSource,
  exitCodeForSpawnResult,
  linkNodeModules,
  removeTemporaryDirectory,
  spawnFirebaseCli,
} = require("./helpers/runnerTools");

const systemRoot = path.resolve(__dirname, "../..");
const blockedProxy = "http://127.0.0.1:9";
const functionsSource = path.join(systemRoot, "functions");
const webPush = require(path.join(functionsSource, "node_modules", "web-push"));
const ephemeralVapidKeys = webPush.generateVAPIDKeys();

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
  FUNCTIONS_DISCOVERY_TIMEOUT: "30",
  TEST_FIREBASE_PROJECT_ID: SYNTHETIC_DATA.projectId,
  TEST_SECRET_SOURCE: "synthetic-inline",
  FUNCTIONS_EMULATOR_HOST: "127.0.0.1:15001",
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
  PUSH_VAPID_PUBLIC_KEY: ephemeralVapidKeys.publicKey,
  PUSH_VAPID_PRIVATE_KEY: ephemeralVapidKeys.privateKey,
});

assertSafeFirebaseTestEnvironment(environment, { requireEmulators: false });

const emulatorTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "emulatorSmoke.test.js"
);
const autopromotionTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "autopromotionSecurity.test.js"
);
const minimumReadPolicyTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "minimumReadPolicy.test.js"
);
const priorityAssetCharacterizationTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "priorityAssetCharacterization.test.js"
);
const accountTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "accountE1.test.js"
);
const personTestPath = path.join(
  systemRoot,
  "functions",
  "test",
  "emulator",
  "personE1.test.js"
);
const command = `node --test --test-concurrency=1 "${accountTestPath}" "${personTestPath}" "${emulatorTestPath}" "${autopromotionTestPath}" "${minimumReadPolicyTestPath}" "${priorityAssetCharacterizationTestPath}"`;
const args = [
  "emulators:exec",
  "--project",
  SYNTHETIC_DATA.projectId,
  "--config",
  "firebase.test.json",
  "--only",
  "auth,firestore,functions",
  command,
];

let result;
let isolatedConfigHome;
let isolatedWorkspace;
try {
  isolatedConfigHome = fs.mkdtempSync(
    path.join(os.tmpdir(), "sportexa-e0-02-firebase-config-")
  );
  isolatedWorkspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "sportexa-e0-02-emulators-")
  );

  for (const name of [
    "firebase.test.json",
    "firestore.rules",
    "firestore.indexes.json",
  ]) {
    fs.copyFileSync(path.join(systemRoot, name), path.join(isolatedWorkspace, name));
  }

  const isolatedFunctionsSource = path.join(isolatedWorkspace, "functions");
  copyFunctionsSource(functionsSource, isolatedFunctionsSource);
  linkNodeModules(
    path.join(functionsSource, "node_modules"),
    path.join(isolatedFunctionsSource, "node_modules")
  );
  if (fs.existsSync(path.join(isolatedFunctionsSource, ".secret.local"))) {
    throw new Error("The isolated Functions source contains .secret.local");
  }
  fs.writeFileSync(
    path.join(isolatedFunctionsSource, ".secret.local"),
    [
      "GMAIL_USER=e0-04@example.invalid",
      "GMAIL_PASS=e0-04-synthetic-password",
      "WEB_APP_URL=http://127.0.0.1:3000",
      `PUSH_VAPID_PUBLIC_KEY=${ephemeralVapidKeys.publicKey}`,
      `PUSH_VAPID_PRIVATE_KEY=${ephemeralVapidKeys.privateKey}`,
      "PUSH_VAPID_SUBJECT=mailto:e0-02@example.invalid",
      "",
    ].join("\n")
  );

  environment.XDG_CONFIG_HOME = isolatedConfigHome;
  assertSafeFirebaseTestEnvironment(environment, { requireEmulators: false });

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
