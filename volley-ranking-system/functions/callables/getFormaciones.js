// Obtener las formaciones disponibles para crear un match

const functions = require("firebase-functions/v1");
const formaciones = require("../src/config/formaciones");

module.exports = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  return {
    formaciones: Object.keys(formaciones),
  };
});
