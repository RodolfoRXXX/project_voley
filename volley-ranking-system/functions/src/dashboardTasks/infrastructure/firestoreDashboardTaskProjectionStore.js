"use strict";

const crypto = require("crypto");
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { COVERAGE, GENERATION, TASK_TYPES, EVENT_STATUS, SCOPE_STATUS, itemId } = require("../application/dashboardTaskModel");
const { createDashboardTaskSourceReader } = require("./dashboardTaskSourceReader");

const LEASE_MS = 45_000;
const DEGRADE_AFTER_MS = 5 * 60 * 1000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TRANSITION_WRITES = 420;
const FULL_SCAN_PAGE_SIZE = 100;
const MAX_AUTOMATIC_FAILURES = 10;
const PROCESSING_MODE = Object.freeze({ RESOURCE: "RESOURCE", AUDIENCE: "AUDIENCE", FULL: "FULL" });

function addMillis(timestamp, millis) { return Timestamp.fromMillis(timestamp.toMillis() + millis); }
function nextCount(current, delta) { const value = (current || 0) + delta; if (!Number.isSafeInteger(value) || value < 0) throw Object.assign(new Error("Projection counter invariant failed"), { code: "COUNTER_INVARIANT" }); return value; }
function projectionRef(db, uid) { return db.collection("users").doc(uid).collection("dashboardTaskProjection").doc(COVERAGE); }
function generationRef(db, uid, generation) { return db.collection("users").doc(uid).collection("dashboardTaskSets").doc(generation); }
function itemRef(db, uid, taskIdentity, generation = GENERATION) { return db.collection("users").doc(uid).collection("dashboardTaskSets").doc(generation).collection("items").doc(itemId(taskIdentity)); }
function contextRef(db, uid, groupId, generation = GENERATION) { return db.collection("users").doc(uid).collection("dashboardTaskSets").doc(generation).collection("contexts").doc(groupId); }
function projectionWriteCount({ itemWrites, contextWrites, userCount, manifestWrites }) {
  return itemWrites + contextWrites + userCount * 2 + manifestWrites + 2;
}
function processingMode(event) {
  if (["GROUP_JOIN_REQUEST", "PAYMENT_DELIVERY"].includes(event.resourceType)) return PROCESSING_MODE.RESOURCE;
  if (["N31_AUDIENCE_CHANGED", "N31_AUDIENCE_CONTEXT_CHANGED"].includes(event.kind)) return PROCESSING_MODE.AUDIENCE;
  return PROCESSING_MODE.FULL;
}
function firstPhase(mode) { return mode === PROCESSING_MODE.AUDIENCE ? TASK_TYPES.PAYMENT_DELIVERY : TASK_TYPES.JOIN_REQUEST; }
function phaseAfter(mode, phase) {
  if (phase === TASK_TYPES.JOIN_REQUEST && mode === PROCESSING_MODE.FULL) return TASK_TYPES.PAYMENT_DELIVERY;
  return "SWEEP";
}

