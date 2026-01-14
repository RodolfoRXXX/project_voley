// Deadline 3 horas (evento 6)

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    const now = new Date();

    const matchesSnap = await db
      .collection("matches")
      .where("cerrado", "==", false)
      .get();

    for (const doc of matchesSnap.docs) {
      const match = doc.data();
      const horaInicio = match.horaInicio.toDate();
      const diffHoras = (horaInicio - now) / 36e5;

      if (diffHoras <= 3 && !match.deadlineProcesado) {
        // notificar admin
        await doc.ref.update({ deadlineProcesado: true });
      }
    }
  });
