"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-03 unifica por groupId, conserva ambas relaciones y ordena en español con desempate estable", async () => {
  const { filterPresentableGroups, mergePresentableGroups } = await import("../../../../volley-ranking-frontend/src/services/groupsPresentation.mjs");
  const owned = [
    { id: "group-z", nombre: "Águilas", deporte: "voleibol", estado: "activo" },
    { id: "group-a", nombre: "Aguilas", deporte: "voleibol", estado: "activo" },
  ];
  const memberships = [
    { group: { id: "group-z", nombre: "No reemplazar", deporte: "voleibol", estado: "activo" }, membership: { id: "m-1", seasonId: "s-1", fechaIngreso: "2026-01-01T00:00:00.000Z" } },
    { group: { id: "group-b", nombre: "Búhos", deporte: "voleibol", estado: "activo" }, membership: { id: "m-2", seasonId: "s-2", fechaIngreso: "2026-02-01T00:00:00.000Z" } },
  ];
  const result = mergePresentableGroups(owned, memberships);
  assert.deepEqual(result.map((item) => item.groupId), ["group-a", "group-z", "group-b"]);
  assert.deepEqual(result.find((item) => item.groupId === "group-z"), {
    groupId: "group-z", name: "Águilas", sport: "voleibol", state: "activo", administers: true, participates: true,
    membershipId: "m-1", membershipKey: ["group-z", "s-1", "2026-01-01T00:00:00.000Z"].join("\0"),
  });
  assert.deepEqual(filterPresentableGroups(result, "admin").map((item) => item.groupId), ["group-a", "group-z"]);
  assert.deepEqual(filterPresentableGroups(result, "member").map((item) => item.groupId), ["group-z", "group-b"]);
});

test("IUX-03 historial oculta CURRENT sólo si el vínculo exacto está visible", async () => {
  const { visibleHistoryItems } = await import("../../../../volley-ranking-frontend/src/services/groupsPresentation.mjs");
  const rows = [
    { rowKey: "same", status: "CURRENT", group: { id: "g" }, season: { id: "s" }, joinedAt: "2026-01-01" },
    { rowKey: "other-period", status: "CURRENT", group: { id: "g" }, season: { id: "old" }, joinedAt: "2025-01-01" },
    { rowKey: "historical", status: "HISTORICAL", group: { id: "g" }, season: { id: "s" }, joinedAt: "2024-01-01" },
  ];
  const visible = new Set([["g", "s", "2026-01-01"].join("\0")]);
  assert.deepEqual(visibleHistoryItems(rows, visible).map((item) => item.rowKey), ["other-period", "historical"]);
});

test("IUX-03 continúa página vacía, corta cursor repetido y descarta sesión tardía", async () => {
  const { collectCurrentMembershipPages } = await import("../../../../volley-ranking-frontend/src/services/groupsPresentation.mjs");
  const calls = [];
  const published = [];
  const pages = new Map([
    [undefined, { items: [], nextCursor: "next" }],
    ["next", { items: [{ membership: { id: "m" } }], nextCursor: null }],
  ]);
  const complete = await collectCurrentMembershipPages(async (cursor) => { calls.push(cursor); return pages.get(cursor); }, () => true, (items) => published.push(items.length));
  assert.deepEqual(calls, [undefined, "next"]);
  assert.deepEqual(published, [0, 1]);
  assert.equal(complete.cancelled, false);
  await assert.rejects(() => collectCurrentMembershipPages(async () => ({ items: [], nextCursor: "same" })), /MEMBERSHIP_CURSOR_REPEATED/);
  let current = true;
  const cancelled = await collectCurrentMembershipPages(async () => { current = false; return { items: [{ membership: { id: "late" } }], nextCursor: null }; }, () => current);
  assert.deepEqual(cancelled, { items: [], cancelled: true });
});

test("IUX-03 UI preserva cobertura parcial, paginación contractual y rutas por autorización", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const card = read("volley-ranking-frontend/src/components/groups/GroupCard.tsx");
  const membership = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/membership/page.tsx");
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  const switcher = read("volley-ranking-frontend/src/components/groups/GroupSwitcher.tsx");
  const history = read("volley-ranking-frontend/src/components/memberships/OwnGroupMembershipHistorySection.tsx");
  const personalEconomyPage = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/personal-economy/page.tsx");
  const personalEconomy = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  const presentation = read("volley-ranking-frontend/src/services/groupsPresentation.mjs");
  for (const marker of ["Todos", "Administro", "Integro", "Todavía no tenés grupos", "No integrás ningún grupo", "cobertura todavía es parcial", "pageSize: 20", "generation.current", "collectCurrentMembershipPages", "PROVISIONAL_GROUP_LIMIT", "owned.length", "groupTaskCounts", "createDashboardTasksClient", "personStatus === \"empty\"", "completá tu ficha personal"]) assert.match(page, new RegExp(marker));
  assert.doesNotMatch(page, /TaskSourceState|No pudimos verificar los pendientes|Pendientes por Grupo/);
  const membershipPage = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/membership/page.tsx");
  assert.doesNotMatch(membershipPage, /PersonalMembershipEconomy/);
  assert.match(personalEconomyPage, /PersonalMembershipEconomy/);
  assert.match(personalEconomy, /Ver todas mis obligaciones/);
  assert.doesNotMatch(personalEconomy, /capabilities\./);
  assert.doesNotMatch(`${personalEconomyPage}\n${personalEconomy}`, /capabilities\.record[^\n]*Mis obligaciones/);
  assert.match(presentation, /seenCursors/);
  assert.match(card, /administers \? `\/dashboard\/groups\/\$\{group\.groupId\}` : `\/dashboard\/groups\/\$\{group\.groupId\}\/membership`/);
  assert.equal((card.match(/<Link/g) || []).length, 1);
  for (const marker of ["Mi participación", "Economía del Grupo", "MembershipSelfExitControl"]) assert.match(membership, new RegExp(marker));
  assert.match(frame, /No asumimos que estén ausentes/);
  assert.doesNotMatch(membership, /resolveCapabilities|Promise\.allSettled|getMyDirectPaymentRecordContext/);
  assert.match(frame, /Promise\.allSettled/);
  assert.match(frame, /getMyCurrentGroupMembershipContext/);
  assert.match(switcher, /pageSize: 20/);
  assert.doesNotMatch(`${frame}\n${navigation}\n${switcher}`, /pageSize: 50/);
  assert.doesNotMatch(navigation, /getMy(GroupTreasury|PaymentReview|DirectPaymentRecord)Context/);
  assert.match(history, /status === "idle"/);
  assert.match(history, /No hay membresías finalizadas/);
  assert.doesNotMatch(history, /HISTORY_TIMEOUT|withHistoryTimeout/);
  assert.match(card, /actionableTaskCount/);
  assert.match(card, /pendiente/);
  assert.doesNotMatch(`${page}\n${card}\n${membership}`, /firebase\/firestore|collection\(|getDoc\(|setDoc\(|updateDoc\(/);
});
