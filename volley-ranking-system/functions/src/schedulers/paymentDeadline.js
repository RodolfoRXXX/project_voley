// Verificador de pendientes luego del deadline

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("../firebase");

exports.checkPaymentDeadlines = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    console.log("⏱️ Chequeando deadlines de pago...");

    const now = admin.firestore.Timestamp.now();

    // Matches abiertos
    const matchesSnap = await db
      .collection("matches")
      .where("estado", "==", "abierto")
      .where("deadlineProcesado", "==", false)
      .get();

    for (const doc of matchesSnap.docs) {
      const match = doc.data();
      const matchId = doc.id;

      const deadline = admin.firestore.Timestamp.fromMillis(
        match.horaInicio.toMillis() - 3 * 60 * 60 * 1000
      );

      if (now.toMillis() >= deadline.toMillis()) {
        console.log(`⏰ Deadline alcanzado para match ${matchId}`);

        await procesarDeadline(matchId);
      }
    }

    return null;
  });


  async function procesarDeadline(matchId) {
    const participationsSnap = await db
        .collection("participations")
        .where("matchId", "==", matchId)
        .where("estado", "==", "titular")
        .where("estadoPago", "==", "pendiente")
        .get();

    const pendientes = participationsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
    }));

    console.log(
        `💰 Match ${matchId} tiene ${pendientes.length} pagos pendientes`
    );

    // Marcar match en estado "pagos_pendientes"
    await db.collection("matches").doc(matchId).update({
        estado: "pagos_pendientes",
        deadlineProcesado: true
    });

    // 👉 Acá SOLO notificás (email, push, dashboard)
    // No se toca ranking
    }
