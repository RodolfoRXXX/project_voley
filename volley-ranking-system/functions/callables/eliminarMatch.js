

const functions = require("firebase-functions/v1");
const { eliminarMatch } = require("../src/services/adminMatchService");
const { assertIsAdmin, assertMatchAdmin } = require("../src/services/adminAccessService");
const { db } = require("../src/firebase");
const { emitDomainEvent } = require("../src/events/domainEventBus");
const { DOMAIN_EVENTS } = require("../src/events/domainEvents");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const { matchId } = data;
  if (!matchId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "matchId requerido"
    );
  }

  await assertIsAdmin(context.auth.uid);
  await assertMatchAdmin(matchId, context.auth.uid);

  const matchSnap = await db.collection("matches").doc(matchId).get();
  const match = matchSnap.exists ? matchSnap.data() : null;
  const groupId = match?.groupId || null;
  const groupSnap = groupId ? await db.collection("groups").doc(String(groupId)).get() : null;
  const group = groupSnap?.exists ? groupSnap.data() : null;

  try {
    await eliminarMatch(matchId);

    if (groupId) {
      emitDomainEvent(DOMAIN_EVENTS.MATCH_DELETED, {
        groupId: String(groupId),
        groupName: group?.nombre || "Grupo",
        memberIds: Array.isArray(group?.memberIds) ? group.memberIds : [],
      });
    }

    return { ok: true };
  } catch (err) {
    switch (err.code) {
      case "MATCH_NOT_FOUND":
        throw new functions.https.HttpsError(
          "not-found",
          err.message
        );

      case "MATCH_ALREADY_PLAYED":
        throw new functions.https.HttpsError(
          "failed-precondition",
          err.message
        );

      default:
        throw new functions.https.HttpsError(
          "internal",
          "No se pudo eliminar el partido"
        );
    }
  }
});

