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
    horaInicioMillis,
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

  if (typeof horaInicioMillis !== "number") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "horaInicioMillis inválido"
    );
  } else {
    cambios.horaInicio = Timestamp.fromMillis(horaInicioMillis);
  }

  /* =====================
     Update
  ===================== */
  let updated = false;

  try {
    updated = await actualizarMatch(matchId, cambios);
  } catch (err) {
    if (err.message === "MATCH_NOT_FOUND") {
      throw new functions.https.HttpsError(
        "not-found",
        "El partido ya no existe"
      );
    }

    if (err.message === "MATCH_NOT_EDITABLE") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El partido no es editable"
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      "Error inesperado al editar el match"
    );
  }

  return { ok: true, updated };
});
