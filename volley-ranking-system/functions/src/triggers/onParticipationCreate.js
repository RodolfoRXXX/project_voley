// triggers/onParticipationCreate.js

const functions = require("firebase-functions");
const { recalcularRanking } = require("../services/rankingService");

  module.exports = functions.firestore
  .document("participations/{id}")
  .onCreate(async (snap) => {
    const participation = snap.data();
    const matchRef = db.collection("matches").doc(participation.matchId);

    await db.runTransaction(async (tx) => {
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists) throw new Error("Match no existe");

      const match = matchSnap.data();

      if (match.lock) {
        throw new Error("Ranking bloqueado");
      }

      // 🔒 lock
      tx.update(matchRef, {
        lock: true,
      });

      // ⚙️ recalcular ranking
      await recalcularRanking(participation.matchId);

      // 🔓 unlock
      tx.update(matchRef, {
        lock: false,
      });
    });
  });
