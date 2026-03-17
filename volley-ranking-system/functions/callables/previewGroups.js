const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin } = require("../src/services/tournamentService");
const {
  assertValidFixtureTeamCount,
  generateBalancedGroups,
} = require("../src/services/tournamentFixtureService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  if (!tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  const providedSeed = data?.seed;
  if (providedSeed !== undefined && !Number.isInteger(providedSeed)) {
    throw new functions.https.HttpsError("invalid-argument", "seed inválido");
  }

  const tournamentRef = db.collection("tournaments").doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();

  if (!tournamentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "El torneo no existe");
  }

  const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };
  assertTournamentAdmin(tournament, uid);

  if (tournament.status !== "inscripciones_cerradas") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El torneo debe estar en estado inscripciones_cerradas"
    );
  }

  const teamsSnap = await db
    .collection("tournamentTeams")
    .where("tournamentId", "==", tournamentId)
    .where("status", "==", "aceptado")
    .get();

  const teams = teamsSnap.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() }));
  assertValidFixtureTeamCount(tournament, teams);

  const seed = providedSeed ?? Math.floor(Math.random() * 1000000000);
  const configuredGroupCount = Number(tournament.structure?.groupStage?.groupCount || 2);
  const rawGroups = generateBalancedGroups(teams, configuredGroupCount, seed);

  const groups = rawGroups.map((group, index) => ({
    name: String.fromCharCode(65 + index),
    teamIds: group.map((team) => team.id),
  }));

  return { groups, seed };
});
