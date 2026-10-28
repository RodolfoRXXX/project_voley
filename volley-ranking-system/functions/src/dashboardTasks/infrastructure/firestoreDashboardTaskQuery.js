"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { COVERAGE, TASK_TYPES } = require("../application/dashboardTaskModel");
const { createDashboardTaskCursorCodec } = require("../application/dashboardTaskCursor");
const { createDashboardTaskGroupCapability } = require("../../groups/public/dashboardTaskGroupCapability");
const { createPaymentReviewAudienceCapability } = require("../../paymentDeliveries/public/paymentReviewAudienceCapability");
const { createTreasuryAccountIdentityCapability } = require("../../users/public/treasuryAccountIdentityCapability");
const { createDashboardTaskSourceReader, RESOURCE_TYPES } = require("./dashboardTaskSourceReader");
const {
  DashboardTaskProjectionDisabledError, DashboardTaskProjectionNotReadyError, DashboardTaskIncompatibleStateError,
} = require("../application/dashboardTaskQueryErrors");

const PAGE_SIZE = 10;
const SCAN_SIZE = PAGE_SIZE + 1;
const EMPTY_GENERATION = "no-contexts-v1";
const HEALTH = Object.freeze({ READY: "READY", UPDATING: "UPDATING", REBUILDING: "REBUILDING", DEGRADED: "DEGRADED" });

function validCount(value) { return Number.isSafeInteger(value) && value >= 0; }
function timestamp(value) { return value && Number.isSafeInteger(value.seconds) && Number.isSafeInteger(value.nanoseconds); }
function iso(value) { if (!timestamp(value)) throw new DashboardTaskIncompatibleStateError(); return value.toDate().toISOString(); }
function anchor(item) { return { seconds: item.actionableAt.seconds, nanoseconds: item.actionableAt.nanoseconds, kind: item.taskType, resourceId: item.resourceId }; }

