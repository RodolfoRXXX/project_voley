
// -------------------
// Callable - generarEquipos
// -------------------

const functions = require("firebase-functions/v1");
const { generarEquipos } = require("../src/services/teamsService");
const { assertIsAdmin, assertMatchAdmin } = require("../src/services/adminAccessService");


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
       GROUP / ADMIN
    ========================= */

    await assertIsAdmin(context.auth.uid);
    const matchWithAuth = await assertMatchAdmin(matchId, context.auth.uid);

    /* =========================
       GENERAR
    ========================= */

    await generarEquipos(matchId, matchWithAuth.groupId);

    return { ok: true };
  }
);
