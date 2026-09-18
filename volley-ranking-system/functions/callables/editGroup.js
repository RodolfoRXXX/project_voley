const functions = require("firebase-functions/v1");
const LEGACY_GROUP_CAPABILITY_RETIRED = "LEGACY_GROUP_CAPABILITY_RETIRED";
module.exports = functions.https.onCall(async () => {
  throw new functions.https.HttpsError("failed-precondition", "Esta capacidad ya no está disponible.", { reason: LEGACY_GROUP_CAPABILITY_RETIRED });
});
