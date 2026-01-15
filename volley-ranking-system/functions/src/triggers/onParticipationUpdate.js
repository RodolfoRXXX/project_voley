// Trigger que activa la llamada a la acción para reemplazar a un titular eliminado

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { reemplazarTitular } = require("../services/replacementService");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    // Solo nos interesa cuando un TITULAR pasa a eliminado
    if (
      before.estado === "titular" &&
      after.estado === "eliminado"
    ) {
      const matchSnap = await db
        .collection("matches")
        .doc(after.matchId)
        .get();

      const match = matchSnap.data();

      const now = new Date();
      const horaInicio = match.horaInicio.toDate();
      const diffHoras = (horaInicio - now) / 36e5;

      const postDeadline = diffHoras <= 3;

      await reemplazarTitular({
        matchId: after.matchId,
        posicionLiberada: before.posicionAsignada,
        postDeadline,
      });
    }
  });
