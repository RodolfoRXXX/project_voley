// services/replacementService.js
// Servicio de reemplazo de titulares por suplentes

const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Reemplaza un titular eliminado por el mejor suplente válido
 * NO recalcula ranking
 * NO maneja locks
 */
async function reemplazarTitular({
  matchId,
  posicionLiberada,
  postDeadline = false,
}) {
  if (!matchId || !posicionLiberada) {
    console.log("❌ reemplazarTitular: parámetros inválidos");
    return;
  }

  const participationsSnap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("estado", "==", "suplente")
    .orderBy("rankingSuplente", "asc")
    .get();

  if (participationsSnap.empty) {
    console.log("⚠️ No hay suplentes disponibles");
    return;
  }

  let suplenteElegido = null;

  for (const doc of participationsSnap.docs) {
    const suplente = doc.data();

    if (
      Array.isArray(suplente.posicionesPreferidas) &&
      suplente.posicionesPreferidas.includes(posicionLiberada)
    ) {
      suplenteElegido = {
        id: doc.id,
        userId: suplente.userId,
      };
      break;
    }
  }

  if (!suplenteElegido) {
    console.log(
      `⚠️ Ningún suplente cubre la posición ${posicionLiberada}`
    );
    return;
  }

  const updates = {
    estado: "titular",
    posicionAsignada: posicionLiberada,
    rankingSuplente: null,
    rankingTitular: null, // se define luego en recalcularRanking
  };

  // 🔥 ÚNICO CASO AUTOMÁTICO DE PAGO
  if (postDeadline) {
    updates.pagoEstado = "pospuesto";
  }

  await db
    .collection("participations")
    .doc(suplenteElegido.id)
    .update(updates);

  console.log(
    `✅ Suplente ${suplenteElegido.userId} promovido a titular en ${posicionLiberada}`
  );
}

module.exports = {
  reemplazarTitular,
};

