const functions = require("firebase-functions/v1");
const { db } = require("../firebase");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getKnockoutBracketSize } = require("./tournamentFixtureService");
const { buildDefaultAdvancementRules, validateMixedAdvancement } = require("./tournamentAdvancementService");

const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  OPEN: "inscripciones_abiertas",
  CLOSED: "inscripciones_cerradas",
  ACTIVE: "activo",
  FINISHED: "finalizado",
  CANCELLED: "cancelado",
};

const PHASE_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  PREVIEW: "preview",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
};

const PHASE_TYPES = {
  REGISTRATION: "registration",
  GROUP_STAGE: "group_stage",
  KNOCKOUT: "knockout",
  ROUND_ROBIN: "round_robin",
  FINAL: "final",
};

function isTournamentAdmin(tournament, uid) {
  return Array.isArray(tournament.adminIds) && tournament.adminIds.includes(uid);
}

function assertTournamentOwner(tournament, uid) {
  if (tournament.ownerAdminId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "Solo el admin owner puede gestionar administradores del torneo");
  }
}

function assertTournamentAdmin(tournament, uid) {
  if (!isTournamentAdmin(tournament, uid)) {
    throw new functions.https.HttpsError("permission-denied", "No tenés permisos para gestionar este torneo");
  }
}

function buildDefaultPhases(format, structure = {}) {
  const phases = [{ type: PHASE_TYPES.REGISTRATION, order: 0, config: {} }];

  if (format === "liga") {
    phases.push({
      type: PHASE_TYPES.ROUND_ROBIN,
      order: 1,
      config: {
        fixtureType: "round_robin",
        rounds: Number(structure.groupStage?.rounds || 1),
      },
    });
  }

  if (format === "eliminacion") {
    phases.push({
      type: PHASE_TYPES.KNOCKOUT,
      order: 1,
      config: {
        startFrom: structure.knockoutStage?.startFrom || "semi",
        bracketSize: getKnockoutBracketSize(structure.knockoutStage?.startFrom || "semi"),
        allowByes: false,
      },
    });
  }

  if (format === "mixto") {
    phases.push({
      type: PHASE_TYPES.GROUP_STAGE,
      order: 1,
      config: {
        groupCount: Number(structure.groupStage?.groupCount || 2),
        teamsPerGroup: null,
        ...buildDefaultAdvancementRules(structure),
        fixtureType: "round_robin",
        rounds: Number(structure.groupStage?.rounds || 1),
        groups: [],
      },
    });
    phases.push({
      type: PHASE_TYPES.KNOCKOUT,
      order: 2,
      config: {
        startFrom: structure.knockoutStage?.startFrom || "semi",
        bracketSize: getKnockoutBracketSize(structure.knockoutStage?.startFrom || "semi"),
        allowByes: false,
      },
    });
  }

  return phases;
}

