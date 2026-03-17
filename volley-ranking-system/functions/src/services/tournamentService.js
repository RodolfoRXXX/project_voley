

const functions = require("firebase-functions/v1");
const { db } = require("../firebase");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  OPEN: "inscripciones_abiertas",
  CLOSED: "inscripciones_cerradas",
  ACTIVE: "activo",
  FINISHED: "finalizado",
  CANCELLED: "cancelado",
};

function isTournamentAdmin(tournament, uid) {
  return Array.isArray(tournament.adminIds) && tournament.adminIds.includes(uid);
}

function assertTournamentOwner(tournament, uid) {
  if (tournament.ownerAdminId !== uid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo el admin owner puede gestionar administradores del torneo"
    );
  }
}

function assertTournamentAdmin(tournament, uid) {
  if (!isTournamentAdmin(tournament, uid)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "No tenés permisos para gestionar este torneo"
    );
  }
}

function validateTournamentPayload(data) {
  const {
    name,
    description,
    sport = "voley",
    format,
    maxTeams,
    minTeams,
    minPlayers,
    maxPlayers,
    startDateMillis,
    paymentForPlayer,
    rules,
    structure,
    adminIds,
  } = data;

  if (typeof name !== "string" || !name.trim()) {
    throw new functions.https.HttpsError("invalid-argument", "name inválido");
  }

  if (typeof description !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "description inválido");
  }

  if (!["liga", "eliminacion", "mixto"].includes(format)) {
    throw new functions.https.HttpsError("invalid-argument", "format inválido");
  }

  if (typeof sport !== "string" || !sport.trim()) {
    throw new functions.https.HttpsError("invalid-argument", "sport inválido");
  }

  if (typeof maxTeams !== "number" || maxTeams <= 1) {
    throw new functions.https.HttpsError("invalid-argument", "maxTeams inválido");
  }

  if (typeof minTeams !== "number" || minTeams <= 1 || minTeams > maxTeams) {
    throw new functions.https.HttpsError("invalid-argument", "minTeams inválido");
  }

  if (typeof minPlayers !== "number" || minPlayers < 1) {
    throw new functions.https.HttpsError("invalid-argument", "minPlayers inválido");
  }

  if (
    typeof maxPlayers !== "number" ||
    maxPlayers < 1 ||
    maxPlayers < minPlayers
  ) {
    throw new functions.https.HttpsError("invalid-argument", "maxPlayers inválido");
  }

  if (typeof startDateMillis !== "number") {
    throw new functions.https.HttpsError("invalid-argument", "Fecha de inicio inválida");
  }

  if (typeof paymentForPlayer !== "number" || paymentForPlayer < 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "paymentForPlayer inválido"
    );
  }

  if (!rules || typeof rules !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "rules inválido");
  }

  const numericRules = ["pointsWin", "pointsDraw", "pointsLose", "setsToWin"];

  for (const key of numericRules) {
    if (typeof rules[key] !== "number") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `rules.${key} inválido`
      );
    }
  }

  if (!structure || typeof structure !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "structure inválido");
  }

  const groupStage = structure.groupStage || {};
  const knockoutStage = structure.knockoutStage || {};

  if (typeof groupStage.enabled !== "boolean") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "structure.groupStage.enabled inválido"
    );
  }

  if (groupStage.enabled) {
    if (typeof groupStage.groupCount !== "number" || groupStage.groupCount < 1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "groupCount inválido"
      );
    }

    if (typeof groupStage.rounds !== "number" || groupStage.rounds < 1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "rounds inválido"
      );
    }
  }

  if (typeof knockoutStage.enabled !== "boolean") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "structure.knockoutStage.enabled inválido"
    );
  }

  const validKnockoutStarts = ["octavos", "cuartos", "semi", "final"];

  if (
    knockoutStage.enabled &&
    !validKnockoutStarts.includes(knockoutStage.startFrom)
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "startFrom inválido"
    );
  }

  const cleanAdminIds = Array.isArray(adminIds)
    ? [...new Set(adminIds.filter((id) => typeof id === "string" && id.trim()))]
    : [];

  return {
    name: name.trim(),
    description: description.trim(),
    sport: sport.trim(),
    format,
    maxTeams,
    minTeams,
    minPlayers,
    maxPlayers,
    paymentForPlayer,
    startDate: Timestamp.fromMillis(startDateMillis),

    ...(typeof data.endDateMillis === "number"
      ? { endDate: Timestamp.fromMillis(data.endDateMillis) }
      : {}),

    rules: {
      setsToWin: rules.setsToWin,
      pointsWin: rules.pointsWin,
      pointsDraw: rules.pointsDraw,
      pointsLose: rules.pointsLose,
    },

    structure: {
      groupStage: {
        enabled: groupStage.enabled,
        ...(groupStage.enabled
          ? {
              groupCount: groupStage.groupCount,
              rounds: groupStage.rounds,
            }
          : {}),
      },
      knockoutStage: {
        enabled: knockoutStage.enabled,
        ...(knockoutStage.enabled
          ? { startFrom: knockoutStage.startFrom }
          : {}),
      },
    },

    adminIds: cleanAdminIds,
  };
}

