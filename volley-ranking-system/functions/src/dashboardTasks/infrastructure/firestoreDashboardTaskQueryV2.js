"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { COVERAGE, COVERAGE_V2, GENERATION_V2, TASK_TYPES, taskId } = require("../application/dashboardTaskModel");
const { createDashboardTaskCursorCodec } = require("../application/dashboardTaskCursor");
const { DashboardTaskDependencyUnavailableError, DashboardTaskGroupContextNotAccessibleError } = require("../application/dashboardTaskQueryErrors");

const PAGE_SIZE = 10;
const MAX_SOURCE_PAGES = 100;

function millis(value) { return new Date(value).getTime(); }
function compare(left, right) {
  const time = millis(right.actionableAt) - millis(left.actionableAt);
  return time || left.kind.localeCompare(right.kind) || left.resourceId.localeCompare(right.resourceId);
}
function anchorOf(item) {
  const time = Timestamp.fromDate(new Date(item.actionableAt));
  return { seconds: time.seconds, nanoseconds: time.nanoseconds, kind: item.kind, resourceId: item.resourceId };
}
function afterAnchor(item, anchor) {
  if (!anchor) return true;
  const at = anchorOf(item);
  if (at.seconds !== anchor.seconds) return at.seconds < anchor.seconds;
  if (at.nanoseconds !== anchor.nanoseconds) return at.nanoseconds < anchor.nanoseconds;
  const kind = at.kind.localeCompare(anchor.kind);
  return kind > 0 || (kind === 0 && at.resourceId.localeCompare(anchor.resourceId) > 0);
}

function createFirestoreDashboardTaskQueryV2({ v1, invitations, cursorSecret, now = () => Timestamp.now() }) {
  const cursors = createDashboardTaskCursorCodec({ secret: cursorSecret });

  async function readV1(accountId) {
    let cursor; let first; const items = [];
    for (let page = 0; page < MAX_SOURCE_PAGES; page += 1) {
      const result = await v1.list(accountId, { coverage: COVERAGE, ...(cursor ? { cursor } : {}) });
      if (!first) first = result;
      items.push(...result.items);
      cursor = result.nextCursor;
      if (!cursor) return { first, items };
    }
    throw new DashboardTaskDependencyUnavailableError();
  }

  async function readN42(accountId) {
    let cursor; const items = [];
    for (let page = 0; page < MAX_SOURCE_PAGES; page += 1) {
      const result = await invitations.listMyPendingGroupInvitations({ userId: accountId }, { pageSize: 10, ...(cursor ? { cursor } : {}) });
      for (const invitation of result.items) {
        if (!invitation.group || !invitation.season || invitation.seasonStatus !== "abierta") continue;
        items.push(Object.freeze({
          taskId: taskId(TASK_TYPES.GROUP_INVITATION, invitation.invitationId), kind: TASK_TYPES.GROUP_INVITATION,
          resourceId: invitation.invitationId, actionableAt: invitation.createdAt,
          group: { id: invitation.groupId, name: invitation.group.name },
          season: { id: invitation.seasonId, name: invitation.season.name },
          summary: "Invitación de ingreso recibida",
          destination: { href: `/dashboard/groups?section=requests-invitations&invitationRef=${encodeURIComponent(invitation.invitationId)}` },
        }));
      }
      cursor = result.nextCursor;
      if (!cursor) return items;
    }
    throw new DashboardTaskDependencyUnavailableError();
  }

  async function list(accountId, input) {
    if (input.groupId) throw new DashboardTaskGroupContextNotAccessibleError();
    const [{ first, items: v1Items }, n42Items] = await Promise.all([readV1(accountId), readN42(accountId)]);
    const generationId = `${GENERATION_V2}.${first.coverage.generationId}`;
    const anchor = cursors.decode(input.cursor, { accountId, coverage: COVERAGE_V2, generationId, groupId: null });
    const all = [...v1Items, ...n42Items].sort(compare);
    const remaining = all.filter((item) => afterAnchor(item, anchor));
    const visible = remaining.slice(0, PAGE_SIZE); const last = visible.at(-1);
    const counts = new Map((first.groupTaskCounts || []).map((entry) => [entry.groupId, { ...entry, N42: 0 }]));
    for (const item of n42Items) {
      const current = counts.get(item.group.id) || { groupId: item.group.id, count: 0, N20: 0, N31: 0, N42: 0 };
      current.N42 += 1; current.count += 1; counts.set(item.group.id, current);
    }
    const complete = first.coverage.complete && first.coverage.health === "READY";
    return Object.freeze({
      coverage: { version: COVERAGE_V2, complete, health: first.coverage.health,
        asOf: now().toDate().toISOString(), generationId },
      ...(complete ? { totalTasks: (first.totalTasks || 0) + n42Items.length,
        groupTaskCounts: [...counts.values()].sort((left, right) => left.groupId.localeCompare(right.groupId)) } : {}),
      items: Object.freeze(visible),
      ...(remaining.length > PAGE_SIZE && last ? { nextCursor: cursors.encode({ accountId, coverage: COVERAGE_V2,
        generationId, groupId: null, anchor: anchorOf(last) }) } : {}),
    });
  }

  return Object.freeze({ list });
}

module.exports = { PAGE_SIZE, compare, createFirestoreDashboardTaskQueryV2 };
