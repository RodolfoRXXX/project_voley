// Trigger que activa la llamada a la acción para reemplazar a un titular eliminado

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
    if (before.estado === after.estado) {
      return null;
    }

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
        console.log("Usuario no onboarded, se aborta reemplazo");
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
      if (!matchSnap.exists) return null;

      const match = matchSnap.data();
      if (!match.horaInicio) return null;

      const diffHoras =
        (match.horaInicio.toDate() - new Date()) / 36e5;

      const postDeadline = diffHoras <= 3;

      /* =========================
         LOCK GLOBAL DEL MATCH
      ========================= */
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists) throw new Error("Match no existe");
        if (snap.data().lock) {
          console.log(
            `🔒 Match ${after.matchId} bloqueado. Se ignora reemplazo`
          );
          return;
        }

        tx.update(matchRef, { lock: true });
      });

      try {
        await reemplazarTitular({
          matchId: after.matchId,
          posicionLiberada: before.posicionAsignada,
          postDeadline,
        });

        await recalcularRanking(after.matchId);
      } finally {
        await matchRef.update({ lock: false }).catch(() => {});
      }

      return null;
    }

    /* ==================================
       CASO 2: ELIMINADO → PENDIENTE
       (reincorporación)
    ================================== */
    if (
      before.estado === "eliminado" &&
      after.estado === "pendiente"
    ) {
      await recalcularRanking(after.matchId);
      return null;
    }

    return null;
  });
