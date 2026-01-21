const functions = require("firebase-functions/v1");
const { crearMatch } = require("../src/services/adminMatchService");
const formaciones = require("../src/config/formaciones");

const {
  getFirestore,
  Timestamp,
} = require("firebase-admin/firestore");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const {
    groupId,
    horaInicio,
    cantidadEquipos,
    formacion,
    cantidadSuplentes,
  } = data;

  if (!formaciones[formacion]) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Formación inválida"
    );
  }

  const db = getFirestore();
  const matchId = db.collection("matches").doc().id;

  await crearMatch({
    matchId,
    groupId,
    adminId: context.auth.uid,
    horaInicio: Timestamp.fromDate(new Date(horaInicio)), // ✅
    cantidadEquipos,
    formacion,
    posicionesBase: formaciones[formacion],
    cantidadSuplentes,
  });

  return { ok: true, matchId };
});
