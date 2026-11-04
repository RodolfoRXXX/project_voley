"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-04 compone Resumen y /members sin total de roster", () => {
  const summary = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  const members = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/members/page.tsx");
  const order = ["GroupNewsCard", "GroupEconomySummaryCard", "GroupSeasonSummaryCard", "GroupMembersSummaryCard"];
  for (let index = 1; index < order.length; index += 1) assert.ok(summary.lastIndexOf(order[index - 1]) < summary.lastIndexOf(order[index]));
  for (const component of ["OwnMembershipSection", "ActiveGroupMembersSection", "PendingGroupJoinRequestsSection"]) assert.match(members, new RegExp(component));
  assert.match(summary, /#integrantes/); assert.match(summary, /joinRequestId|searchParams\.toString/);
  assert.doesNotMatch(summary + members, /totalItems|items\.length.*integrantes/i);
});

test("IUX-04 usa selector móvil, tabs desktop y Clipboard accesible", () => {
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  const clipboard = read("volley-ranking-frontend/src/components/groups/CopyGroupJoinLinkButton.tsx");
  assert.match(navigation, /Sección del Grupo/); assert.match(navigation, /md:hidden/); assert.match(navigation, /md:flex/);
  assert.doesNotMatch(navigation, /overflow-x-auto/);
  for (const label of ["Resumen", "Economía", "Temporada", "Integrantes"]) assert.match(navigation, new RegExp(`label: "${label}"`));
  for (const marker of ["navigator.clipboard.writeText", "aria-live=\"polite\"", "min-h-11", "min-w-11", "Enlace copiado", "role=\"alert\""]) assert.match(clipboard, new RegExp(marker));
  assert.match(clipboard, /className="relative inline-flex flex-col items-end"[\s\S]*className="sr-only" aria-live="polite"/);
});

test("IUX-04 Clipboard cubre éxito, timer, fallo, retry y clic repetido", async () => {
  const { createCopyFeedback } = await import("../../../../volley-ranking-frontend/src/components/groups/copyFeedback.mjs");
  const copied = []; const errors = []; const timers = []; let writes = 0; let release;
  const controller = createCopyFeedback({ write: async () => { writes += 1; await new Promise((resolve) => { release = resolve; }); },
    schedule: (callback, delay) => { timers.push({ callback, delay, cancelled: false }); return timers.length - 1; },
    cancel: (id) => { timers[id].cancelled = true; }, onCopied: (value) => copied.push(value), onError: (value) => errors.push(value) });
  const first = controller.copy("https://example.invalid/join");
  assert.equal(await controller.copy("https://example.invalid/repeated"), false); assert.equal(writes, 1);
  release(); assert.equal(await first, true); assert.equal(timers[0].delay, 2000); assert.equal(copied.at(-1), true);
  timers[0].callback(); assert.equal(copied.at(-1), false);
  controller.dispose();

  const failing = createCopyFeedback({ write: async () => { throw new Error("denied"); },
    onCopied: (value) => copied.push(value), onError: (value) => errors.push(value) });
  assert.equal(await failing.copy("x"), false); assert.match(errors.at(-1), /Intentá nuevamente/);
  assert.equal(await failing.copy("x"), false); assert.equal(errors.filter(Boolean).length, 2);
});

test("IUX-04 preserva roster y agrega sólo el índice contextual de tareas", () => {
  const roster = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveGroupMembersForOwnerReader.js");
  assert.doesNotMatch(roster, /aggregate|\.count\(|totalItems/);
  const indexes = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  const target = indexes.indexes.find((entry) => entry.collectionGroup === "items" && entry.queryScope === "COLLECTION"
    && entry.fields[0]?.fieldPath === "groupId" && entry.fields[1]?.fieldPath === "projectionState");
  assert.ok(target); assert.deepEqual(target.fields.map((field) => field.fieldPath),
    ["groupId", "projectionState", "actionableAt", "taskType", "resourceId"]);
});

test("IUX-04 conserva un solo scroller vertical de aplicacion", () => {
  const rootLayout = read("volley-ranking-frontend/src/app/layout.tsx");
  const protectedLayout = read("volley-ranking-frontend/src/app/(protected)/layout.tsx");
  assert.match(rootLayout, /className="h-dvh"/);
  assert.match(rootLayout, /className="flex h-full flex-col"/);
  assert.doesNotMatch(rootLayout, /overflow-y-auto/);
  assert.equal((protectedLayout.match(/id="protected-scroll-container"/g) || []).length, 2);
  assert.match(protectedLayout, /id="protected-scroll-container"[\s\S]*?overflow-y-auto/);
});

test("IUX-04 no consulta membresias cuando la ausencia de Persona esta acreditada", () => {
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  const groupsPage = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const personProvider = read("volley-ranking-frontend/src/components/providers/PersonProvider.tsx");
  assert.match(personProvider, /personAccountId/);
  assert.match(navigation, /personAccountId === firebaseUser\?\.uid/);
  assert.match(navigation, /loadContexts\(scopedPersonStatus === "ready"\)/);
  assert.match(navigation, /getMembershipErrorReason\(cause\) === "PERSON_REQUIRED"/);
  assert.match(groupsPage, /personAccountId !== firebaseUser\.uid/);
  assert.match(groupsPage, /personStatus === "empty"/);
});

test("IUX-04 resuelve capabilities solo bajo demanda y clasifica denegaciones esperadas", () => {
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  const membership = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/membership/page.tsx");
  assert.match(frame, /resolveAccess\(groupId, pathname\.endsWith\("\/economy"\)\)/);
  assert.match(membership, /withCapabilityTimeout\(getMyDirectPaymentRecordContext\(groupId\)\)/);
  assert.match(membership, /recordDenied[\s\S]*ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED/);
  assert.match(membership, /record\.status === "rejected" && !recordDenied/);
  assert.match(membership, /href="\/dashboard\/obligations"/);
  assert.match(membership, /No pudimos verificar todas tus autorizaciones\. No asumimos que est.n ausentes\./);
  assert.equal((membership.match(/withCapabilityTimeout\(getMyDirectPaymentRecordContext\(groupId\)\)/g) || []).length, 1);
});
