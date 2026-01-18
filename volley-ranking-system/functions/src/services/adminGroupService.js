// Crea, edita grupos

// services/adminGroupService.js

const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Crear grupo
 */
async function crearGrupo({
  groupId,
  nombre,
  descripcion,
  adminId,
}) {
  await db.collection("groups").doc(groupId).set({
    nombre,
    descripcion,
    adminId,
    activo: true,
    partidosTotales: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Modificar grupo
 */
async function actualizarGrupo(groupId, cambios) {
  // cambios permitidos: nombre, descripcion, activo
  await db.collection("groups").doc(groupId).update({
    ...cambios,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = {
  crearGrupo,
  actualizarGrupo,
};
