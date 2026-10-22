"use strict";

const fs = require("node:fs");
const path = require("node:path");

function option(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function requiredOption(name) {
  const value = option(name);
  if (!value) throw new Error(`Falta --${name}=...`);
  return value;
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifestPath, manifest) {
  const absolutePath = path.resolve(manifestPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, absolutePath);
}

function addCounts(total, batch) {
  for (const key of Object.keys(total)) total[key] += Number(batch[key] || 0);
}

async function main() {
  const environment = requiredOption("environment");
  const projectId = requiredOption("project");
  const mode = requiredOption("mode");
  const manifestPath = requiredOption("manifest");
  const batchSize = Number(option("batch-size") || 200);
  const maxBatches = Number(option("max-batches") || Number.MAX_SAFE_INTEGER);

  if (!["emulator", "production"].includes(environment)) {
    throw new Error("--environment debe ser emulator o production");
  }
  if (!["inspect", "apply"].includes(mode)) {
    throw new Error("--mode debe ser inspect o apply");
  }
  if (environment === "emulator" && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("El entorno emulator requiere FIRESTORE_EMULATOR_HOST explícito");
  }
  if (environment === "production" && mode === "apply" && !process.argv.includes("--confirm-rollout")) {
    throw new Error("La escritura productiva requiere --confirm-rollout y autorización de rollout separada");
  }

  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_CONFIG = JSON.stringify({ projectId });
  const { db } = require("../firebase");
  const {
    emptyCounts,
    reconcileTournamentPaymentAlertsBatch,
  } = require("../services/tournamentPaymentAlertReconciliationService");

  const previous = readManifest(manifestPath);
  if (previous && (previous.projectId !== projectId || previous.environment !== environment || previous.mode !== mode)) {
    throw new Error("El manifiesto no pertenece al mismo proyecto, entorno y modo");
  }

  const manifest = previous || {
    schemaVersion: 1,
    operation: "E3-10-reconcile-tournament-payment-alerts",
    projectId,
    environment,
    mode,
    cursor: null,
    done: false,
    batchesCompleted: 0,
    counts: emptyCounts(),
    startedAt: new Date().toISOString(),
  };

  for (let index = 0; index < maxBatches && !manifest.done; index += 1) {
    let result;
    try {
      result = await reconcileTournamentPaymentAlertsBatch({
        db,
        cursor: manifest.cursor,
        batchSize,
        write: mode === "apply",
      });
    } catch (error) {
      manifest.counts.failed += 1;
      manifest.updatedAt = new Date().toISOString();
      manifest.lastError = {
        name: String(error?.name || "Error"),
        message: String(error?.message || error),
      };
      writeManifest(manifestPath, manifest);
      throw error;
    }
    manifest.cursor = result.cursor;
    manifest.done = result.done;
    manifest.batchesCompleted += 1;
    addCounts(manifest.counts, result.counts);
    manifest.updatedAt = new Date().toISOString();
    delete manifest.lastError;
    writeManifest(manifestPath, manifest);
    console.log("E3-10 reconciliación: lote confirmado", {
      mode,
      batch: manifest.batchesCompleted,
      done: manifest.done,
      cursor: manifest.cursor,
      counts: result.counts,
    });
  }

  console.log("E3-10 reconciliación: estado", manifest);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("E3-10 reconciliación falló", error);
  process.exit(1);
});
