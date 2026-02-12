// functions/src/callables/editGroup.js

const functions = require("firebase-functions/v1");
const { actualizarGrupo } = require("../src/services/adminGroupService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const { groupId, nombre, descripcion, activo } = data;

  if (!groupId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "groupId requerido"
    );
  }

  const cambios = {};
  if (nombre !== undefined) cambios.nombre = nombre;
  if (descripcion !== undefined) cambios.descripcion = descripcion;
  if (activo !== undefined) cambios.activo = activo;

  if (Object.keys(cambios).length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "No hay cambios para aplicar"
    );
  }

  let updated = false;

  try {
    updated = await actualizarGrupo(groupId, cambios);
  } catch (err) {
    if (err.message === "GROUP_NOT_FOUND") {
      throw new functions.https.HttpsError(
        "not-found",
        "El grupo ya no existe"
      );
    }

    throw err;
  }

  return { ok: true, updated };
});
