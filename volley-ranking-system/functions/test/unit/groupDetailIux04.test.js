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

test("IUX-06B reintenta cobertura inicial acotadamente y actualiza ambos resúmenes compartidos", () => {
  const summary = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  const hook = read("volley-ranking-frontend/src/components/groups/useGroupDashboardTasks.ts");
  const news = read("volley-ranking-frontend/src/components/groups/GroupNewsCard.tsx");
  assert.equal((summary.match(/tasks=\{tasks\}/g) || []).length, 2);
  assert.match(hook, /COVERAGE_RETRY_DELAYS_MS = \[250, 500, 1000, 2000\]/);
  assert.match(hook, /reason === "PROJECTION_NOT_READY"/);
  assert.match(hook, /!page\.coverage\.complete \|\| page\.coverage\.health !== "READY"/);
  assert.match(hook, /scheduleCoverageRetry\(coverageRetry\)/);
  assert.match(hook, /clearTimeout\(retryTimer\.current\)/);
  assert.match(news, /La cobertura está actualizándose; no mostramos totales inciertos/);
  assert.match(news, /Reintentar ahora/);
});

test("IUX-04 usa pestañas compartidas responsive y Clipboard accesible", () => {
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  const clipboard = read("volley-ranking-frontend/src/components/groups/CopyGroupJoinLinkButton.tsx");
  assert.match(navigation, /aria-label="Secciones del Grupo"/); assert.match(navigation, /flex-wrap/);
  assert.match(navigation, /aria-current/); assert.match(navigation, /focus-visible:outline-orange-500/);
  assert.doesNotMatch(navigation, /overflow-x-auto/);
  for (const label of ["Resumen", "Mi participación", "Economía personal", "Economía del Grupo", "Temporada", "Integrantes"]) assert.match(navigation, new RegExp(`label: "${label}"`));
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
  const switcher = read("volley-ranking-frontend/src/components/groups/GroupSwitcher.tsx");
  const groupsPage = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const personProvider = read("volley-ranking-frontend/src/components/providers/PersonProvider.tsx");
  assert.match(personProvider, /personAccountId/);
  assert.match(switcher, /personAccountId === firebaseUser\?\.uid/);
  assert.match(switcher, /scopedStatus === "empty" \? "empty"/);
  assert.match(switcher, /scopedStatus === "ready" \? "available"/);
  assert.match(switcher, /if \(membershipCoverage === "available"\)/);
  assert.match(groupsPage, /personAccountId !== firebaseUser\.uid/);
  assert.match(groupsPage, /personStatus === "empty"/);
});

test("IUX-05 integra el cambio de Grupo en el título y reserva la caja para secciones", () => {
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  const switcher = read("volley-ranking-frontend/src/components/groups/GroupSwitcher.tsx");
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  assert.match(frame, /title=\{currentAccess \? <GroupSwitcher/);
  assert.match(frame, /Temporada \$\{seasonName\} · \$\{condition\}/);
  assert.doesNotMatch(navigation, /Grupo seleccionado|Cambiar de Grupo|listOwnGroups|listMyCurrentGroupMemberships/);
  assert.match(navigation, /aria-label="Navegación del Grupo"/);
  for (const marker of ["aria-haspopup=\"menu\"", "aria-expanded", "event.key === \"Escape\"", "pointerdown", "Reintentar alternativas", "overflow-x-hidden", "pageSize: 20", "seenCursors", "MEMBERSHIP_CURSOR_REPEATED"]) assert.match(switcher, new RegExp(marker));
  assert.match(switcher, /loading \|\| !alternatives\.complete \|\| alternatives\.items\.length > 1/);
  assert.match(switcher, /current\.owner \|\| next\.owner/);
  assert.match(switcher, /current\.membership \|\| next\.membership/);
  assert.match(switcher, /pathname\.endsWith\("\/personal-economy"\) && target\.membership/);
  assert.match(switcher, /if \(target\.owner\) return base/);
  assert.match(switcher, /if \(target\.membership\) return `\$\{base\}\/membership`/);
});

test("IUX-04 resuelve capabilities una vez en el frame y clasifica denegaciones esperadas", () => {
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  const membership = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/membership/page.tsx");
  const personalEconomyPage = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/personal-economy/page.tsx");
  const personalEconomy = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  assert.match(frame, /resolveAccess\(groupId, true\)/);
  assert.doesNotMatch(frame, /usePathname|needsEconomicCapabilities/);
  assert.match(frame, /getMyDirectPaymentRecordContext\(groupId\)/);
  assert.match(frame, /ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED/);
  assert.match(frame, /capabilitiesFailed: capabilityUnavailable/);
  assert.doesNotMatch(membership, /getMyDirectPaymentRecordContext|resolveCapabilities|Promise\.allSettled/);
  assert.doesNotMatch(membership, /<PersonalMembershipEconomy/);
  assert.match(personalEconomyPage, /<PersonalMembershipEconomy[^>]*groupId=\{groupId\}/);
  assert.match(personalEconomy, /href="\/dashboard\/obligations"/);
  assert.match(frame, /No pudimos verificar todas tus autorizaciones econ.micas\. No asumimos que est.n ausentes\./);
  assert.equal((frame.match(/getMyDirectPaymentRecordContext\(groupId\)/g) || []).length, 1);
});
