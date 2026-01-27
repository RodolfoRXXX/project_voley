// functions/src/services/userGameService.js

const { getFirestore } = require("firebase-admin/firestore");
const { POSICIONES_VALIDAS } = require("../config/posiciones");

const db = getFirestore();

async function updatePreferredPositions(userId, posiciones) {
  if (!Array.isArray(posiciones)) {
    throw new Error("Formato inválido");
  }

  if (posiciones.length < 1) {
    throw new Error("Debe haber al menos una posición");
  }

  if (posiciones.length > 3) {
    throw new Error("Máximo 3 posiciones permitidas");
  }

  // validar duplicados
  const unique = new Set(posiciones);
  if (unique.size !== posiciones.length) {
    throw new Error("Hay posiciones duplicadas");
  }

  // validar catálogo (DOMINIO)
  posiciones.forEach((p) => {
    if (!POSICIONES_VALIDAS.includes(p)) {
      throw new Error(`Posición inválida: ${p}`);
    }
  });

  const userRef = db.collection("users").doc(userId);

  await userRef.update({
    posicionesPreferidas: posiciones,
  });
}

module.exports = {
  updatePreferredPositions,
};
