// services/replacementService.js
// Servicio de reemplazo de titulares por suplentes

const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Reemplaza un titular eliminado por el mejor suplente válido
 * NO recalcula ranking
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

  const matchRef = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) return;

    const match = matchSnap.data();

    if (match.lock) {
      console.log("🔒 Reemplazo en curso");
      return;
    }

    tx.update(matchRef, { lock: true });

    const suplentesSnap = await tx.get(
      db.collection("participations")
        .where("matchId", "==", matchId)
        .where("estado", "==", "suplente")
        .orderBy("rankingSuplente", "asc")
    );

    if (suplentesSnap.empty) {
      console.log("⚠️ No hay suplentes disponibles");
      return;
    }

    let suplenteElegido = null;

    for (const doc of suplentesSnap.docs) {
      const suplente = doc.data();
      if (
        Array.isArray(suplente.posicionesPreferidas) &&
        suplente.posicionesPreferidas.includes(posicionLiberada)
      ) {
        suplenteElegido = { id: doc.id, ...suplente };
        break;
      }
    }

    if (!suplenteElegido) {
      tx.update(matchRef, { lock: false });
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

    if (postDeadline) updates.pagoEstado = "pospuesto";

    tx.update(
      db.collection("participations").doc(suplenteElegido.id),
      updates
    );

    tx.update(matchRef, { lock: false });

    console.log(
      `✅ Suplente ${suplenteElegido.userId} promovido a titular en ${posicionLiberada}`
    );
  });
}

module.exports = {
  reemplazarTitular,
};

