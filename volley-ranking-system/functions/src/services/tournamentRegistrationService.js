const functions = require("firebase-functions/v1");
const { db, admin } = require("../firebase");
const { assertGroupAdmin } = require("./adminAccessService");
const { TOURNAMENT_STATUS, assertTournamentAdmin } = require("./tournamentService");
const {
  FieldValue,
} = require("firebase-admin/firestore");


async function requestTournamentRegistration({ uid, tournamentId, groupId, nameTeam }) {

  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  if (typeof groupId !== "string" || !groupId) {
    throw new functions.https.HttpsError("invalid-argument", "groupId inválido");
  }

  if (typeof nameTeam !== "string" || !nameTeam.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El nombre del equipo es obligatorio"
    );
  }

  const cleanTeamName = nameTeam.trim();

  await assertGroupAdmin(groupId, uid);

  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  const groupRef = db.collection("groups").doc(groupId);

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

    const groupSnap = await trx.get(groupRef);
    if (!groupSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El grupo no existe");
    }

    const group = groupSnap.data();
    const teamMembersCount = Array.isArray(group.memberIds) ? group.memberIds.length : 0;
    const minPlayers = Number(tournament.minPlayers || 1);

    if (teamMembersCount < minPlayers) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `El grupo debe tener al menos ${minPlayers} integrantes para inscribirse`
      );
    }

    const existingRegistration = await trx.get(registrationRef);
    if (existingRegistration.exists) {
      throw new functions.https.HttpsError(
        "already-exists",
        "El grupo ya tiene una inscripción para este torneo"
      );
    }

    const paymentForPlayer = Number(tournament.paymentForPlayer || 0);
    const expectedAmount = 0;
    const paidAmount = 0;
    const pendingAmount = expectedAmount;

    trx.set(registrationRef, {
      tournamentId,
      groupId,
      nameTeam: cleanTeamName,
      playerIds: [],
      paymentForPlayer,
      expectedAmount,
      paidAmount,
      pendingAmount,
      teamMembersCount,
      status: "pendiente",
      paymentStatus: "pendiente",
      paymentAmount: 0,
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      });
    }

    const paidAmount = typeof paymentAmount === "number" ? paymentAmount : Number(registration.paidAmount || 0);
    const expectedAmount = Number(registration.expectedAmount || 0);
    const pendingAmount = Math.max(expectedAmount - paidAmount, 0);
    const computedPaymentStatus = paidAmount <= 0 ? "pendiente" : pendingAmount === 0 ? "pagado" : "parcial";

    const nextPaymentStatus = paymentStatus === "pagado" ? "pagado" : computedPaymentStatus;

    const updatePayload = {
      status,
      paymentStatus: nextPaymentStatus,
      paidAmount,
      paymentAmount: paidAmount,
      expectedAmount,
      pendingAmount: nextPaymentStatus === "pagado" ? 0 : pendingAmount,
      paymentDate: nextPaymentStatus === "pagado" ? FieldValue.serverTimestamp() : null,
      decidedByUserId: uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    trx.update(registrationRef, updatePayload);
  });

  return { ok: true };
}

async function updateTournamentRegistrationPayment({ uid, registrationId, paidAmount }) {
  if (typeof registrationId !== "string" || !registrationId) {
    throw new functions.https.HttpsError("invalid-argument", "registrationId inválido");
  }

  if (typeof paidAmount !== "number" || paidAmount < 0) {
    throw new functions.https.HttpsError("invalid-argument", "paidAmount inválido");
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

    const expectedAmount = Number(registration.expectedAmount || 0);
    const pendingAmount = Math.max(expectedAmount - paidAmount, 0);
    const paymentStatus = paidAmount <= 0 ? "pendiente" : pendingAmount === 0 ? "pagado" : "parcial";

    trx.update(registrationRef, {
      paidAmount,
      paymentAmount: paidAmount,
      expectedAmount,
      pendingAmount,
      paymentStatus,
      paymentVerifiedBy: uid,
      paymentVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
}

module.exports = {
  requestTournamentRegistration,
  reviewTournamentRegistration,
  updateTournamentRegistrationPayment,
};