function normalizePhases(data) {
  const rawPhases = Array.isArray(data.phases) && data.phases.length ? data.phases : buildDefaultPhases(data.format, data.structure || {});

  return rawPhases
    .map((phase, index) => {
      if (!phase || typeof phase !== "object") {
        throw new functions.https.HttpsError("invalid-argument", `phases[${index}] inválida`);
      }

      const type = typeof phase.type === "string" ? phase.type.trim() : "";
      const order = Number.isInteger(phase.order) ? phase.order : index;
      const config = phase.config && typeof phase.config === "object" ? phase.config : {};

      if (!Object.values(PHASE_TYPES).includes(type)) {
        throw new functions.https.HttpsError("invalid-argument", `phases[${index}].type inválido`);
      }

      return { type, order, config };
    })
    .sort((a, b) => a.order - b.order);
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
    adminIds,
  } = data;

  if (typeof name !== "string" || !name.trim()) throw new functions.https.HttpsError("invalid-argument", "name inválido");
  if (typeof description !== "string") throw new functions.https.HttpsError("invalid-argument", "description inválido");
  if (!["liga", "eliminacion", "mixto"].includes(format)) throw new functions.https.HttpsError("invalid-argument", "format inválido");
  if (typeof sport !== "string" || !sport.trim()) throw new functions.https.HttpsError("invalid-argument", "sport inválido");
  if (typeof maxTeams !== "number" || maxTeams <= 1) throw new functions.https.HttpsError("invalid-argument", "maxTeams inválido");
  if (typeof minTeams !== "number" || minTeams <= 1 || minTeams > maxTeams) throw new functions.https.HttpsError("invalid-argument", "minTeams inválido");
  if (typeof minPlayers !== "number" || minPlayers < 1) throw new functions.https.HttpsError("invalid-argument", "minPlayers inválido");
  if (typeof maxPlayers !== "number" || maxPlayers < minPlayers) throw new functions.https.HttpsError("invalid-argument", "maxPlayers inválido");
  if (typeof startDateMillis !== "number") throw new functions.https.HttpsError("invalid-argument", "Fecha de inicio inválida");
  if (typeof paymentForPlayer !== "number" || paymentForPlayer < 0) throw new functions.https.HttpsError("invalid-argument", "paymentForPlayer inválido");
  if (!rules || typeof rules !== "object") throw new functions.https.HttpsError("invalid-argument", "rules inválido");

  const numericRules = ["pointsWin", "pointsDraw", "pointsLose", "setsToWin"];
  for (const key of numericRules) {
    if (typeof rules[key] !== "number") throw new functions.https.HttpsError("invalid-argument", `rules.${key} inválido`);
  }

  const cleanAdminIds = Array.isArray(adminIds) ? [...new Set(adminIds.filter((id) => typeof id === "string" && id.trim()))] : [];
  const phases = normalizePhases(data);
  const phaseOrder = phases.map(({ type, order }) => ({ type, order }));
  const structure = {
    groupStage: {
      enabled: format !== "eliminacion",
      groupCount: format === "liga" ? 1 : Number(data.structure?.groupStage?.groupCount || 2),
      rounds: Number(data.structure?.groupStage?.rounds || 1),
      qualifyPerGroup: Number(data.structure?.groupStage?.qualifyPerGroup || 0),
      wildcardsCount: Number(data.structure?.groupStage?.wildcardsCount || 0),
      seedingCriteria: data.structure?.groupStage?.seedingCriteria || "points",
      crossGroupSeeding: data.structure?.groupStage?.crossGroupSeeding !== false,
      bracketMatchup: data.structure?.groupStage?.bracketMatchup || "standard_seeded",
    },
    knockoutStage: {
      enabled: format !== "liga",
      startFrom: data.structure?.knockoutStage?.startFrom || "semi",
      allowByes: false,
    },
  };

  if (format === "mixto") {
    validateMixedAdvancement({ structure, context: "crear el torneo mixto" });
  }

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
    ...(typeof data.endDateMillis === "number" ? { endDate: Timestamp.fromMillis(data.endDateMillis) } : {}),
    rules: {
      setsToWin: rules.setsToWin,
      pointsWin: rules.pointsWin,
      pointsDraw: rules.pointsDraw,
      pointsLose: rules.pointsLose,
    },
    settings: {
      minTeams,
      maxTeams,
      minPlayers,
      maxPlayers,
      paymentPerPlayer: paymentForPlayer,
      setsToWin: rules.setsToWin,
      pointsWin: rules.pointsWin,
      pointsDraw: rules.pointsDraw,
      pointsLose: rules.pointsLose,
    },
    structure,
    phaseOrder,
    phases,
    adminIds: cleanAdminIds,
  };
}

function validateTournamentUpdate(data) {
  const update = {};
  if (typeof data.name === "string" && data.name.trim()) update.name = data.name.trim();
  if (typeof data.description === "string") update.description = data.description.trim();
  if (typeof data.maxTeams === "number" && data.maxTeams > 1) update.maxTeams = data.maxTeams;
  if (typeof data.minTeams === "number" && data.minTeams > 1) update.minTeams = data.minTeams;
  if (typeof data.minPlayers === "number" && data.minPlayers >= 1) update.minPlayers = data.minPlayers;
  if (typeof data.maxPlayers === "number" && data.maxPlayers >= 1) update.maxPlayers = data.maxPlayers;
  if (typeof data.paymentForPlayer === "number" && data.paymentForPlayer >= 0) update.paymentForPlayer = data.paymentForPlayer;
  if (typeof data.startDateMillis === "number") update.startDate = Timestamp.fromMillis(data.startDateMillis);
  if (typeof data.endDateMillis === "number") update.endDate = Timestamp.fromMillis(data.endDateMillis);
  if (typeof data.format === "string") update.format = data.format;
  if (data.rules && typeof data.rules === "object") update.rules = Object.fromEntries(Object.entries(data.rules).filter(([, v]) => typeof v === "number"));
  if (data.structure && typeof data.structure === "object") update.structure = data.structure;
  if (Array.isArray(data.phases) && data.phases.length) {
    const phases = normalizePhases(data);
    update.phaseOrder = phases.map(({ type, order }) => ({ type, order }));
    update.phaseDefinitions = phases;
  }
  return update;
}

