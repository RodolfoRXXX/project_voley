// -------------------
// TRIGGER QUE CIERRA EL CICLO AL INICIAR EL MATCH
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    let matchesSnap;
    try {
      matchesSnap = await db
        .collection("matches")
        .where("estado", "in", ["cerrado", "abierto", "verificando"])
        .where("horaInicio", "<=", now)
        .get();
    } catch (err) {
      console.error("❌ Error consultando matches por hora de inicio", err);
      return null;
    }

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;

      try {
        await db.runTransaction(async (tx) => {
          const matchSnap = await tx.get(matchRef);
          if (!matchSnap.exists) return;

          const match = matchSnap.data();

          if (match.estado === "cerrado") {
            tx.update(matchRef, {
              estado: "jugado",
            });
            return;
          }

          if (
            match.estado === "abierto" ||
            match.estado === "verificando"
          ) {
            tx.update(matchRef, {
              estado: "eliminado",
              lock: true,
              nextDeadlineAt: null,
            });
          }
        });

        console.log(`⏱️ Match ${doc.id} procesado por horaInicio`);
      } catch (err) {
        console.error(`🔥 Error procesando match ${doc.id}`, err);
      }
    }

    return null;
  });
