const functions = require("firebase-functions/v1");
const { db, admin } = require("../firebase");
const { assertGroupAdmin } = require("./adminAccessService");
const { TOURNAMENT_STATUS, assertTournamentAdmin } = require("./tournamentService");
const {
  FieldValue,
} = require("firebase-admin/firestore");
const { emitDomainEvent } = require("../events/domainEventBus");
const { DOMAIN_EVENTS } = require("../events/domainEvents");
const { createGroupTournamentRejectionAlert } = require("./pendingAlertsService");
const {
  assertNoRetiredTournamentEconomy,
  getTournamentRegistrationEconomicFields,
  tournamentPaymentRetiredError,
} = require("./tournamentEconomyRetirement");


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
    const minPlayers = Number(tournament.settings?.minPlayers || tournament.minPlayers || 1);

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

    trx.set(registrationRef, {
      tournamentId,
      groupId,
      nameTeam: cleanTeamName,
      playerIds: [],
      teamMembersCount,
      status: "pendiente",
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      decidedByUserId: null,
    });

  });

  return { registrationId };
}

async function reviewTournamentRegistration({ uid, data }) {
  const { registrationId, status } = data || {};
  const source = data?.source ?? "registration";
  if (typeof registrationId !== "string" || !registrationId.trim()) {
    throw new functions.https.HttpsError("invalid-argument", "registrationId inválido");
  }
  if (!["registration", "team"].includes(source)) {
    throw new functions.https.HttpsError("invalid-argument", "source inválido");
  }

  const sourceCollection = source === "team" ? "tournamentTeams" : "tournamentRegistrations";
  const registrationRef = db.collection(sourceCollection).doc(registrationId);
  let acceptedGroupId = null;
  let acceptedTournamentId = null;
  let acceptedTournamentName = "Torneo";
  let rejectedGroupId = null;
  let rejectedTournamentId = null;
  let rejectedTournamentName = "Torneo";

  await db.runTransaction(async (trx) => {
    const registrationSnap = await trx.get(registrationRef);
    if (!registrationSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El registro no existe");
    }

    const registration = registrationSnap.data();
    const tournamentRef = db.collection("tournaments").doc(registration.tournamentId);
    const tournamentTeamRef = db.collection("tournamentTeams").doc(registration.id || registrationId);
    const tournamentSnap = await trx.get(tournamentRef);

    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El torneo no existe");
    }

    const tournament = tournamentSnap.data();
    acceptedTournamentName = tournament?.name || tournament?.nombre || "Torneo";
    rejectedTournamentName = acceptedTournamentName;
    assertTournamentAdmin(tournament, uid);

    assertNoRetiredTournamentEconomy(getTournamentRegistrationEconomicFields(data));
    if (!["aceptado", "rechazado"].includes(status)) {
      throw new functions.https.HttpsError("invalid-argument", "status inválido");
    }
    if (source === "team" && status === "aceptado") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No se puede aceptar un equipo desde la fuente team"
      );
    }

    const isPendingRegistration = registration.status === "pendiente";
    const isAcceptedRegistration = registration.status === "aceptado";

    if (source === "team") {
      if (!isAcceptedRegistration) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Solo se puede rechazar un equipo aceptado"
        );
      }

      trx.update(registrationRef, {
        status: "rechazado",
        decidedByUserId: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      rejectedGroupId = registration.groupId;
      rejectedTournamentId = registration.tournamentId;

      const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
      trx.update(tournamentRef, {
        acceptedTeamsCount: Math.max(acceptedTeamsCount - 1, 0),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      });

      return;
    }

    if (status === "aceptado") {
      if (!isPendingRegistration) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "La inscripción ya fue procesada"
        );
      }

      const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
      if (acceptedTeamsCount >= Number(tournament.settings?.maxTeams || tournament.maxTeams || 0)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "El torneo alcanzó el máximo de equipos"
        );
      }

      const existingTournamentTeamSnap = await trx.get(tournamentTeamRef);
      if (existingTournamentTeamSnap.exists) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Ya existe un equipo del torneo para esta inscripción"
        );
      }

      trx.update(tournamentRef, {
        acceptedTeamsCount: acceptedTeamsCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      });

      acceptedGroupId = registration.groupId;
      acceptedTournamentId = registration.tournamentId;

      trx.set(tournamentTeamRef, {
        tournamentId: registration.tournamentId,
        groupId: registration.groupId,
        registrationId,
        name: registration.nameTeam || "Sin nombre",
        nameTeam: registration.nameTeam || "Sin nombre",
        playerIds: Array.isArray(registration.playerIds) ? registration.playerIds : [],
        teamMembersCount: Number(registration.teamMembersCount || 0),
        status: "aceptado",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (status === "rechazado" && isAcceptedRegistration) {
      const tournamentTeamSnap = await trx.get(tournamentTeamRef);
      if (!tournamentTeamSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El equipo del torneo no existe");
      }

      trx.update(tournamentTeamRef, {
        status: "rechazado",
        updatedAt: FieldValue.serverTimestamp(),
        decidedByUserId: uid,
      });

      rejectedGroupId = registration.groupId;
      rejectedTournamentId = registration.tournamentId;

      const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
      trx.update(tournamentRef, {
        acceptedTeamsCount: Math.max(acceptedTeamsCount - 1, 0),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      });

      return;
    }

    if (!isPendingRegistration) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "La inscripción ya fue procesada"
      );
    }

    const updatePayload = {
      status,
      decidedByUserId: uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    trx.update(registrationRef, updatePayload);

    if (status === "rechazado") {
      rejectedGroupId = registration.groupId;
      rejectedTournamentId = registration.tournamentId;
    }
  });

  if (acceptedGroupId && acceptedTournamentId) {
    emitDomainEvent(DOMAIN_EVENTS.GROUP_ACCEPTED_INTO_TOURNAMENT, {
      groupId: acceptedGroupId,
      tournamentId: acceptedTournamentId,
      tournamentName: acceptedTournamentName,
    });
  }

  if (rejectedGroupId && rejectedTournamentId) {
    await createGroupTournamentRejectionAlert({
      groupId: rejectedGroupId,
      tournamentId: rejectedTournamentId,
      tournamentName: rejectedTournamentName,
    });
  }

  return { ok: true };
}

