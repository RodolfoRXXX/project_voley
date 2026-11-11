"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Timestamp } = require("firebase-admin/firestore");
const { validateListMyGroupJoinRequestsPayload } = require("../../src/groupJoinRequests/application/groupJoinRequestContract");
const { decodeOwnGroupJoinRequestCursor, encodeOwnGroupJoinRequestCursor } = require("../../src/groupJoinRequests/application/ownGroupJoinRequestCursor");
const { GroupJoinRequestValidationError } = require("../../src/groupJoinRequests/application/groupJoinRequestErrors");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-06B limita solicitudes propias a cinco y liga cursor a Persona", () => {
  assert.deepEqual(validateListMyGroupJoinRequestsPayload({}), { pageSize: 5 });
  assert.deepEqual(validateListMyGroupJoinRequestsPayload({ pageSize: 5, cursor: "abc" }), { pageSize: 5, cursor: "abc" });
  for (const pageSize of [0, 6, 1.5]) assert.throws(() => validateListMyGroupJoinRequestsPayload({ pageSize }), GroupJoinRequestValidationError);
  const token = encodeOwnGroupJoinRequestCursor({ personId: "person-1", createdAt: new Timestamp(10, 20), requestId: "request-1" });
  assert.deepEqual(decodeOwnGroupJoinRequestCursor(token, "person-1"), { seconds: 10, nanoseconds: 20, requestId: "request-1" });
  assert.throws(() => decodeOwnGroupJoinRequestCursor(token, "person-2"), GroupJoinRequestValidationError);
});

test("IUX-06B presenta tres bloques, carga historia a demanda y no consulta por tarjeta", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const pending = read("volley-ranking-frontend/src/components/groupJoinRequests/OwnPendingGroupJoinRequestsSection.tsx");
  const history = read("volley-ranking-frontend/src/components/memberships/OwnGroupMembershipHistorySection.tsx");
  assert.ok(page.indexOf("Grupos actuales") < page.lastIndexOf("<OwnPendingGroupJoinRequestsSection"));
  assert.ok(page.lastIndexOf("<OwnPendingGroupJoinRequestsSection") < page.lastIndexOf("<OwnGroupMembershipHistorySection"));
  assert.match(page, /CURRENT_GROUP_PAGE_SIZE = 5/); assert.match(page, /Cargar más grupos actuales/); assert.match(page, /filtered\.slice\(0, visibleCurrentGroups\)/);
  assert.match(pending, /pageSize: 5/); assert.match(pending, /Cancelar solicitud/); assert.match(pending, /cancelMyGroupJoinRequest/);
  assert.doesNotMatch(pending, /getMyCurrentGroupJoinRequest/);
  assert.match(history, /aria-expanded/); assert.match(history, /status === "idle"/); assert.match(history, /pageSize: 5/); assert.match(history, /Último período/);
});

test("IUX-06B filtra administración y membresía acreditada como condiciones independientes", async () => {
  const { filterPresentableGroups, mergePresentableGroups } = await import("../../../../volley-ranking-frontend/src/services/groupsPresentation.mjs");
  const items = mergePresentableGroups(
    [
      { id: "group-admin", nombre: "Sólo administro", deporte: "voleibol", estado: "activo" },
      { id: "group-both", nombre: "Administro e integro", deporte: "futbol", estado: "activo" },
    ],
    [
      { group: { id: "group-member", nombre: "Sólo integro", deporte: "basquet", estado: "activo" }, membership: { id: "membership-member", seasonId: "season-1", fechaIngreso: "2026-01-01T00:00:00.000Z" } },
      { group: { id: "group-both", nombre: "Administro e integro", deporte: "futbol", estado: "activo" }, membership: { id: "membership-both", seasonId: "season-1", fechaIngreso: "2026-02-01T00:00:00.000Z" } },
    ],
  );
  assert.equal(items.length, 3);
  assert.equal(items.filter((item) => item.groupId === "group-both").length, 1);
  assert.deepEqual(filterPresentableGroups(items, "admin").map((item) => item.groupId).sort(), ["group-admin", "group-both"]);
  assert.deepEqual(filterPresentableGroups(items, "member").map((item) => item.groupId).sort(), ["group-both", "group-member"]);
  assert.deepEqual(filterPresentableGroups(items, "all").map((item) => item.groupId).sort(), ["group-admin", "group-both", "group-member"]);
  assert.deepEqual(
    items.map(({ groupId, administers, participates }) => ({ groupId, administers, participates })).sort((left, right) => left.groupId.localeCompare(right.groupId)),
    [
      { groupId: "group-admin", administers: true, participates: false },
      { groupId: "group-both", administers: true, participates: true },
      { groupId: "group-member", administers: false, participates: true },
    ],
  );
  assert.equal(filterPresentableGroups(mergePresentableGroups(
    [{ id: "group-admin", nombre: "Sólo administro", deporte: "voleibol", estado: "activo" }],
    [],
  ), "member").length, 0);
});

test("IUX-06B espera cobertura completa antes de mostrar el vacío de Integro", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  assert.match(page, /\["member", "Integro"\]/);
  assert.match(page, /coverageComplete && filter === "member" && filtered\.length === 0/);
  assert.match(page, /No integrás ningún grupo/);
  assert.match(page, /collectCurrentMembershipPages/);
  assert.match(page, /personStatus === "error" \|\| personStatus === "inconsistent" \|\| personStatus === "sessionInvalid"/);
  assert.match(page, /retryPerson\(\)/);
  assert.match(page, /Estamos verificando tus grupos actuales/);
});
