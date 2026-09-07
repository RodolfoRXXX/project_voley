"use strict";
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupJoinRequestStateError, buildGroupJoinRequest } = require("../domain/groupJoinRequest");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const {
  GroupJoinRequestActiveMembershipExistsError,
  GroupJoinRequestConflictError,
  GroupJoinRequestError,
  GroupJoinRequestGroupIncompatibleError,
  GroupJoinRequestGroupNotAvailableError,
  GroupJoinRequestIdempotencyConflictError,
  GroupJoinRequestIncompatibleStateError,
  GroupJoinRequestNotAuthorizedError,
  GroupJoinRequestOwnerCannotRequestError,
  GroupJoinRequestRequestAlreadyPendingError,
  GroupJoinRequestRequestNotFoundError,
  GroupJoinRequestRequestNotPendingError,
  GroupJoinRequestDependencyUnavailableError,
} = require("../application/groupJoinRequestErrors");
const { decodeGroupJoinRequestCursor, encodeGroupJoinRequestCursor } = require("../application/groupJoinRequestCursor");
const { groupJoinRequestHash, groupJoinRequestIntentId, pendingGroupJoinRequestGuardId } = require("../application/groupJoinRequestHashing");

const GUARD_FIELDS = Object.freeze(["requestId", "personId", "groupId", "createdAt", "guardVersion"]);
const INTENT_FIELDS = Object.freeze(["requestId", "personId", "groupId", "requestHash", "createdAt", "intentVersion"]);
const HASH = /^[a-f0-9]{64}$/;
function exact(data, expected) { if (!data || typeof data !== "object" || Array.isArray(data)) return false; const a = Object.keys(data).sort(); const b = [...expected].sort(); return a.length === b.length && !a.some((key, i) => key !== b[i]); }
function validId(value) { return typeof value === "string" && value && value.trim() === value && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500; }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function hydrateGuard(snapshot, { guardId, personId, groupId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!exact(data, GUARD_FIELDS) || !validId(data.requestId) || data.personId !== personId || data.groupId !== groupId || !validTimestamp(data.createdAt) || data.guardVersion !== 1 || snapshot.id !== guardId || guardId !== pendingGroupJoinRequestGuardId(groupId, personId)) throw new GroupJoinRequestIncompatibleStateError();
  return Object.freeze(data);
}
function hydrateIntent(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!exact(data, INTENT_FIELDS) || !validId(data.requestId) || !validId(data.personId) || !validId(data.groupId) || !HASH.test(data.requestHash || "") || !validTimestamp(data.createdAt) || data.intentVersion !== 1) throw new GroupJoinRequestIncompatibleStateError();
  return Object.freeze(data);
}
function resolvePending(snapshot, guard, context) {
  if (snapshot.size > 1) throw new GroupJoinRequestIncompatibleStateError();
  const request = snapshot.empty ? null : context.repository.fromSnapshot(snapshot.docs[0]);
  if (!request && !guard) return null;
  if (!request || !guard || request.requestId !== guard.requestId || request.personId !== guard.personId || request.groupId !== guard.groupId || request.personId !== context.personId || request.groupId !== context.groupId || request.createdAt.toDate().getTime() !== guard.createdAt.toDate().getTime()) throw new GroupJoinRequestIncompatibleStateError();
  return request;
}
function mapFailure(error) {
  if (error instanceof GroupJoinRequestError) return error;
  if (error instanceof InvalidGroupJoinRequestStateError) return new GroupJoinRequestIncompatibleStateError({ cause: error });
  if (isTransientDependencyError(error)) return new GroupJoinRequestDependencyUnavailableError({ cause: error });
  if ([10, "10", "aborted", "ABORTED"].includes(error?.code)) return new GroupJoinRequestConflictError({ cause: error });
  return error;
}

