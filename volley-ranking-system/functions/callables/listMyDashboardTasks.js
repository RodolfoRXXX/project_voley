"use strict";

const crypto = require("crypto");
const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { dashboardTaskProjectionEnabled } = require("../src/dashboardTasks/application/dashboardTaskProjectionFlag");
const { validateDashboardTaskQuery } = require("../src/dashboardTasks/application/dashboardTaskQueryContract");
const { DashboardTaskDependencyUnavailableError, DashboardTaskProjectionDisabledError } = require("../src/dashboardTasks/application/dashboardTaskQueryErrors");
const { createFirestoreDashboardTaskQuery } = require("../src/dashboardTasks/infrastructure/firestoreDashboardTaskQuery");
const { createDashboardTaskQueryCallable } = require("../src/dashboardTasks/infrastructure/dashboardTaskQueryCallable");

const enabled = dashboardTaskProjectionEnabled();
const configuredSecret = process.env.DASHBOARD_TASK_CURSOR_SECRET;
const query = !enabled
  ? Object.freeze({ async list() { throw new DashboardTaskProjectionDisabledError(); } })
  : !configuredSecret && !process.env.FIRESTORE_EMULATOR_HOST
    ? Object.freeze({ async list() { throw new DashboardTaskDependencyUnavailableError(); } })
    : createFirestoreDashboardTaskQuery({ db,
      cursorSecret: configuredSecret || crypto.randomBytes(32).toString("base64url"), projectionEnabled: true });

module.exports = functions.https.onCall(createDashboardTaskQueryCallable({ query, validate: validateDashboardTaskQuery }));