function createFirestoreDashboardTaskProjectionStore({ db, now = () => Timestamp.now(), workerId = crypto.randomUUID() }) {
  if (!db) throw new TypeError("db is required");
  const source = createDashboardTaskSourceReader({ db });
  const outbox = db.collection("dashboardTaskOutbox");
  const scopes = db.collection("dashboardTaskScopes");
  const manifests = db.collection("dashboardTaskManifests");

  async function claim(eventId) {
    const token = crypto.randomUUID(); const at = now(); const leaseUntil = addMillis(at, LEASE_MS);
    return db.runTransaction(async (transaction) => {
      const ref = outbox.doc(eventId); const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const event = snapshot.data(); const expired = event.status === EVENT_STATUS.PROCESSING && event.leaseUntil?.toMillis() <= at.toMillis();
      if (event.retryExhausted === true) return null;
      if (![EVENT_STATUS.PENDING, EVENT_STATUS.FAILED].includes(event.status) && !expired) return null;
      if (event.availableAt?.toMillis() > at.toMillis()) return null;
      transaction.update(ref, { status: EVENT_STATUS.PROCESSING, leaseToken: token, leaseOwner: workerId,
        leaseUntil, attempts: (event.attempts || 0) + 1, updatedAt: at });
      return Object.freeze({ ...event, status: EVENT_STATUS.PROCESSING, leaseToken: token, leaseOwner: workerId,
        leaseUntil, attempts: (event.attempts || 0) + 1 });
    });
  }

  async function fail(claimed, error) {
    const at = now();
    await db.runTransaction(async (transaction) => {
      const ref = outbox.doc(claimed.eventId); const snapshot = await transaction.get(ref); const current = snapshot.data();
      const scopeRef = scopes.doc(claimed.groupId); const scope = await transaction.get(scopeRef);
      if (!snapshot.exists || current.status !== EVENT_STATUS.PROCESSING || current.leaseToken !== claimed.leaseToken
        || current.leaseUntil?.toMillis() <= at.toMillis()) return;
      const failureAttempts = (current.failureAttempts || 0) + 1; const retryExhausted = failureAttempts >= MAX_AUTOMATIC_FAILURES;
      const delay = Math.min(300_000, 1000 * 2 ** Math.min(8, failureAttempts));
      transaction.update(ref, { status: EVENT_STATUS.FAILED, availableAt: retryExhausted ? null : addMillis(at, delay), failureAttempts, retryExhausted,
        lastErrorCode: error?.code || "PROJECTOR_FAILED",
        lastErrorMessage: String(error?.message || error).slice(0, 500), leaseToken: null, leaseOwner: null, leaseUntil: null, updatedAt: at });
      if (scope.exists) {
        const degraded = at.toMillis() - (current.createdAt?.toMillis?.() || at.toMillis()) >= DEGRADE_AFTER_MS;
        transaction.update(scopeRef, { status: degraded ? SCOPE_STATUS.DEGRADED : SCOPE_STATUS.DIRTY, lastErrorAt: at, updatedAt: at });
      }
    });
  }

  async function apply(claimed) {
    const at = now();
    return db.runTransaction(async (transaction) => {
      const eventRef = outbox.doc(claimed.eventId); const scopeRef = scopes.doc(claimed.groupId);
      const [eventSnapshot, scopeSnapshot] = await transaction.getAll(eventRef, scopeRef);
      const event = eventSnapshot.data(); const scope = scopeSnapshot.data();
      if (!eventSnapshot.exists || !scopeSnapshot.exists || event.status !== EVENT_STATUS.PROCESSING
        || event.leaseToken !== claimed.leaseToken || event.leaseUntil?.toMillis() <= at.toMillis()) throw Object.assign(new Error("Dashboard task lease lost"), { code: "LEASE_LOST" });
      const generation = event.generationId || GENERATION;
      const mode = processingMode(event); const progress = event.progress || { phase: firstPhase(mode), cursor: null };
      let desired = []; let taskIds = []; let oldSnapshots = []; let nextProgress = null; let complete = mode === PROCESSING_MODE.RESOURCE;
      if (mode === PROCESSING_MODE.RESOURCE) {
        const resource = await source.readResources({ unitOfWork: transaction, groupId: claimed.groupId,
          resourceType: event.resourceType, resourceIds: event.resourceIds });
        desired = resource.items; taskIds = resource.taskIds;
        oldSnapshots = taskIds.length ? await transaction.getAll(...taskIds.map((id) => manifests.doc(id))) : [];
      }
      else if (progress.phase === "SWEEP") {
        let query = manifests.where("groupId", "==", claimed.groupId).orderBy(FieldPath.documentId()).limit(FULL_SCAN_PAGE_SIZE);
        if (progress.cursor) query = query.startAfter(progress.cursor);
        const snapshot = await transaction.get(query); const audienceOnly = mode === PROCESSING_MODE.AUDIENCE;
        oldSnapshots = snapshot.docs.filter((doc) => {
          const manifest = doc.data();
          return manifest.projectionState === "ACTIVE" && manifest.lastFullScanEventId !== event.eventId
            && (!Number.isSafeInteger(manifest.scopeRevision) || manifest.scopeRevision <= event.scopeRevision)
            && (!audienceOnly || manifest.taskType === TASK_TYPES.PAYMENT_DELIVERY);
        });
        const exhausted = snapshot.size < FULL_SCAN_PAGE_SIZE;
        complete = exhausted;
        if (!complete) nextProgress = { phase: "SWEEP", cursor: snapshot.docs.at(-1).id };
      }
      else {
        const page = await source.readPage({ unitOfWork: transaction, groupId: claimed.groupId,
          phase: progress.phase, afterId: progress.cursor, limit: FULL_SCAN_PAGE_SIZE });
        desired = page.items; taskIds = page.taskIds;
        oldSnapshots = taskIds.length ? await transaction.getAll(...taskIds.map((id) => manifests.doc(id))) : [];
        nextProgress = page.exhausted
          ? { phase: phaseAfter(mode, progress.phase), cursor: null }
          : { phase: progress.phase, cursor: page.cursor };
      }
      const desiredById = new Map(desired.map((task) => [task.taskId, task]));
      const oldById = new Map(oldSnapshots.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));
      const transitions = [];
      for (const taskIdValue of new Set([...desiredById.keys(), ...oldById.keys()])) {
        const next = desiredById.get(taskIdValue) || null; const old = oldById.get(taskIdValue) || null;
        if (Number.isSafeInteger(old?.scopeRevision) && old.scopeRevision > event.scopeRevision) continue;
        const recipients = new Set([...(old?.recipients || []), ...(next?.recipients || [])]);
        for (const uid of recipients) transitions.push({ uid, taskId: taskIdValue, old, next: next?.recipients.includes(uid) ? next : null });
      }
      const itemRefs = transitions.map((entry) => itemRef(db, entry.uid, entry.taskId, generation));
      const counterKeys = [...new Set(transitions.map((entry) => `${entry.uid}\u0000${claimed.groupId}`))];
      const counterRefs = counterKeys.map((key) => { const [uid, groupId] = key.split("\u0000"); return contextRef(db, uid, groupId, generation); });
      const metaUids = [...new Set(transitions.map((entry) => entry.uid))]; const metaRefs = metaUids.map((uid) => projectionRef(db, uid));
      const generationRefs = metaUids.map((uid) => generationRef(db, uid, generation));
      const revisionWindow = await transaction.get(outbox.where("groupId", "==", claimed.groupId)
        .where("scopeRevision", ">", scope.projectedRevision || 0).orderBy("scopeRevision", "asc").limit(250));
      const snapshots = [...(itemRefs.length ? await transaction.getAll(...itemRefs) : []), ...(counterRefs.length ? await transaction.getAll(...counterRefs) : []), ...(metaRefs.length ? await transaction.getAll(...metaRefs) : []), ...(generationRefs.length ? await transaction.getAll(...generationRefs) : [])];
      const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot])); const deltas = new Map(); const userDeltas = new Map(); const plans = [];
      for (const entry of transitions) {
        const ref = itemRef(db, entry.uid, entry.taskId, generation); const existing = byPath.get(ref.path); const wasActive = existing?.exists && existing.data().projectionState === "ACTIVE";
        const willBeActive = Boolean(entry.next); const key = `${entry.uid}\u0000${claimed.groupId}`;
        if (wasActive !== willBeActive) {
          const delta = deltas.get(key) || { total: 0, N20: 0, N31: 0 }; const type = (entry.next || entry.old).taskType;
          const direction = willBeActive ? 1 : -1; delta.total += direction; delta[type] += direction; deltas.set(key, delta);
          const userDelta = userDeltas.get(entry.uid) || { total: 0, N20: 0, N31: 0 }; userDelta.total += direction; userDelta[type] += direction; userDeltas.set(entry.uid, userDelta);
        }
        plans.push({ entry, ref, existing, wasActive });
      }
      const actualWrites = projectionWriteCount({
        itemWrites: plans.filter(({ entry, wasActive }) => Boolean(entry.next) || wasActive).length,
        contextWrites: deltas.size,
        userCount: metaUids.length,
        manifestWrites: new Set([...desiredById.keys(), ...oldById.keys()]).size,
      });
      if (actualWrites > MAX_TRANSITION_WRITES) throw Object.assign(new Error("Projection transition exceeds safe transaction size"), { code: "PROJECTION_FANOUT_LIMIT" });
      for (const { entry, ref, existing, wasActive } of plans) {
        if (entry.next) {
          const { recipients: _recipients, ...item } = entry.next;
          transaction.set(ref, { ...item, projectionState: "ACTIVE", generationId: generation,
            coverage: COVERAGE, scopeRevision: event.scopeRevision, projectedAt: at, schemaVersion: 1 });
        }
        else if (wasActive) transaction.set(ref, { ...existing.data(), projectionState: "INACTIVE", inactiveAt: at,
          purgeAfter: addMillis(at, RETENTION_MS), projectedAt: at }, { merge: false });
      }
      for (const uid of metaUids) {
        const ref = generationRef(db, uid, generation); const current = byPath.get(ref.path)?.data() || {}; const delta = userDeltas.get(uid) || { N20: 0, N31: 0 };
        const n20 = nextCount(current.N20, delta.N20); const n31 = nextCount(current.N31, delta.N31);
        transaction.set(ref, { generationId: generation, coverage: COVERAGE, total: n20 + n31, N20: n20, N31: n31,
          projectedRevision: event.scopeRevision, updatedAt: at, schemaVersion: 1 }, { merge: true });
      }
      for (const [key, delta] of deltas) {
        const [uid, groupId] = key.split("\u0000"); const ref = contextRef(db, uid, groupId, generation); const snapshot = byPath.get(ref.path); const current = snapshot?.exists ? snapshot.data() : {};
        const n20 = nextCount(current.N20, delta.N20); const n31 = nextCount(current.N31, delta.N31);
        transaction.set(ref, { groupId, generationId: generation, total: n20 + n31, N20: n20, N31: n31,
          scopeRevision: event.scopeRevision, updatedAt: at, schemaVersion: 1 });
      }
      for (const uid of metaUids) {
        const meta = byPath.get(projectionRef(db, uid).path)?.data() || {};
        const rebuilding = meta.activeGenerationId && meta.activeGenerationId !== generation;
        transaction.set(projectionRef(db, uid), { coverage: COVERAGE,
          ...(rebuilding ? { buildingGenerationId: generation } : { activeGenerationId: generation }),
          projectionState: rebuilding ? "REBUILDING" : "AVAILABLE", updatedAt: at, schemaVersion: 1 }, { merge: true });
      }
      for (const [taskIdentity, task] of desiredById) {
        const previous = oldById.get(taskIdentity);
        if (Number.isSafeInteger(previous?.scopeRevision) && previous.scopeRevision > event.scopeRevision) continue;
        transaction.set(manifests.doc(taskIdentity), { ...task, generationId: generation,
          projectionState: "ACTIVE", scopeRevision: event.scopeRevision, projectedAt: at,
          ...(mode === PROCESSING_MODE.RESOURCE && previous?.lastFullScanEventId ? { lastFullScanEventId: previous.lastFullScanEventId } : {}),
          ...(mode !== PROCESSING_MODE.RESOURCE ? { lastFullScanEventId: event.eventId } : {}), schemaVersion: 1 });
      }
      for (const [taskIdentity, old] of oldById) if (!desiredById.has(taskIdentity)
        && (!Number.isSafeInteger(old.scopeRevision) || old.scopeRevision <= event.scopeRevision)) transaction.set(manifests.doc(taskIdentity), { ...old,
        projectionState: "INACTIVE", recipients: [], scopeRevision: event.scopeRevision,
        inactiveAt: at, purgeAfter: addMillis(at, RETENTION_MS), projectedAt: at });
      if (!complete) {
        transaction.update(eventRef, { progress: nextProgress, leaseUntil: addMillis(at, LEASE_MS), updatedAt: at });
        transaction.update(scopeRef, { status: scope.status === SCOPE_STATUS.REBUILDING ? SCOPE_STATUS.REBUILDING : SCOPE_STATUS.DIRTY, updatedAt: at });
        return { eventId: claimed.eventId, groupId: claimed.groupId, completed: false, progress: nextProgress, transitions: transitions.length };
      }
      transaction.update(eventRef, { status: EVENT_STATUS.APPLIED, progress: null, appliedAt: at,
        leaseToken: null, leaseOwner: null, leaseUntil: null, updatedAt: at });
      let contiguous = scope.projectedRevision || 0;
      for (const candidate of revisionWindow.docs) {
        const data = candidate.id === claimed.eventId ? { ...candidate.data(), status: EVENT_STATUS.APPLIED } : candidate.data();
        if (data.scopeRevision !== contiguous + 1 || data.status !== EVENT_STATUS.APPLIED) break;
        contiguous = data.scopeRevision;
      }
      const ready = contiguous === scope.sourceRevision && scope.coverageComplete === true;
      transaction.update(scopeRef, { projectedRevision: contiguous, status: ready ? SCOPE_STATUS.READY : SCOPE_STATUS.DIRTY,
        lastAppliedAt: at, updatedAt: at });
      return { eventId: claimed.eventId, groupId: claimed.groupId, completed: true,
        projectedRevision: contiguous, sourceRevision: scope.sourceRevision, ready, transitions: transitions.length };
    });
  }

  async function release(claimed) {
    const at = now();
    return db.runTransaction(async (transaction) => {
      const ref = outbox.doc(claimed.eventId); const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data().status !== EVENT_STATUS.PROCESSING || snapshot.data().leaseToken !== claimed.leaseToken) return false;
      transaction.update(ref, { status: EVENT_STATUS.PENDING, availableAt: at, leaseToken: null, leaseOwner: null, leaseUntil: null, updatedAt: at });
      return true;
    });
  }

  async function pending(limit = 20) {
    const at = now(); const results = [];
    for (const status of [EVENT_STATUS.PENDING, EVENT_STATUS.FAILED]) {
      const snapshot = await outbox.where("status", "==", status).where("availableAt", "<=", at)
        .orderBy("availableAt", "asc").orderBy("createdAt", "asc").orderBy("__name__", "asc").limit(limit).get();
      results.push(...snapshot.docs.map((doc) => doc.id));
    }
    const expired = await outbox.where("status", "==", EVENT_STATUS.PROCESSING).where("leaseUntil", "<=", at)
      .orderBy("leaseUntil", "asc").orderBy("createdAt", "asc").orderBy("__name__", "asc").limit(limit).get();
    results.push(...expired.docs.map((doc) => doc.id));
    return [...new Set(results)].slice(0, limit);
  }

  async function advance(groupId) {
    return db.runTransaction(async (transaction) => {
      const ref = scopes.doc(groupId); const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { complete: true, advanced: 0 };
      const scope = snapshot.data(); const window = await transaction.get(outbox.where("groupId", "==", groupId)
        .where("scopeRevision", ">", scope.projectedRevision || 0).orderBy("scopeRevision", "asc").limit(250));
      let contiguous = scope.projectedRevision || 0;
      for (const candidate of window.docs) {
        const data = candidate.data();
        if (data.scopeRevision !== contiguous + 1 || data.status !== EVENT_STATUS.APPLIED) break;
        contiguous = data.scopeRevision;
      }
      const ready = contiguous === scope.sourceRevision && scope.coverageComplete === true;
      if (contiguous !== (scope.projectedRevision || 0) || ready !== (scope.status === SCOPE_STATUS.READY)) {
        transaction.update(ref, { projectedRevision: contiguous, status: ready ? SCOPE_STATUS.READY : SCOPE_STATUS.DIRTY, updatedAt: now() });
      }
      return { complete: contiguous === scope.sourceRevision, advanced: contiguous - (scope.projectedRevision || 0) };
    });
  }

  async function advanceUntilStable(groupId) {
    for (let page = 0; page < 20; page += 1) {
      const result = await advance(groupId);
      if (result.complete || result.advanced === 0) return result;
    }
    return { complete: false, advanced: 0 };
  }

  return Object.freeze({ claim, apply, release, fail, pending, advanceUntilStable });
}

module.exports = { createFirestoreDashboardTaskProjectionStore, projectionWriteCount, processingMode,
  LEASE_MS, DEGRADE_AFTER_MS, RETENTION_MS, MAX_TRANSITION_WRITES, FULL_SCAN_PAGE_SIZE, MAX_AUTOMATIC_FAILURES, PROCESSING_MODE };
