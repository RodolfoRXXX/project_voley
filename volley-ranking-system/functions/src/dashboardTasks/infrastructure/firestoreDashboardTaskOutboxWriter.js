"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { EVENT_STATUS, SCOPE_STATUS, GENERATION } = require("../application/dashboardTaskModel");

function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }

function createDashboardTaskOutboxWriter({ db, now = () => Timestamp.now() }) {
  if (!db || typeof now !== "function") throw new TypeError("Dashboard task outbox dependencies are required");
  const scopes = db.collection("dashboardTaskScopes");
  const outbox = db.collection("dashboardTaskOutbox");

  async function prepare(transaction, input) {
    if (!transaction || !validId(input?.eventId) || !validId(input?.groupId) || !validId(input?.kind)
      || !validId(input?.resourceType) || !Array.isArray(input?.resourceIds) || input.resourceIds.some((id) => !validId(id))) {
      throw new TypeError("Invalid dashboard task event");
    }
    const eventRef = outbox.doc(input.eventId);
    const scopeRef = scopes.doc(input.groupId);
    const [eventSnapshot, scopeSnapshot] = await transaction.getAll(eventRef, scopeRef);
    if (eventSnapshot.exists) {
      const existing = eventSnapshot.data();
      if (existing.groupId !== input.groupId || existing.kind !== input.kind || existing.sourceFingerprint !== input.sourceFingerprint) {
        throw new Error("DASHBOARD_TASK_EVENT_IDEMPOTENCY_CONFLICT");
      }
      return Object.freeze({ duplicate: true, revision: existing.scopeRevision, commit() {} });
    }
    const scope = scopeSnapshot.exists ? scopeSnapshot.data() : {};
    const sourceRevision = Number.isSafeInteger(scope.sourceRevision) ? scope.sourceRevision : 0;
    const projectedRevision = Number.isSafeInteger(scope.projectedRevision) ? scope.projectedRevision : 0;
    const revision = sourceRevision + 1;
    const createdAt = now();
    return Object.freeze({
      duplicate: false,
      revision,
      commit() {
        transaction.set(scopeRef, {
          groupId: input.groupId,
          sourceRevision: revision,
          projectedRevision,
          status: scope.status === SCOPE_STATUS.REBUILDING ? SCOPE_STATUS.REBUILDING : SCOPE_STATUS.DIRTY,
          coverageComplete: scope.coverageComplete === true,
          writeGenerationId: input.generationId || scope.writeGenerationId || GENERATION,
          updatedAt: createdAt,
          schemaVersion: 1,
        });
        transaction.set(eventRef, {
          eventId: input.eventId,
          groupId: input.groupId,
          scopeRevision: revision,
          kind: input.kind,
          resourceType: input.resourceType,
          resourceIds: input.resourceIds,
          sourceFingerprint: input.sourceFingerprint,
          generationId: input.generationId || scope.writeGenerationId || GENERATION,
          status: EVENT_STATUS.PENDING,
          availableAt: createdAt,
          attempts: 0,
          failureAttempts: 0,
          retryExhausted: false,
          createdAt,
          updatedAt: createdAt,
          schemaVersion: 1,
        });
      },
    });
  }

  return Object.freeze({ prepare });
}

module.exports = { createDashboardTaskOutboxWriter };
