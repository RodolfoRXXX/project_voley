"use strict";

const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupJoinRequestStateError, buildGroupJoinRequest } = require("../domain/groupJoinRequest");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const errors = require("../application/groupJoinRequestErrors");
const { decodeGroupJoinRequestCursor, encodeGroupJoinRequestCursor } = require("../application/groupJoinRequestCursor");
const {
  groupJoinRequestDecisionHash, groupJoinRequestDecisionIntentId, groupJoinRequestHash,
  groupJoinRequestIntentId, groupJoinRequestMembershipHash,
  groupJoinRequestMembershipIdempotencyHash, pendingGroupJoinRequestGuardId,
} = require("../application/groupJoinRequestHashing");

const {
  GroupJoinRequestActiveMembershipExistsError, GroupJoinRequestApprovalInProgressError,
  GroupJoinRequestConflictError, GroupJoinRequestDecisionAlreadyApprovedError,
  GroupJoinRequestDecisionAlreadyRejectedError, GroupJoinRequestDependencyUnavailableError,
  GroupJoinRequestError, GroupJoinRequestGroupIncompatibleError, GroupJoinRequestGroupNotAvailableError,
  GroupJoinRequestIdempotencyConflictError, GroupJoinRequestIncompatibleStateError,
  GroupJoinRequestMembershipReactivationRequiredError, GroupJoinRequestNotAuthorizedError,
  GroupJoinRequestOpenSeasonRequiredError, GroupJoinRequestOwnerCannotRequestError,
  GroupJoinRequestRequestAlreadyPendingError, GroupJoinRequestRequestCancelledError,
  GroupJoinRequestRequestNotFoundError, GroupJoinRequestRequestNotPendingError,
  GroupJoinRequestSeasonIncompatibleError,
} = errors;

