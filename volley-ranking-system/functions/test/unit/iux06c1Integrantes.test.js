"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-06C1 conserva orden del padrón, excluye al Owner canónico y deduplica páginas", async () => {
  const { mergeRosterPages } = await import("../../../../volley-ranking-frontend/src/components/memberships/rosterPresentation.mjs");
  const member = (membershipId, isOwner = false) => ({ membershipId, isOwner });
  const first = mergeRosterPages([], [member("member-1"), member("owner-membership", true), member("member-2")]);
  assert.deepEqual(first.map((item) => item.membershipId), ["member-1", "member-2"]);
  const all = mergeRosterPages(first, [member("owner-membership", true), member("member-2"), member("member-3")]);
  assert.deepEqual(all.map((item) => item.membershipId), ["member-1", "member-2", "member-3"]);
});

test("IUX-06C1 integra Tu membresía como primera fila desplegable y preserva acciones canónicas", () => {
  const roster = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  const own = read("volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx");
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/members/page.tsx");
  assert.ok(roster.indexOf("<OwnMembershipSection") < roster.indexOf("items.map"));
  for (const marker of ["aria-expanded", "aria-controls", "focus-visible:outline-2", "md:flex-row", "mergeRosterPages", "Cargar más", "Editar cargo", "Finalizar Membresía"]) assert.match(roster, new RegExp(marker));
  for (const marker of ["Todavía no sos integrante", "/profile/person", "Owner", "Incorporarme como integrante", "Finalizar mi Membresía", "getMembershipCargoForOwnedGroup", "Seguís administrando el grupo. Para sumarte como integrante, necesitás crear tu ficha personal.", "Ya podés sumarte como integrante y seguir administrando el grupo."]) assert.match(own, new RegExp(marker));
  for (const marker of ["useState(false)", "aria-expanded={expanded}", "rotate-180", "Crear mi ficha personal", ">ACTIVA<", "Integrante desde"]) assert.ok(own.includes(marker), `falta ${marker}`);
  assert.doesNotMatch(own, /Crear mi Persona|Temporada: \{membership\.seasonId\}|bg-emerald-50/);
  assert.doesNotMatch(page, /<OwnMembershipSection/);
  assert.doesNotMatch(`${roster}\n${own}`, /firebase\/firestore|collection\(|getDoc\(|setDoc\(|updateDoc\(/);
});

test("IUX-06C1 descarta lecturas tardías y refresca el padrón después de aprobar sin repetir el comando", () => {
  const pending = read("volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx");
  const roster = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  for (const marker of ["terminalRequestIds", "terminalRequestIds.current.has(requestedRequestId)", "terminalRequestIds.current.add(requestId)", "applyAuthoritativeDecision", "REQUEST_NOT_PENDING", "group-membership-changed", "setError(\"\")", "setItems((current) => current.filter"]) assert.ok(pending.includes(marker), `falta ${marker}`);
  assert.equal((pending.match(/approveGroupJoinRequest\(/g) ?? []).length, 1);
  assert.match(roster, /addEventListener\("group-membership-changed", refresh\)/);
});