function validateTournamentUpdate(data) {
  const update = {};

  const validFormats = ["liga", "eliminacion", "mixto"];
  const validKnockoutStarts = ["octavos", "cuartos", "semi", "final"];

  if (typeof data.name === "string" && data.name.trim()) {
    update.name = data.name.trim();
  }

  if (typeof data.description === "string") {
    update.description = data.description.trim();
  }

  if (typeof data.maxTeams === "number" && data.maxTeams > 1) {
    update.maxTeams = data.maxTeams;
  }

  if (typeof data.minTeams === "number" && data.minTeams > 1) {
    update.minTeams = data.minTeams;
  }

  if (typeof data.minPlayers === "number" && data.minPlayers >= 1) {
    update.minPlayers = data.minPlayers;
  }

  if (typeof data.maxPlayers === "number" && data.maxPlayers >= 1) {
    update.maxPlayers = data.maxPlayers;
  }

  if (
    typeof update.maxTeams === "number" &&
    typeof update.minTeams === "number" &&
    update.minTeams > update.maxTeams
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "minTeams no puede ser mayor que maxTeams"
    );
  }

  if (
    typeof update.maxPlayers === "number" &&
    typeof update.minPlayers === "number" &&
    update.minPlayers > update.maxPlayers
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "minPlayers no puede ser mayor que maxPlayers"
    );
  }

  if (typeof data.paymentForPlayer === "number" && data.paymentForPlayer >= 0) {
    update.paymentForPlayer = data.paymentForPlayer;
  }

  if (typeof data.format === "string") {
    if (!validFormats.includes(data.format)) {
      throw new functions.https.HttpsError("invalid-argument", "format inválido");
    }

    update.format = data.format;
  }

  if (typeof data.startDateMillis === "number") {
    update.startDate = Timestamp.fromMillis(data.startDateMillis);
  }

  if (typeof data.endDateMillis === "number") {
    update.endDate = Timestamp.fromMillis(data.endDateMillis);
  }

  if (data.rules && typeof data.rules === "object") {
    const rules = data.rules;

    const nextRules = {};

    if (typeof rules.pointsWin === "number") nextRules.pointsWin = rules.pointsWin;
    if (typeof rules.pointsDraw === "number") nextRules.pointsDraw = rules.pointsDraw;
    if (typeof rules.pointsLose === "number") nextRules.pointsLose = rules.pointsLose;
    if (typeof rules.setsToWin === "number") nextRules.setsToWin = rules.setsToWin;

    if (Object.keys(nextRules).length) {
      update.rules = nextRules;
    }
  }

  if (data.structure && typeof data.structure === "object") {
    const groupStage = data.structure.groupStage || {};
    const knockoutStage = data.structure.knockoutStage || {};

    if (typeof groupStage.enabled !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "structure.groupStage.enabled inválido"
      );
    }

    if (groupStage.enabled) {
      if (typeof groupStage.groupCount !== "number" || groupStage.groupCount < 1) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "groupCount inválido"
        );
      }

      if (typeof groupStage.rounds !== "number" || groupStage.rounds < 1) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "rounds inválido"
        );
      }
    }

    if (typeof knockoutStage.enabled !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "structure.knockoutStage.enabled inválido"
      );
    }

    if (
      knockoutStage.enabled &&
      !validKnockoutStarts.includes(knockoutStage.startFrom)
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "startFrom inválido"
      );
    }

    update.structure = {
      groupStage: {
        enabled: groupStage.enabled,
        ...(groupStage.enabled
          ? {
              groupCount: groupStage.groupCount,
              rounds: groupStage.rounds,
            }
          : {}),
      },
      knockoutStage: {
        enabled: knockoutStage.enabled,
        ...(knockoutStage.enabled
          ? { startFrom: knockoutStage.startFrom }
          : {}),
      },
    };
  }

  return update;
}

