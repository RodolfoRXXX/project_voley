"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../firebase");
const { createFirestoreAccountIdentityStore } = require("../accountIdentities/infrastructure/firestoreAccountIdentityStore");

function requireLocalEmulator() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("IUX-11C0 materialization is restricted to the local Firestore emulator");
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId?.startsWith("demo-")) throw new Error("IUX-11C0 materialization requires an isolated demo-* project");
}

function option(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function readManifest(manifestPath) {
  if (!manifestPath || !fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifestPath, manifest) {
  if (!manifestPath) return;
  const absolutePath = path.resolve(manifestPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, absolutePath);
}

function newManifest({ mode, pageSize, now }) {
  const at = now().toISOString();
  return {
    schemaVersion: 1,
    mode,
    pageSize,
    cursor: null,
    done: false,
    pagesCompleted: 0,
    counts: { inspected: 0, legacy: 0, created: 0, existing: 0, missing: 0, incompatible: 0 },
    createdAt: at,
    updatedAt: at,
  };
}

function assertManifest(manifest, { mode, pageSize }) {
  if (manifest.schemaVersion !== 1 || manifest.mode !== mode || manifest.pageSize !== pageSize
    || typeof manifest.done !== "boolean" || !Number.isSafeInteger(manifest.pagesCompleted)
    || !manifest.counts || typeof manifest.counts !== "object") {
    throw new Error("IUX-11C0 manifest is incompatible with this run");
  }
}

async function reconcile({
  mode = "inspect",
  pageSize = 100,
  maxPages = Number.POSITIVE_INFINITY,
  manifestPath = null,
  store = null,
  now = () => new Date(),
  occurredAt = () => Timestamp.now(),
} = {}) {
  requireLocalEmulator();
  if (!["inspect", "apply"].includes(mode)) throw new TypeError("mode must be inspect or apply");
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new TypeError("pageSize must be between 1 and 100");
  if (!(maxPages === Number.POSITIVE_INFINITY || (Number.isSafeInteger(maxPages) && maxPages > 0))) throw new TypeError("maxPages must be positive");
  if (mode === "apply" && !manifestPath) throw new Error("apply requires --manifest for resumable execution");

  const identityStore = store || createFirestoreAccountIdentityStore({ db });
  const manifest = readManifest(manifestPath) || newManifest({ mode, pageSize, now });
  assertManifest(manifest, { mode, pageSize });
  let pagesThisRun = 0;

  while (!manifest.done && pagesThisRun < maxPages) {
    const countsBeforePage = { ...manifest.counts };
    try {
      const page = await identityStore.inspectIdentityMaterialization({ pageSize, cursor: manifest.cursor });
      for (const item of page.items) {
        manifest.counts.inspected += 1;
        if (mode === "inspect") {
          const key = item.status === "INCOMPATIBLE" ? "incompatible"
            : item.status === "MISSING" ? "missing"
              : item.status === "MIRRORED_SINGLE" ? "existing"
                : item.status === "LEGACY_SINGLE" ? "legacy" : null;
          if (key) manifest.counts[key] += 1;
          continue;
        }
        const outcome = await identityStore.materializeLegacyIdentity({ accountId: item.accountId, occurredAt: occurredAt() });
        const key = outcome === "CREATED" ? "created" : outcome === "EXISTING" ? "existing" : "missing";
        manifest.counts[key] += 1;
      }
      manifest.cursor = page.nextCursor || null;
      manifest.done = !page.nextCursor;
      manifest.pagesCompleted += 1;
      pagesThisRun += 1;
      manifest.updatedAt = now().toISOString();
      delete manifest.lastError;
      writeManifest(manifestPath, manifest);
    } catch (error) {
      manifest.counts = countsBeforePage;
      manifest.failures = (Number.isSafeInteger(manifest.failures) ? manifest.failures : 0) + 1;
      manifest.updatedAt = now().toISOString();
      manifest.lastError = { code: error?.name === "IdentityIncompatibleStateError" ? "INCOMPATIBLE_STATE" : "INTERNAL" };
      writeManifest(manifestPath, manifest);
      throw error;
    }
  }

  console.log(JSON.stringify(manifest, null, 2));
  return manifest;
}

if (require.main === module) {
  const mode = process.argv.includes("--apply") ? "apply" : (option("mode") || "inspect");
  reconcile({
    mode,
    pageSize: option("page-size") ? Number(option("page-size")) : 100,
    maxPages: option("max-pages") ? Number(option("max-pages")) : Number.POSITIVE_INFINITY,
    manifestPath: option("manifest"),
  }).then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { readManifest, reconcile, requireLocalEmulator };
