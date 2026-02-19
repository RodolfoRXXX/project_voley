// Modificar estado de pago

const functions = require("firebase-functions/v1");
const { actualizarPago } = require("../src/services/adminMatchService");
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

  try {
    await actualizarPago(participationId, estado);
  } catch (err) {
    if (err.code === "INVALID_PAGO_ESTADO") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        err.message
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      "No se pudo actualizar el pago"
    );
  }

  return { ok: true };
});

