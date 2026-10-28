"use strict";

function dashboardTaskProjectionEnabled(environment = process.env) {
  return String(environment.ENABLE_DASHBOARD_TASK_PROJECTION || "false").toLowerCase() === "true";
}

module.exports = { dashboardTaskProjectionEnabled };
