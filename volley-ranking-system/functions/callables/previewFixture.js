const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin, PHASE_TYPES } = require("../src/services/tournamentService");
const {
  generateKnockoutBracket,
  generateRoundRobinMatches,
  assertValidFixtureTeamCount,
  assertKnockoutTeamCount,
  getKnockoutConfig,
} = require("../src/services/tournamentFixtureService");
const { getTournamentAndPhase } = require("../src/services/tournamentPhaseService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  const phaseId = typeof data?.phaseId === "string" ? data.phaseId.trim() : "";
  if (!tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const providedSeed = data?.seed;
  if (providedSeed !== undefined && !Number.isInteger(providedSeed)) throw new functions.https.HttpsError("invalid-argument", "seed inválido");

  const { tournament, phase } = await getTournamentAndPhase({ tournamentId, phaseId, allowedTypes: [PHASE_TYPES.GROUP_STAGE, PHASE_TYPES.ROUND_ROBIN, PHASE_TYPES.KNOCKOUT] });
  assertTournamentAdmin(tournament, uid);
  if (tournament.status !== "inscripciones_cerradas" && tournament.status !== "activo") throw new functions.https.HttpsError("failed-precondition", "El torneo debe estar organizado para generar fixture");

  const teamsSnap = await db.collection("tournamentTeams").where("tournamentId", "==", tournamentId).where("status", "==", "aceptado").get();
  const teams = teamsSnap.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() }));
  assertValidFixtureTeamCount(tournament, teams);

  let matches = [];
  if (phase.type === PHASE_TYPES.GROUP_STAGE) {
    const sourceGroups = Array.isArray(phase.config?.groups) ? phase.config.groups : [];
    if (!sourceGroups.length) throw new functions.https.HttpsError("failed-precondition", "Debés confirmar grupos antes de generar fixture");
    const teamById = new Map(teams.map((team) => [team.id, team]));
    matches = sourceGroups.flatMap((group) => {
      const groupTeams = (group.teamIds || []).map((teamId) => teamById.get(teamId)).filter(Boolean);
      return generateRoundRobinMatches(tournament, groupTeams, 1, phase.type, {
        phaseId: phase.id,
        phaseType: phase.type,
        groupLabel: group.name,
        rounds: Number(phase.config?.rounds || 1),
      });
    });
  } else if (phase.type === PHASE_TYPES.ROUND_ROBIN) {
    matches = generateRoundRobinMatches(tournament, teams, 1, phase.type, {
      phaseId: phase.id,
      phaseType: phase.type,
      rounds: Number(phase.config?.rounds || 1),
    });
  } else {
    const startFrom = phase.config?.startFrom || tournament.structure?.knockoutStage?.startFrom || "semi";
    const knockoutConfig = getKnockoutConfig(startFrom);
    assertKnockoutTeamCount({ teamCount: teams.length, startFrom, allowByes: false, context: "confirmar el fixture" });
    matches = generateKnockoutBracket(tournament, teams, 1, phase.type, {
      phaseId: phase.id,
      phaseType: phase.type,
      startFrom,
      allowByes: false,
    });
    return {
      seed: providedSeed ?? Math.floor(Math.random() * 1000000000),
      matches,
      phaseId: phase.id,
      knockout: {
        startFrom,
        bracketSize: knockoutConfig.bracketSize,
        allowByes: knockoutConfig.allowByes,
      },
    };
  }

  return { seed: providedSeed ?? Math.floor(Math.random() * 1000000000), matches, phaseId: phase.id };
});
