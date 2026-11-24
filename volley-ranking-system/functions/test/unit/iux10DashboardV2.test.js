"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Timestamp } = require("firebase-admin/firestore");
const { validateDashboardTaskQuery } = require("../../src/dashboardTasks/application/dashboardTaskQueryContract");
const { createFirestoreDashboardTaskQueryV2 } = require("../../src/dashboardTasks/infrastructure/firestoreDashboardTaskQueryV2");

const invitation = (index) => ({ invitationId: `inv-${index}`, groupId: `group-${index}`, seasonId: `season-${index}`,
  status: "pending", createdAt: new Date(20_000 - index * 1000).toISOString(), group: { name: `Grupo ${index}` },
  season: { name: `Temporada ${index}` }, seasonStatus: "abierta" });

test("D5-081 acepta V2 sin alterar el contrato V1", () => {
  assert.equal(validateDashboardTaskQuery({ coverage: "N20_N31_V1" }).coverage, "N20_N31_V1");
  assert.equal(validateDashboardTaskQuery({ coverage: "N20_N31_N42_V2" }).coverage, "N20_N31_N42_V2");
  assert.throws(() => validateDashboardTaskQuery({ coverage: "N42" }));
});

test("D5-081 compone N20/N31 V1 con N42 destinataria y pagina con cursor V2", async () => {
  const received = Array.from({ length: 11 }, (_, index) => invitation(index + 1));
  const v1 = { async list(_accountId, input) { assert.equal(input.coverage, "N20_N31_V1"); return {
    coverage: { version: "N20_N31_V1", complete: true, health: "READY", asOf: new Date(0).toISOString(), generationId: "live-v1" },
    totalTasks: 1, groupTaskCounts: [{ groupId: "owned", count: 1, N20: 1, N31: 0 }],
    items: [{ taskId: "JOIN_REQUEST_DECISION:req", kind: "N20", resourceId: "req", actionableAt: new Date(25_000).toISOString(),
      group: { id: "owned", name: "Administrado" }, summary: "Solicitud", destination: { href: "/request" } }],
  }; } };
  const invitations = { async listMyPendingGroupInvitations(_identity, input) { const offset = input.cursor ? Number(input.cursor) : 0; const items = received.slice(offset, offset + input.pageSize); return { items, ...(offset + input.pageSize < received.length ? { nextCursor: String(offset + input.pageSize) } : {}) }; } };
  const query = createFirestoreDashboardTaskQueryV2({ v1, invitations, cursorSecret: "x".repeat(32), now: () => Timestamp.fromMillis(30_000) });
  const first = await query.list("account", { coverage: "N20_N31_N42_V2" });
  assert.equal(first.coverage.version, "N20_N31_N42_V2"); assert.equal(first.coverage.generationId, "live-v2.live-v1");
  assert.equal(first.totalTasks, 12); assert.equal(first.items.length, 10); assert.equal(first.items[0].kind, "N20"); assert.ok(first.nextCursor);
  assert.equal(first.items.filter((item) => item.kind === "N42").every((item) => item.destination.href.includes("invitationRef=")), true);
  const second = await query.list("account", { coverage: "N20_N31_N42_V2", cursor: first.nextCursor });
  assert.equal(second.items.length, 2); assert.equal(second.nextCursor, undefined);
});
