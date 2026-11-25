"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-10 centraliza estados en español y pagina invitaciones enviadas de a cinco", () => {
  const service = read("volley-ranking-frontend/src/services/groupInvitationPresentation.mjs");
  const page = read("volley-ranking-frontend/src/components/groupInvitations/OwnedGroupInvitationsSection.tsx");
  for (const label of ["Pendiente", "Aceptada", "Rechazada", "Cancelada", "Vencida"]) assert.match(service, new RegExp(`\\b${label}\\b`));
  assert.match(service, /INVITATION_STATUS_LABELS/);
  assert.match(service, /DIRECTORY_CANDIDATE_STATE_LABELS/);
  assert.match(service, /mergeGroupInvitationPages/);
  assert.match(service, /right\.status === "pending"/);
  assert.match(page, /pageSize: 5/);
  assert.match(page, /"Mostrar más"/);
  assert.match(page, /Cancelar invitación/);
  assert.match(page, /invitationStatusLabel\(item\.status\)/);
  assert.doesNotMatch(page, />\{item\.status\}</);
});

test("IUX-10 deduplica transiciones entre páginas y reconstruye el orden global", async () => {
  const { mergeGroupInvitationPages } = await import("../../../../volley-ranking-frontend/src/services/groupInvitationPresentation.mjs");
  const first = [
    { invitationId: "pending-new", status: "pending", createdAt: "2026-11-24T12:00:00.000Z" },
    { invitationId: "pending-transition", status: "pending", createdAt: "2026-11-24T11:00:00.000Z" },
  ];
  const second = [
    { invitationId: "pending-transition", status: "accepted", createdAt: "2026-11-24T11:00:00.000Z" },
    { invitationId: "cancelled", status: "cancelled", createdAt: "2026-11-24T10:00:00.000Z" },
  ];
  const merged = mergeGroupInvitationPages(first, second);
  assert.deepEqual(merged.map(({ invitationId, status }) => ({ invitationId, status })), [
    { invitationId: "pending-new", status: "pending" },
    { invitationId: "pending-transition", status: "accepted" },
    { invitationId: "cancelled", status: "cancelled" },
  ]);
  assert.deepEqual(mergeGroupInvitationPages(merged, [second[1]], true), [second[1]]);
});

test("IUX-10 conserva accesibilidad del Owner y unifica Historial con las demás subsecciones", () => {
  const owner = read("volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx");
  const members = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  const person = read("volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx");
  const history = read("volley-ranking-frontend/src/app/(protected)/profile/memberships/history/page.tsx");
  for (const source of [owner, members]) {
    assert.match(source, /aria-expanded/);
    assert.match(source, /expanded \? "−" : "\+"/);
  }
  assert.doesNotMatch(person, /profile\/memberships\/history|Historial de grupos/);
  assert.match(history, /GroupPageShell/);
  assert.match(history, /backHref="\/profile\/info"/);
  assert.match(history, /title="Historial de grupos"/);
  assert.match(history, /w-full max-w-2xl/);
});
