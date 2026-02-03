
// -------------------
// TRIGGER ACTUALIZA ESTADISTICAS Y CIERRA DEFINITIVAMENTE EL MATCH
// -------------------

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
      .where("horaInicio", "<=", now)
      .get();

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;

      try {
        await db.runTransaction(async (tx) => {
          const matchSnap = await tx.get(matchRef);
          if (!matchSnap.exists) return;

          const match = matchSnap.data();

          if (match.lock === true) return;
          if (!match.groupId) return;

          // 🔒 lock
          tx.update(matchRef, { lock: true });

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
             TITULARES
          ========================= */
          const participationsSnap = await tx.get(
            db
              .collection("participations")
              .where("matchId", "==", matchRef.id)
              .where("estado", "==", "titular")
          );

          for (const pDoc of participationsSnap.docs) {
            const p = pDoc.data();
            if (!p.userId) continue;

            const statRef = db
              .collection("groupStats")
              .doc(`${match.groupId}_${p.userId}`);

            const statSnap = await tx.get(statRef);

            tx.set(
              statRef,
              {
                groupId: match.groupId,
                userId: p.userId,
                partidosJugados:
                  (statSnap.data()?.partidosJugados || 0) + 1,
              },
              { merge: true }
            );
          }

          tx.update(groupRef, {
            partidosTotales: partidosTotales + 1,
          });

          tx.update(matchRef, {
            estado: "jugado",
          });
        });

        console.log(`🏐 Match ${doc.id} iniciado`);
      } catch (err) {
        console.error(
          `🔥 Error iniciando match ${doc.id}`,
          err
        );
      }
    }

    return null;
  });

