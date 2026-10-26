"use strict";

const { db } = require("../../firebase");
const { createFirestoreDashboardTaskProjectionStore } = require("./firestoreDashboardTaskProjectionStore");
const { createDashboardTaskWorker } = require("../application/dashboardTaskWorker");
const { createDashboardTaskOperations } = require("../application/dashboardTaskOperations");

const store = createFirestoreDashboardTaskProjectionStore({ db });
module.exports = Object.freeze({ worker: createDashboardTaskWorker({ store }), operations: createDashboardTaskOperations({ db }) });
