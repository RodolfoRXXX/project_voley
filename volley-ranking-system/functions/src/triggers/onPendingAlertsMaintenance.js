const functions = require("firebase-functions/v1");
const { cleanupPendingAlerts } = require("../services/pendingAlertsMaintenanceService");

module.exports = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    await cleanupPendingAlerts();
    return null;
  });
