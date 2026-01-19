// triggers/onMatchStart.js
// Evento 8 — inicio real del partido

const functions = require("firebase-functions/v1");
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
        if (!match.horaInicio || !match.groupId) return;

        // ⏱️ ¿ya empezó el partido?
        if (now.toMillis() < match.horaInicio.toMillis()) {
          return;
        }

        /* =========================
           GROUP
        ========================= */

        const groupRef = db
          .collection("groups")
          .doc(match.groupId);

        const groupSnap = await tx.get(groupRef);
        if (!groupSnap.exists) return;

        const partidosTotales =
          groupSnap.data().partidosTotales || 0;

        /* =========================
           TITULARES DEL MATCH
        ========================= */

        const participationsSnap = await tx.get(
          db
            .collection("participations")
            .where("matchId", "==", matchRef.id)
            .where("estado", "==", "titular")
        );

        /* =========================
           ACTUALIZAR groupStats
        ========================= */

        for (const pDoc of participationsSnap.docs) {
          const p = pDoc.data();
          if (!p.userId) continue;

          const statRef = db
            .collection("groupStats")
            .doc(`${match.groupId}_${p.userId}`);

          const statSnap = await tx.get(statRef);

          if (statSnap.exists) {
            const actuales =
              statSnap.data().partidosJugados || 0;

            tx.update(statRef, {
              partidosJugados: actuales + 1,
            });
          } else {
            tx.set(statRef, {
              groupId: match.groupId,
              userId: p.userId,
              partidosJugados: 1,
            });
          }
        }

        /* =========================
           ACTUALIZAR GROUP + MATCH
        ========================= */

        tx.update(groupRef, {
          partidosTotales: partidosTotales + 1,
        });

        tx.update(matchRef, {
          estado: "jugado",
        });

        console.log(
          `🏐 Match ${matchRef.id} iniciado → grupo ${match.groupId}`
        );
      });
    }

    return null;
  });
