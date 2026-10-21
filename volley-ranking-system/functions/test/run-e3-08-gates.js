"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { assertSafeFirebaseTestEnvironment } = require("./guards/firebaseTestGuard");
const { copyFunctionsSource, exitCodeForSpawnResult, linkNodeModules,
  removeTemporaryDirectory, spawnFirebaseCli } = require("./helpers/runnerTools");

const systemRoot = path.resolve(__dirname, "../..");
const projectId = "demo-sportexa-e3-08-gates";
const firestorePort = 38080;
const authPort = 39099;
const functionsPort = 35001;
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "sportexa-e3-08-gates-"));
const configName = "firebase.e3-08-gates.json";
const testPath = path.join(systemRoot, "functions", "test", "emulator", "registeredIncomeMovementsGatesE3.test.js");
const callableTestPath = path.join(systemRoot, "functions", "test", "emulator", "registeredIncomeMovementsCallableE3.test.js");
const vapid = require(path.join(systemRoot, "functions", "node_modules", "web-push")).generateVAPIDKeys();
const inherited = ["JAVA_HOME", "LANG", "LC_ALL", "PATH", "SystemRoot", "TEMP", "TMP", "TMPDIR"];
const environment = {};
for (const name of inherited) if (process.env[name]) environment[name] = process.env[name];
Object.assign(environment, {
  CI: "1",
  NODE_ENV: "test",
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
  TEST_FIREBASE_PROJECT_ID: projectId,
  GCLOUD_PROJECT: projectId,
  GOOGLE_CLOUD_PROJECT: projectId,
  FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
  FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`,
  FUNCTIONS_EMULATOR_HOST: `127.0.0.1:${functionsPort}`,
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  ALL_PROXY: "http://127.0.0.1:9",
  NO_PROXY: "127.0.0.1,localhost,0.0.0.0,::1",
  http_proxy: "http://127.0.0.1:9",
  https_proxy: "http://127.0.0.1:9",
  all_proxy: "http://127.0.0.1:9",
  no_proxy: "127.0.0.1,localhost,0.0.0.0,::1",
  E3_08_GATE: process.env.E3_08_GATE || "AB",
});
assertSafeFirebaseTestEnvironment(environment, {
  requiredEmulatorHosts: ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FUNCTIONS_EMULATOR_HOST"],
  requireSyntheticSecrets: false,
});

let result;
try {
  fs.copyFileSync(path.join(systemRoot, "firestore.rules"), path.join(workspace, "firestore.rules"));
  fs.copyFileSync(path.join(systemRoot, "firestore.indexes.json"), path.join(workspace, "firestore.indexes.json"));
  const isolatedFunctions = path.join(workspace, "functions");
  copyFunctionsSource(path.join(systemRoot, "functions"), isolatedFunctions);
  linkNodeModules(path.join(systemRoot, "functions", "node_modules"), path.join(isolatedFunctions, "node_modules"));
  fs.writeFileSync(path.join(isolatedFunctions, ".secret.local"), [
    "GMAIL_USER=e3-08@example.invalid",
    "GMAIL_PASS=e3-08-synthetic-password",
    "WEB_APP_URL=http://127.0.0.1:3000",
    `PUSH_VAPID_PUBLIC_KEY=${vapid.publicKey}`,
    `PUSH_VAPID_PRIVATE_KEY=${vapid.privateKey}`,
    "PUSH_VAPID_SUBJECT=mailto:e3-08@example.invalid",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(workspace, configName), JSON.stringify({
    emulators: {
      auth: { host: "127.0.0.1", port: authPort },
      firestore: { host: "127.0.0.1", port: firestorePort, websocketPort: 38150 },
      functions: { host: "127.0.0.1", port: functionsPort },
      hub: { host: "127.0.0.1", port: 34400 },
      logging: { host: "127.0.0.1", port: 34500 },
      ui: { enabled: false },
      singleProjectMode: true,
    },
    firestore: { rules: "firestore.rules", indexes: "firestore.indexes.json" },
    functions: { source: "functions", runtime: "nodejs20" },
  }, null, 2));
  const exposeGc = environment.E3_08_GATE === "C" ? "--expose-gc " : "";
  const command = `node ${exposeGc}--test --test-concurrency=1 "${testPath}" "${callableTestPath}"`;
  result = spawnFirebaseCli(["emulators:exec", "--project", projectId, "--config", configName,
    "--only", "auth,firestore,functions", command], { cwd: workspace, env: environment, stdio: "inherit" });
} finally {
  removeTemporaryDirectory(workspace);
}

process.exit(exitCodeForSpawnResult(result));
