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

function generateRoundRobinMatches(tournament, teams, startRound = 1, phase = "liga") {
  const matches = [];

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      matches.push({
        id: `${phase}-r${startRound + matches.length}`,
        tournamentId: tournament.id,
        phase,
        round: startRound + matches.length,
        homeTeamId: teams[i].id,
        awayTeamId: teams[j].id,
        status: "pending",
      });
    }
  }

  return matches;
}

function generateKnockoutBracket(tournament, teams, startRound = 1, phase = "eliminacion") {
  const matches = [];
  const pairCount = Math.floor(teams.length / 2);

  for (let i = 0; i < pairCount; i += 1) {
    const homeTeamId = teams[i].id;
    const awayTeamId = teams[teams.length - 1 - i].id;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
      continue;
    }

    matches.push({
      id: `${phase}-r${startRound + i}`,
      tournamentId: tournament.id,
      phase,
      round: startRound + i,
      homeTeamId,
      awayTeamId,
      status: "pending",
    });
  }

  return matches;
}

function generateGroups(tournament, teams, seed) {
  const groupCount = Math.max(1, Number(tournament.structure?.groupStage?.groupCount || 2));
  const shuffled = shuffleWithSeed(teams, seed);
  const groups = Array.from({ length: groupCount }, () => []);

  shuffled.forEach((team, index) => {
    groups[index % groupCount].push(team);
  });

  return groups;
}

function generateTournamentFixture(tournament, teams, seed) {
  if (!Array.isArray(teams) || teams.length < 2) {
    return [];
  }

  const shuffledTeams = shuffleWithSeed(teams, seed);
  let matches = [];

  if (tournament.format === "liga") {
    matches = generateRoundRobinMatches(tournament, shuffledTeams, 1, "liga");
  } else if (tournament.format === "eliminacion") {
    matches = generateKnockoutBracket(tournament, shuffledTeams, 1, "eliminacion");
  } else {
    const groups = generateGroups(tournament, teams, seed);
    const groupMatches = groups.flatMap((group, index) =>
      generateRoundRobinMatches(tournament, group, index * 100 + 1, `grupos_${index + 1}`)
    );

    const knockoutCandidates = groups.flatMap((group) => group.slice(0, Math.min(2, group.length)));
    const knockoutMatches = generateKnockoutBracket(
      tournament,
      shuffleWithSeed(knockoutCandidates, seed + 9973),
      1000,
      "eliminacion"
    );

    matches = [...groupMatches, ...knockoutMatches];
  }

  const uniqueKeys = new Set();
  const uniqueMatches = [];

  for (const match of matches) {
    if (!match.homeTeamId || !match.awayTeamId || match.homeTeamId === match.awayTeamId) {
      continue;
    }

    const key = matchKey(match.homeTeamId, match.awayTeamId);
    if (uniqueKeys.has(key)) {
      continue;
    }

    uniqueKeys.add(key);
    uniqueMatches.push(match);
  }

  return uniqueMatches.sort((a, b) => {
    if (a.phase === b.phase) {
      return a.round - b.round;
    }

    return a.phase.localeCompare(b.phase);
  });
}

function assertValidFixtureTeamCount(tournament, teams) {
  const count = teams.length;
  const minTeams = Number(tournament.minTeams || 0);
  const maxTeams = Number(tournament.maxTeams || 0);

  if (count < minTeams || count > maxTeams) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "La cantidad de equipos aceptados no cumple los límites del torneo"
    );
  }
}

module.exports = {
  shuffleWithSeed,
  generateRoundRobinMatches,
  generateKnockoutBracket,
  generateGroups,
  generateTournamentFixture,
  assertValidFixtureTeamCount,
};
