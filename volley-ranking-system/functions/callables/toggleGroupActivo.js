// Callable que activa/desactiva un group

const functions = require("firebase-functions/v1");
const { actualizarGrupo } = require("../src/services/adminGroupService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const { groupId, activo } = data;

  if (!groupId || typeof activo !== "boolean") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "groupId y activo son requeridos"
    );
  }

  await actualizarGrupo(groupId, { activo });

  return { ok: true };
});
