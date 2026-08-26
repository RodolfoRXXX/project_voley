// Crea, edita grupos

// services/adminGroupService.js

const admin = require("firebase-admin");
const db = admin.firestore();
const { assertLegacyGroup } = require("./groupAdminsService");

/**
 * Modificar grupo
 */
async function actualizarGrupo(groupId, cambios) {
  // cambios permitidos: nombre, descripcion, activo
  const ref = db.collection("groups").doc(groupId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const actual = snap.data();
  assertLegacyGroup(actual);
  const cambiosReales = {};

  Object.entries(cambios).forEach(([key, value]) => {
    if (actual[key] !== value) {
      cambiosReales[key] = value;
    }
  });

  if (Object.keys(cambiosReales).length === 0) {
    return false;
  }

  await ref.update(cambiosReales);
  return true;
}

module.exports = {
  actualizarGrupo,
};