function createFirestoreDashboardTaskQuery({ db, cursorSecret, projectionEnabled = false, now = () => Timestamp.now() }) {
  if (!db) throw new TypeError("db is required");
  const cursorCodec = createDashboardTaskCursorCodec({ secret: cursorSecret });
  const groups = createDashboardTaskGroupCapability({ db });
  const audience = createPaymentReviewAudienceCapability({ db });
  const identities = createTreasuryAccountIdentityCapability({ db });
  const sources = createDashboardTaskSourceReader({ db });

  async function contexts(transaction, accountId) {
    if ((await identities.getCanonicalAccount({ unitOfWork: transaction, accountId })).status !== "READY") {
      throw new DashboardTaskIncompatibleStateError();
    }
    const [owned, candidateGroupIds] = await Promise.all([
      groups.listOwned({ unitOfWork: transaction, accountId }), audience.listCandidateGroupIds({ unitOfWork: transaction, accountId }),
    ]);
    if (owned.some((entry) => entry.status !== "READY")) throw new DashboardTaskIncompatibleStateError();
    const result = new Map();
    for (const group of owned) result.set(group.groupId, { ...group, N20: group.estado === "activo", N31: true });
    for (const groupId of candidateGroupIds) {
      const group = await groups.get({ unitOfWork: transaction, groupId });
      if (group.status === "NOT_FOUND") continue;
      if (group.status !== "READY") throw new DashboardTaskIncompatibleStateError();
      const authorization = await audience.evaluateAccount({ unitOfWork: transaction, accountId, group });
      if (authorization.status !== "AUTHORIZED" || authorization.kind !== "REVIEWER") continue;
      const current = result.get(groupId);
      result.set(groupId, current ? { ...current, N31: true } : { ...group, N20: false, N31: true });
    }
    return result;
  }

  async function healthAndTotal(transaction, accountId, generationId, authorized, meta, root) {
    const groupIds = [...authorized.keys()];
    const scopeRefs = groupIds.map((id) => db.collection("dashboardTaskScopes").doc(id));
    const contextRefs = groupIds.map((id) => db.collection("users").doc(accountId).collection("dashboardTaskSets")
      .doc(generationId).collection("contexts").doc(id));
    const snapshots = [...(scopeRefs.length ? await transaction.getAll(...scopeRefs) : []),
      ...(contextRefs.length ? await transaction.getAll(...contextRefs) : [])];
    const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
    let state = ["READY", "ROLLED_BACK"].includes(meta.projectionState) ? HEALTH.READY : HEALTH.REBUILDING;
    let total = 0;
    for (const groupId of groupIds) {
      const scopeSnapshot = byPath.get(db.collection("dashboardTaskScopes").doc(groupId).path);
      if (!scopeSnapshot?.exists) { state = HEALTH.REBUILDING; continue; }
      const scope = scopeSnapshot.data();
      if (scope.writeGenerationId !== generationId || scope.coverageComplete !== true) state = HEALTH.REBUILDING;
      else if (scope.status === "DEGRADED") state = HEALTH.DEGRADED;
      else if (scope.status === "REBUILDING" && state !== HEALTH.DEGRADED) state = HEALTH.REBUILDING;
      else if ((scope.status !== "READY" || scope.projectedRevision !== scope.sourceRevision)
        && ![HEALTH.DEGRADED, HEALTH.REBUILDING].includes(state)) state = HEALTH.UPDATING;
      const contextSnapshot = byPath.get(contextRefs[groupIds.indexOf(groupId)].path);
      if (!contextSnapshot?.exists) continue;
      const count = contextSnapshot.data();
      if (count.generationId !== generationId || count.groupId !== groupId || !validCount(count.N20) || !validCount(count.N31)
        || !validCount(count.total) || count.total !== count.N20 + count.N31) throw new DashboardTaskIncompatibleStateError();
      const allowed = authorized.get(groupId);
      total += (allowed.N20 ? count.N20 : 0) + (allowed.N31 ? count.N31 : 0);
    }
    if (!validCount(root.total) || !validCount(root.N20) || !validCount(root.N31) || root.total !== root.N20 + root.N31) {
      throw new DashboardTaskIncompatibleStateError();
    }
    return { health: state, total };
  }

  async function revalidate(transaction, accountId, authorized, docs) {
    const groupsByResource = new Map();
    for (const doc of docs) {
      const item = doc.data();
      if (item.coverage !== COVERAGE || item.generationId !== doc.ref.parent.parent.id || item.projectionState !== "ACTIVE"
        || ![TASK_TYPES.JOIN_REQUEST, TASK_TYPES.PAYMENT_DELIVERY].includes(item.taskType)
        || typeof item.groupId !== "string" || typeof item.resourceId !== "string" || !timestamp(item.actionableAt)) {
        throw new DashboardTaskIncompatibleStateError();
      }
      const key = `${item.taskType}\u0000${item.groupId}`;
      if (!groupsByResource.has(key)) groupsByResource.set(key, []);
      groupsByResource.get(key).push(item.resourceId);
    }
    const current = new Map();
    for (const [key, resourceIds] of groupsByResource) {
      const [taskType, groupId] = key.split("\u0000");
      const source = await sources.readResources({ unitOfWork: transaction, groupId,
        resourceType: taskType === TASK_TYPES.JOIN_REQUEST ? RESOURCE_TYPES.JOIN_REQUEST : RESOURCE_TYPES.PAYMENT_DELIVERY,
        resourceIds });
      for (const item of source.items) if (item.recipients.includes(accountId)) current.set(item.taskId, item);
    }
    const items = []; const anchors = new Map(); let discarded = false;
    for (const doc of docs) {
      const projected = doc.data(); const source = current.get(projected.taskId); const context = authorized.get(projected.groupId);
      const typeAllowed = projected.taskType === TASK_TYPES.JOIN_REQUEST ? context?.N20 : context?.N31;
      if (!source || !context || !typeAllowed || source.resourceId !== projected.resourceId
        || source.groupId !== projected.groupId || source.seasonId !== projected.seasonId) { discarded = true; continue; }
      const season = source.seasonId ? await groups.getSeasonPresentation({ unitOfWork: transaction,
        groupId: source.groupId, seasonId: source.seasonId }) : null;
      if (season && season.status !== "READY") throw new DashboardTaskIncompatibleStateError();
      items.push(Object.freeze({ taskId: source.taskId, kind: source.taskType, resourceId: source.resourceId,
        actionableAt: iso(source.actionableAt), group: { id: source.groupId, name: context.name },
        ...(season ? { season: { id: season.seasonId, name: season.name } } : {}),
        summary: source.taskType === TASK_TYPES.JOIN_REQUEST ? "Solicitud de ingreso por decidir" : "Entrega de pago por revisar",
        destination: source.taskType === TASK_TYPES.JOIN_REQUEST
          ? { href: `/dashboard/groups/${encodeURIComponent(source.groupId)}?joinRequestId=${encodeURIComponent(source.resourceId)}#integrantes` }
          : { href: `/dashboard/groups/${encodeURIComponent(source.groupId)}/economy?tab=notices&deliveryId=${encodeURIComponent(source.resourceId)}` },
      }));
      anchors.set(source.taskId, anchor(projected));
    }
    return { items, anchors, discarded };
  }

  async function list(accountId, input) {
    if (!projectionEnabled) throw new DashboardTaskProjectionDisabledError();
    return db.runTransaction(async (transaction) => {
      const metaRef = db.collection("users").doc(accountId).collection("dashboardTaskProjection").doc(COVERAGE);
      const metaSnapshot = await transaction.get(metaRef);
      if (!metaSnapshot.exists) {
        let authorized;
        try { authorized = await contexts(transaction, accountId); } catch { throw new DashboardTaskProjectionNotReadyError(); }
        if (authorized.size) throw new DashboardTaskProjectionNotReadyError();
        cursorCodec.decode(input.cursor, { accountId, coverage: COVERAGE, generationId: EMPTY_GENERATION });
        return Object.freeze({ coverage: { version: COVERAGE, complete: true, health: HEALTH.READY,
          asOf: now().toDate().toISOString(), generationId: EMPTY_GENERATION }, totalTasks: 0, items: [] });
      }
      const meta = metaSnapshot.data(); const generationId = meta.activeGenerationId;
      if (meta.coverage !== COVERAGE || typeof generationId !== "string" || !generationId) throw new DashboardTaskProjectionNotReadyError();
      const cursor = cursorCodec.decode(input.cursor, { accountId, coverage: COVERAGE, generationId });
      const rootRef = db.collection("users").doc(accountId).collection("dashboardTaskSets").doc(generationId);
      const rootSnapshot = await transaction.get(rootRef);
      if (!rootSnapshot.exists || rootSnapshot.data().coverage !== COVERAGE || rootSnapshot.data().generationId !== generationId) {
        throw new DashboardTaskProjectionNotReadyError();
      }
      const authorized = await contexts(transaction, accountId);
      const state = await healthAndTotal(transaction, accountId, generationId, authorized, meta, rootSnapshot.data());
      let query = rootRef.collection("items").where("projectionState", "==", "ACTIVE")
        .orderBy("actionableAt", "desc").orderBy("taskType", "asc").orderBy("resourceId", "asc");
      if (cursor) query = query.startAfter(new Timestamp(cursor.seconds, cursor.nanoseconds), cursor.kind, cursor.resourceId);
      const page = await transaction.get(query.limit(SCAN_SIZE));
      const validated = await revalidate(transaction, accountId, authorized, page.docs);
      const visible = validated.items.slice(0, PAGE_SIZE);
      const lastVisible = visible.at(-1); const lastScanned = page.docs.at(-1)?.data();
      const hasMore = validated.items.length > PAGE_SIZE || page.size === SCAN_SIZE;
      const nextAnchor = validated.items.length > PAGE_SIZE && lastVisible
        ? validated.anchors.get(lastVisible.taskId) : (lastScanned ? anchor(lastScanned) : null);
      const contradictoryPage = state.health === HEALTH.READY && (validated.items.length > state.total
        || (!input.cursor && ((state.total === 0 && validated.items.length > 0) || (state.total > 0 && page.empty))));
      const finalHealth = (validated.discarded || contradictoryPage) && state.health === HEALTH.READY
        ? HEALTH.UPDATING : state.health;
      const complete = finalHealth === HEALTH.READY;
      return Object.freeze({ coverage: { version: COVERAGE, complete, health: finalHealth,
        asOf: now().toDate().toISOString(), generationId }, ...(complete ? { totalTasks: state.total } : {}), items: visible,
        ...(hasMore && nextAnchor ? { nextCursor: cursorCodec.encode({ accountId, coverage: COVERAGE, generationId,
          anchor: nextAnchor }) } : {}) });
    }, { readOnly: true });
  }

  return Object.freeze({ list });
}

module.exports = { EMPTY_GENERATION, HEALTH, PAGE_SIZE, SCAN_SIZE, createFirestoreDashboardTaskQuery };
