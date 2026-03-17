const functions = require("firebase-functions/v1");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../src/firebase");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin } = require("../src/services/tournamentService");

function isValidMatch(match) {
  return (
    match &&
    typeof match === "object" &&
    typeof match.id === "string" &&
    typeof match.phase === "string" &&
    Number.isFinite(match.round) &&
    typeof match.homeTeamId === "string" &&
    typeof match.awayTeamId === "string" &&
    match.homeTeamId !== match.awayTeamId &&
    match.status === "pending"
  );
}

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  }

  const uid = context.auth.uid;
  await assertIsAdmin(uid);

  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  const matches = data?.matches;

  if (!tournamentId) {
    throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  }

  if (!Array.isArray(matches) || matches.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "matches inválido");
  }

  if (!matches.every(isValidMatch)) {
    throw new functions.https.HttpsError("invalid-argument", "Hay partidos inválidos en el fixture");
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

  const existingMatchesSnap = await db
    .collection("tournamentMatches")
    .where("tournamentId", "==", tournamentId)
    .limit(1)
    .get();

  if (!existingMatchesSnap.empty) {
    throw new functions.https.HttpsError("already-exists", "El fixture ya fue confirmado");
  }

  const teamsSnap = await db
    .collection("tournamentTeams")
    .where("tournamentId", "==", tournamentId)
    .where("status", "==", "aceptado")
    .get();

  const validTeamIds = new Set(teamsSnap.docs.map((teamDoc) => teamDoc.id));
  const pairSet = new Set();

  for (const match of matches) {
    if (!validTeamIds.has(match.homeTeamId) || !validTeamIds.has(match.awayTeamId)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El fixture contiene equipos que no pertenecen al torneo"
      );
    }

    const pairKey = [match.homeTeamId, match.awayTeamId].sort().join("::");
    if (pairSet.has(pairKey)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El fixture contiene partidos duplicados"
      );
    }

    pairSet.add(pairKey);
  }

  const batch = db.batch();

  for (const match of matches) {
    const matchRef = db.collection("tournamentMatches").doc(match.id);
    batch.set(matchRef, {
      tournamentId,
      phase: match.phase,
      round: match.round,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  batch.update(tournamentRef, {
    status: "activo",
    updatedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { ok: true, matchesCount: matches.length };
});
