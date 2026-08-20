// functions/src/callables/completeOnboarding.js

const functions = require("firebase-functions/v1");
const { POSICIONES_VALIDAS } = require("../src/config/posiciones");
const { db } = require("../src/firebase");

const ALLOWED_FIELDS = new Set(["posicionesPreferidas"]);

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Datos inválidos"
    );
  }

  const unexpectedFields = Object.keys(data).filter(
    (field) => !ALLOWED_FIELDS.has(field)
  );
  if (unexpectedFields.length > 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El onboarding contiene campos no permitidos"
    );
  }

  const uid = context.auth.uid;
  const { posicionesPreferidas } = data;

  if (
    !Array.isArray(posicionesPreferidas) ||
    posicionesPreferidas.length < 1 ||
    posicionesPreferidas.length > 3 ||
    new Set(posicionesPreferidas).size !== posicionesPreferidas.length ||
    !posicionesPreferidas.every((position) => POSICIONES_VALIDAS.includes(position))
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Datos inválidos"
    );
  }

  const userRef = db.collection("users").doc(uid);
  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Usuario no existe"
      );
    }

    transaction.update(userRef, {
      posicionesPreferidas,
      onboarded: true,
    });
  });

  return { ok: true };
});
