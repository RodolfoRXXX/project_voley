// triggers/onMatchClose.js

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.pagoEstado === after.pagoEstado) return null;

    const matchId = after.matchId;
    if (!matchId) return null;

    const matchRef = db.collection("matches").doc(matchId);

    await db.runTransaction(async (tx) => {
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists) return;

      const match = matchSnap.data();

      // 🔒 LOCK
      if (match.lock === true) {
        console.log(`🔒 Match ${matchId} ya bloqueado`);
        return;
      }

      if (match.estado !== "pagos_pendientes") return;

      const participationsSnap = await tx.get(
        db
          .collection("participations")
          .where("matchId", "==", matchId)
          .where("estado", "==", "titular")
      );

      const hayPendientes = participationsSnap.docs.some((doc) => {
        const p = doc.data();
        return (
          p.pagoEstado !== "confirmado" &&
          p.pagoEstado !== "pospuesto"
        );
      });

      if (hayPendientes) return;

      // 🔐 ACTIVAR LOCK + CIERRE
      tx.update(matchRef, {
        estado: "cerrado",
        lock: true,
      });

      console.log(`🔒 Match ${matchId} cerrado con lock`);
    });

    return null;
  });
