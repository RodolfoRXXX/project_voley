// Script para probar el deadline

process.env.GCLOUD_PROJECT = "project-groupvolley";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

require("../firebase");

const { checkPaymentDeadlinesLogic } = require("../schedulers/testPaymentDeadline");

async function run() {
  console.log("🚀 Ejecutando chequeo de deadline MANUAL...");

  await checkPaymentDeadlinesLogic();

  console.log("✅ Script terminado");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Error en script:", err);
  process.exit(1);
});
