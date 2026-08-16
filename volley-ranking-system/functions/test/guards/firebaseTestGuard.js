"use strict";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const REQUIRED_EMULATOR_HOSTS = [
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FUNCTIONS_EMULATOR_HOST",
];
const CREDENTIAL_VARIABLES = [
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
  "GCLOUD_ACCESS_TOKEN",
  "FIREBASE_TOKEN",
];
const REMOTE_MARKERS = [
  "project-groupvolley",
  "firestore.googleapis.com",
  "firebaseio.com",
  "firebaseapp.com",
  "cloudfunctions.net",
];
const SYNTHETIC_SECRETS = {
  PUSH_VAPID_PUBLIC_KEY: `B${"A".repeat(86)}`,
  PUSH_VAPID_PRIVATE_KEY: "A".repeat(43),
  PUSH_VAPID_SUBJECT: "mailto:e0-02@example.invalid",
};

function fail(message) {
  throw new Error(`[firebase-test-guard] ${message}`);
}

function requireDemoProjectId(environment) {
  const candidates = [
    environment.TEST_FIREBASE_PROJECT_ID,
    environment.GCLOUD_PROJECT,
    environment.GOOGLE_CLOUD_PROJECT,
  ].filter(Boolean);

  if (!candidates.length) {
    fail("missing project ID");
  }

  for (const candidate of candidates) {
    if (!String(candidate).startsWith("demo-")) {
      fail("project ID must start with demo-");
    }
  }

  if (new Set(candidates.map(String)).size !== 1) {
    fail("project IDs do not match");
  }

  return String(candidates[0]);
}

function requireLoopbackHost(name, value) {
  if (!value) {
    fail(`missing ${name}`);
  }
  if (String(value).includes("://")) {
    fail(`${name} must be host:port, without a URL scheme`);
  }

  let parsed;
  try {
    parsed = new URL(`http://${value}`);
  } catch (_error) {
    fail(`${name} is not a valid host:port`);
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname) || !parsed.port) {
    fail(`${name} must use a loopback host and an explicit port`);
  }
}

function rejectCredentials(environment) {
  for (const name of CREDENTIAL_VARIABLES) {
    if (environment[name]) {
      fail(`${name} must be absent`);
    }
  }
}

function rejectRemoteConfiguration(environment, projectId) {
  const explicitProjectVariables = [
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "FIREBASE_PROJECT_ID",
  ];

  for (const name of explicitProjectVariables) {
    if (environment[name] && environment[name] !== projectId) {
      fail(`${name} does not match the demo project`);
    }
  }

  for (const [name, value] of Object.entries(environment)) {
    if (name === "FIREBASE_CONFIG") {
      continue;
    }
    if (!/(FIREBASE|FIRESTORE|GCLOUD|GOOGLE_CLOUD|FUNCTIONS)/.test(name)) {
      continue;
    }
    const normalized = String(value || "").toLowerCase();
    if (REMOTE_MARKERS.some((marker) => normalized.includes(marker))) {
      fail(`${name} contains a remote Firebase marker`);
    }
  }

  if (environment.FIREBASE_CONFIG) {
    let firebaseConfig;
    try {
      firebaseConfig = JSON.parse(environment.FIREBASE_CONFIG);
    } catch (_error) {
      fail("FIREBASE_CONFIG must be valid JSON when present");
    }
    if (firebaseConfig.projectId !== projectId) {
      fail("FIREBASE_CONFIG does not match the demo project");
    }

    const pending = [firebaseConfig];
    while (pending.length) {
      const current = pending.pop();
      for (const value of Object.values(current || {})) {
        if (value && typeof value === "object") {
          pending.push(value);
          continue;
        }
        if (typeof value !== "string") {
          continue;
        }
        const normalized = value.toLowerCase();
        const containsRemoteMarker = REMOTE_MARKERS.some((marker) =>
          normalized.includes(marker)
        );
        if (containsRemoteMarker && !normalized.includes(projectId)) {
          fail("FIREBASE_CONFIG contains a remote Firebase target");
        }
      }
    }
  }
}

function requireSyntheticSecrets(environment) {
  if (environment.TEST_SECRET_SOURCE !== "synthetic-inline") {
    fail("synthetic secret source is required");
  }

  if (environment.PUSH_VAPID_SUBJECT !== SYNTHETIC_SECRETS.PUSH_VAPID_SUBJECT) {
    fail("PUSH_VAPID_SUBJECT is not the approved synthetic value");
  }

  const publicKey = String(environment.PUSH_VAPID_PUBLIC_KEY || "");
  const privateKey = String(environment.PUSH_VAPID_PRIVATE_KEY || "");
  if (!/^B[A-Za-z0-9_-]{86}$/.test(publicKey)) {
    fail("PUSH_VAPID_PUBLIC_KEY is not a valid synthetic VAPID key");
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(privateKey)) {
    fail("PUSH_VAPID_PRIVATE_KEY is not a valid synthetic VAPID key");
  }
}

function assertSafeFirebaseTestEnvironment(environment, options = {}) {
  const projectId = requireDemoProjectId(environment);
  rejectCredentials(environment);
  rejectRemoteConfiguration(environment, projectId);

  if (options.requireEmulators !== false) {
    for (const name of REQUIRED_EMULATOR_HOSTS) {
      requireLoopbackHost(name, environment[name]);
    }
  }

  if (options.requireSyntheticSecrets !== false) {
    requireSyntheticSecrets(environment);
  }

  return Object.freeze({ projectId });
}

module.exports = {
  SYNTHETIC_SECRETS,
  assertSafeFirebaseTestEnvironment,
};