const GUARD_FIELDS = Object.freeze(["requestId", "personId", "groupId", "createdAt", "guardVersion"]);
const INTENT_FIELDS = Object.freeze(["requestId", "personId", "groupId", "requestHash", "createdAt", "intentVersion"]);
const DECISION_INTENT_FIELDS = Object.freeze(["requestId", "personId", "groupId", "action", "requestedBy", "requestHash", "createdAt", "intentVersion"]);
const COORDINATION_FIELDS = Object.freeze(["requestId", "personId", "groupId", "seasonId", "decisionIntentId", "requestedBy", "createdAt", "coordinationVersion"]);
const HASH = /^[a-f0-9]{64}$/;
function exact(data, expected) { if (!data || typeof data !== "object" || Array.isArray(data)) return false; const a = Object.keys(data).sort(); const b = [...expected].sort(); return a.length === b.length && !a.some((key, i) => key !== b[i]); }
function validId(value) { return typeof value === "string" && value && value.trim() === value && !value.includes("/") && Buffer.byteLength(value, "utf8") <= 1500; }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
function sameTime(a, b) { return validTimestamp(a) && validTimestamp(b) && a.toDate().getTime() === b.toDate().getTime(); }

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
function hydrateDecisionIntent(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!exact(data, DECISION_INTENT_FIELDS) || !validId(data.requestId) || !validId(data.personId) || !validId(data.groupId) || !["approve", "reject"].includes(data.action) || !validId(data.requestedBy) || !HASH.test(data.requestHash || "") || !validTimestamp(data.createdAt) || data.intentVersion !== 1) throw new GroupJoinRequestIncompatibleStateError();
  return Object.freeze(data);
}
function hydrateCoordination(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!exact(data, COORDINATION_FIELDS) || snapshot.id !== data.requestId || !validId(data.requestId) || !validId(data.personId) || !validId(data.groupId) || !validId(data.seasonId) || !validId(data.decisionIntentId) || !validId(data.requestedBy) || !validTimestamp(data.createdAt) || data.coordinationVersion !== 1) throw new GroupJoinRequestIncompatibleStateError();
  return Object.freeze(data);
}
function resolvePending(snapshot, guard, context) {
  if (snapshot.size > 1) throw new GroupJoinRequestIncompatibleStateError();
  const request = snapshot.empty ? null : context.repository.fromSnapshot(snapshot.docs[0]);
  if (!request && !guard) return null;
  if (!request || !guard || request.requestId !== guard.requestId || request.personId !== guard.personId || request.groupId !== guard.groupId || request.personId !== context.personId || request.groupId !== context.groupId || !sameTime(request.createdAt, guard.createdAt)) throw new GroupJoinRequestIncompatibleStateError();
  return request;
}
function assertDecisionIntent(intent, id, request, action, requestedBy) {
  if (!intent || !id || intent.requestId !== request.requestId || intent.personId !== request.personId || intent.groupId !== request.groupId || intent.action !== action || (requestedBy && intent.requestedBy !== requestedBy) || intent.requestHash !== groupJoinRequestDecisionHash(request.requestId, request.personId, request.groupId, action)) throw new GroupJoinRequestIncompatibleStateError();
}
function assertCoordination(coordination, request, intent, intentId) {
  if (!coordination || coordination.requestId !== request.requestId || coordination.personId !== request.personId || coordination.groupId !== request.groupId || coordination.decisionIntentId !== intentId || coordination.requestedBy !== intent.requestedBy || coordination.createdAt.toDate().getTime() < intent.createdAt.toDate().getTime()) throw new GroupJoinRequestIncompatibleStateError();
}
function assertAlias(intent, request, action, userId) {
  if (!intent) return;
  if (intent.requestId !== request.requestId || intent.personId !== request.personId || intent.groupId !== request.groupId || intent.action !== action || intent.requestedBy !== userId || intent.requestHash !== groupJoinRequestDecisionHash(request.requestId, request.personId, request.groupId, action)) throw new GroupJoinRequestIdempotencyConflictError();
}
function mapFailure(error) {
  if (error instanceof GroupJoinRequestError) return error;
  if (error instanceof InvalidGroupJoinRequestStateError) return new GroupJoinRequestIncompatibleStateError({ cause: error });
  const reason = error?.reason;
  if (reason === "MEMBERSHIP_ALREADY_EXISTS") return new GroupJoinRequestActiveMembershipExistsError({ cause: error });
  if (reason === "MEMBERSHIP_REACTIVATION_REQUIRED") return new GroupJoinRequestMembershipReactivationRequiredError({ cause: error });
  if (reason === "OPEN_SEASON_REQUIRED") return new GroupJoinRequestOpenSeasonRequiredError({ cause: error });
  if (reason === "SEASON_INCOMPATIBLE") return new GroupJoinRequestSeasonIncompatibleError({ cause: error });
  if (reason === "GROUP_INCOMPATIBLE" || reason === "GROUP_NOT_FOUND") return new GroupJoinRequestGroupIncompatibleError({ cause: error });
  if (reason === "INCOMPATIBLE_STATE") return new GroupJoinRequestIncompatibleStateError({ cause: error });
  if (reason === "CONFLICT") return new GroupJoinRequestConflictError({ cause: error });
  if (reason === "DEPENDENCY_UNAVAILABLE" || isTransientDependencyError(error)) return new GroupJoinRequestDependencyUnavailableError({ cause: error });
  if ([10, "10", "aborted", "ABORTED"].includes(error?.code)) return new GroupJoinRequestConflictError({ cause: error });
  return error;
}

