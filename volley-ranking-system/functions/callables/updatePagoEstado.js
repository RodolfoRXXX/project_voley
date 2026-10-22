// Tombstone estable de la gestión económica legacy de partidos sociales

const functions = require("firebase-functions/v1");
const {
  assertIsAdmin,
  assertParticipationMatchAdmin,
} = require("../src/services/adminAccessService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const { participationId, estado } = data;

  if (!participationId || !estado) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "participationId requerido"
    );
  }

  await assertIsAdmin(context.auth.uid);
  await assertParticipationMatchAdmin(participationId, context.auth.uid);

  if (!["confirmado", "pendiente", "pospuesto"].includes(estado)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Estado de pago inválido"
    );
  }

  throw new functions.https.HttpsError(
    "failed-precondition",
    "La gestión económica de partidos sociales fue retirada",
    { code: "SOCIAL_MATCH_PAYMENT_RETIRED" }
  );
});

