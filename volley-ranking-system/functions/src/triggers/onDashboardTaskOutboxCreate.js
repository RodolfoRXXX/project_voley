"use strict";

const functions = require("firebase-functions/v1");
const { dashboardTaskProjectionEnabled } = require("../dashboardTasks/application/dashboardTaskProjectionFlag");
const { worker } = require("../dashboardTasks/infrastructure/dashboardTaskModule");

module.exports = functions.firestore.document("dashboardTaskOutbox/{eventId}").onCreate(async (_snapshot, context) => {
  if (!dashboardTaskProjectionEnabled()) return null;
  await worker.processOne(context.params.eventId); return null;
});
