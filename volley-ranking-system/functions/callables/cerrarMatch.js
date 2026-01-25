// callables/cerrarMatch.js
const functions = require("firebase-functions/v1");
const { cerrarMatch } = require("../src/services/adminMatchService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  const { matchId } = data;
  if (!matchId) {
    throw new functions.https.HttpsError("invalid-argument");
  }

  await cerrarMatch(matchId, context.auth.uid);
  return { ok: true };
});
