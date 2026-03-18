const functions = require("firebase-functions/v1");
const { assertIsAdmin } = require("../src/services/adminAccessService");
const { assertTournamentAdmin } = require("../src/services/tournamentService");
const { getTournamentAndPhase, advancePhase } = require("../src/services/tournamentPhaseService");

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "No autenticado");
  const uid = context.auth.uid;
  await assertIsAdmin(uid);
  const tournamentId = typeof data?.tournamentId === "string" ? data.tournamentId.trim() : "";
  const phaseId = typeof data?.phaseId === "string" ? data.phaseId.trim() : "";
  if (!tournamentId) throw new functions.https.HttpsError("invalid-argument", "tournamentId inválido");
  const { tournament, phase } = await getTournamentAndPhase({ tournamentId, phaseId });
  assertTournamentAdmin(tournament, uid);
  return advancePhase({ tournament, phase });
});
