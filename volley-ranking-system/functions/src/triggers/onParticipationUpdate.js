// Trigger que activa la llamada a la acción para reemplazar a un titular eliminado

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { reemplazarTitular } = require("../services/replacementService");
const { recalcularRanking } = require("../services/rankingService");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    // Solo titular → eliminado
    if (
      before.estado !== "titular" ||
      after.estado !== "eliminado" ||
      !after.matchId ||
      !before.posicionAsignada
    ) {
      return null;
    }

    /* =========================
       VALIDAR USUARIO ONBOARDED
    ========================= */

    const userSnap = await db
      .collection("users")
      .doc(after.userId)
      .get();

    const user = userSnap.data();

    if (!user?.onboarded) {
      console.log("Usuario no onboarded, se aborta reemplazo");
      return null;
    }

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
        throw new Error("Match bloqueado");
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
  });

