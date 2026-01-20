// functions/src/callables/completeOnboarding.js

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const uid = context.auth.uid;
  const { roles, posicionesPreferidas } = data;

  if (!roles || !Array.isArray(posicionesPreferidas)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Datos inválidos"
    );
  }

  await db.collection("users").doc(uid).update({
    roles,
    posicionesPreferidas,
    onboarded: true,
  });

  return { ok: true };
});

