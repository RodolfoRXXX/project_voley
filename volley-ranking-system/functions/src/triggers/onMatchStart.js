
// -------------------
// TRIGGER ACTUALIZA ESTADISTICAS Y CIERRA DEFINITIVAMENTE EL MATCH
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.pubsub
  .schedule("every 60 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const matchesSnap = await db
      .collection("matches")
      .where("estado", "in", ["cerrado", "abierto", "verificando"])
      .where("horaInicio", "<=", now)
      .get();

    if (matchesSnap.empty) {
      console.log("ℹ️ No hay matches para procesar en cierre");
      return null;
    }

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;
      const match = doc.data();

      if (match.lock === true) continue;
      if (!["cerrado", "abierto", "verificando"].includes(match.estado)) {
        continue;
      }

      try {
        await db.runTransaction(async (tx) => {
          const matchSnap = await tx.get(matchRef);
          if (!matchSnap.exists) return;

          const match = matchSnap.data();

          // 🔒 Mutex defensivo
          if (match.lock === true) return;

          /* =========================
             DECISIÓN DE DESTINO
          ========================= */

          if (match.estado === "abierto" || match.estado === "verificando") {
            tx.update(matchRef, {
              estado: "eliminado",
              lock: true,
              nextDeadlineAt: null,
            });
            return;
          }

          if (match.estado !== "cerrado") return;

          /* =========================
             EFECTOS DE MATCH JUGADO
          ========================= */

          tx.update(matchRef, { lock: true });

          const groupRef = db.collection("groups").doc(match.groupId);
          const groupSnap = await tx.get(groupRef);
          if (!groupSnap.exists) return;

          const partidosTotales =
            groupSnap.data().partidosTotales || 0;

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

        console.log(`🏐 Match ${doc.id} procesado`);
      } catch (err) {
        console.error(`🔥 Error procesando match ${doc.id}`, err);
      }
    }

    return null;
  });
