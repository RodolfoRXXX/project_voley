
// -------------------
// TRIGGER ACTUALIZA ESTADISTICAS Y CIERRA DEFINITIVAMENTE EL MATCH
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

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
      let shouldApplyStats = false;

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
              estado: "cancelado",
              lock: false,
            });
            return;
          }

          if (match.estado !== "cerrado") return;
          if (match.statsAppliedAt) return;

          tx.update(matchRef, { lock: true });
          shouldApplyStats = true;
        });

        if (!shouldApplyStats) {
          console.log(`ℹ️ Match ${doc.id} no requiere aplicar estadísticas`);
          continue;
        }

        const currentMatchSnap = await matchRef.get();
        if (!currentMatchSnap.exists) continue;
        const currentMatch = currentMatchSnap.data();

        const participationsSnap = await db
          .collection("participations")
          .where("matchId", "==", matchRef.id)
          .where("estado", "==", "titular")
          .get();

        const userIds = [
          ...new Set(
            participationsSnap.docs
              .map((pDoc) => pDoc.data().userId)
              .filter(Boolean)
          ),
        ];

        const batch = db.batch();

        userIds.forEach((userId) => {
          const statRef = db
            .collection("groupStats")
            .doc(`${currentMatch.groupId}_${userId}`);
          batch.set(
            statRef,
            {
              groupId: currentMatch.groupId,
              userId,
              partidosJugados: FieldValue.increment(1),
            },
            { merge: true }
          );

          const userRef = db.collection("users").doc(userId);
          batch.set(
            userRef,
            { estadoCompromiso: FieldValue.increment(1) },
            { merge: true }
          );
        });

        const groupRef = db.collection("groups").doc(currentMatch.groupId);
        batch.set(
          groupRef,
          { partidosTotales: FieldValue.increment(1) },
          { merge: true }
        );

        batch.update(matchRef, {
          estado: "jugado",
          lock: false,
          statsAppliedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();
        console.log(`🏐 Match ${doc.id} procesado`);
      } catch (err) {
        console.error(`🔥 Error procesando match ${doc.id}`, err);
        await matchRef.set({ lock: false }, { merge: true });
      }
    }

    return null;
  });