function createFirestoreGroupJoinRequestStore({ db, groupCapability, personCapability, membershipCapability, repository }) {
  if (!db || !groupCapability || !personCapability || !membershipCapability || !repository) throw new TypeError("Group join request store dependencies are required");
  const guardRef = (groupId, personId) => db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groupId, personId));
  const intentRef = (userId, key) => db.collection("groupJoinRequestIntents").doc(groupJoinRequestIntentId(userId, key));

  async function candidateGroup(unitOfWork, groupId, userId) {
    const context = await groupCapability.getCandidateContext({ unitOfWork, groupId, userId });
    if (context?.status !== "available") throw new GroupJoinRequestGroupNotAvailableError();
    if (context.isOwner) throw new GroupJoinRequestOwnerCannotRequestError();
    return context.group;
  }
  async function ownedGroup(unitOfWork, groupId, userId) {
    const context = await groupCapability.getOwnedContext({ unitOfWork, groupId, userId });
    if (context?.status === "incompatible") throw new GroupJoinRequestGroupIncompatibleError();
    if (context?.status !== "owned") throw new GroupJoinRequestNotAuthorizedError();
  }
  async function assertNoActiveMembership(unitOfWork, personId, groupId) {
    const context = await membershipCapability.getActiveContext({ unitOfWork, personId, groupId });
    if (context?.status === "incompatible") throw new GroupJoinRequestIncompatibleStateError();
    if (context?.status !== "absent") throw new GroupJoinRequestActiveMembershipExistsError();
  }

  return {
    async preview({ userId, personId, groupId, observe = () => {} }) {
      try {
        return await db.runTransaction(async (transaction) => {
          observe({ stage: "candidate-context-check", classification: "first-attempt" });
          const group = await candidateGroup(transaction, groupId, userId);
          await assertNoActiveMembership(transaction, personId, groupId);
          observe({ stage: "context-confirmed", classification: "first-attempt" });
          return group;
        });
      } catch (error) { throw mapFailure(error); }
    },

    async create({ userId, personId, groupId, idempotencyKey, observe = () => {} }) {
      const requestId = repository.newId();
      const requestedHash = groupJoinRequestHash(personId, groupId);
      try {
        return await db.runTransaction(async (transaction) => {
          observe({ stage: "candidate-context-check", classification: "first-attempt" });
          await candidateGroup(transaction, groupId, userId);
          await assertNoActiveMembership(transaction, personId, groupId);
          const iRef = intentRef(userId, idempotencyKey);
          const gRef = guardRef(groupId, personId);
          const [intentSnapshot, guardSnapshot] = await transaction.getAll(iRef, gRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId, groupId }));
          observe({ stage: "intent-integrity-check", classification: "first-attempt" });
          const intent = hydrateIntent(intentSnapshot);
          const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId, groupId });
          const pending = resolvePending(pendingSnapshot, guard, { repository, personId, groupId });
          const referencedSnapshot = intent ? await transaction.get(repository.reference(intent.requestId)) : null;
          const referenced = referencedSnapshot ? repository.fromSnapshot(referencedSnapshot) : null;

          if (intent) {
            if (intent.requestHash !== requestedHash || intent.personId !== personId || intent.groupId !== groupId) throw new GroupJoinRequestIdempotencyConflictError();
            if (!referenced || referenced.personId !== personId || referenced.groupId !== groupId || referenced.createdAt.toDate().getTime() !== intent.createdAt.toDate().getTime()) throw new GroupJoinRequestIncompatibleStateError();
            if (referenced.estado === "pendiente" && (!pending || pending.requestId !== referenced.requestId)) throw new GroupJoinRequestIncompatibleStateError();
            observe({ stage: referenced.estado === "pendiente" ? "intent-confirmed" : "cancelled-intent-confirmed", classification: referenced.estado === "pendiente" ? "retry" : "recovery" });
            return { outcome: referenced.estado === "pendiente" ? "EXISTING_PENDING" : "EXISTING_CANCELLED", request: referenced };
          }
          if (pending) throw new GroupJoinRequestRequestAlreadyPendingError();
          const createdAt = Timestamp.now();
          const request = buildGroupJoinRequest({ requestId, personId, groupId, createdAt });
          repository.createInitial(transaction, request);
          transaction.create(gRef, { requestId, personId, groupId, createdAt, guardVersion: 1 });
          transaction.create(iRef, { requestId, personId, groupId, requestHash: requestedHash, createdAt, intentVersion: 1 });
          observe({ stage: "commit-ready", classification: "first-attempt" });
          return { outcome: "CREATED_PENDING", request };
        });
      } catch (error) { throw mapFailure(error); }
    },

    async getCurrent({ personId, groupId, observe = () => {} }) {
      try {
        return await db.runTransaction(async (transaction) => {
          observe({ stage: "authoritative-state-check", classification: "first-attempt" });
          const gRef = guardRef(groupId, personId);
          const guardSnapshot = await transaction.get(gRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId, groupId }));
          const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId, groupId });
          const pending = resolvePending(pendingSnapshot, guard, { repository, personId, groupId });
          observe({ stage: "authoritative-state-confirmed", classification: "first-attempt" });
          return pending;
        });
      } catch (error) { throw mapFailure(error); }
    },

    async cancel({ personId, groupId, requestId, observe = () => {} }) {
      try {
        return await db.runTransaction(async (transaction) => {
          observe({ stage: "authoritative-state-check", classification: "first-attempt" });
          const requestSnapshot = await transaction.get(repository.reference(requestId));
          const gRef = guardRef(groupId, personId);
          const guardSnapshot = await transaction.get(gRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId, groupId }));
          const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId, groupId });
          resolvePending(pendingSnapshot, guard, { repository, personId, groupId });
          const rawRequest = requestSnapshot.exists ? requestSnapshot.data() : null;
          if (!rawRequest || rawRequest.personId !== personId || rawRequest.groupId !== groupId) throw new GroupJoinRequestRequestNotFoundError();
          if (rawRequest.estado !== "pendiente" && rawRequest.estado !== "cancelada") throw new GroupJoinRequestRequestNotPendingError();
          const request = repository.fromSnapshot(requestSnapshot);
          if (request.estado === "cancelada") { observe({ stage: "cancelled-state-confirmed", classification: "recovery" }); return { outcome: "ALREADY_CANCELLED", request }; }
          if (!guard || guard.requestId !== requestId) throw new GroupJoinRequestIncompatibleStateError();
          const cancelled = request.cancel(Timestamp.now());
          repository.updateCancelled(transaction, cancelled);
          transaction.delete(gRef);
          observe({ stage: "cancel-commit-ready", classification: "first-attempt" });
          return { outcome: "CANCELLED", request: cancelled };
        });
      } catch (error) { throw mapFailure(error); }
    },

    async listOwned({ userId, groupId, pageSize, cursor, observe = () => {} }) {
      const position = cursor ? decodeGroupJoinRequestCursor(cursor, groupId) : null;
      try {
        return await db.runTransaction(async (transaction) => {
          observe({ stage: "ownership-check", classification: "first-attempt" });
          await ownedGroup(transaction, groupId, userId);
          observe({ stage: "page-integrity-check", classification: "first-attempt" });
          const pageSnapshot = await transaction.get(repository.pendingGroupQuery({ groupId, pageSize, cursor: position, FieldPath, Timestamp }));
          const pageDocs = pageSnapshot.docs.slice(0, pageSize);
          const requests = pageDocs.map((snapshot) => repository.fromSnapshot(snapshot));
          const composed = [];
          for (const request of requests) {
            const gRef = guardRef(groupId, request.personId);
            const guardSnapshot = await transaction.get(gRef);
            const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: request.personId, groupId }));
            const personContext = await personCapability.getOwnerProjection({ unitOfWork: transaction, personId: request.personId });
            const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: request.personId, groupId });
            const authoritative = resolvePending(pendingSnapshot, guard, { repository, personId: request.personId, groupId });
            if (!authoritative || authoritative.requestId !== request.requestId || personContext?.status !== "found") throw new GroupJoinRequestIncompatibleStateError();
            composed.push({ request, person: personContext.person });
          }
          let nextCursor = null;
          if (pageSnapshot.size > pageSize && requests.length) {
            const last = requests[requests.length - 1];
            nextCursor = encodeGroupJoinRequestCursor({ groupId, seconds: last.createdAt.seconds, nanoseconds: last.createdAt.nanoseconds, lastRequestId: last.requestId });
          }
          observe({ stage: "page-integrity-confirmed", classification: "first-attempt" });
          return { composed, nextCursor };
        });
      } catch (error) { throw mapFailure(error); }
    },
  };
}

module.exports = { GUARD_FIELDS, INTENT_FIELDS, createFirestoreGroupJoinRequestStore, hydrateGuard, hydrateIntent, resolvePending };
