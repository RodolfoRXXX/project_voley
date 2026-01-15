// Servicio de reemplazo de titulares por suplentes

const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Reemplaza un titular eliminado por el mejor suplente válido
 */
async function reemplazarTitular({
  matchId,
  posicionLiberada,
  postDeadline = false,
}) {
  const participationsSnap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("estado", "==", "suplente")
    .orderBy("rankingSuplente", "asc")
    .get();

  let suplenteElegido = null;

  for (const doc of participationsSnap.docs) {
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
    console.log(
      `⚠️ No hay suplente válido para la posición ${posicionLiberada}`
    );
    return;
  }

  const updates = {
    estado: "titular",
    posicionAsignada: posicionLiberada,
    rankingSuplente: null,
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
    `✅ Suplente ${suplenteElegido.userId} promovido a titular (${posicionLiberada})`
  );
}

module.exports = {
  reemplazarTitular,
};
