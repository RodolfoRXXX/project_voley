
// -------------------
// Callable - generarEquipos
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { generarEquipos } = require("../src/services/teamsService");

const db = admin.firestore();

module.exports = functions.https.onCall(
  async (data, context) => {
    console.log("🔥 generarEquipos callable INVOCADO");    

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Usuario no autenticado"
      );
    }

    const { matchId } = data;

    if (!matchId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "matchId es requerido"
      );
    }

    /* =========================
       MATCH
    ========================= */

    const matchRef = db.collection("matches").doc(matchId);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "El match no existe"
      );
    }

    const match = matchSnap.data();

    /* =========================
       GROUP / ADMIN
    ========================= */

    const groupRef = db.collection("groups").doc(match.groupId);
    const groupSnap = await groupRef.get();

    if (!groupSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "El grupo no existe"
      );
    }

    const group = groupSnap.data();

    if (group.adminId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo el admin puede generar equipos"
      );
    }

    /* =========================
       GENERAR
    ========================= */

    await generarEquipos(matchId, match.groupId);

    return { ok: true };
  }
);
