const functions = require("firebase-functions/v1");
const { getKnockoutBracketSize } = require("./tournamentFixtureService");

const DEFAULT_TIEBREAKERS = ["setsDiff", "pointsDiff", "head2head"];
const DEFAULT_SEEDING_CRITERIA = "points";
const DEFAULT_BRACKET_MATCHUP = "standard_seeded";

function asPositiveInteger(value, fallback = 0) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(0, Math.floor(normalized));
}

function normalizeSeedingCriteria(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || DEFAULT_SEEDING_CRITERIA;
}

function normalizeBracketMatchup(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || DEFAULT_BRACKET_MATCHUP;
}

function normalizeTiebreakers(value) {
  if (!Array.isArray(value) || value.length === 0) return [...DEFAULT_TIEBREAKERS];
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());
}

function buildDefaultAdvancementRules(structure = {}) {
  const groupCount = Math.max(1, asPositiveInteger(structure.groupStage?.groupCount, 2));
  const startFrom = structure.knockoutStage?.startFrom || "semi";
  const bracketSize = getKnockoutBracketSize(startFrom);
  const explicitQualifyPerGroup = asPositiveInteger(structure.groupStage?.qualifyPerGroup, 0);
  const qualifyPerGroup = Math.max(1, explicitQualifyPerGroup || Math.floor(bracketSize / groupCount));
  const automaticQualified = groupCount * qualifyPerGroup;
  const explicitWildcardsCount = asPositiveInteger(structure.groupStage?.wildcardsCount, Math.max(0, bracketSize - automaticQualified));
  const totalQualified = automaticQualified + explicitWildcardsCount;

  return {
    startFrom,
    bracketSize,
    qualifyPerGroup,
    qualifyPositions: Array.from({ length: qualifyPerGroup }, (_, index) => index + 1),
    wildcardsCount: explicitWildcardsCount,
    qualifyBestThirds: explicitWildcardsCount > 0,
    seedingCriteria: normalizeSeedingCriteria(structure.groupStage?.seedingCriteria),
    tiebreakers: normalizeTiebreakers(structure.groupStage?.tiebreakers),
    crossGroupSeeding: structure.groupStage?.crossGroupSeeding !== false,
    bracketMatchup: normalizeBracketMatchup(structure.groupStage?.bracketMatchup),
    totalQualified,
    configurationValid: totalQualified === bracketSize,
  };
}

