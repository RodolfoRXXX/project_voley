const functions = require("firebase-functions/v1");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../firebase");
const { PHASE_STATUS, PHASE_TYPES, TOURNAMENT_STATUS } = require("./tournamentService");
const {
  generateKnockoutBracket,
  getKnockoutConfig,
  getKnockoutRoundLabels,
  assertKnockoutTeamCount,
} = require("./tournamentFixtureService");
const {
  buildAdvancementSummary,
  buildDefaultAdvancementRules,
  normalizeTiebreakers,
} = require("./tournamentAdvancementService");

async function getTournamentAndPhase({ tournamentId, phaseId, allowedTypes = [] }) {
  const tournamentSnap = await db.collection("tournaments").doc(tournamentId).get();
  if (!tournamentSnap.exists) throw new functions.https.HttpsError("not-found", "El torneo no existe");
  const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };

  const resolvedPhaseId = phaseId || tournament.currentPhaseId;
  if (!resolvedPhaseId) throw new functions.https.HttpsError("failed-precondition", "El torneo no tiene una fase activa configurada");

  const phaseSnap = await db.collection("tournamentPhases").doc(resolvedPhaseId).get();
  if (!phaseSnap.exists) throw new functions.https.HttpsError("not-found", "La fase no existe");
  const phase = { id: phaseSnap.id, ...phaseSnap.data() };

  if (phase.tournamentId !== tournamentId) throw new functions.https.HttpsError("failed-precondition", "La fase no pertenece al torneo");
  if (allowedTypes.length && !allowedTypes.includes(phase.type)) throw new functions.https.HttpsError("failed-precondition", "La fase no es compatible con esta operación");

  return { tournament, phase, tournamentRef: tournamentSnap.ref, phaseRef: phaseSnap.ref };
}

