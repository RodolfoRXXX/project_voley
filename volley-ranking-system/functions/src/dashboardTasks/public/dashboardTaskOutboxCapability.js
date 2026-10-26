"use strict";

const { createDashboardTaskOutboxWriter } = require("../infrastructure/firestoreDashboardTaskOutboxWriter");
const { eventId, hash } = require("../application/dashboardTaskModel");

function createDashboardTaskOutboxCapability({ db, now }) {
  const writer = createDashboardTaskOutboxWriter({ db, ...(now ? { now } : {}) });
  return Object.freeze({
    async prepare(unitOfWork, { kind, idempotencyIdentity, groupId, resourceType, resourceIds, fingerprintParts = [], generationId }) {
      return writer.prepare(unitOfWork, {
        eventId: eventId(kind, idempotencyIdentity), kind, groupId, resourceType, resourceIds,
        sourceFingerprint: hash("dashboard-task-source-v1", kind, ...fingerprintParts), ...(generationId ? { generationId } : {}),
      });
    },
  });
}

module.exports = { createDashboardTaskOutboxCapability };
