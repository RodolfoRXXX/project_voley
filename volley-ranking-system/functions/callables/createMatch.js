// Functions/src/callables/createMatch.js

const functions = require("firebase-functions/v1");
const { crearMatch } = require("../src/services/adminMatchService");
const formaciones = require("../src/config/formaciones");

const {
  getFirestore,
  Timestamp,
} = require("firebase-admin/firestore");

module.exports = functions.https.onCall(async (data, context) => {
  /* =====================
     Auth
  ===================== */
  
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  /* =====================
     Data
  ===================== */
  
  const {
    groupId,
    horaInicioMillis,
    cantidadEquipos,
    formacion,
    cantidadSuplentes,
  } = data;

  const db = getFirestore();
  const groupSnap = await db.collection("groups").doc(data.groupId).get();

  if (!groupSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Grupo no existe"
    );
  }

  if (!groupSnap.data().activo) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El grupo está desactivado"
    );
  }

  if (!formaciones[formacion]) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Formación inválida"
    );
  }

  const matchId = db.collection("matches").doc().id;
  if (typeof horaInicioMillis !== "number") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "horaInicioMillis inválido"
    );
  }

  if (
    typeof cantidadEquipos !== "number" ||
    cantidadEquipos <= 0
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "cantidadEquipos inválida"
    );
  }

  if (
    typeof cantidadSuplentes !== "number" ||
    cantidadSuplentes < 0
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "cantidadSuplentes inválida"
    );
  }

  const horaInicioTs = Timestamp.fromMillis(horaInicioMillis);

  await crearMatch({
    matchId,
    groupId,
    adminId: context.auth.uid,
    horaInicio: horaInicioTs, // ✅
    cantidadEquipos,
    formacion,
    posicionesBase: formaciones[formacion],
    cantidadSuplentes,
    jugadores: [],
  });

  return { ok: true, matchId };
});
