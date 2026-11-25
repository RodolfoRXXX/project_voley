"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const contract = require("../../src/administrativePersons/application/administrativePersonContract");
const root = path.resolve(__dirname, "../../../..");
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");

test("IUX-11A.1 valida paginación y reincorporación estrictas", () => {
  assert.deepEqual(contract.validateListAdministrativePersonsPayload({ groupId: "group-1" }), { groupId: "group-1", pageSize: 20, cursor: undefined });
  assert.deepEqual(contract.validateListAdministrativePersonsPayload({ groupId: "group-1", pageSize: 5, cursor: "cursor-valid-123" }), { groupId: "group-1", pageSize: 5, cursor: "cursor-valid-123" });
  assert.throws(() => contract.validateListAdministrativePersonsPayload({ groupId: "group-1", pageSize: 21 }));
  assert.deepEqual(contract.validatePrepareAdministrativeReincorporationPayload({ groupId: "group-1", personId: "person-1" }), { groupId: "group-1", personId: "person-1" });
  assert.equal(contract.validateConfirmAdministrativeReincorporationPayload({ groupId: "group-1", personId: "person-1", previewToken: "preview-token-valid-123", idempotencyKey: "idempotency-key-123" }).personId, "person-1");
});

test("IUX-11A.1 conserva modal, tabs URL-driven y autorización backend", () => {
  const modal = read("volley-ranking-frontend/src/components/administrativePersons/AdministrativePersonModal.tsx");
  const reincorporation = read("volley-ranking-frontend/src/components/administrativePersons/AdministrativeNonMembersSection.tsx");
  const addPage = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/members/add/page.tsx");
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/members/page.tsx");
  const roster = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  const module = read("volley-ranking-system/functions/src/administrativePersons/infrastructure/administrativePersonModule.js");
  const invitations = read("volley-ranking-system/functions/src/groupInvitations/infrastructure/groupInvitationModule.js");
  assert.match(modal, /aria-modal="true"/); assert.match(modal, /event\.key === "Escape"/); assert.match(modal, /first\.current\?\.focus/); assert.match(modal, /intent\.current/);
  assert.doesNotMatch(reincorporation, /window\.confirm/); assert.match(reincorporation, /role="alertdialog"/); assert.match(reincorporation, /Temporada de destino/); assert.match(reincorporation, /sendingRef\.current/);
  assert.match(addPage, /No encontramos coincidencias/); assert.match(addPage, /Crear integrante/); assert.match(modal, /no envía una invitación ni vincula una cuenta/);
  assert.match(page, /membersView/); assert.match(page, /role="tablist"/); assert.match(page, /joinRequestId/); assert.match(page, /invitationId/);
  assert.match(roster, /administrativeCustody\?\.status === "EDITABLE"/);
  assert.match(module, /season\.seasonId !== plan\.seasonId/); assert.match(module, /destinationSeason/);
  assert.match(invitations, /ownedHistorical/); assert.match(invitations, /await ownedHistorical\(tx, userId, input\.groupId\)/);
});