function restrictUpdateByStatus(status, updatePayload) {
  if (status === TOURNAMENT_STATUS.DRAFT) {
    return updatePayload;
  }

  if (status === TOURNAMENT_STATUS.OPEN) {
    const next = {};
    if (typeof updatePayload.maxTeams === "number") next.maxTeams = updatePayload.maxTeams;
    if (typeof updatePayload.minPlayers === "number") next.minPlayers = updatePayload.minPlayers;
    if (typeof updatePayload.maxPlayers === "number") next.maxPlayers = updatePayload.maxPlayers;
    if (typeof updatePayload.paymentForPlayer === "number") next.paymentForPlayer = updatePayload.paymentForPlayer;
    if (updatePayload.startDate) next.startDate = updatePayload.startDate;
    if (updatePayload.rules?.setsToWin != null) next.rules = { setsToWin: updatePayload.rules.setsToWin };
    if (updatePayload.structure) next.structure = updatePayload.structure;
    return next;
  }

  if (status === TOURNAMENT_STATUS.CLOSED) {
    const next = {};
    if (updatePayload.startDate) next.startDate = updatePayload.startDate;
    if (typeof updatePayload.minPlayers === "number") next.minPlayers = updatePayload.minPlayers;
    if (typeof updatePayload.maxPlayers === "number") next.maxPlayers = updatePayload.maxPlayers;
    if (typeof updatePayload.paymentForPlayer === "number") next.paymentForPlayer = updatePayload.paymentForPlayer;
    return next;
  }

  return {};
}

