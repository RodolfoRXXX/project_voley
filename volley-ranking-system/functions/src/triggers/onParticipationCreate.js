// triggers/onParticipationCreate.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { recalcularRanking } = require("../services/rankingService");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onCreate(async (snap) => {
    const participation = snap.data();

    const matchRef = db.collection("matches").doc(participation.matchId);

    /* =========================
       VALIDAR USUARIO ONBOARDED
    ========================= */

    const userSnap = await db
      .collection("users")
      .doc(participation.userId)
      .get();

    const user = userSnap.data();

    if (!user?.onboarded) {
      throw new Error("Usuario no onboarded");
    }

    /* =========================
       LOCK + VALIDACIÓN MATCH
    ========================= */

    await db.runTransaction(async (tx) => {
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists) {
        throw new Error("Match no existe");
      }

      const match = matchSnap.data();

      if (match.lock) {
        throw new Error("Ranking bloqueado");
      }

      // 🔒 lock
      tx.update(matchRef, { lock: true });
    });

    /* =========================
       RECALCULAR RANKING
    ========================= */

    try {
      await recalcularRanking(participation.matchId);
    } finally {
      // 🔓 unlock (SIEMPRE)
      await matchRef.update({ lock: false });
    }
  });