function buildStandingsDoc({ tournamentId, phase, teamId, groupLabel = null }) {
  return {
    tournamentId,
    phaseId: phase.id,
    phaseType: phase.type,
    teamId,
    groupLabel,
    position: 0,
    stats: {
      played: 0, won: 0, draw: 0, lost: 0,
      points: 0,
      setsFor: 0, setsAgainst: 0, setsDiff: 0,
      pointsFor: 0, pointsAgainst: 0, pointsDiff: 0,
    },
    qualified: false,
    qualificationType: null,
    seed: null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildDirectMatchComparator(matches = []) {
  return (teamAId, teamBId) => {
    const directMatches = matches.filter((match) => {
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
      const teamASetsDiff = (aIsHome ? homeSets - awaySets : awaySets - homeSets);
      const teamAPointsDiff = (aIsHome ? homePoints - awayPoints : awayPoints - homePoints);
      const winnerId = result.winnerId || (homeSets > awaySets ? match.homeTeamId : match.awayTeamId);

      return {
        wins: acc.wins + (winnerId === teamAId ? 1 : 0),
        losses: acc.losses + (winnerId === teamBId ? 1 : 0),
        setsDiff: acc.setsDiff + teamASetsDiff,
        pointsDiff: acc.pointsDiff + teamAPointsDiff,
      };
    }, { wins: 0, losses: 0, setsDiff: 0, pointsDiff: 0 });

    return summary.wins - summary.losses
      || summary.setsDiff
      || summary.pointsDiff;
  };
}

function sortStandingsRows(rows, matches = [], options = {}) {
  const tiebreakers = normalizeTiebreakers(options.tiebreakers);
  const directMatchComparator = buildDirectMatchComparator(matches);

  const comparisons = {
    points: (aStats, bStats) => (bStats.points || 0) - (aStats.points || 0),
    setsDiff: (aStats, bStats) => (bStats.setsDiff || 0) - (aStats.setsDiff || 0),
    pointsDiff: (aStats, bStats) => (bStats.pointsDiff || 0) - (aStats.pointsDiff || 0),
    head2head: (a, b) => directMatchComparator(a.teamId, b.teamId) * -1,
  };

  return [...rows].sort((a, b) => {
    const aStats = a.stats || {};
    const bStats = b.stats || {};

    const baseResult = comparisons.points(aStats, bStats);
    if (baseResult !== 0) return baseResult;

    for (const criterion of tiebreakers) {
      const comparator = comparisons[criterion] || comparisons[criterion === "head_to_head" || criterion === "headToHead" ? "head2head" : criterion];
      if (!comparator) continue;
      const result = criterion === "head2head" || criterion === "head_to_head" || criterion === "headToHead"
        ? comparator(a, b)
        : comparator(aStats, bStats);
      if (result !== 0) return result;
    }

    return String(a.teamId).localeCompare(String(b.teamId));
  }).map((row, index) => ({ ...row, position: index + 1 }));
}

function sortKnockoutMatches(matches = []) {
  return [...matches].sort((a, b) => {
    const aRound = Number(a.round || 0);
    const bRound = Number(b.round || 0);
    return aRound - bRound
      || Number(a.bracketIndex || a.sequence || 0) - Number(b.bracketIndex || b.sequence || 0)
      || String(a.id).localeCompare(String(b.id));
  });
}

function getKnockoutPodium(matches = []) {
  const completedMatches = matches.filter((match) => match.status === "completed" && match.result?.winnerId);
  const finalMatch = sortKnockoutMatches(completedMatches).slice(-1)[0] || null;
  if (!finalMatch) return null;
  const winnerId = finalMatch.result?.winnerId || null;
  const runnerUpId = winnerId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;
  return [winnerId || null, runnerUpId || null, null];
}

async function advancePhase({ tournament, phase }) {
  const phasesSnap = await db.collection("tournamentPhases").where("tournamentId", "==", tournament.id).get();
  const phases = phasesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order);
  const currentIndex = phases.findIndex((item) => item.id === phase.id);
  const nextPhase = currentIndex >= 0 ? phases[currentIndex + 1] : null;

  if (!nextPhase) {
    let podiumTeamIds = null;

    if (phase.type === PHASE_TYPES.KNOCKOUT || phase.type === PHASE_TYPES.FINAL) {
      const matchesSnap = await db.collection("tournamentMatches").where("phaseId", "==", phase.id).get();
      podiumTeamIds = getKnockoutPodium(matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } else {
      const standingsSnap = await db.collection("tournamentStandings").where("phaseId", "==", phase.id).get();
      const matchesSnap = await db.collection("tournamentMatches").where("phaseId", "==", phase.id).get();
      const orderedStandings = sortStandingsRows(
        standingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      podiumTeamIds = orderedStandings.length
        ? [
            orderedStandings[0]?.teamId || null,
            orderedStandings[1]?.teamId || null,
            orderedStandings[2]?.teamId || null,
          ]
        : null;
    }

    await db.collection("tournaments").doc(tournament.id).update({
      status: TOURNAMENT_STATUS.FINISHED,
      currentPhaseId: phase.id,
      currentPhaseType: phase.type,
      podiumTeamIds,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { advanced: false, finished: true };
  }

  const batch = db.batch();
  const tournamentRef = db.collection("tournaments").doc(tournament.id);
  const nextPhaseRef = db.collection("tournamentPhases").doc(nextPhase.id);
  const nextPhaseUpdate = { status: PHASE_STATUS.ACTIVE, updatedAt: FieldValue.serverTimestamp() };

  batch.update(tournamentRef, {
    status: TOURNAMENT_STATUS.ACTIVE,
    currentPhaseId: nextPhase.id,
    currentPhaseType: nextPhase.type,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (phase.type === PHASE_TYPES.GROUP_STAGE && nextPhase.type === PHASE_TYPES.KNOCKOUT) {
    const [standingsSnap, matchesSnap, rulesSnap] = await Promise.all([
      db.collection("tournamentStandings").where("phaseId", "==", phase.id).get(),
      db.collection("tournamentMatches").where("phaseId", "==", phase.id).get(),
      db.collection("tournamentAdvancementRules").doc(`${tournament.id}_${phase.type}_${nextPhase.type}`).get(),
    ]);
    const standings = standingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const matches = matchesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const fallbackRules = buildDefaultAdvancementRules(tournament.structure || {});
    const advancementRules = {
      ...fallbackRules,
      ...(phase.config || {}),
      ...(rulesSnap.exists ? (rulesSnap.data()?.rules || {}) : {}),
      startFrom: nextPhase.config?.startFrom || tournament.structure?.knockoutStage?.startFrom || fallbackRules.startFrom,
      bracketSize: nextPhase.config?.bracketSize || fallbackRules.bracketSize,
    };

    const advancement = buildAdvancementSummary({
      standings,
      matches,
      rules: advancementRules,
    });

    standings.forEach((row) => {
      const rankedRow = advancement.groupRankings
        .flatMap((group) => group.rankedRows)
        .find((item) => item.id === row.id);
      const qualifiedRow = advancement.qualifiedRows.find((item) => item.id === row.id);
      batch.set(db.collection("tournamentStandings").doc(row.id), {
        position: rankedRow?.position || row.position || 0,
        qualified: Boolean(qualifiedRow),
        qualificationType: qualifiedRow?.qualificationType || null,
        seed: qualifiedRow?.seed || null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const teams = advancement.orderedSeeds.map((row) => ({
      id: row.teamId,
      seed: row.bracketSeed,
      sourceGroupLabel: row.groupLabel || null,
      sourcePosition: row.position || null,
      qualificationType: row.qualificationType || null,
    }));
    const startFrom = advancement.rules.startFrom || nextPhase.config?.startFrom || tournament.structure?.knockoutStage?.startFrom || "semi";
    assertKnockoutTeamCount({ teamCount: teams.length, startFrom, allowByes: false, context: "armar la llave eliminatoria" });
    const knockoutConfig = getKnockoutConfig(startFrom);
    const knockoutMatches = generateKnockoutBracket(tournament, teams, 1, nextPhase.type, {
      phaseId: nextPhase.id,
      phaseType: nextPhase.type,
      startFrom,
      allowByes: false,
    });
    knockoutMatches.forEach((match) => {
      const matchRef = db.collection("tournamentMatches").doc(match.id);
      batch.set(matchRef, {
        tournamentId: tournament.id,
        phaseId: nextPhase.id,
        phaseType: nextPhase.type,
        groupLabel: null,
        round: match.round,
        roundLabel: match.roundLabel || null,
        bracketIndex: Number(match.bracketIndex || match.sequence || 1),
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
    });

    batch.set(db.collection("tournamentPhases").doc(phase.id), {
      config: {
        ...(phase.config || {}),
        standingsClosed: true,
        qualifiedTeamsPublished: advancement.qualifiedRows.map((row) => ({
          teamId: row.teamId,
          groupLabel: row.groupLabel || null,
          position: row.position || null,
          seed: row.seed || null,
          qualificationType: row.qualificationType || null,
          points: Number(row.stats?.points || 0),
          setsDiff: Number(row.stats?.setsDiff || 0),
          pointsDiff: Number(row.stats?.pointsDiff || 0),
        })),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    nextPhaseUpdate.config = {
      ...(nextPhase.config || {}),
      startFrom,
      bracketSize: knockoutConfig.bracketSize,
      allowByes: false,
      currentRoundLabel: knockoutMatches[0]?.roundLabel || null,
      qualifiedTeams: advancement.orderedSeeds.map((row) => ({
        teamId: row.teamId,
        seed: row.bracketSeed,
        standingsSeed: row.seed || null,
        groupLabel: row.groupLabel || null,
        position: row.position || null,
        qualificationType: row.qualificationType || null,
      })),
      qualificationRules: advancement.rules,
      fixture: {
        generated: knockoutMatches.length > 0,
        generationMode: "full_bracket",
        totalRounds: knockoutConfig.roundLabels.length,
        totalMatchdays: 0,
        roundLabels: knockoutConfig.roundLabels,
        matchesCount: knockoutMatches.length,
      },
    };
    nextPhaseUpdate.confirmedAt = FieldValue.serverTimestamp();
    nextPhaseUpdate.updatedAt = FieldValue.serverTimestamp();
  }

  batch.update(nextPhaseRef, nextPhaseUpdate);
  await batch.commit();
  return { advanced: true, nextPhaseId: nextPhase.id, nextPhaseType: nextPhase.type };
}

async function recordMatchResult({ matchId, result }) {
  if (typeof matchId !== "string" || !matchId) throw new functions.https.HttpsError("invalid-argument", "matchId inválido");
  if (!result || typeof result !== "object") throw new functions.https.HttpsError("invalid-argument", "result inválido");

  const matchRef = db.collection("tournamentMatches").doc(matchId);
  let phaseCompleted = false;
  let tournament = null;
  let phase = null;

  await db.runTransaction(async (trx) => {
    const matchSnap = await trx.get(matchRef);
    if (!matchSnap.exists) throw new functions.https.HttpsError("not-found", "El partido no existe");
    const match = { id: matchSnap.id, ...matchSnap.data() };

    if (!match.homeTeamId || !match.awayTeamId) {
      throw new functions.https.HttpsError("failed-precondition", "El partido todavía no tiene ambos equipos definidos");
    }

    const tournamentSnap = await trx.get(db.collection("tournaments").doc(match.tournamentId));
    const phaseSnap = await trx.get(db.collection("tournamentPhases").doc(match.phaseId));
    tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };
    phase = { id: phaseSnap.id, ...phaseSnap.data() };

    const settings = tournament.settings || {};
    const homeSets = Number(result.homeSets || 0);
    const awaySets = Number(result.awaySets || 0);
    const winnerId = result.winnerId || (homeSets > awaySets ? match.homeTeamId : match.awayTeamId);
    const loserId = winnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    const homeStandingRef = db.collection("tournamentStandings").doc(`${match.tournamentId}_${match.phaseId}_${match.homeTeamId}`);
    const awayStandingRef = db.collection("tournamentStandings").doc(`${match.tournamentId}_${match.phaseId}_${match.awayTeamId}`);
    const matchesQuery = db.collection("tournamentMatches").where("phaseId", "==", match.phaseId);
    const standingsQuery = db.collection("tournamentStandings").where("phaseId", "==", match.phaseId);
    const [homeStandingSnap, awayStandingSnap, matchesSnap, standingsSnap] = await Promise.all([
      trx.get(homeStandingRef),
      trx.get(awayStandingRef),
      trx.get(matchesQuery),
      trx.get(standingsQuery),
    ]);

    if (homeSets === awaySets) {
      throw new functions.https.HttpsError("invalid-argument", "El resultado no puede terminar empatado en sets");
    }

    if (![match.homeTeamId, match.awayTeamId].includes(winnerId)) {
      throw new functions.https.HttpsError("invalid-argument", "winnerId inválido");
    }

    const homePointsList = Array.isArray(result.homePoints) ? result.homePoints.map((value) => Number(value || 0)) : [];
    const awayPointsList = Array.isArray(result.awayPoints) ? result.awayPoints.map((value) => Number(value || 0)) : [];

    if (homePointsList.length !== awayPointsList.length) {
      throw new functions.https.HttpsError("invalid-argument", "Los puntos por set de ambos equipos deben tener la misma cantidad de sets");
    }

    const maxRecordedSets = Math.max(homeSets, awaySets, homePointsList.length, awayPointsList.length);
    if (homePointsList.length > 0 && maxRecordedSets !== homePointsList.length) {
      throw new functions.https.HttpsError("invalid-argument", "La cantidad de puntos por set debe coincidir con la cantidad de sets informados");
    }

    const homeStats = { ...(homeStandingSnap.data()?.stats || {}) };
    const awayStats = { ...(awayStandingSnap.data()?.stats || {}) };
    const sum = (list) => list.reduce((acc, value) => acc + Number(value || 0), 0);
    const homeWon = winnerId === match.homeTeamId;
    const awayWon = winnerId === match.awayTeamId;

    const nextHome = {
      played: Number(homeStats.played || 0) + 1,
      won: Number(homeStats.won || 0) + (homeWon ? 1 : 0),
      draw: Number(homeStats.draw || 0),
      lost: Number(homeStats.lost || 0) + (homeWon ? 0 : 1),
      points: Number(homeStats.points || 0) + (homeWon ? Number(settings.pointsWin || 0) : Number(settings.pointsLose || 0)),
      setsFor: Number(homeStats.setsFor || 0) + homeSets,
      setsAgainst: Number(homeStats.setsAgainst || 0) + awaySets,
      pointsFor: Number(homeStats.pointsFor || 0) + sum(homePointsList),
      pointsAgainst: Number(homeStats.pointsAgainst || 0) + sum(awayPointsList),
    };
    nextHome.setsDiff = nextHome.setsFor - nextHome.setsAgainst;
    nextHome.pointsDiff = nextHome.pointsFor - nextHome.pointsAgainst;

    const nextAway = {
      played: Number(awayStats.played || 0) + 1,
      won: Number(awayStats.won || 0) + (awayWon ? 1 : 0),
      draw: Number(awayStats.draw || 0),
      lost: Number(awayStats.lost || 0) + (awayWon ? 0 : 1),
      points: Number(awayStats.points || 0) + (awayWon ? Number(settings.pointsWin || 0) : Number(settings.pointsLose || 0)),
      setsFor: Number(awayStats.setsFor || 0) + awaySets,
      setsAgainst: Number(awayStats.setsAgainst || 0) + homeSets,
      pointsFor: Number(awayStats.pointsFor || 0) + sum(awayPointsList),
      pointsAgainst: Number(awayStats.pointsAgainst || 0) + sum(homePointsList),
    };
    nextAway.setsDiff = nextAway.setsFor - nextAway.setsAgainst;
    nextAway.pointsDiff = nextAway.pointsFor - nextAway.pointsAgainst;

    trx.update(matchRef, { result: { ...result, winnerId }, status: "completed", updatedAt: FieldValue.serverTimestamp() });
    trx.set(homeStandingRef, { ...buildStandingsDoc({ tournamentId: match.tournamentId, phase, teamId: match.homeTeamId, groupLabel: match.groupLabel || null }), stats: nextHome }, { merge: true });
    trx.set(awayStandingRef, { ...buildStandingsDoc({ tournamentId: match.tournamentId, phase, teamId: match.awayTeamId, groupLabel: match.groupLabel || null }), stats: nextAway }, { merge: true });

    const nextMatches = matchesSnap.docs.map((doc) => {
      if (doc.id !== match.id) return { id: doc.id, ...doc.data() };
      return {
        id: doc.id,
        ...doc.data(),
        status: "completed",
        result: { ...result, winnerId },
      };
    });
    const nextRows = standingsSnap.docs.map((doc) => {
      if (doc.id === homeStandingRef.id) {
        return {
          id: doc.id,
          ...doc.data(),
          teamId: match.homeTeamId,
          groupLabel: match.groupLabel || null,
          stats: nextHome,
        };
      }

      if (doc.id === awayStandingRef.id) {
        return {
          id: doc.id,
          ...doc.data(),
          teamId: match.awayTeamId,
          groupLabel: match.groupLabel || null,
          stats: nextAway,
        };
      }

      return { id: doc.id, ...doc.data() };
    });

    const phaseUpdate = { updatedAt: FieldValue.serverTimestamp() };

    if (phase.type === PHASE_TYPES.KNOCKOUT || phase.type === PHASE_TYPES.FINAL) {
      nextMatches
        .filter((nextMatch) => nextMatch.sourceHomeMatchId === match.id || nextMatch.sourceAwayMatchId === match.id)
        .forEach((nextMatch) => {
          const nextPayload = { updatedAt: FieldValue.serverTimestamp() };
          if (nextMatch.sourceHomeMatchId === match.id) nextPayload.homeTeamId = winnerId;
          if (nextMatch.sourceAwayMatchId === match.id) nextPayload.awayTeamId = winnerId;
          trx.update(db.collection("tournamentMatches").doc(nextMatch.id), nextPayload);
        });

      const roundLabels = getKnockoutRoundLabels(phase.config?.startFrom || tournament.structure?.knockoutStage?.startFrom || "semi");
      const updatedMatches = nextMatches.map((nextMatch) => {
        if (nextMatch.id !== match.id) return nextMatch;
        return { ...nextMatch, status: "completed", result: { ...result, winnerId } };
      }).map((nextMatch) => {
        if (nextMatch.sourceHomeMatchId === match.id) return { ...nextMatch, homeTeamId: winnerId };
        if (nextMatch.sourceAwayMatchId === match.id) return { ...nextMatch, awayTeamId: winnerId };
        return nextMatch;
      });

      const currentRoundLabel = match.roundLabel || roundLabels[0] || null;
      const currentRoundCompleted = updatedMatches
        .filter((nextMatch) => nextMatch.roundLabel === currentRoundLabel)
        .every((nextMatch) => nextMatch.status === "completed");
      const nextRoundLabel = currentRoundCompleted
        ? roundLabels[roundLabels.indexOf(currentRoundLabel) + 1] || currentRoundLabel
        : currentRoundLabel;

      phaseUpdate.config = {
        ...(phase.config || {}),
        currentRoundLabel: nextRoundLabel,
        lastWinnerTeamId: winnerId,
        lastEliminatedTeamId: loserId,
      };
    }

    const rowsByGroup = nextRows.reduce((acc, row) => {
      const key = row.groupLabel || "_";
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});

    Object.entries(rowsByGroup).forEach(([groupKey, rows]) => {
      const rankedRows = sortStandingsRows(
        rows,
        nextMatches.filter((nextMatch) => (nextMatch.groupLabel || "_") === groupKey)
      );
      rankedRows.forEach((row) => {
        trx.set(db.collection("tournamentStandings").doc(row.id), { position: row.position, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
    });

    phaseCompleted = nextMatches.every((nextMatch) => nextMatch.status === "completed");

    if (phaseCompleted) {
      phaseUpdate.status = PHASE_STATUS.COMPLETED;
      phaseUpdate.completedAt = FieldValue.serverTimestamp();
    }

    if (Object.keys(phaseUpdate).length > 0) {
      trx.update(db.collection("tournamentPhases").doc(match.phaseId), phaseUpdate);
    }
  });

  if (phaseCompleted && tournament && phase) {
    await advancePhase({ tournament, phase });
  }

  return { ok: true, phaseCompleted };
}

module.exports = {
  getTournamentAndPhase,
  buildStandingsDoc,
  sortStandingsRows,
  advancePhase,
  recordMatchResult,
};
