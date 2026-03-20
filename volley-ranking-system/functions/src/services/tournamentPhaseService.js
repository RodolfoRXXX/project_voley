const functions = require("firebase-functions/v1");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../firebase");
const { PHASE_STATUS, PHASE_TYPES, TOURNAMENT_STATUS } = require("./tournamentService");
const {
  generateBalancedGroups,
  generateKnockoutBracket,
  generateRoundRobinMatches,
} = require("./tournamentFixtureService");

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
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function sortStandingsRows(rows) {
  return [...rows].sort((a, b) => {
    const aStats = a.stats || {};
    const bStats = b.stats || {};
    return (bStats.points || 0) - (aStats.points || 0)
      || (bStats.setsDiff || 0) - (aStats.setsDiff || 0)
      || (bStats.pointsDiff || 0) - (aStats.pointsDiff || 0)
      || String(a.teamId).localeCompare(String(b.teamId));
  }).map((row, index) => ({ ...row, position: index + 1 }));
}

async function advancePhase({ tournament, phase }) {
  const phasesSnap = await db.collection("tournamentPhases").where("tournamentId", "==", tournament.id).get();
  const phases = phasesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order);
  const currentIndex = phases.findIndex((item) => item.id === phase.id);
  const nextPhase = currentIndex >= 0 ? phases[currentIndex + 1] : null;

  if (!nextPhase) {
    await db.collection("tournaments").doc(tournament.id).update({
      status: TOURNAMENT_STATUS.FINISHED,
      currentPhaseId: phase.id,
      currentPhaseType: phase.type,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { advanced: false, finished: true };
  }

  const batch = db.batch();
  const tournamentRef = db.collection("tournaments").doc(tournament.id);
  const nextPhaseRef = db.collection("tournamentPhases").doc(nextPhase.id);

  batch.update(nextPhaseRef, { status: PHASE_STATUS.ACTIVE, updatedAt: FieldValue.serverTimestamp() });
  batch.update(tournamentRef, {
    status: TOURNAMENT_STATUS.ACTIVE,
    currentPhaseId: nextPhase.id,
    currentPhaseType: nextPhase.type,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (phase.type === PHASE_TYPES.GROUP_STAGE && nextPhase.type === PHASE_TYPES.KNOCKOUT) {
    const standingsSnap = await db.collection("tournamentStandings").where("phaseId", "==", phase.id).get();
    const standings = standingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const standingsByGroup = standings.reduce((acc, row) => {
      const key = row.groupLabel || "_";
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});

    const qualified = Object.values(standingsByGroup)
      .flatMap((rows) => sortStandingsRows(rows).slice(0, 2))
      .map((row) => row.teamId);

    standings.forEach((row) => {
      batch.update(db.collection("tournamentStandings").doc(row.id), {
        qualified: qualified.includes(row.teamId),
        position: sortStandingsRows(standingsByGroup[row.groupLabel || "_"]).find((item) => item.id === row.id)?.position || row.position || 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const seededRows = sortStandingsRows(standings.filter((row) => qualified.includes(row.teamId)));
    const teams = seededRows.map((row) => ({ id: row.teamId }));
    const knockoutMatches = generateKnockoutBracket(tournament, teams, 1, nextPhase.type, { phaseId: nextPhase.id, phaseType: nextPhase.type });
    knockoutMatches.forEach((match) => {
      const matchRef = db.collection("tournamentMatches").doc(match.id);
      batch.set(matchRef, {
        tournamentId: tournament.id,
        phaseId: nextPhase.id,
        phaseType: nextPhase.type,
        groupLabel: null,
        round: match.round,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        status: "scheduled",
        result: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

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

    const tournamentSnap = await trx.get(db.collection("tournaments").doc(match.tournamentId));
    const phaseSnap = await trx.get(db.collection("tournamentPhases").doc(match.phaseId));
    tournament = { id: tournamentSnap.id, ...tournamentSnap.data() };
    phase = { id: phaseSnap.id, ...phaseSnap.data() };

    const settings = tournament.settings || {};
    const homeSets = Number(result.homeSets || 0);
    const awaySets = Number(result.awaySets || 0);
    const winnerId = result.winnerId || (homeSets > awaySets ? match.homeTeamId : match.awayTeamId);
    const homeStandingRef = db.collection("tournamentStandings").doc(`${match.tournamentId}_${match.phaseId}_${match.homeTeamId}`);
    const awayStandingRef = db.collection("tournamentStandings").doc(`${match.tournamentId}_${match.phaseId}_${match.awayTeamId}`);
    const matchesQuery = db.collection("tournamentMatches").where("phaseId", "==", match.phaseId);
    const [homeStandingSnap, awayStandingSnap, matchesSnap] = await Promise.all([
      trx.get(homeStandingRef),
      trx.get(awayStandingRef),
      trx.get(matchesQuery),
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

    phaseCompleted = matchesSnap.docs.every((doc) => {
      if (doc.id === match.id) return true;
      return doc.data().status === "completed";
    });

    if (phaseCompleted) {
      trx.update(db.collection("tournamentPhases").doc(match.phaseId), { status: PHASE_STATUS.COMPLETED, completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
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
