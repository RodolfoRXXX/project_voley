
// 🔴 SIEMPRE PRIMERO
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = 'volley-ranking-system';

// 🔵 inicializa firebase-admin contra emulator
require("../firebase");

const { recalcularRanking } = require("../services/rankingService");

async function runTest() {
  console.log("🚀 Iniciando test ranking para match1...");

  await recalcularRanking("match1");

  console.log("✅ TEST COMPLETADO");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Error en test:", err);
  process.exit(1);
});
