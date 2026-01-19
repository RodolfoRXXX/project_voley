// schedulers/onMatchDeadline.js
// Evento 6 — Deadline automático (3 horas antes)

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

exports.onMatchDeadline = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    console.log("⏱️ Verificando deadlines de matches...");

    const now = admin.firestore.Timestamp.now();

    const matchesSnap = await db
      .collection("matches")
      .where("estado", "==", "abierto")
      .where("deadlineProcesado", "==", false)
      .get();

    for (const doc of matchesSnap.docs) {
      const match = doc.data();
      const matchId = doc.id;

      if (!match.horaInicio) continue;

      const deadline = admin.firestore.Timestamp.fromMillis(
        match.horaInicio.toMillis() - 3 * 60 * 60 * 1000
      );

      if (now.toMillis() >= deadline.toMillis()) {
        console.log(`⏰ Deadline alcanzado para match ${matchId}`);

        // 1️⃣ Detectar pagos pendientes
        const participationsSnap = await db
          .collection("participations")
          .where("matchId", "==", matchId)
          .where("estado", "==", "titular")
          .where("pagoEstado", "==", "pendiente")
          .get();

        console.log(
          `💰 ${participationsSnap.size} pagos pendientes en match ${matchId}`
        );

        // 2️⃣ Actualizar match
        await doc.ref.update({
          estado: "pagos_pendientes",
          deadlineProcesado: true,
        });

        // 👉 Acá solo notificaciones (dashboard, mail, etc)
      }
    }

    return null;
  });

