// triggers/onParticipationCreate.js

const functions = require("firebase-functions/v1");
const { db } = require("../firebase");
const { recalcularRanking } = require("../services/rankingService");

module.exports = functions.firestore
  .document("participations/{id}")
  .onCreate(async (snap) => {
    const participation = snap.data();

    const matchRef = db
      .collection("matches")
      .doc(participation.matchId);

    /* =========================
       VALIDAR USUARIO ONBOARDED
    ========================= */

    const userSnap = await db
      .collection("users")
      .doc(participation.userId)
      .get();

    const user = userSnap.data();

    if (!user?.onboarded) {
      console.warn(
        "[onParticipationCreate] Usuario no onboarded",
        {
          userId: participation.userId,
          participationId: snap.id,
        }
      );
      return;
    }

    /* =========================
       LOCK + VALIDACIÓN MATCH
    ========================= */

    let shouldRecalculate = false;

    await db.runTransaction(async (tx) => {
      const matchSnap = await tx.get(matchRef);

      if (!matchSnap.exists) {
        console.warn(
          "[onParticipationCreate] Match no existe",
          participation.matchId
        );
        return;
      }

      const match = matchSnap.data();

      if (match.estado !== "abierto") return;

      if (match.lock) {
        console.warn(
          "[onParticipationCreate] Ranking bloqueado",
          participation.matchId
        );
        return;
      }

      // 🔒 lock
      tx.update(matchRef, { lock: true });
      shouldRecalculate = true;
    });

    if (!shouldRecalculate) return;

    /* =========================
       RECALCULAR RANKING
    ========================= */

    try {
      await recalcularRanking(participation.matchId);
    } catch (err) {
      console.error(
        "[onParticipationCreate] Error recalculando ranking",
        err
      );
    } finally {
      // 🔓 unlock (SIEMPRE)
      await matchRef.update({ lock: false });
    }
  });
