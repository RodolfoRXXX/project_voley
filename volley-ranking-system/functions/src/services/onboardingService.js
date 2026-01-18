// services/onboardingService.js

const admin = require("firebase-admin");
const db = admin.firestore();

const { POSICIONES_VALIDAS } = require("../config/posiciones");


async function completarOnboarding({
  uid,
  roles,
  posicionesPreferidas,
}) {
  if (!uid) throw new Error("UID requerido");

  if (!["player", "admin"].includes(roles)) {
    throw new Error("Rol inválido");
  }

  if (
    !Array.isArray(posicionesPreferidas) ||
    posicionesPreferidas.length !== 3
  ) {
    throw new Error("Debe elegir 3 posiciones");
  }

  const posicionesValidas = posicionesPreferidas.every((p) =>
    POSICIONES_VALIDAS.includes(p)
  );

  if (!posicionesValidas) {
    throw new Error("Posiciones inválidas");
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
