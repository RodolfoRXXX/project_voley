const functions = require("firebase-functions/v1");
const { MAIL_AND_PUSH_SECRETS } = require("../src/config/functionSecrets");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin, PHASE_STATUS, PHASE_TYPES } = require("../src/services/tournamentService");
const { buildStandingsDoc, getTournamentAndPhase } = require("../src/services/tournamentPhaseService");
const { getKnockoutConfig } = require("../src/services/tournamentFixtureService");
const { emitDomainEvent } = require("../src/events/domainEventBus");
const { DOMAIN_EVENTS } = require("../src/events/domainEvents");

function isNullableTeamId(teamId) {
  return teamId == null || typeof teamId === "string";
}

function isValidMatch(match) {
  return match
    && typeof match === "object"
    && typeof match.id === "string"
    && typeof match.phaseId === "string"
    && typeof match.phaseType === "string"
    && isNullableTeamId(match.homeTeamId)
    && isNullableTeamId(match.awayTeamId)
    && (match.homeTeamId == null || match.awayTeamId == null || match.homeTeamId !== match.awayTeamId);
}

function buildFixtureSummary(matches = []) {
  const isKnockout = matches.some((match) => typeof match.roundLabel === "string");
  if (isKnockout) {
    const roundLabels = [...new Set(matches.map((match) => match.roundLabel).filter(Boolean))];
    return {
      generated: matches.length > 0,
      generationMode: "full_bracket",
      totalRounds: roundLabels.length,
      totalMatchdays: 0,
      roundLabels,
      matchesCount: matches.length,
    };
  }

  const roundCycles = new Set();
  const matchdays = new Set();

  matches.forEach((match) => {
    const roundCycle = Number(match.roundCycle || 1);
    const matchdayNumber = Number(match.matchdayNumber || match.round || 0);
    if (roundCycle > 0) roundCycles.add(roundCycle);
    if (matchdayNumber > 0) matchdays.add(`${roundCycle}:${matchdayNumber}`);
  });

  return {
    generated: matches.length > 0,
    generationMode: "full_schedule",
    totalRounds: roundCycles.size || 1,
    totalMatchdays: matchdays.size,
  };
}

module.exports = functions
  .runWith({ secrets: MAIL_AND_PUSH_SECRETS })
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  const phaseId = typeof data?.phaseId === "string" ? data.phaseId.trim() : "";
  const matches = data?.matches;
  if (!tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  if (!Array.isArray(matches) || !matches.length || !matches.every(isValidMatch)) throw new functions.https.HttpsError("invalid-argument", "matches inválido");

  const { tournament, phase, tournamentRef, phaseRef } = await getTournamentAndPhase({ tournamentId, phaseId, allowedTypes: [PHASE_TYPES.GROUP_STAGE, PHASE_TYPES.ROUND_ROBIN, PHASE_TYPES.KNOCKOUT] });
  assertTournamentAdmin(tournament, uid);

  const existingMatchesSnap = await db.collection("tournamentMatches").where("phaseId", "==", phase.id).limit(1).get();
  if (!existingMatchesSnap.empty) throw new functions.https.HttpsError("already-exists", "El fixture ya fue confirmado");

  const teamsSnap = await db.collection("tournamentTeams").where("tournamentId", "==", tournamentId).where("status", "==", "aceptado").get();
  const validTeamIds = new Set(teamsSnap.docs.map((teamDoc) => teamDoc.id));
  const batch = db.batch();
  const standingSeeds = new Map();

  for (const match of matches) {
    if (match.phaseId !== phase.id || match.phaseType !== phase.type) throw new functions.https.HttpsError("invalid-argument", "El fixture no corresponde a la fase indicada");
    if (match.homeTeamId && !validTeamIds.has(match.homeTeamId)) throw new functions.https.HttpsError("failed-precondition", "El fixture contiene equipos que no pertenecen al torneo");
    if (match.awayTeamId && !validTeamIds.has(match.awayTeamId)) throw new functions.https.HttpsError("failed-precondition", "El fixture contiene equipos que no pertenecen al torneo");
    batch.set(db.collection("tournamentMatches").doc(match.id), {
      tournamentId,
      phaseId: phase.id,
      phaseType: phase.type,
      groupLabel: match.groupLabel || null,
      round: match.round,
      roundLabel: match.roundLabel || null,
      bracketIndex: Number(match.bracketIndex || match.sequence || 1),
      matchdayNumber: match.matchdayNumber == null ? null : Number(match.matchdayNumber || match.round || 1),
      roundCycle: match.roundCycle == null ? null : Number(match.roundCycle || 1),
      sequence: Number(match.sequence || 1),
      homeTeamId: match.homeTeamId || null,
      awayTeamId: match.awayTeamId || null,
      sourceHomeMatchId: match.sourceHomeMatchId || null,
      sourceAwayMatchId: match.sourceAwayMatchId || null,
      sourceHomeSlot: match.sourceHomeSlot || null,
      sourceAwaySlot: match.sourceAwaySlot || null,
      status: "scheduled",
      result: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    [match.homeTeamId, match.awayTeamId].filter(Boolean).forEach((teamId) => {
      const standingId = `${tournamentId}_${phase.id}_${teamId}`;
      if (!standingSeeds.has(standingId)) standingSeeds.set(standingId, buildStandingsDoc({ tournamentId, phase, teamId, groupLabel: match.groupLabel || null }));
    });
  }

  standingSeeds.forEach((standing, standingId) => {
    batch.set(db.collection("tournamentStandings").doc(standingId), standing, { merge: true });
  });

  const startFrom = phase.config?.startFrom || tournament.structure?.knockoutStage?.startFrom || null;
  const knockoutConfig = phase.type === PHASE_TYPES.KNOCKOUT ? getKnockoutConfig(startFrom || "semi") : null;

  batch.update(phaseRef, {
    status: PHASE_STATUS.CONFIRMED,
    confirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    config: {
      ...(phase.config || {}),
      ...(phase.type === PHASE_TYPES.KNOCKOUT
        ? {
            startFrom: startFrom || "semi",
            bracketSize: knockoutConfig?.bracketSize || null,
            allowByes: false,
            currentRoundLabel: matches[0]?.roundLabel || null,
          }
        : {}),
      fixture: buildFixtureSummary(matches),
    },
  });
  batch.update(tournamentRef, { status: "inscripciones_cerradas", currentPhaseId: phase.id, currentPhaseType: phase.type, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();

  emitDomainEvent(DOMAIN_EVENTS.TOURNAMENT_FIXTURE_CONFIRMED, {
    tournamentId,
    tournamentName: tournament?.name || tournament?.nombre || "Torneo",
  });

  return { ok: true, matchesCount: matches.length, phaseId: phase.id };
});