function validateMixedAdvancement({ structure = {}, context = "configurar el torneo mixto" }) {
  const rules = buildDefaultAdvancementRules(structure);
  const groupCount = Math.max(1, asPositiveInteger(structure.groupStage?.groupCount, 2));
  const automaticQualified = groupCount * rules.qualifyPerGroup;

  if (rules.totalQualified !== rules.bracketSize) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Para ${context}, ${groupCount} grupos x ${rules.qualifyPerGroup} clasificados + ${rules.wildcardsCount} wildcards = ${rules.totalQualified} equipos, pero ${rules.startFrom} requiere ${rules.bracketSize}.`
    );
  }

  if (automaticQualified <= 0) {
    throw new functions.https.HttpsError("invalid-argument", `Para ${context} se necesita al menos un clasificado por grupo.`);
  }

  return rules;
}

function compareStrings(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}

function compareRowsByRanking(a, b, directMatchComparator, tiebreakers = DEFAULT_TIEBREAKERS) {
  const aStats = a.stats || {};
  const bStats = b.stats || {};
  const comparisons = {
    points: () => (bStats.points || 0) - (aStats.points || 0),
    setsDiff: () => (bStats.setsDiff || 0) - (aStats.setsDiff || 0),
    pointsDiff: () => (bStats.pointsDiff || 0) - (aStats.pointsDiff || 0),
    head2head: () => directMatchComparator(a.teamId, b.teamId) * -1,
    head_to_head: () => directMatchComparator(a.teamId, b.teamId) * -1,
    headToHead: () => directMatchComparator(a.teamId, b.teamId) * -1,
  };

  const orderedCriteria = ["points", ...tiebreakers];
  for (const criterion of orderedCriteria) {
    const comparator = comparisons[criterion];
    if (!comparator) continue;
    const result = comparator();
    if (result !== 0) return result;
  }

  return compareStrings(a.teamId, b.teamId);
}

function compareRowsForSeeding(a, b, directMatchComparator, rules = {}) {
  const criterion = normalizeSeedingCriteria(rules.seedingCriteria);
  const tiebreakers = normalizeTiebreakers(rules.tiebreakers);
  const rankingComparator = compareRowsByRanking(a, b, directMatchComparator, tiebreakers);

  if (criterion === "group_position") {
    return (a.position || 0) - (b.position || 0)
      || rankingComparator
      || compareStrings(a.groupLabel, b.groupLabel)
      || compareStrings(a.teamId, b.teamId);
  }

  if (criterion === "setsDiff") {
    return ((b.stats?.setsDiff || 0) - (a.stats?.setsDiff || 0))
      || ((b.stats?.points || 0) - (a.stats?.points || 0))
      || ((b.stats?.pointsDiff || 0) - (a.stats?.pointsDiff || 0))
      || directMatchComparator(a.teamId, b.teamId) * -1
      || compareStrings(a.groupLabel, b.groupLabel)
      || compareStrings(a.teamId, b.teamId);
  }

  if (criterion === "pointsDiff") {
    return ((b.stats?.pointsDiff || 0) - (a.stats?.pointsDiff || 0))
      || ((b.stats?.points || 0) - (a.stats?.points || 0))
      || ((b.stats?.setsDiff || 0) - (a.stats?.setsDiff || 0))
      || directMatchComparator(a.teamId, b.teamId) * -1
      || compareStrings(a.groupLabel, b.groupLabel)
      || compareStrings(a.teamId, b.teamId);
  }

  return rankingComparator || compareStrings(a.groupLabel, b.groupLabel) || compareStrings(a.teamId, b.teamId);
}

function orderQualifiedRowsForBracket(qualifiedRows, rules = {}) {
  const groupOrder = [...new Set(qualifiedRows.map((row) => row.groupLabel).filter(Boolean))].sort(compareStrings);

  if (
    normalizeBracketMatchup(rules.bracketMatchup) === "1A_vs_2B"
    && Number(rules.qualifyPerGroup || 0) === 2
    && Number(rules.wildcardsCount || 0) === 0
  ) {
    return [...qualifiedRows].sort((a, b) => {
      const positionResult = (a.position || 0) - (b.position || 0);
      if (positionResult !== 0) return positionResult;
      return groupOrder.indexOf(a.groupLabel || "") - groupOrder.indexOf(b.groupLabel || "");
    });
  }

  if (rules.crossGroupSeeding === false) {
    return [...qualifiedRows].sort((a, b) => groupOrder.indexOf(a.groupLabel || "") - groupOrder.indexOf(b.groupLabel || "") || (a.position || 0) - (b.position || 0));
  }

  return [...qualifiedRows].sort((a, b) => Number(a.seed || 0) - Number(b.seed || 0));
}

function buildAdvancementSummary({ standings, matches, rules }) {
  const normalizedRules = {
    ...rules,
    tiebreakers: normalizeTiebreakers(rules?.tiebreakers),
    seedingCriteria: normalizeSeedingCriteria(rules?.seedingCriteria),
    bracketMatchup: normalizeBracketMatchup(rules?.bracketMatchup),
  };
  const standingsByGroup = standings.reduce((acc, row) => {
    const key = row.groupLabel || "_";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
  const matchesByGroup = matches.reduce((acc, match) => {
    const key = match.groupLabel || "_";
    acc[key] = acc[key] || [];
    acc[key].push(match);
    return acc;
  }, {});

  const groupRankings = Object.entries(standingsByGroup)
    .map(([groupLabel, rows]) => ({
      groupLabel,
      rows: rows,
      matches: matchesByGroup[groupLabel] || [],
    }))
    .sort((a, b) => compareStrings(a.groupLabel, b.groupLabel))
    .map((group) => ({
      ...group,
      rankedRows: [...group.rows],
    }));

  const directComparatorByGroup = new Map();
  groupRankings.forEach((group) => {
    directComparatorByGroup.set(group.groupLabel, (teamAId, teamBId) => {
      const directMatches = group.matches.filter((match) => {
        if (match.status !== "completed") return false;
        return [match.homeTeamId, match.awayTeamId].includes(teamAId)
          && [match.homeTeamId, match.awayTeamId].includes(teamBId);
      });

      if (!directMatches.length) return 0;

      const summary = directMatches.reduce((acc, match) => {
        const result = match.result || {};
        const homeSets = Number(result.homeSets || 0);
        const awaySets = Number(result.awaySets || 0);
        const homePoints = Array.isArray(result.homePoints)
          ? result.homePoints.reduce((sum, value) => sum + Number(value || 0), 0)
          : 0;
        const awayPoints = Array.isArray(result.awayPoints)
          ? result.awayPoints.reduce((sum, value) => sum + Number(value || 0), 0)
          : 0;
        const aIsHome = match.homeTeamId === teamAId;
        const teamASetsDiff = aIsHome ? homeSets - awaySets : awaySets - homeSets;
        const teamAPointsDiff = aIsHome ? homePoints - awayPoints : awayPoints - homePoints;
        const winnerId = result.winnerId || (homeSets > awaySets ? match.homeTeamId : match.awayTeamId);

        return {
          wins: acc.wins + (winnerId === teamAId ? 1 : 0),
          losses: acc.losses + (winnerId === teamBId ? 1 : 0),
          setsDiff: acc.setsDiff + teamASetsDiff,
          pointsDiff: acc.pointsDiff + teamAPointsDiff,
        };
      }, { wins: 0, losses: 0, setsDiff: 0, pointsDiff: 0 });

      return summary.wins - summary.losses || summary.setsDiff || summary.pointsDiff;
    });
  });

  const rankedGroups = groupRankings.map((group) => ({
    ...group,
    rankedRows: [...group.rows].sort((a, b) => compareRowsByRanking(a, b, directComparatorByGroup.get(group.groupLabel), normalizedRules.tiebreakers))
      .map((row, index) => ({ ...row, position: index + 1 })),
  }));

  const autoQualified = rankedGroups.flatMap((group) => group.rankedRows
    .filter((row) => (row.position || 0) <= Number(normalizedRules.qualifyPerGroup || 0))
    .map((row) => ({
      ...row,
      qualificationType: "group",
    })));

  const wildcardCandidates = rankedGroups
    .flatMap((group) => group.rankedRows.filter((row) => (row.position || 0) > Number(normalizedRules.qualifyPerGroup || 0)))
    .sort((a, b) => compareRowsForSeeding(a, b, directComparatorByGroup.get(a.groupLabel || "_"), normalizedRules));

  const wildcardQualified = wildcardCandidates
    .slice(0, Number(normalizedRules.wildcardsCount || 0))
    .map((row) => ({ ...row, qualificationType: "wildcard" }));

  const qualifiedRows = [...autoQualified, ...wildcardQualified].sort((a, b) => compareRowsForSeeding(a, b, directComparatorByGroup.get(a.groupLabel || "_"), normalizedRules))
    .map((row, index) => ({ ...row, seed: index + 1 }));

  if (qualifiedRows.length !== Number(normalizedRules.bracketSize || 0)) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `La clasificación configurada produce ${qualifiedRows.length} equipos, pero el playoff requiere ${normalizedRules.bracketSize}.`
    );
  }

  const orderedSeeds = orderQualifiedRowsForBracket(qualifiedRows, normalizedRules).map((row, index) => ({
    ...row,
    bracketSeed: index + 1,
  }));

  return {
    groupRankings: rankedGroups,
    qualifiedRows,
    orderedSeeds,
    wildcardCandidates,
    rules: normalizedRules,
  };
}

module.exports = {
  DEFAULT_TIEBREAKERS,
  DEFAULT_SEEDING_CRITERIA,
  DEFAULT_BRACKET_MATCHUP,
  buildDefaultAdvancementRules,
  validateMixedAdvancement,
  buildAdvancementSummary,
  normalizeSeedingCriteria,
  normalizeTiebreakers,
  normalizeBracketMatchup,
};
