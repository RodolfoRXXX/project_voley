const functions = require("firebase-functions/v1");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin } = require("../src/services/tournamentService");

function isValidGroup(group) {
  return (
    group &&
    typeof group === "object" &&
    typeof group.name === "string" &&
    group.name.trim() &&
    Array.isArray(group.teamIds) &&
    group.teamIds.every((teamId) => typeof teamId === "string" && teamId.trim())
  );
}

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  const groups = data?.groups;

  if (!tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  if (!Array.isArray(groups) || groups.length === 0 || !groups.every(isValidGroup)) {
    throw new functions.https.HttpsError("invalid-argument", "groups inválido");
  }

  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();

  if (!tournamentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El torneo no existe");
  }

  const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };
  assertTournamentAdmin(tournament, uid);

  if (Array.isArray(tournament.groups) && tournament.groups.length > 0) {
    throw new functions.https.HttpsError("already-exists", "Los grupos ya fueron confirmados");
  }

  const teamsSnap = await db
    .collection("tournamentTeams")
    .where("tournamentId", "==", tournamentId)
    .where("status", "==", "aceptado")
    .get();

  const validTeamIds = new Set(teamsSnap.docs.map((teamDoc) => teamDoc.id));
  const seenTeamIds = new Set();
  const normalizedGroups = groups.map((group) => ({
    name: group.name.trim(),
    teamIds: group.teamIds.map((teamId) => teamId.trim()),
  }));

  for (const group of normalizedGroups) {
    for (const teamId of group.teamIds) {
      if (!validTeamIds.has(teamId)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Hay equipos en grupos que no pertenecen al torneo"
        );
      }

      if (seenTeamIds.has(teamId)) {
        throw new functions.https.HttpsError("invalid-argument", "Hay equipos duplicados entre grupos");
      }

      seenTeamIds.add(teamId);
    }
  }

  if (seenTeamIds.size !== validTeamIds.size) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Los grupos no incluyen todos los equipos aceptados"
    );
  }

  const sizes = normalizedGroups.map((group) => group.teamIds.length);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  if (maxSize - minSize > 1) {
    throw new functions.https.HttpsError("invalid-argument", "Los grupos deben estar balanceados");
  }

  await tournamentRef.update({
    groups: normalizedGroups,
    updatedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true, groupsCount: normalizedGroups.length };
});
