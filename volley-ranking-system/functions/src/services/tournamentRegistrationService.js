const functions = require("firebase-functions/v1");
const { db, admin } = require("../firebase");
const { assertGroupAdmin } = require("./adminAccessService");
const { TOURNAMENT_STATUS, assertTournamentAdmin } = require("./tournamentService");

async function requestTournamentRegistration({ uid, tournamentId, groupId }) {
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  if (typeof groupId !== "string" || !groupId) {
    throw new functions.https.HttpsError("invalid-argument", "groupId inválido");
  }

  await assertGroupAdmin(groupId, uid);

  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  const registrationId = `${tournamentId}_${groupId}`;
  const registrationRef = db.collection("tournamentRegistrations").doc(registrationId);

  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El torneo no existe");
    }

    const tournament = tournamentSnap.data();

    if (tournament.status !== TOURNAMENT_STATUS.OPEN) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El torneo no está abierto a inscripciones"
      );
    }

    const existingRegistration = await trx.get(registrationRef);
    if (existingRegistration.exists) {
      throw new functions.https.HttpsError(
        "already-exists",
        "El grupo ya tiene una inscripción para este torneo"
      );
    }

    trx.set(registrationRef, {
      tournamentId,
      groupId,
      status: "pendiente",
      paymentStatus: "pendiente",
      paymentAmount: 0,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      decidedByUserId: null,
    });
  });

  return { registrationId };
}

async function reviewTournamentRegistration({ uid, registrationId, status, paymentStatus, paymentAmount }) {
  if (!["aceptado", "rechazado"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "status inválido");
  }

  const registrationRef = db.collection("tournamentRegistrations").doc(registrationId);

  await db.runTransaction(async (trx) => {
    const registrationSnap = await trx.get(registrationRef);
    if (!registrationSnap.exists) {
      throw new functions.https.HttpsError("not-found", "La inscripción no existe");
    }

    const registration = registrationSnap.data();
    const tournamentRef = db.collection("tournaments").doc(registration.tournamentId);
    const tournamentSnap = await trx.get(tournamentRef);

    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El torneo no existe");
    }

    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);

    if (registration.status !== "pendiente") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "La inscripción ya fue procesada"
      );
    }

    if (status === "aceptado") {
      const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
      if (acceptedTeamsCount >= Number(tournament.maxTeams || 0)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "El torneo alcanzó el máximo de equipos"
        );
      }

      trx.update(tournamentRef, {
        acceptedTeamsCount: acceptedTeamsCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: uid,
      });
    }

    const updatePayload = {
      status,
      paymentStatus: paymentStatus === "pagado" ? "pagado" : "pendiente",
      paymentAmount: typeof paymentAmount === "number" ? paymentAmount : 0,
      paymentDate: paymentStatus === "pagado" ? admin.firestore.FieldValue.serverTimestamp() : null,
      decidedByUserId: uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    trx.update(registrationRef, updatePayload);
  });

  return { ok: true };
}

module.exports = {
  requestTournamentRegistration,
  reviewTournamentRegistration,
};
