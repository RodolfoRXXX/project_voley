// services/onboardingService.js

const admin = require("firebase-admin");
const functions = require("firebase-functions/v1");

const db = admin.firestore();
const { POSICIONES_VALIDAS } = require("../config/posiciones");

async function completarOnboarding({
  uid,
  roles,
  posicionesPreferidas,
}) {
  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "UID requerido"
    );
  }

  if (!["player", "admin"].includes(roles)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Rol inválido"
    );
  }

  if (
    !Array.isArray(posicionesPreferidas) ||
    posicionesPreferidas.length !== 3
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Debe elegir exactamente 3 posiciones"
    );
  }

  const posicionesValidas = posicionesPreferidas.every((p) =>
    POSICIONES_VALIDAS.includes(p)
  );

  if (!posicionesValidas) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Posiciones inválidas"
    );
  }

  const userRef = db.collection("users").doc(uid);

  await userRef.update({
    roles,
    posicionesPreferidas,
    onboarded: true,
  });
}

module.exports = {
  completarOnboarding,
};
