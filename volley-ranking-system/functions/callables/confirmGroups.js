const functions = require("firebase-functions/v1");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin, PHASE_STATUS, PHASE_TYPES } = require("../src/services/tournamentService");
const { getTournamentAndPhase } = require("../src/services/tournamentPhaseService");

function isValidGroup(group) {
  return group && typeof group === "object" && typeof group.name === "string" && group.name.trim() && Array.isArray(group.teamIds) && group.teamIds.every((teamId) => typeof teamId === "string" && teamId.trim());
}

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  const phaseId = typeof data?.phaseId === "string" ? data.phaseId.trim() : "";
  const groups = data?.groups;
  if (!tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  if (!Array.isArray(groups) || groups.length === 0 || !groups.every(isValidGroup)) throw new functions.https.HttpsError("invalid-argument", "groups inválido");

  const { tournament, phase, phaseRef } = await getTournamentAndPhase({ tournamentId, phaseId, allowedTypes: [PHASE_TYPES.GROUP_STAGE] });
  assertTournamentAdmin(tournament, uid);
  if (Array.isArray(phase.config?.groups) && phase.config.groups.length > 0) throw new functions.https.HttpsError("already-exists", "Los grupos ya fueron confirmados");

  const teamsSnap = await db.collection("tournamentTeams").where("tournamentId", "==", tournamentId).where("status", "==", "aceptado").get();
  const validTeamIds = new Set(teamsSnap.docs.map((teamDoc) => teamDoc.id));
  const seenTeamIds = new Set();
  const normalizedGroups = groups.map((group) => ({ name: group.name.trim(), teamIds: group.teamIds.map((teamId) => teamId.trim()) }));

  for (const group of normalizedGroups) {
    for (const teamId of group.teamIds) {
      if (!validTeamIds.has(teamId)) throw new functions.https.HttpsError("failed-precondition", "Hay equipos en grupos que no pertenecen al torneo");
      if (seenTeamIds.has(teamId)) throw new functions.https.HttpsError("invalid-argument", "Hay equipos duplicados entre grupos");
      seenTeamIds.add(teamId);
    }
  }

  if (seenTeamIds.size !== validTeamIds.size) throw new functions.https.HttpsError("failed-precondition", "Los grupos no incluyen todos los equipos aceptados");
  const sizes = normalizedGroups.map((group) => group.teamIds.length);
  if (Math.max(...sizes) - Math.min(...sizes) > 1) throw new functions.https.HttpsError("invalid-argument", "Los grupos deben estar balanceados");

  await phaseRef.update({
    config: {
      ...(phase.config || {}),
      groups: normalizedGroups,
      groupsConfirmed: true,
      groupsConfirmedAt: FieldValue.serverTimestamp(),
    },
    status: PHASE_STATUS.CONFIRMED,
    confirmedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, groupsCount: normalizedGroups.length, phaseId: phase.id };
});