function createFirestoreGroupJoinRequestStore({ db, groupCapability, seasonCapability, personCapability, membershipCapability, repository }) {
  if (!db || !groupCapability || !seasonCapability || !personCapability || !membershipCapability || !repository) throw new TypeError("Group join request store dependencies are required");
  const guardRef = (groupId, personId) => db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groupId, personId));
  const intentRef = (userId, key) => db.collection("groupJoinRequestIntents").doc(groupJoinRequestIntentId(userId, key));
  const decisionIntentRef = (userId, key) => db.collection("groupJoinRequestDecisionIntents").doc(groupJoinRequestDecisionIntentId(userId, key));
  const coordinationRef = (requestId) => db.collection("groupJoinRequestApprovalCoordinations").doc(requestId);
  const membershipInput = (request, seasonId) => ({ requestId: request.requestId, personId: request.personId, groupId: request.groupId, seasonId, idempotencyKeyHash: groupJoinRequestMembershipIdempotencyHash(request.requestId, request.personId, request.groupId), requestHash: groupJoinRequestMembershipHash(request.requestId, request.personId, request.groupId, seasonId) });
  const createDecisionIntent = (transaction, ref, request, action, userId, createdAt) => transaction.create(ref, { requestId: request.requestId, personId: request.personId, groupId: request.groupId, action, requestedBy: userId, requestHash: groupJoinRequestDecisionHash(request.requestId, request.personId, request.groupId, action), createdAt, intentVersion: 1 });

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
  async function readCanonicalIntent(transaction, request) {
    if (!["aprobada", "rechazada"].includes(request.estado)) return null;
    const ref = db.collection("groupJoinRequestDecisionIntents").doc(request.decisionIntentId);
    const intent = hydrateDecisionIntent(await transaction.get(ref));
    assertDecisionIntent(intent, request.decisionIntentId, request, request.estado === "aprobada" ? "approve" : "reject", request.decidedBy);
    if (intent.createdAt.toDate().getTime() > request.decidedAt.toDate().getTime()) throw new GroupJoinRequestIncompatibleStateError();
    return intent;
  }
  async function assertTerminal(transaction, request, guard, pending, coordination) {
    if (guard || pending || coordination) throw new GroupJoinRequestIncompatibleStateError();
    await readCanonicalIntent(transaction, request);
    if (request.estado === "aprobada") {
      const member = await membershipCapability.getGroupJoinRequestMembershipContext({ unitOfWork: transaction, requestId: request.requestId, personId: request.personId, groupId: request.groupId, membershipId: request.membershipId });
      if (member?.status !== "correlated") throw new GroupJoinRequestIncompatibleStateError();
      return member;
    }
    return null;
  }
  async function readCoordinationIntent(transaction, request, coordination) {
    if (!coordination) return null;
    const intent = hydrateDecisionIntent(await transaction.get(db.collection("groupJoinRequestDecisionIntents").doc(coordination.decisionIntentId)));
    assertDecisionIntent(intent, coordination.decisionIntentId, request, "approve", coordination.requestedBy);
    assertCoordination(coordination, request, intent, coordination.decisionIntentId);
    return intent;
  }

  async function phaseA({ userId, groupId, requestId, idempotencyKey, observe }) {
    return db.runTransaction(async (transaction) => {
      observe({ stage: "authorization", classification: "first-attempt" });
      await ownedGroup(transaction, groupId, userId);
      const requestSnapshot = await transaction.get(repository.reference(requestId));
      if (!requestSnapshot.exists || requestSnapshot.data()?.groupId !== groupId) throw new GroupJoinRequestRequestNotFoundError();
      const request = repository.fromSnapshot(requestSnapshot);
      const aliasRef = decisionIntentRef(userId, idempotencyKey);
      const gRef = guardRef(groupId, request.personId);
      const cRef = coordinationRef(requestId);
      const [aliasSnapshot, guardSnapshot, coordinationSnapshot] = await transaction.getAll(aliasRef, gRef, cRef);
      const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: request.personId, groupId }));
      const alias = hydrateDecisionIntent(aliasSnapshot);
      const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: request.personId, groupId });
      const pending = resolvePending(pendingSnapshot, guard, { repository, personId: request.personId, groupId });
      const coordination = hydrateCoordination(coordinationSnapshot);
      assertAlias(alias, request, "approve", userId);

      if (request.estado !== "pendiente") {
        const membership = await assertTerminal(transaction, request, guard, pending, coordination);
        if (request.estado === "aprobada") {
          if (!alias) createDecisionIntent(transaction, aliasRef, request, "approve", userId, Timestamp.now());
          return { terminal: true, outcome: "ALREADY_APPROVED", request, membership };
        }
        if (request.estado === "rechazada") throw new GroupJoinRequestDecisionAlreadyRejectedError();
        throw new GroupJoinRequestRequestCancelledError();
      }
      if (!pending || pending.requestId !== requestId || !guard) throw new GroupJoinRequestIncompatibleStateError();
      if (coordination) {
        await readCoordinationIntent(transaction, request, coordination);
        if (!alias) createDecisionIntent(transaction, aliasRef, request, "approve", userId, Timestamp.now());
        observe({ stage: "claim", classification: "recovery" });
        return { terminal: false, request, coordination };
      }
      const season = await seasonCapability.getOpenContextForOwnedGroup({ unitOfWork: transaction, groupId });
      if (season?.status === "absent") throw new GroupJoinRequestOpenSeasonRequiredError();
      if (season?.status !== "open") throw new GroupJoinRequestSeasonIncompatibleError();
      const createdAt = Timestamp.now();
      if (!alias) createDecisionIntent(transaction, aliasRef, request, "approve", userId, createdAt);
      transaction.create(cRef, { requestId, personId: request.personId, groupId, seasonId: season.seasonId, decisionIntentId: aliasRef.id, requestedBy: userId, createdAt, coordinationVersion: 1 });
      observe({ stage: "claim", classification: alias ? "retry" : "first-attempt" });
      return { terminal: false, request, coordination: { requestId, personId: request.personId, groupId, seasonId: season.seasonId, decisionIntentId: aliasRef.id, requestedBy: userId, createdAt, coordinationVersion: 1 } };
    });
  }

  async function phaseC({ requestId, receipt, observe }) {
    return db.runTransaction(async (transaction) => {
      const requestSnapshot = await transaction.get(repository.reference(requestId));
      if (!requestSnapshot.exists) throw new GroupJoinRequestIncompatibleStateError();
      const request = repository.fromSnapshot(requestSnapshot);
      const gRef = guardRef(request.groupId, request.personId);
      const cRef = coordinationRef(requestId);
      const [guardSnapshot, coordinationSnapshot] = await transaction.getAll(gRef, cRef);
      const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: request.personId, groupId: request.groupId }));
      const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: request.personId, groupId: request.groupId });
      const pending = resolvePending(pendingSnapshot, guard, { repository, personId: request.personId, groupId: request.groupId });
      const coordination = hydrateCoordination(coordinationSnapshot);
      if (request.estado === "aprobada") {
        const membership = await assertTerminal(transaction, request, guard, pending, coordination);
        observe({ stage: "authoritative-reread", classification: "recovery" });
        return { outcome: "ALREADY_APPROVED", request, membership };
      }
      if (request.estado !== "pendiente" || !pending || !guard || !coordination) throw new GroupJoinRequestIncompatibleStateError();
      const intent = await readCoordinationIntent(transaction, request, coordination);
      const expected = membershipInput(request, coordination.seasonId);
      const membership = await membershipCapability.getGroupJoinRequestMembershipContext({ unitOfWork: transaction, ...expected, membershipId: receipt.membershipId });
      if (membership?.status !== "correlated") throw new GroupJoinRequestIncompatibleStateError();
      const approved = request.approveAfterMembership({ decisionIntentId: coordination.decisionIntentId, decidedBy: intent.requestedBy, decidedAt: Timestamp.now(), membershipId: membership.membershipId });
      repository.updateApproved(transaction, approved);
      transaction.delete(gRef);
      transaction.delete(cRef);
      observe({ stage: "finalize", classification: receipt.outcome === "RECOVERED_ACTIVE" ? "recovery" : "first-attempt" });
      return { outcome: "APPROVED", request: approved, membership };
    });
  }

  async function releaseClaim({ request, coordination, observe }) {
    return db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(repository.reference(request.requestId));
      if (!currentSnapshot.exists) throw new GroupJoinRequestIncompatibleStateError();
      const current = repository.fromSnapshot(currentSnapshot);
      const gRef = guardRef(current.groupId, current.personId);
      const cRef = coordinationRef(current.requestId);
      const [guardSnapshot, coordinationSnapshot] = await transaction.getAll(gRef, cRef);
      const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: current.personId, groupId: current.groupId }));
      const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: current.personId, groupId: current.groupId });
      const pending = resolvePending(pendingSnapshot, guard, { repository, personId: current.personId, groupId: current.groupId });
      const persistedCoordination = hydrateCoordination(coordinationSnapshot);
      if (current.estado !== "pendiente" || !pending || !guard || !persistedCoordination || persistedCoordination.decisionIntentId !== coordination.decisionIntentId) throw new GroupJoinRequestIncompatibleStateError();
      await readCoordinationIntent(transaction, current, persistedCoordination);
      const membership = await membershipCapability.getGroupJoinRequestMembershipContext({ unitOfWork: transaction, ...membershipInput(current, persistedCoordination.seasonId) });
      if (membership?.status === "correlated" || !["absent", "foreign"].includes(membership?.status)) throw new GroupJoinRequestIncompatibleStateError();
      transaction.delete(cRef);
      observe({ stage: "release", classification: "recovery" });
    });
  }

  return {
    async preview({ userId, personId, groupId, observe = () => {} }) {
      try { return await db.runTransaction(async (transaction) => { observe({ stage: "candidate-context-check", classification: "first-attempt" }); const group = await candidateGroup(transaction, groupId, userId); await assertNoActiveMembership(transaction, personId, groupId); observe({ stage: "context-confirmed", classification: "first-attempt" }); return group; }); }
      catch (error) { throw mapFailure(error); }
    },
    async create({ userId, personId, groupId, idempotencyKey, observe = () => {} }) {
      const requestId = repository.newId(); const requestedHash = groupJoinRequestHash(personId, groupId);
      try {
        return await db.runTransaction(async (transaction) => {
          observe({ stage: "candidate-context-check", classification: "first-attempt" });
          await candidateGroup(transaction, groupId, userId); await assertNoActiveMembership(transaction, personId, groupId);
          const iRef = intentRef(userId, idempotencyKey); const gRef = guardRef(groupId, personId);
          const [intentSnapshot, guardSnapshot] = await transaction.getAll(iRef, gRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId, groupId }));
          const intent = hydrateIntent(intentSnapshot); const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId, groupId });
          const pending = resolvePending(pendingSnapshot, guard, { repository, personId, groupId });
          const referencedSnapshot = intent ? await transaction.get(repository.reference(intent.requestId)) : null;
          const referenced = referencedSnapshot ? repository.fromSnapshot(referencedSnapshot) : null;
          if (intent) {
            if (intent.requestHash !== requestedHash || intent.personId !== personId || intent.groupId !== groupId) throw new GroupJoinRequestIdempotencyConflictError();
            if (!referenced || referenced.personId !== personId || referenced.groupId !== groupId || !sameTime(referenced.createdAt, intent.createdAt)) throw new GroupJoinRequestIncompatibleStateError();
            if (referenced.estado === "pendiente" && (!pending || pending.requestId !== referenced.requestId)) throw new GroupJoinRequestIncompatibleStateError();
            const outcomes = { pendiente: "EXISTING_PENDING", cancelada: "EXISTING_CANCELLED", aprobada: "EXISTING_APPROVED", rechazada: "EXISTING_REJECTED" };
            return { outcome: outcomes[referenced.estado], request: referenced, decisionStatus: referenced.estado === "pendiente" ? await this.readPendingDecisionStatus(transaction, referenced) : undefined };
          }
          if (pending) throw new GroupJoinRequestRequestAlreadyPendingError();
          const createdAt = Timestamp.now(); const request = buildGroupJoinRequest({ requestId, personId, groupId, createdAt });
          repository.createInitial(transaction, request); transaction.create(gRef, { requestId, personId, groupId, createdAt, guardVersion: 1 }); transaction.create(iRef, { requestId, personId, groupId, requestHash: requestedHash, createdAt, intentVersion: 1 });
          return { outcome: "CREATED_PENDING", request, decisionStatus: "PENDING" };
        });
      } catch (error) { throw mapFailure(error); }
    },
    async readPendingDecisionStatus(transaction, request) {
      const coordination = hydrateCoordination(await transaction.get(coordinationRef(request.requestId)));
      if (!coordination) return "PENDING";
      await readCoordinationIntent(transaction, request, coordination);
      return "APPROVAL_IN_PROGRESS";
    },
    async getCurrent({ personId, groupId, observe = () => {} }) {
      try { return await db.runTransaction(async (transaction) => { const gRef = guardRef(groupId, personId); const guardSnapshot = await transaction.get(gRef); const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId, groupId })); const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId, groupId }); const request = resolvePending(pendingSnapshot, guard, { repository, personId, groupId }); const decisionStatus = request ? await this.readPendingDecisionStatus(transaction, request) : null; observe({ stage: "authoritative-state-confirmed", classification: "first-attempt" }); return request ? { request, decisionStatus } : null; }); }
      catch (error) { throw mapFailure(error); }
    },
    async cancel({ personId, groupId, requestId, observe = () => {} }) {
      try {
        return await db.runTransaction(async (transaction) => {
          const requestSnapshot = await transaction.get(repository.reference(requestId));
          const raw = requestSnapshot.exists ? requestSnapshot.data() : null;
          if (!raw || raw.personId !== personId || raw.groupId !== groupId) throw new GroupJoinRequestRequestNotFoundError();
          const request = repository.fromSnapshot(requestSnapshot); const gRef = guardRef(groupId, personId); const cRef = coordinationRef(requestId);
          const [guardSnapshot, coordinationSnapshot] = await transaction.getAll(gRef, cRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId, groupId }));
          const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId, groupId }); const pending = resolvePending(pendingSnapshot, guard, { repository, personId, groupId }); const coordination = hydrateCoordination(coordinationSnapshot);
          if (coordination) await readCoordinationIntent(transaction, request, coordination);
          if (request.estado === "cancelada") { if (guard || pending || coordination) throw new GroupJoinRequestIncompatibleStateError(); return { outcome: "ALREADY_CANCELLED", request }; }
          if (request.estado !== "pendiente") throw new GroupJoinRequestRequestNotPendingError();
          if (!guard || !pending || pending.requestId !== requestId) throw new GroupJoinRequestIncompatibleStateError();
          if (coordination) throw new GroupJoinRequestApprovalInProgressError();
          const cancelled = request.cancel(Timestamp.now()); repository.updateCancelled(transaction, cancelled); transaction.delete(gRef); return { outcome: "CANCELLED", request: cancelled };
        });
      } catch (error) { throw mapFailure(error); }
    },
    async reject({ userId, groupId, requestId, idempotencyKey, observe = () => {} }) {
      try {
        return await db.runTransaction(async (transaction) => {
          await ownedGroup(transaction, groupId, userId);
          const requestSnapshot = await transaction.get(repository.reference(requestId));
          if (!requestSnapshot.exists || requestSnapshot.data()?.groupId !== groupId) throw new GroupJoinRequestRequestNotFoundError();
          const request = repository.fromSnapshot(requestSnapshot); const aliasRef = decisionIntentRef(userId, idempotencyKey); const gRef = guardRef(groupId, request.personId); const cRef = coordinationRef(requestId);
          const [aliasSnapshot, guardSnapshot, coordinationSnapshot] = await transaction.getAll(aliasRef, gRef, cRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: request.personId, groupId }));
          const alias = hydrateDecisionIntent(aliasSnapshot); const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: request.personId, groupId }); const pending = resolvePending(pendingSnapshot, guard, { repository, personId: request.personId, groupId }); const coordination = hydrateCoordination(coordinationSnapshot);
          assertAlias(alias, request, "reject", userId);
          if (request.estado !== "pendiente") {
            await assertTerminal(transaction, request, guard, pending, coordination);
            if (request.estado === "rechazada") { if (!alias) createDecisionIntent(transaction, aliasRef, request, "reject", userId, Timestamp.now()); return { outcome: "ALREADY_REJECTED", request }; }
            if (request.estado === "aprobada") throw new GroupJoinRequestDecisionAlreadyApprovedError();
            throw new GroupJoinRequestRequestCancelledError();
          }
          if (!pending || pending.requestId !== requestId || !guard) throw new GroupJoinRequestIncompatibleStateError();
          if (coordination) { await readCoordinationIntent(transaction, request, coordination); throw new GroupJoinRequestApprovalInProgressError(); }
          const decidedAt = Timestamp.now(); if (!alias) createDecisionIntent(transaction, aliasRef, request, "reject", userId, decidedAt);
          const rejected = request.reject({ decisionIntentId: aliasRef.id, decidedBy: userId, decidedAt }); repository.updateRejected(transaction, rejected); transaction.delete(gRef); observe({ stage: "finalize", classification: alias ? "retry" : "first-attempt" }); return { outcome: "REJECTED", request: rejected };
        });
      } catch (error) { throw mapFailure(error); }
    },
    async approve(args) {
      const observe = args.observe || (() => {});
      let claimed;
      try { claimed = await phaseA({ ...args, observe }); if (claimed.terminal) return claimed; }
      catch (error) { throw mapFailure(error); }
      let receipt;
      try { receipt = await membershipCapability.createOrRecoverForGroupJoinRequest(membershipInput(claimed.request, claimed.coordination.seasonId)); observe({ stage: "membership", classification: receipt.outcome === "RECOVERED_ACTIVE" ? "recovery" : "first-attempt" }); }
      catch (error) {
        const mapped = mapFailure(error);
        if (["ACTIVE_MEMBERSHIP_EXISTS", "MEMBERSHIP_REACTIVATION_REQUIRED", "OPEN_SEASON_REQUIRED", "SEASON_INCOMPATIBLE", "GROUP_INCOMPATIBLE"].includes(mapped.reason)) {
          try { await releaseClaim({ request: claimed.request, coordination: claimed.coordination, observe }); } catch (releaseError) { throw mapFailure(releaseError); }
        }
        throw mapped;
      }
      try { return await phaseC({ requestId: args.requestId, receipt, observe }); }
      catch (error) { throw mapFailure(error); }
    },
    async getDecisionResult({ userId, groupId, requestId, observe = () => {} }) {
      try {
        return await db.runTransaction(async (transaction) => {
          await ownedGroup(transaction, groupId, userId);
          const requestSnapshot = await transaction.get(repository.reference(requestId));
          if (!requestSnapshot.exists || requestSnapshot.data()?.groupId !== groupId) throw new GroupJoinRequestRequestNotFoundError();
          const request = repository.fromSnapshot(requestSnapshot); const gRef = guardRef(groupId, request.personId); const cRef = coordinationRef(requestId);
          const [guardSnapshot, coordinationSnapshot] = await transaction.getAll(gRef, cRef);
          const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: request.personId, groupId }));
          const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: request.personId, groupId }); const pending = resolvePending(pendingSnapshot, guard, { repository, personId: request.personId, groupId }); const coordination = hydrateCoordination(coordinationSnapshot);
          if (request.estado === "pendiente") {
            if (!guard || !pending || pending.requestId !== requestId) throw new GroupJoinRequestIncompatibleStateError();
            if (!coordination) return { status: "PENDING", request };
            await readCoordinationIntent(transaction, request, coordination);
            const membership = await membershipCapability.getGroupJoinRequestMembershipContext({ unitOfWork: transaction, ...membershipInput(request, coordination.seasonId) });
            if (!["absent", "correlated"].includes(membership?.status)) throw new GroupJoinRequestIncompatibleStateError();
            observe({ stage: "authoritative-reread", classification: "recovery" }); return { status: "APPROVAL_IN_PROGRESS", request, coordination };
          }
          const membership = await assertTerminal(transaction, request, guard, pending, coordination);
          return { status: request.estado === "cancelada" ? "CANCELLED" : request.estado === "rechazada" ? "REJECTED" : "APPROVED", request, membership };
        });
      } catch (error) { throw mapFailure(error); }
    },
    async listOwned({ userId, groupId, pageSize, cursor, observe = () => {} }) {
      const position = cursor ? decodeGroupJoinRequestCursor(cursor, groupId) : null;
      try {
        return await db.runTransaction(async (transaction) => {
          await ownedGroup(transaction, groupId, userId);
          const pageSnapshot = await transaction.get(repository.pendingGroupQuery({ groupId, pageSize, cursor: position, FieldPath, Timestamp })); const requests = pageSnapshot.docs.slice(0, pageSize).map((snapshot) => repository.fromSnapshot(snapshot)); const composed = [];
          for (const request of requests) {
            const gRef = guardRef(groupId, request.personId); const cRef = coordinationRef(request.requestId);
            const [guardSnapshot, coordinationSnapshot] = await transaction.getAll(gRef, cRef); const pendingSnapshot = await transaction.get(repository.pendingPairQuery({ personId: request.personId, groupId })); const personContext = await personCapability.getOwnerProjection({ unitOfWork: transaction, personId: request.personId });
            const guard = hydrateGuard(guardSnapshot, { guardId: gRef.id, personId: request.personId, groupId }); const authoritative = resolvePending(pendingSnapshot, guard, { repository, personId: request.personId, groupId }); const coordination = hydrateCoordination(coordinationSnapshot);
            if (!authoritative || authoritative.requestId !== request.requestId || personContext?.status !== "found") throw new GroupJoinRequestIncompatibleStateError();
            if (coordination) await readCoordinationIntent(transaction, request, coordination);
            composed.push({ request, person: personContext.person, decisionStatus: coordination ? "APPROVAL_IN_PROGRESS" : "PENDING" });
          }
          let nextCursor = null; if (pageSnapshot.size > pageSize && requests.length) { const last = requests[requests.length - 1]; nextCursor = encodeGroupJoinRequestCursor({ groupId, seconds: last.createdAt.seconds, nanoseconds: last.createdAt.nanoseconds, lastRequestId: last.requestId }); }
          observe({ stage: "authoritative-reread", classification: "first-attempt" }); return { composed, nextCursor };
        });
      } catch (error) { throw mapFailure(error); }
    },
  };
}

module.exports = { COORDINATION_FIELDS, DECISION_INTENT_FIELDS, GUARD_FIELDS, INTENT_FIELDS, createFirestoreGroupJoinRequestStore, hydrateCoordination, hydrateDecisionIntent, hydrateGuard, hydrateIntent, resolvePending };
