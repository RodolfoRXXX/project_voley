const { db } = require("../firebase");
const { syncTournamentPendingAlerts } = require("../services/tournamentPendingAlertsService");

const shouldWrite = process.argv.includes("--write");

async function maybeWrite(description, operation) {
  if (!shouldWrite) { console.log(`[dry-run] ${description}`); return; }
  await operation();
  console.log(`[write] ${description}`);
}

async function backfillTournamentAlerts() {
  const tournamentsSnap = await db.collection("tournaments").get();
  for (const tournamentDoc of tournamentsSnap.docs) {
    const tournament = tournamentDoc.data();
    await maybeWrite(`tournament_pending_alerts -> ${tournamentDoc.id}`, () =>
      syncTournamentPendingAlerts(tournamentDoc.id, null, tournament)
    );
  }
  return tournamentsSnap.size;
}

async function main() {
  console.log(`Backfill de pendingAlerts de Torneo iniciado en modo ${shouldWrite ? "write" : "dry-run"}.`);
  const tournamentAlertsCount = await backfillTournamentAlerts();
  console.log("Backfill de pendingAlerts de Torneo finalizado.", { mode: shouldWrite ? "write" : "dry-run", tournamentAlertsCount });
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("Backfill de pendingAlerts de Torneo falló", error);
  process.exit(1);
});
