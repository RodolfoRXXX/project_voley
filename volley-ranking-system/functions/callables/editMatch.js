// functions/src/callables/editMatch.js

const functions = require("firebase-functions/v1");
const { actualizarMatch } = require("../src/services/adminMatchService");
const formaciones = require("../src/config/formaciones");

const {
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
    matchId,
    cantidadEquipos,
    cantidadSuplentes,
    formacion,
    horaInicio,
  } = data;

  if (!matchId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "matchId requerido"
    );
  }

  const cambios = {};

  /* =====================
     Formación + posiciones
  ===================== */
  if (formacion || cantidadEquipos) {
    const base = formaciones[formacion];

    if (!base) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Formación inválida"
      );
    }

    const posicionesObjetivo = {};
    Object.entries(base).forEach(([pos, cant]) => {
      posicionesObjetivo[pos] = cant * cantidadEquipos;
    });

    cambios.formacion = formacion;
    cambios.cantidadEquipos = cantidadEquipos;
    cambios.posicionesObjetivo = posicionesObjetivo;
  }

  /* =====================
     Otros cambios
  ===================== */
  if (typeof cantidadSuplentes === "number") {
    cambios.cantidadSuplentes = cantidadSuplentes;
  }

  if (horaInicio) {
    /*cambios.horaInicio = admin.firestore.Timestamp.fromDate(
      new Date(horaInicio)
    );*/
    cambios.horaInicio = Timestamp.fromDate(new Date(horaInicio)); // ✅
  }

  /* =====================
     Update
  ===================== */
  await actualizarMatch(matchId, cambios);

  return { ok: true };
});
