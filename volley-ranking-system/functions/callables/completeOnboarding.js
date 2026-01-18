const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { completarOnboarding } = require("../services/onboardingService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const uid = context.auth.uid;
  const { roles, posicionesPreferidas } = data;

  await completarOnboarding({
    uid,
    roles,
    posicionesPreferidas,
  });

  return { success: true };
});
