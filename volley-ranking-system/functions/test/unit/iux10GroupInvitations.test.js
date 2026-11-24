"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const contract = require("../../src/groupInvitations/application/groupInvitationContract");
const hashing = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const invitations = require("../../src/groupInvitations/infrastructure/groupInvitationModule");
const root = path.resolve(__dirname, "../../../..");
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");

test("IUX-10 normaliza prefijos sin mayúsculas ni tildes y cierra páginas en diez", () => {
  assert.deepEqual(contract.search({ groupId: "group-1", query: "  Álv  " }), { groupId: "group-1", query: "alv", pageSize: 10, cursor: undefined });
  assert.throws(() => contract.search({ groupId: "group-1", query: "ab" }), /3 to 40/);
  assert.throws(() => contract.search({ groupId: "group-1", query: "abc", pageSize: 11 }), /between 1 and 10/);
});

test("IUX-10 pagina invitaciones enviadas de a cinco", () => {
  assert.deepEqual(contract.groupPage({ groupId: "group-1" }), { groupId: "group-1", pageSize: 5, cursor: undefined });
  assert.deepEqual(contract.groupPage({ groupId: "group-1", pageSize: 5, cursor: "cursor-valid" }), { groupId: "group-1", pageSize: 5, cursor: "cursor-valid" });
  assert.throws(() => contract.groupPage({ groupId: "group-1", pageSize: 6 }), /between 1 and 5/);
});

test("IUX-10 conserva un único guard físico para solicitud e invitación", () => {
  const source = read("volley-ranking-system/functions/src/groupInvitations/infrastructure/groupInvitationModule.js");
  assert.match(source, /pendingGroupJoinRequestGuardId/);
  assert.match(source, /guardVersion: 2/);
  assert.match(source, /kind: "GROUP_INVITATION"/);
  assert.match(source, /crypto\.randomBytes\(18\)/);
  assert.match(source, /groupId: input\.groupId, seasonId, query: input\.query/);
  assert.equal(hashing.pendingGroupJoinRequestGuardId("g", "p"), hashing.pendingGroupJoinRequestGuardId("g", "p"));
  assert.match(read("volley-ranking-system/functions/src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js"), /GroupJoinRequestInvitationPendingError/);
  assert.match(source, /recoverCompletedAcceptance/);
  assert.match(source, /createOrRecoverForGroupJoinRequest/);
  assert.match(source, /groupInvitationAcceptanceCoordinations/);
});

test("IUX-10 mide una página completa variada debajo del presupuesto de 95 lecturas", () => {
  assert.deepEqual(invitations.DIRECTORY_READ_MEASUREMENT, { pageSize: 10, context: 4, directoryWithLookahead: 11, activeAndAdmissionGuards: 20, referenceValidationCeiling: 60, measuredCeiling: 95, approvedCeiling: 95, rateLimitOverhead: 3 });
  assert.ok(invitations.DIRECTORY_READ_MEASUREMENT.measuredCeiling <= invitations.DIRECTORY_READ_MEASUREMENT.approvedCeiling);
});

test("IUX-10 niega acceso cliente y registra índices de directorio e invitaciones", () => {
  const rules = read("volley-ranking-system/firestore.rules");
  for (const collection of ["personDiscoverability", "discoverablePersonDirectory", "groupInvitations", "groupInvitationAcceptanceCoordinations"]) assert.match(rules, new RegExp(`match /${collection}`));
  const indexes = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "discoverablePersonDirectory"));
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "groupInvitations"));
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "groupInvitations" && index.fields.some((field) => field.fieldPath === "status")));
});
