// triggers/onMatchStart.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const matchesSnap = await db
      .collection("matches")
      .where("estado", "==", "cerrado")
      .get();

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;

      await db.runTransaction(async (tx) => {
        const matchSnap = await tx.get(matchRef);
        if (!matchSnap.exists) return;

        const match = matchSnap.data();

        if (!match.horaInicio) return;

        // ⏱️ ¿ya empezó el partido?
        if (now.toMillis() < match.horaInicio.toMillis()) {
          return;
        }

        const groupRef = db
          .collection("groups")
          .doc(match.groupId);

        const groupSnap = await tx.get(groupRef);
        if (!groupSnap.exists) return;

        const partidosTotales =
          groupSnap.data().partidosTotales || 0;

        // 🔒 LOCK REAL: cambio de estado
        tx.update(groupRef, {
          partidosTotales: partidosTotales + 1,
        });

        tx.update(matchRef, {
          estado: "jugado",
        });

        console.log(
          `🏐 Match ${matchRef.id} iniciado → partidosTotales +1`
        );
      });
    }

    return null;
  });
