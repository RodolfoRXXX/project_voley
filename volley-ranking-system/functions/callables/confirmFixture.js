const functions = require("firebase-functions/v1");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin, PHASE_STATUS, PHASE_TYPES } = require("../src/services/tournamentService");
const { buildStandingsDoc, getTournamentAndPhase } = require("../src/services/tournamentPhaseService");

function isValidMatch(match) {
  return match && typeof match === "object" && typeof match.id === "string" && typeof match.phaseId === "string" && typeof match.phaseType === "string" && typeof match.homeTeamId === "string" && typeof match.awayTeamId === "string" && match.homeTeamId !== match.awayTeamId;
}

function buildFixtureSummary(matches = []) {
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

module.exports = functions.https.onCall(async (data, context) => {
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
    if (!validTeamIds.has(match.homeTeamId) || !validTeamIds.has(match.awayTeamId)) throw new functions.https.HttpsError("failed-precondition", "El fixture contiene equipos que no pertenecen al torneo");
    batch.set(db.collection("tournamentMatches").doc(match.id), {
      tournamentId,
      phaseId: phase.id,
      phaseType: phase.type,
      groupLabel: match.groupLabel || null,
      round: match.round,
      matchdayNumber: Number(match.matchdayNumber || match.round || 1),
      roundCycle: Number(match.roundCycle || 1),
      sequence: Number(match.sequence || 1),
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      status: "scheduled",
      result: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    [match.homeTeamId, match.awayTeamId].forEach((teamId) => {
      const standingId = `${tournamentId}_${phase.id}_${teamId}`;
      if (!standingSeeds.has(standingId)) standingSeeds.set(standingId, buildStandingsDoc({ tournamentId, phase, teamId, groupLabel: match.groupLabel || null }));
    });
  }

  standingSeeds.forEach((standing, standingId) => {
    batch.set(db.collection("tournamentStandings").doc(standingId), standing, { merge: true });
  });

  batch.update(phaseRef, {
    status: PHASE_STATUS.CONFIRMED,
    confirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    config: {
      ...(phase.config || {}),
      fixture: buildFixtureSummary(matches),
    },
  });
  batch.update(tournamentRef, { status: "activo", currentPhaseId: phase.id, currentPhaseType: phase.type, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { ok: true, matchesCount: matches.length, phaseId: phase.id };
});