async function createTournament({ data, uid }) {
  const payload = validateTournamentPayload(data);
  const docRef = db.collection("tournaments").doc();
  const now = FieldValue.serverTimestamp();
  const adminIds = [...new Set([uid, ...payload.adminIds])];
  const phaseRefs = payload.phases.map(() => db.collection("tournamentPhases").doc());
  const registrationPhaseIndex = payload.phases.findIndex((phase) => phase.type === PHASE_TYPES.REGISTRATION);
  const registrationPhaseRef = phaseRefs[registrationPhaseIndex >= 0 ? registrationPhaseIndex : 0];

  const tournament = {
    name: payload.name,
    description: payload.description,
    sport: payload.sport,
    format: payload.format,
    status: TOURNAMENT_STATUS.DRAFT,
    ownerAdminId: uid,
    adminIds,
    createdByAdminIds: adminIds,
    updatedBy: uid,
    acceptedTeamsCount: 0,
    podiumTeamIds: null,
    startDate: payload.startDate,
    ...(payload.endDate ? { endDate: payload.endDate } : {}),
    rules: payload.rules,
    settings: payload.settings,
    structure: payload.structure,
    minTeams: payload.minTeams,
    maxTeams: payload.maxTeams,
    minPlayers: payload.minPlayers,
    maxPlayers: payload.maxPlayers,
    paymentForPlayer: payload.paymentForPlayer,
    phaseOrder: payload.phaseOrder,
    currentPhaseType: payload.phaseOrder[registrationPhaseIndex >= 0 ? registrationPhaseIndex : 0]?.type || PHASE_TYPES.REGISTRATION,
    currentPhaseId: registrationPhaseRef.id,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(docRef, tournament);
  payload.phases.forEach((phase, index) => {
    batch.set(phaseRefs[index], {
      tournamentId: docRef.id,
      type: phase.type,
      order: phase.order,
      status: phase.type === PHASE_TYPES.REGISTRATION ? PHASE_STATUS.ACTIVE : PHASE_STATUS.PENDING,
      config: phase.config || {},
      confirmedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  if (payload.format === "mixto") {
    const groupPhase = payload.phases.find((phase) => phase.type === PHASE_TYPES.GROUP_STAGE);
    const knockoutPhase = payload.phases.find((phase) => phase.type === PHASE_TYPES.KNOCKOUT);
    if (groupPhase && knockoutPhase) {
      const rulesRef = db.collection("tournamentAdvancementRules").doc(`${docRef.id}_${groupPhase.type}_${knockoutPhase.type}`);
      const advancementRules = buildDefaultAdvancementRules(payload.structure || {});
      batch.set(rulesRef, {
        tournamentId: docRef.id,
        fromPhaseType: groupPhase.type,
        toPhaseType: knockoutPhase.type,
        rules: {
          ...advancementRules,
          qualifyPositions: advancementRules.qualifyPositions,
          seedingCriteria: advancementRules.seedingCriteria,
          tiebreakers: advancementRules.tiebreakers,
          crossGroupSeeding: advancementRules.crossGroupSeeding,
          bracketMatchup: advancementRules.bracketMatchup,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  return { tournamentId: docRef.id, currentPhaseId: registrationPhaseRef.id };
}

async function editTournament({ uid, tournamentId, data }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const updatePayload = validateTournamentUpdate(data);
  if (!Object.keys(updatePayload).length) throw new functions.https.HttpsError("invalid-argument", "No hay datos válidos para actualizar");

  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);

    if (![TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.OPEN, TOURNAMENT_STATUS.CLOSED].includes(tournament.status)) {
      throw new functions.https.HttpsError("failed-precondition", "El torneo no se puede editar en su estado actual");
    }

    const restrictedPayload = restrictUpdateByStatus(tournament.status, updatePayload);
    if (!Object.keys(restrictedPayload).length) {
      throw new functions.https.HttpsError("failed-precondition", "No hay campos editables para el estado actual del torneo");
    }

    const nextPayload = { ...restrictedPayload, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() };
    if (restrictedPayload.minTeams || restrictedPayload.maxTeams || restrictedPayload.minPlayers || restrictedPayload.maxPlayers || restrictedPayload.paymentForPlayer || restrictedPayload.rules) {
      nextPayload.settings = {
        ...(tournament.settings || {}),
        ...(typeof restrictedPayload.minTeams === "number" ? { minTeams: restrictedPayload.minTeams } : {}),
        ...(typeof restrictedPayload.maxTeams === "number" ? { maxTeams: restrictedPayload.maxTeams } : {}),
        ...(typeof restrictedPayload.minPlayers === "number" ? { minPlayers: restrictedPayload.minPlayers } : {}),
        ...(typeof restrictedPayload.maxPlayers === "number" ? { maxPlayers: restrictedPayload.maxPlayers } : {}),
        ...(typeof restrictedPayload.paymentForPlayer === "number" ? { paymentPerPlayer: restrictedPayload.paymentForPlayer } : {}),
        ...(restrictedPayload.rules || {}),
      };
    }

    if (restrictedPayload.structure) {
      const currentStructure = tournament.structure || {};
      const nextFormat = restrictedPayload.format || tournament.format;
      nextPayload.structure = {
        groupStage: {
          ...(currentStructure.groupStage || {}),
          ...(restrictedPayload.structure.groupStage || {}),
          enabled: nextFormat !== "eliminacion",
          groupCount: nextFormat === "liga"
            ? 1
            : Number(restrictedPayload.structure.groupStage?.groupCount || currentStructure.groupStage?.groupCount || 2),
          rounds: Number(restrictedPayload.structure.groupStage?.rounds || currentStructure.groupStage?.rounds || 1),
          qualifyPerGroup: Number(restrictedPayload.structure.groupStage?.qualifyPerGroup || currentStructure.groupStage?.qualifyPerGroup || 0),
          wildcardsCount: Number(restrictedPayload.structure.groupStage?.wildcardsCount || currentStructure.groupStage?.wildcardsCount || 0),
          seedingCriteria: restrictedPayload.structure.groupStage?.seedingCriteria || currentStructure.groupStage?.seedingCriteria || "points",
          crossGroupSeeding: restrictedPayload.structure.groupStage?.crossGroupSeeding ?? currentStructure.groupStage?.crossGroupSeeding ?? true,
          bracketMatchup: restrictedPayload.structure.groupStage?.bracketMatchup || currentStructure.groupStage?.bracketMatchup || "standard_seeded",
        },
        knockoutStage: {
          ...(currentStructure.knockoutStage || {}),
          ...(restrictedPayload.structure.knockoutStage || {}),
          enabled: nextFormat !== "liga",
          startFrom: restrictedPayload.structure.knockoutStage?.startFrom || currentStructure.knockoutStage?.startFrom || "semi",
          allowByes: false,
        },
      };
    }

    if ((restrictedPayload.structure || restrictedPayload.format) && (restrictedPayload.format || tournament.format) === "mixto") {
      validateMixedAdvancement({ structure: nextPayload.structure || tournament.structure || {}, context: "editar el torneo mixto" });
    }

    if (!restrictedPayload.phaseDefinitions && (restrictedPayload.structure || restrictedPayload.format)) {
      const derivedPhases = buildDefaultPhases(restrictedPayload.format || tournament.format, nextPayload.structure || tournament.structure || {});
      nextPayload.phaseDefinitions = derivedPhases;
      nextPayload.phaseOrder = derivedPhases.map(({ type, order }) => ({ type, order }));
    }

    if (restrictedPayload.phaseDefinitions) {
      const phaseSnap = await trx.get(db.collection("tournamentPhases").where("tournamentId", "==", tournamentId));
      const phasesByType = new Map(phaseSnap.docs.map((doc) => [doc.data().type, { id: doc.id, ...doc.data() }]));
      for (const phase of updatePayload.phaseDefinitions) {
        const existing = phasesByType.get(phase.type);
        if (!existing) continue;
        if (existing.status !== PHASE_STATUS.PENDING) {
          throw new functions.https.HttpsError("failed-precondition", `La fase ${phase.type} ya no se puede editar`);
        }
        trx.update(db.collection("tournamentPhases").doc(existing.id), { config: phase.config || {}, order: phase.order, updatedAt: FieldValue.serverTimestamp() });
      }
      delete nextPayload.phaseDefinitions;
    }

    if ((restrictedPayload.format || tournament.format) === "mixto") {
      const groupPhase = (nextPayload.phaseDefinitions || buildDefaultPhases(restrictedPayload.format || tournament.format, nextPayload.structure || tournament.structure || {})).find((phase) => phase.type === PHASE_TYPES.GROUP_STAGE);
      const knockoutPhase = (nextPayload.phaseDefinitions || buildDefaultPhases(restrictedPayload.format || tournament.format, nextPayload.structure || tournament.structure || {})).find((phase) => phase.type === PHASE_TYPES.KNOCKOUT);
      if (groupPhase && knockoutPhase) {
        const rulesRef = db.collection("tournamentAdvancementRules").doc(`${tournamentId}_${groupPhase.type}_${knockoutPhase.type}`);
        const advancementRules = buildDefaultAdvancementRules(nextPayload.structure || tournament.structure || {});
        trx.set(rulesRef, {
          tournamentId,
          fromPhaseType: groupPhase.type,
          toPhaseType: knockoutPhase.type,
          rules: {
            ...advancementRules,
            qualifyPositions: advancementRules.qualifyPositions,
            seedingCriteria: advancementRules.seedingCriteria,
            tiebreakers: advancementRules.tiebreakers,
            crossGroupSeeding: advancementRules.crossGroupSeeding,
            bracketMatchup: advancementRules.bracketMatchup,
          },
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    trx.update(tournamentRef, nextPayload);
  });

  return { ok: true };
}

async function addTournamentAdmin({ uid, tournamentId, adminUserId }) { /* unchanged body below */
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  if (typeof adminUserId !== "string" || !adminUserId) throw new functions.https.HttpsError("invalid-argument", "adminUserId inválido");
  const targetUserSnap = await db.collection("users").doc(adminUserId).get();
  if (!targetUserSnap.exists || targetUserSnap.data().roles !== "admin") throw new functions.https.HttpsError("failed-precondition", "El usuario a agregar no es admin");
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const tournament = tournamentSnap.data();
    assertTournamentOwner(tournament, uid);
    const currentAdminIds = Array.isArray(tournament.adminIds) ? tournament.adminIds : [];
    if (currentAdminIds.includes(adminUserId)) throw new functions.https.HttpsError("already-exists", "El admin ya está asignado al torneo");
    trx.update(tournamentRef, { adminIds: [...currentAdminIds, adminUserId], updatedBy: uid, updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
}

async function getRegistrationPhaseDoc(trx, tournamentId) {
  const phaseQuery = db.collection("tournamentPhases").where("tournamentId", "==", tournamentId).where("type", "==", PHASE_TYPES.REGISTRATION).limit(1);
  const phaseSnap = await trx.get(phaseQuery);
  return phaseSnap.empty ? null : phaseSnap.docs[0];
}

function syncRegistrationPhaseStatus(trx, registrationPhaseDoc, nextStatus) {
  if (!registrationPhaseDoc) return;
  trx.update(registrationPhaseDoc.ref, { status: nextStatus, updatedAt: FieldValue.serverTimestamp(), ...(nextStatus === PHASE_STATUS.COMPLETED ? { completedAt: FieldValue.serverTimestamp() } : {}) });
}

async function openTournamentRegistrations({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const registrationPhaseDoc = await getRegistrationPhaseDoc(trx, tournamentId);
    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);
    if (tournament.status !== TOURNAMENT_STATUS.DRAFT) throw new functions.https.HttpsError("failed-precondition", "Solo se pueden abrir inscripciones desde estado draft");
    trx.update(tournamentRef, { status: TOURNAMENT_STATUS.OPEN, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() });
    syncRegistrationPhaseStatus(trx, registrationPhaseDoc, PHASE_STATUS.ACTIVE);
  });
  return { ok: true };
}

async function closeTournamentRegistrations({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const phasesSnap = await trx.get(db.collection("tournamentPhases").where("tournamentId", "==", tournamentId));
    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);
    if (tournament.status !== TOURNAMENT_STATUS.OPEN) throw new functions.https.HttpsError("failed-precondition", "Solo se pueden cerrar inscripciones desde estado inscripciones_abiertas");
    const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
    const minTeams = Number(tournament.settings?.minTeams || tournament.minTeams || 0);
    const maxTeams = Number(tournament.settings?.maxTeams || tournament.maxTeams || 0);
    if (acceptedTeamsCount < minTeams || acceptedTeamsCount > maxTeams) throw new functions.https.HttpsError("failed-precondition", "El torneo debe tener una cantidad de equipos aceptados entre minTeams y maxTeams");

    const phases = phasesSnap.docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() })).sort((a, b) => a.order - b.order);
    const registrationPhaseDoc = phasesSnap.docs.find((doc) => doc.data().type === PHASE_TYPES.REGISTRATION) || null;
    const nextPhase = phases.find((phase) => phase.type !== PHASE_TYPES.REGISTRATION);

    trx.update(tournamentRef, {
      status: TOURNAMENT_STATUS.CLOSED,
      ...(nextPhase ? { currentPhaseId: nextPhase.id, currentPhaseType: nextPhase.type } : {}),
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    syncRegistrationPhaseStatus(trx, registrationPhaseDoc, PHASE_STATUS.COMPLETED);
    if (nextPhase) {
      trx.update(nextPhase.ref, { status: PHASE_STATUS.ACTIVE, updatedAt: FieldValue.serverTimestamp() });
    }
  });
  return { ok: true };
}

async function startTournament({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);
    if (tournament.status !== TOURNAMENT_STATUS.CLOSED) throw new functions.https.HttpsError("failed-precondition", "Solo se puede iniciar un torneo con inscripciones cerradas");

    const phaseId = typeof tournament.currentPhaseId === "string" ? tournament.currentPhaseId : "";
    if (!phaseId) throw new functions.https.HttpsError("failed-precondition", "El torneo no tiene fase activa");
    const fixtureSnap = await trx.get(db.collection("tournamentMatches").where("phaseId", "==", phaseId).limit(1));
    if (fixtureSnap.empty) throw new functions.https.HttpsError("failed-precondition", "Primero debés confirmar el fixture para iniciar el torneo");

    trx.update(tournamentRef, {
      status: TOURNAMENT_STATUS.ACTIVE,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
}

async function finalizeTournament({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);
    if (tournament.status !== TOURNAMENT_STATUS.ACTIVE) throw new functions.https.HttpsError("failed-precondition", "Solo se puede finalizar un torneo activo");

    const matchesSnap = await trx.get(db.collection("tournamentMatches").where("tournamentId", "==", tournamentId));
    if (matchesSnap.empty) throw new functions.https.HttpsError("failed-precondition", "No hay partidos para finalizar el torneo");
    const allCompleted = matchesSnap.docs.every((matchDoc) => matchDoc.data().status === "completed");
    if (!allCompleted) throw new functions.https.HttpsError("failed-precondition", "Debés cargar resultados en todos los partidos antes de finalizar");

    const standingsRef = db.collection("tournamentStandings");
    const currentPhaseId = typeof tournament.currentPhaseId === "string" ? tournament.currentPhaseId : "";
    const currentPhaseStandingsSnap = currentPhaseId
      ? await trx.get(standingsRef.where("tournamentId", "==", tournamentId).where("phaseId", "==", currentPhaseId))
      : null;
    const standingsSnap = currentPhaseStandingsSnap && !currentPhaseStandingsSnap.empty
      ? currentPhaseStandingsSnap
      : await trx.get(standingsRef.where("tournamentId", "==", tournamentId));

    const orderedStandings = standingsSnap.docs
      .map((standingDoc) => {
        const standing = standingDoc.data();
        return {
          teamId: typeof standing.teamId === "string" ? standing.teamId : "",
          position: Number(standing.position || 0),
          points: Number(standing?.stats?.points || 0),
        };
      })
      .filter((standing) => standing.teamId && standing.position > 0)
      .sort((a, b) => a.position - b.position || b.points - a.points);

    const podiumTeamIds = Array.from(new Set(orderedStandings.map((standing) => standing.teamId))).slice(0, 3);

    trx.update(tournamentRef, {
      status: TOURNAMENT_STATUS.FINISHED,
      podiumTeamIds: podiumTeamIds.length > 0 ? podiumTeamIds : null,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
}

async function removeTournamentAdmin({ uid, tournamentId, adminUserId }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  if (typeof adminUserId !== "string" || !adminUserId) throw new functions.https.HttpsError("invalid-argument", "adminUserId inválido");

  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const tournament = tournamentSnap.data();
    assertTournamentOwner(tournament, uid);

    if (adminUserId === tournament.ownerAdminId) {
      throw new functions.https.HttpsError("failed-precondition", "No se puede eliminar al admin principal");
    }

    const currentAdminIds = Array.isArray(tournament.adminIds) ? tournament.adminIds : [];
    if (!currentAdminIds.includes(adminUserId)) {
      throw new functions.https.HttpsError("not-found", "El usuario no es admin del torneo");
    }

    const nextAdminIds = currentAdminIds.filter((id) => id !== adminUserId);
    trx.update(tournamentRef, {
      adminIds: nextAdminIds,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
}

async function cancelTournament({ uid, tournamentId }) {
  if (typeof tournamentId !== "string" || !tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  await db.runTransaction(async (trx) => {
    const tournamentSnap = await trx.get(tournamentRef);
    if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
    const tournament = tournamentSnap.data();
    assertTournamentAdmin(tournament, uid);
    if ([TOURNAMENT_STATUS.CANCELLED, TOURNAMENT_STATUS.FINISHED].includes(tournament.status)) {
      throw new functions.https.HttpsError("failed-precondition", "El torneo ya está cerrado definitivamente");
    }

    trx.update(tournamentRef, {
      status: TOURNAMENT_STATUS.CANCELLED,
      updatedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
}

module.exports = {
  TOURNAMENT_STATUS,
  PHASE_STATUS,
  PHASE_TYPES,
  assertTournamentAdmin,
  assertTournamentOwner,
  createTournament,
  addTournamentAdmin,
  removeTournamentAdmin,
  openTournamentRegistrations,
  closeTournamentRegistrations,
  startTournament,
  finalizeTournament,
  cancelTournament,
  editTournament,
};
