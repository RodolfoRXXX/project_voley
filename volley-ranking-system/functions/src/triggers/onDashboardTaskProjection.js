"use strict";

const functions = require("firebase-functions/v1");
const { dashboardTaskProjectionEnabled } = require("../dashboardTasks/application/dashboardTaskProjectionFlag");
const { worker } = require("../dashboardTasks/infrastructure/dashboardTaskModule");

module.exports = functions.pubsub.schedule("every 1 minutes").timeZone("America/Argentina/Buenos_Aires").onRun(async () => {
  if (!dashboardTaskProjectionEnabled()) return null;
  await worker.run({ limit: 40 }); return null;
});
