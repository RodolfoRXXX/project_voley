"use strict";

const functions = require("firebase-functions/v1");
const { worker } = require("../dashboardTasks/infrastructure/dashboardTaskModule");

module.exports = functions.firestore.document("dashboardTaskOutbox/{eventId}").onCreate(async (_snapshot, context) => {
  await worker.processOne(context.params.eventId); return null;
});
