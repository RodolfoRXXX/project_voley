"use strict";

const functions = require("firebase-functions/v1");
const { DashboardTaskQueryError, DashboardTaskUnauthenticatedError } = require("../application/dashboardTaskQueryErrors");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");

const CODES = Object.freeze({ UNAUTHENTICATED: "unauthenticated", VALIDATION_FAILED: "invalid-argument",
  PROJECTION_DISABLED: "failed-precondition", PROJECTION_NOT_READY: "failed-precondition",
  COVERAGE_CHANGED: "aborted", INCOMPATIBLE_STATE: "failed-precondition", DEPENDENCY_UNAVAILABLE: "unavailable",
  INVALID_CURSOR: "invalid-argument", CURSOR_EXPIRED: "failed-precondition",
  GROUP_CONTEXT_NOT_ACCESSIBLE: "permission-denied" });

function toHttps(error) {
  if (error instanceof functions.https.HttpsError) return error;
  if (error instanceof DashboardTaskQueryError) return new functions.https.HttpsError(CODES[error.reason] || "internal", error.message, { reason: error.reason });
  if (isTransientDependencyError(error)) return new functions.https.HttpsError("unavailable", "Dashboard task dependency unavailable", { reason: "DEPENDENCY_UNAVAILABLE" });
  return new functions.https.HttpsError("internal", "Dashboard task query failed", { reason: "INTERNAL_ERROR" });
}

function createDashboardTaskQueryCallable({ query, validate, logger = console }) {
  return async (data, context) => {
    const startedAt = Date.now();
    try {
      if (!context?.auth?.uid) throw new DashboardTaskUnauthenticatedError();
      const result = await query.list(context.auth.uid, validate(data));
      logger.info?.("dashboardTasks.query", { outcome: result.coverage.health, itemCount: result.items.length,
        hasTotal: result.totalTasks !== undefined, durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      logger.warn?.("dashboardTasks.query", { reason: error instanceof DashboardTaskQueryError ? error.reason : "INTERNAL_ERROR",
        durationMs: Date.now() - startedAt });
      throw toHttps(error);
    }
  };
}

module.exports = { CODES, createDashboardTaskQueryCallable, toHttps };
