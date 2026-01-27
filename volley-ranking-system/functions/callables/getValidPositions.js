
const functions = require("firebase-functions/v1");
const { POSICIONES_VALIDAS } = require("../src/config/posiciones");

module.exports = functions.https.onCall(async () => {
  return {
    posiciones: POSICIONES_VALIDAS,
  };
});
