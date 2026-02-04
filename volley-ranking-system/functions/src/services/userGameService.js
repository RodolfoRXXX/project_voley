// functions/src/services/userGameService.js

const functions = require("firebase-functions/v1");
const { getFirestore } = require("firebase-admin/firestore");
const { POSICIONES_VALIDAS } = require("../config/posiciones");

const db = getFirestore();

async function updatePreferredPositions(userId, posiciones) {
  if (!Array.isArray(posiciones)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Formato inválido"
    );
  }

  if (posiciones.length < 1) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Debe haber al menos una posición"
    );
  }

  if (posiciones.length > 3) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Máximo 3 posiciones permitidas"
    );
  }

  // validar duplicados
  const unique = new Set(posiciones);
  if (unique.size !== posiciones.length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Hay posiciones duplicadas"
    );
  }

  // validar catálogo (DOMINIO)
  posiciones.forEach((p) => {
    if (!POSICIONES_VALIDAS.includes(p)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Posición inválida: ${p}`
      );
    }
  });

  const userRef = db.collection("users").doc(userId);

  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Usuario no existe"
    );
  }

  await userRef.update({
    posicionesPreferidas: posiciones,
  });
}

module.exports = {
  updatePreferredPositions,
};