async function updateTournamentRegistrationPayment({ uid, registrationId, source = "registration" }) {
  if (typeof registrationId !== "string" || !registrationId.trim()) {
    throw new functions.https.HttpsError("invalid-argument", "registrationId inválido");
  }

  if (!["registration", "team"].includes(source)) {
    throw new functions.https.HttpsError("invalid-argument", "source inválido");
  }

  const sourceCollection = source === "team" ? "tournamentTeams" : "tournamentRegistrations";
  const registrationRef = db.collection(sourceCollection).doc(registrationId);

  const registrationSnap = await registrationRef.get();
  if (!registrationSnap.exists) {
    throw new functions.https.HttpsError("not-found", "La inscripción no existe");
  }

  const tournamentId = registrationSnap.get("tournamentId");
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError("not-found", "El torneo no existe");
  }
  const tournamentSnap = await db.collection("tournaments").doc(tournamentId).get();
  if (!tournamentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El torneo no existe");
  }

  assertTournamentAdmin(tournamentSnap.data(), uid);
  throw tournamentPaymentRetiredError();
}


async function notifyTournamentPlayerAdded({ tournamentId, userId }) {
  emitDomainEvent(DOMAIN_EVENTS.TOURNAMENT_PLAYER_ADDED, {
    tournamentId: String(tournamentId),
    userId: String(userId),
  });
}

async function notifyTournamentPlayerRemoved({ tournamentId, userId }) {
  emitDomainEvent(DOMAIN_EVENTS.TOURNAMENT_PLAYER_REMOVED, {
    tournamentId: String(tournamentId),
    userId: String(userId),
  });
}

module.exports = {
  requestTournamentRegistration,
  reviewTournamentRegistration,
  updateTournamentRegistrationPayment,
  notifyTournamentPlayerAdded,
  notifyTournamentPlayerRemoved,
};