async function createTournament({ data, uid }) {
  const payload = validateTournamentPayload(data);

  const now = FieldValue.serverTimestamp();
  const docRef = db.collection("tournaments").doc();

  const adminIds = [...new Set([uid, ...payload.adminIds])];

  const tournament = {
    ...payload,
    status: TOURNAMENT_STATUS.DRAFT,
    ownerAdminId: uid,
    adminIds,
    createdByAdminIds: adminIds,
    updatedBy: uid,
    acceptedTeamsCount: 0,
    podiumTeamIds: null,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(tournament);

  return { tournamentId: docRef.id };
}

async function editTournament({ uid, tournamentId, data }) {
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "tournamentId inválido"
    );
  }

  const updatePayload = validateTournamentUpdate(data);

  if (!Object.keys(updatePayload).length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "No hay datos válidos para actualizar"
    );
  }

  const tournamentRef = db.collection("tournaments").doc(tournamentId);

  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);

    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "El torneo no existe"
      );
    }

    const tournament = tournamentSnap.data();

    assertTournamentAdmin(tournament, uid);

    const editableStatuses = [
      TOURNAMENT_STATUS.DRAFT,
      TOURNAMENT_STATUS.OPEN,
      TOURNAMENT_STATUS.ACTIVE,
    ];

    if (!editableStatuses.includes(tournament.status)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El torneo no se puede editar en su estado actual"
      );
    }

    if (tournament.status === TOURNAMENT_STATUS.ACTIVE) {
      const allowedFields = [
        "paymentForPlayer",
        "minTeams",
        "maxTeams",
        "maxPlayers",
        "rules",
        "structure",
      ];

      const invalidFields = Object.keys(updatePayload).filter(
        (field) => !allowedFields.includes(field)
      );

      if (invalidFields.length) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "En estado activo solo se pueden editar configuración de pagos, cupos y estructura de juego"
        );
      }
    }

    const nextMinPlayers =
      typeof updatePayload.minPlayers === "number"
        ? updatePayload.minPlayers
        : Number(tournament.minPlayers || 1);

    const nextMaxPlayers =
      typeof updatePayload.maxPlayers === "number"
        ? updatePayload.maxPlayers
        : Number(tournament.maxPlayers || 1);

    if (nextMinPlayers > nextMaxPlayers) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "minPlayers no puede ser mayor que maxPlayers"
      );
    }

    trx.update(tournamentRef, {
      ...updatePayload,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
}

async function addTournamentAdmin({ uid, tournamentId, adminUserId }) {
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  if (typeof adminUserId !== "string" || !adminUserId) {
    throw new functions.https.HttpsError("invalid-argument", "adminUserId inválido");
  }

  const targetUserSnap = await db.collection("users").doc(adminUserId).get();
  if (!targetUserSnap.exists || targetUserSnap.data().roles !== "admin") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El usuario a agregar no es admin"
    );
  }

  const tournamentRef = db.collection("tournaments").doc(tournamentId);

  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El torneo no existe");
    }

    const tournament = tournamentSnap.data();
    assertTournamentOwner(tournament, uid);

    const currentAdminIds = Array.isArray(tournament.adminIds) ? tournament.adminIds : [];
    if (currentAdminIds.includes(adminUserId)) {
      throw new functions.https.HttpsError("already-exists", "El admin ya está asignado al torneo");
    }

    const nextAdminIds = [...currentAdminIds, adminUserId];

    trx.update(tournamentRef, {
      adminIds: nextAdminIds,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
}

async function openTournamentRegistrations({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  const tournamentRef = db.collection("tournaments").doc(tournamentId);

  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El torneo no existe");
    }

    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);

    if (tournament.status !== TOURNAMENT_STATUS.DRAFT) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Solo se pueden abrir inscripciones desde estado draft"
      );
    }

    trx.update(tournamentRef, {
      status: TOURNAMENT_STATUS.OPEN,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
}


async function closeTournamentRegistrations({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  const tournamentRef = db.collection("tournaments").doc(tournamentId);

  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El torneo no existe");
    }

    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);

    if (tournament.status !== TOURNAMENT_STATUS.OPEN) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Solo se pueden cerrar inscripciones desde estado inscripciones_abiertas"
      );
    }

    const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
    const minTeams = Number(tournament.minTeams || 0);
    const maxTeams = Number(tournament.maxTeams || 0);

    if (acceptedTeamsCount < minTeams || acceptedTeamsCount > maxTeams) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El torneo debe tener una cantidad de equipos aceptados entre minTeams y maxTeams"
      );
    }

    trx.update(tournamentRef, {
      status: TOURNAMENT_STATUS.CLOSED,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
}

module.exports = {
  TOURNAMENT_STATUS,
  assertTournamentAdmin,
  assertTournamentOwner,
  createTournament,
  addTournamentAdmin,
  openTournamentRegistrations,
  closeTournamentRegistrations,
  editTournament,
};
