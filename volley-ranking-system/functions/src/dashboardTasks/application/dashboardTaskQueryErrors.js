"use strict";

class DashboardTaskQueryError extends Error {
  constructor(reason, message = reason, options = {}) {
    super(message, options);
    this.name = "DashboardTaskQueryError";
    this.reason = reason;
  }
}

const error = (reason) => class extends DashboardTaskQueryError {
  constructor(options = {}) { super(reason, reason, options); }
};

module.exports = {
  DashboardTaskQueryError,
  DashboardTaskUnauthenticatedError: error("UNAUTHENTICATED"),
  DashboardTaskValidationError: error("VALIDATION_FAILED"),
  DashboardTaskProjectionDisabledError: error("PROJECTION_DISABLED"),
  DashboardTaskProjectionNotReadyError: error("PROJECTION_NOT_READY"),
  DashboardTaskCoverageChangedError: error("COVERAGE_CHANGED"),
  DashboardTaskIncompatibleStateError: error("INCOMPATIBLE_STATE"),
  DashboardTaskDependencyUnavailableError: error("DEPENDENCY_UNAVAILABLE"),
  DashboardTaskInvalidCursorError: error("INVALID_CURSOR"),
  DashboardTaskExpiredCursorError: error("CURSOR_EXPIRED"),
};
