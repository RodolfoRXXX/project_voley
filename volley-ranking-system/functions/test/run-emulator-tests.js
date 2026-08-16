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

const functionsSource = path.join(systemRoot, "functions");
const isolatedFunctionsSource = path.join(isolatedWorkspace, "functions");
const webPush = require(path.join(functionsSource, "node_modules", "web-push"));
const ephemeralVapidKeys = webPush.generateVAPIDKeys();
fs.cpSync(functionsSource, isolatedFunctionsSource, {
  recursive: true,
  filter(source) {
    const relative = path.relative(functionsSource, source);
    const topLevel = relative.split(path.sep)[0];
    if (["node_modules", "test", ".secret.local"].includes(topLevel)) {
      return false;
    }
    return !source.endsWith(".log");
  },
});
fs.symlinkSync(
  path.join(functionsSource, "node_modules"),
  path.join(isolatedFunctionsSource, "node_modules"),
  "dir"
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
  FUNCTIONS_EMULATOR_HOST: "127.0.0.1:15001",
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
  PUSH_VAPID_PUBLIC_KEY: ephemeralVapidKeys.publicKey,
  PUSH_VAPID_PRIVATE_KEY: ephemeralVapidKeys.privateKey,
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
const command = `node --test --test-concurrency=1 "${emulatorTestPath}" "${autopromotionTestPath}" "${minimumReadPolicyTestPath}" "${priorityAssetCharacterizationTestPath}"`;
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
