"use strict";

const crypto = require("crypto");
const functions = require("firebase-functions/v1");
const { db } = require("../src/firebase");
const { dashboardTaskProjectionEnabled } = require("../src/dashboardTasks/application/dashboardTaskProjectionFlag");
const { validateDashboardTaskQuery } = require("../src/dashboardTasks/application/dashboardTaskQueryContract");
const { DashboardTaskDependencyUnavailableError, DashboardTaskProjectionDisabledError } = require("../src/dashboardTasks/application/dashboardTaskQueryErrors");
const { createFirestoreDashboardTaskQuery } = require("../src/dashboardTasks/infrastructure/firestoreDashboardTaskQuery");
const { createFirestoreDashboardTaskQueryV2 } = require("../src/dashboardTasks/infrastructure/firestoreDashboardTaskQueryV2");
const { createDashboardTaskQueryCallable } = require("../src/dashboardTasks/infrastructure/dashboardTaskQueryCallable");
const invitations = require("../src/groupInvitations/infrastructure/groupInvitationModule");
const { COVERAGE_V2 } = require("../src/dashboardTasks/application/dashboardTaskModel");

const enabled = dashboardTaskProjectionEnabled();
const configuredSecret = process.env.DASHBOARD_TASK_CURSOR_SECRET;
const cursorSecret = configuredSecret || crypto.randomBytes(32).toString("base64url");
const v1 = !enabled
  ? Object.freeze({ async list() { throw new DashboardTaskProjectionDisabledError(); } })
  : !configuredSecret && !process.env.FIRESTORE_EMULATOR_HOST
    ? Object.freeze({ async list() { throw new DashboardTaskDependencyUnavailableError(); } })
    : createFirestoreDashboardTaskQuery({ db, cursorSecret, projectionEnabled: true });
const v2 = enabled && (configuredSecret || process.env.FIRESTORE_EMULATOR_HOST)
  ? createFirestoreDashboardTaskQueryV2({ v1, invitations, cursorSecret }) : v1;
const query = Object.freeze({ list(accountId, input) { return (input.coverage === COVERAGE_V2 ? v2 : v1).list(accountId, input); } });

module.exports = functions.https.onCall(createDashboardTaskQueryCallable({ query, validate: validateDashboardTaskQuery }));
