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

    const matchSnap = await db
      .collection("matches")
      .doc(after.matchId)
      .get();

    if (!matchSnap.exists) return null;

    const match = matchSnap.data();
    if (!match.horaInicio) return null;

    const diffHoras =
      (match.horaInicio.toDate() - new Date()) / 36e5;

    const postDeadline = diffHoras <= 3;

    // 🔐 LOCK por match + posición
    const lockRef = db
      .collection("locks")
      .doc(`replace_${after.matchId}_${before.posicionAsignada}`);

    await db.runTransaction(async (tx) => {
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists) {
        console.log("🔒 Reemplazo ya en curso, abortando");
        return;
      }

      tx.set(lockRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    try {
      await reemplazarTitular({
        matchId: after.matchId,
        posicionLiberada: before.posicionAsignada,
        postDeadline,
      });

      // 🔁 Reordenar todo el ranking
      await recalcularRanking(after.matchId);
    } finally {
      // 🔓 liberar lock
      await lockRef.delete().catch(() => {});
    }

    return null;
  });

