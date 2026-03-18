const functions = require("firebase-functions/v1");

function createSeededRandom(seed) {
  let value = Math.floor(seed) % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleWithSeed(items, seed) {
  const rng = createSeededRandom(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function matchKey(teamAId, teamBId) {
  return [teamAId, teamBId].sort().join("::");
}

function normalizeRound(round) {
  return Number.isFinite(Number(round)) ? Number(round) : round;
}

function generateRoundRobinMatches(tournament, teams, startRound = 1, phase = "round_robin", options = {}) {
  const matches = [];
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      matches.push({
        id: `${options.phaseId || phase}-r${startRound + matches.length}`,
        tournamentId: tournament.id,
        phaseId: options.phaseId || null,
        phaseType: options.phaseType || phase,
        phase,
        groupLabel: options.groupLabel || null,
        round: normalizeRound(startRound + matches.length),
        homeTeamId: teams[i].id,
        awayTeamId: teams[j].id,
        status: "scheduled",
      });
    }
  }
  return matches;
}

function generateKnockoutBracket(tournament, teams, startRound = 1, phase = "knockout", options = {}) {
  const matches = [];
  const pairCount = Math.floor(teams.length / 2);
  for (let i = 0; i < pairCount; i += 1) {
    const homeTeamId = teams[i].id;
    const awayTeamId = teams[teams.length - 1 - i].id;
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) continue;
    matches.push({
      id: `${options.phaseId || phase}-r${startRound + i}`,
      tournamentId: tournament.id,
      phaseId: options.phaseId || null,
      phaseType: options.phaseType || phase,
      phase,
      groupLabel: null,
      round: normalizeRound(startRound + i),
      homeTeamId,
      awayTeamId,
      status: "scheduled",
    });
  }
  return matches;
}

function generateBalancedGroups(teams, groupCount, seed) {
  const safeGroupCount = Math.max(1, Math.min(groupCount, teams.length || 1));
  const shuffled = shuffleWithSeed(teams, seed);
  const groups = Array.from({ length: safeGroupCount }, () => []);
  shuffled.forEach((team, index) => {
    groups[index % safeGroupCount].push(team);
  });
  return groups;
}

function assertValidFixtureTeamCount(tournament, teams) {
  const count = teams.length;
  const minTeams = Number(tournament.settings?.minTeams || tournament.minTeams || 0);
  const maxTeams = Number(tournament.settings?.maxTeams || tournament.maxTeams || 0);
  if (count < minTeams || count > maxTeams) {
    throw new functions.https.HttpsError("failed-precondition", "La cantidad de equipos aceptados no cumple los límites del torneo");
  }
}

module.exports = {
  shuffleWithSeed,
  generateRoundRobinMatches,
  generateKnockoutBracket,
  generateBalancedGroups,
  assertValidFixtureTeamCount,
  matchKey,
};
