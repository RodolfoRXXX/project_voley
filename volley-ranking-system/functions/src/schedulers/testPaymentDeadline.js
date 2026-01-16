const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../firebase");

async function checkPaymentDeadlinesLogic() {
  console.log("⏱️ Chequeando deadlines de pago...");

  const now = admin.firestore.Timestamp.now();

  const matchesSnap = await db
    .collection("matches")
    .where("estado", "==", "abierto")
    .where("deadlineProcesado", "==", false)
    .get();

  console.log(`📦 Matches encontrados: ${matchesSnap.size}`);

  for (const doc of matchesSnap.docs) {
    const match = doc.data();
    const matchId = doc.id;

    if (!match.horaInicio) {
      console.log(`⚠️ Match ${matchId} sin horaInicio`);
      continue;
    }

    const deadline = admin.firestore.Timestamp.fromMillis(
      match.horaInicio.toMillis() - 3 * 60 * 60 * 1000
    );

    if (now.toMillis() >= deadline.toMillis()) {
      console.log(`⏰ Deadline alcanzado para match ${matchId}`);
      await procesarDeadline(matchId);
    } else {
      console.log(`🟢 Match ${matchId} todavía a tiempo`);
    }
  }
}

async function procesarDeadline(matchId) {
  const participationsSnap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("estado", "==", "titular")
    .where("estadoPago", "==", "pendiente")
    .get();

  const pendientes = participationsSnap.docs.map(d => d.id);

  console.log(
    `💰 Match ${matchId} tiene ${pendientes.length} pagos pendientes`
  );

  await db.collection("matches").doc(matchId).update({
    estado: "pagos_pendientes",
    deadlineProcesado: true
  });
}

// 🔓 EXPORT para script
module.exports = {
  checkPaymentDeadlinesLogic
};
