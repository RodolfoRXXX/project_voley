// triggers/onParticipationUpdate.js

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { reemplazarTitular } = require("../services/replacementService");
const { recalcularRanking } = require("../services/rankingService");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!after.matchId) return null;

    // 🔒 Guard anti-loop
    if (before.estado === after.estado) return null;

    /* ==================================
       CASO 1: TITULAR → ELIMINADO
    ================================== */
    if (
      before.estado === "titular" &&
      after.estado === "eliminado" &&
      before.posicionAsignada
    ) {
      /* =========================
         VALIDAR USUARIO ONBOARDED
      ========================= */
      const userRef = db.collection("users").doc(after.userId);
      const userSnap = await userRef.get();
      const user = userSnap.data();

      if (!user?.onboarded) {
        console.warn(
          "[onParticipationUpdate] Usuario no onboarded",
          after.userId
        );
        return null;
      }

      /* =========================
         PENALIZAR ESTADO COMPROMISO
      ========================= */
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return;

        const actual = snap.data().estadoCompromiso ?? 0;
        tx.update(userRef, {
          estadoCompromiso: actual - 1,
        });
      });

      /* =========================
         OBTENER MATCH
      ========================= */
      const matchRef = db.collection("matches").doc(after.matchId);
      const matchSnap = await matchRef.get();

      if (!matchSnap.exists) {
        console.warn(
          "[onParticipationUpdate] Match no existe",
          after.matchId
        );
        return null;
      }

      const match = matchSnap.data();
      if (!match.horaInicio) return null;

      const diffHoras =
        (match.horaInicio.toDate() - new Date()) / 36e5;

      const postDeadline = diffHoras <= 3;

      /* =========================
         LOCK GLOBAL DEL MATCH
      ========================= */
      let locked = false;

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists) return;

        if (snap.data().lock) {
          console.warn(
            `🔒 Match ${after.matchId} ya bloqueado`
          );
          return;
        }

        tx.update(matchRef, { lock: true });
        locked = true;
      });

      if (!locked) return null;

      /* =========================
         REEMPLAZO + RANKING
      ========================= */
      try {
        await reemplazarTitular({
          matchId: after.matchId,
          posicionLiberada: before.posicionAsignada,
          postDeadline,
          manageLock: false,
        });

        await recalcularRanking(after.matchId);
      } catch (err) {
        console.error(
          "[onParticipationUpdate] Error en reemplazo",
          err
        );
      } finally {
        await matchRef
          .update({ lock: false })
          .catch(() => {});
      }

      return null;
    }

    /* ==================================
       CASO 2: ELIMINADO → PENDIENTE
    ================================== */
    if (
      before.estado === "eliminado" &&
      after.estado === "pendiente"
    ) {
      try {
        await recalcularRanking(after.matchId);
      } catch (err) {
        console.error(
          "[onParticipationUpdate] Error recalculando ranking",
          err
        );
      }
      return null;
    }

    return null;
  });
