"use strict";

const functions = require("firebase-functions/v1");
const { operations } = require("../dashboardTasks/infrastructure/dashboardTaskModule");

module.exports = functions.pubsub.schedule("every 24 hours").timeZone("America/Argentina/Buenos_Aires").onRun(async () => {
  const runId = new Date().toISOString().slice(0, 10);
  const enqueued = await operations.enqueueAll({ runId });
  if (enqueued.truncated) throw new Error("Dashboard task reconciliation context limit reached");
  await operations.health(); await operations.cleanup(); return null;
});
