const functions = require("firebase-functions/v1");
const { db, admin } = require("../firebase");

const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  OPEN: "inscripciones_abiertas",
  ACTIVE: "activo",
  FINISHED: "finalizado",
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
    startDateMillis,
    endDateMillis,
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

  if (typeof startDateMillis !== "number" || typeof endDateMillis !== "number") {
    throw new functions.https.HttpsError("invalid-argument", "Fechas inválidas");
  }

  if (startDateMillis >= endDateMillis) {
    throw new functions.https.HttpsError("invalid-argument", "startDate debe ser menor a endDate");
  }

  if (!rules || typeof rules !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "rules inválido");
  }

  const numericRules = ["pointsWin", "pointsDraw", "pointsLose", "setsToWin"];
  for (const key of numericRules) {
    if (typeof rules[key] !== "number") {
      throw new functions.https.HttpsError("invalid-argument", `rules.${key} inválido`);
    }
  }

  if (typeof rules.allowDraws !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "rules.allowDraws inválido");
  }

  if (!structure || typeof structure !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "structure inválido");
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
    startDate: admin.firestore.Timestamp.fromMillis(startDateMillis),
    endDate: admin.firestore.Timestamp.fromMillis(endDateMillis),
    rules,
    structure,
    adminIds: cleanAdminIds,
  };
}

async function createTournament({ data, uid }) {
  const payload = validateTournamentPayload(data);
  const now = admin.firestore.FieldValue.serverTimestamp();
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
};
