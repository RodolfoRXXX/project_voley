const functions = require("firebase-functions/v1");

const KNOCKOUT_START_FROM_ORDER = ["final", "semi", "cuartos", "octavos"];
const KNOCKOUT_BRACKET_SIZE_BY_START = {
  final: 2,
  semi: 4,
  cuartos: 8,
  octavos: 16,
};

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

function rotateRoundRobinTeams(teamIds) {
  if (teamIds.length <= 2) return [...teamIds];
  const [anchor, ...rest] = teamIds;
  const last = rest.pop();
  return [anchor, last, ...rest];
}

function buildRoundRobinMatchdays(teamIds) {
  const safeTeamIds = [...teamIds];
  const hasBye = safeTeamIds.length % 2 !== 0;
  if (hasBye) safeTeamIds.push(null);

  const matchdays = [];
  let rotating = [...safeTeamIds];
  const totalMatchdays = Math.max(0, rotating.length - 1);

  for (let matchdayIndex = 0; matchdayIndex < totalMatchdays; matchdayIndex += 1) {
    const pairs = [];
    const half = rotating.length / 2;

    for (let pairIndex = 0; pairIndex < half; pairIndex += 1) {
      const home = rotating[pairIndex];
      const away = rotating[rotating.length - 1 - pairIndex];
      if (!home || !away) continue;
      pairs.push([home, away]);
    }

    matchdays.push(pairs);
    rotating = rotateRoundRobinTeams(rotating);
  }

  return matchdays;
}

function generateRoundRobinMatches(tournament, teams, startRound = 1, phase = "round_robin", options = {}) {
  const rounds = Math.max(1, Number(options.rounds || 1));
  const matchdays = buildRoundRobinMatchdays(teams.map((team) => team.id));
  const matches = [];
  let globalSequence = 0;

  for (let roundCycle = 1; roundCycle <= rounds; roundCycle += 1) {
    matchdays.forEach((pairs, matchdayIndex) => {
      const matchdayNumber = startRound + matchdayIndex;
      pairs.forEach(([baseHomeTeamId, baseAwayTeamId], pairIndex) => {
        const isEvenCycle = roundCycle % 2 === 0;
        const homeTeamId = isEvenCycle ? baseAwayTeamId : baseHomeTeamId;
        const awayTeamId = isEvenCycle ? baseHomeTeamId : baseAwayTeamId;
        globalSequence += 1;

        matches.push({
          id: `${options.phaseId || phase}-c${roundCycle}-m${matchdayNumber}-s${pairIndex + 1}`,
          tournamentId: tournament.id,
          phaseId: options.phaseId || null,
          phaseType: options.phaseType || phase,
          phase,
          groupLabel: options.groupLabel || null,
          round: normalizeRound(matchdayNumber),
          matchdayNumber,
          roundCycle,
          sequence: pairIndex + 1,
          cycleSequence: globalSequence,
          homeTeamId,
          awayTeamId,
          status: "scheduled",
        });
      });
    });
  }

  return matches;
}

function getKnockoutBracketSize(startFrom = "semi") {
  const normalized = typeof startFrom === "string" ? startFrom.trim().toLowerCase() : "semi";
  const bracketSize = KNOCKOUT_BRACKET_SIZE_BY_START[normalized];
  if (!bracketSize) {
    throw new functions.https.HttpsError("invalid-argument", `startFrom inválido: ${startFrom}`);
  }
  return bracketSize;
}

function getKnockoutRoundLabels(startFrom = "semi") {
  const normalized = typeof startFrom === "string" ? startFrom.trim().toLowerCase() : "semi";
  const startIndex = KNOCKOUT_START_FROM_ORDER.indexOf(normalized);
  if (startIndex === -1) {
    throw new functions.https.HttpsError("invalid-argument", `startFrom inválido: ${startFrom}`);
  }
  return [...KNOCKOUT_START_FROM_ORDER].slice(0, startIndex + 1).reverse();
}

function getKnockoutConfig(startFrom = "semi") {
  return {
    startFrom,
    bracketSize: getKnockoutBracketSize(startFrom),
    roundLabels: getKnockoutRoundLabels(startFrom),
    allowByes: false,
  };
}

function assertKnockoutTeamCount({ teamCount, startFrom, allowByes = false, context = "generar el cuadro" }) {
  const bracketSize = getKnockoutBracketSize(startFrom);
  if (allowByes) return bracketSize;
  if (teamCount !== bracketSize) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Para ${context} en ${startFrom} se necesitan exactamente ${bracketSize} equipos y hoy hay ${teamCount}.`
    );
  }
  return bracketSize;
}

function generateKnockoutBracket(tournament, teams, startRound = 1, phase = "knockout", options = {}) {
  const startFrom = options.startFrom || tournament.structure?.knockoutStage?.startFrom || "semi";
  const allowByes = Boolean(options.allowByes);
  const { bracketSize, roundLabels } = getKnockoutConfig(startFrom);
  assertKnockoutTeamCount({ teamCount: teams.length, startFrom, allowByes, context: "generar el cuadro" });

  const seededTeams = [...teams].slice(0, bracketSize);
  const matches = [];
  const rounds = [];

  roundLabels.forEach((roundLabel, roundOffset) => {
    const matchesInRound = Math.max(1, bracketSize / (2 ** (roundOffset + 1)));
    const currentRound = [];

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex += 1) {
      const previousRound = rounds[roundOffset - 1] || [];
      const sourceHomeMatch = previousRound[matchIndex * 2] || null;
      const sourceAwayMatch = previousRound[matchIndex * 2 + 1] || null;
      const isFirstRound = roundOffset === 0;
      const homeSeed = isFirstRound ? seededTeams[matchIndex] || null : null;
      const awaySeed = isFirstRound ? seededTeams[bracketSize - 1 - matchIndex] || null : null;
      const match = {
        id: `${options.phaseId || phase}-${roundLabel}-${matchIndex + 1}`,
        tournamentId: tournament.id,
        phaseId: options.phaseId || null,
        phaseType: options.phaseType || phase,
        phase,
        groupLabel: null,
        round: normalizeRound(startRound + roundOffset),
        roundLabel,
        bracketIndex: matchIndex + 1,
        matchdayNumber: null,
        roundCycle: null,
        sequence: matchIndex + 1,
        homeTeamId: homeSeed?.id || null,
        awayTeamId: awaySeed?.id || null,
        sourceHomeMatchId: sourceHomeMatch?.id || null,
        sourceAwayMatchId: sourceAwayMatch?.id || null,
        sourceHomeSlot: sourceHomeMatch ? "winner" : null,
        sourceAwaySlot: sourceAwayMatch ? "winner" : null,
        status: "scheduled",
      };
      currentRound.push(match);
      matches.push(match);
    }

    rounds.push(currentRound);
  });

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
  assertKnockoutTeamCount,
  getKnockoutBracketSize,
  getKnockoutRoundLabels,
  getKnockoutConfig,
  matchKey,
};
