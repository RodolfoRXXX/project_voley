"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateListActiveGroupMembersForOwnedGroupPayload } = require("../../src/memberships/application/membershipContract");
const { createMembershipService } = require("../../src/memberships/application/membershipService");
const { decodeOwnerGroupMembersCursor, encodeOwnerGroupMembersCursor } = require("../../src/memberships/application/ownerGroupMembersCursor");
const { MembershipAccountRequiredError, MembershipDependencyUnavailableError, MembershipGroupNotAccessibleError, MembershipValidationError } = require("../../src/memberships/application/membershipErrors");
const { createOwnerActiveRosterCallableHandler, toMembershipHttpsError } = require("../../src/memberships/infrastructure/membershipCallable");
const { createFirestoreActiveGroupMembersForOwnerReader } = require("../../src/memberships/infrastructure/firestoreActiveGroupMembersForOwnerReader");

const timestamp = { seconds: 1788177600, nanoseconds: 123000000, toDate: () => new Date("2026-08-31T12:00:00.123Z") };
const membership = (id, personId = "person-1") => ({ membershipId: id, personId, groupId: "group-1", seasonId: "season-1", estado: "activa", fechaIngreso: timestamp, createdAt: timestamp, schemaVersion: 1 });

function serviceWith(reader, account = { userId: "owner-1" }) {
  return createMembershipService({
    selfAccountReader: { async getByUserId() { return account; } },
    selfPersonContext: { async getForUser() { return null; } },
    ownedGroupContext: {},
    openSeasonContext: {},
    membershipRepository: {},
    activeMembershipGuard: {},
    myMembershipReader: {},
    ownerActiveGroupMembersReader: reader,
  });
}

test("E2-11 payload exige groupId y rechaza toda identidad, scope u orden cliente", () => {
  assert.deepEqual(validateListActiveGroupMembersForOwnedGroupPayload({ groupId: "group-1" }), { groupId: "group-1", pageSize: 20 });
  const nullPrototype = Object.create(null);
  nullPrototype.groupId = "group-1";
  nullPrototype.pageSize = 1;
  assert.deepEqual(validateListActiveGroupMembersForOwnedGroupPayload(nullPrototype), { groupId: "group-1", pageSize: 1 });
  assert.deepEqual(validateListActiveGroupMembersForOwnedGroupPayload({ groupId: "group-1", pageSize: 20, cursor: "abc" }), { groupId: "group-1", pageSize: 20, cursor: "abc" });
  class Custom {}
  for (const invalid of [null, [], new Custom(), {}, { groupId: " group " }, { groupId: "a/b" }, { groupId: "g", pageSize: 0 }, { groupId: "g", pageSize: 21 }, { groupId: "g", pageSize: 1.5 }, { groupId: "g", cursor: "" }, { groupId: "g", cursor: "x".repeat(2049) }]) {
    assert.throws(() => validateListActiveGroupMembersForOwnedGroupPayload(invalid), MembershipValidationError);
  }
  for (const key of ["ownerUid", "uid", "personId", "membershipId", "seasonId", "roles", "estado", "filters", "order", "path", "memberIds", "adminIds"]) {
    assert.throws(() => validateListActiveGroupMembersForOwnedGroupPayload({ groupId: "group-1", [key]: "forbidden" }), MembershipValidationError);
  }
});

test("cursor Owner-roster es canónico, cerrado y ligado a actor, Grupo, Temporada, contrato y orden", () => {
  const position = { groupId: "group-1", seasonId: "season-1", userId: "owner-1", seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, lastMembershipId: "membership-20" };
  const token = encodeOwnerGroupMembersCursor(position);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(token, /=/);
  assert.deepEqual(decodeOwnerGroupMembersCursor(token, { groupId: "group-1", userId: "owner-1" }), { seasonId: "season-1", seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, lastMembershipId: "membership-20" });
  const serialized = Buffer.from(token, "base64url").toString("utf8");
  assert.equal(serialized.includes("owner-1"), false);
  for (const context of [{ groupId: "group-2", userId: "owner-1" }, { groupId: "group-1", userId: "owner-2" }]) {
    assert.throws(() => decodeOwnerGroupMembersCursor(token, context), MembershipValidationError);
  }
  assert.throws(() => decodeOwnerGroupMembersCursor(`${token.slice(0, -1)}A`, { groupId: "group-1", userId: "owner-1" }), MembershipValidationError);
});

test("servicio E2-11 revalida Cuenta, compone DTO mínimo y ancla cursor en la última fila entregada", async () => {
  let captured;
  const service = serviceWith({ async listPage(input) {
    captured = input;
    return {
      scopeStatus: "OPEN_SEASON", seasonId: "season-1", hasLookahead: true,
      cursorAnchor: { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, lastMembershipId: "membership-20" },
      rows: [
        { membership: membership("membership-01"), person: { status: "available", firstName: "Ana", lastName: "Pérez" }, isOwner: true },
        { membership: membership("membership-20", "person-2"), person: { status: "unavailable" }, isOwner: false },
      ],
    };
  } });
  const result = await service.listActiveGroupMembersForOwnedGroup({ userId: "owner-1", roles: "admin" }, { groupId: "group-1", pageSize: 20 });
  assert.deepEqual(Object.keys(result).sort(), ["items", "nextCursor", "scope"]);
  assert.deepEqual(result.scope, { status: "OPEN_SEASON" });
  assert.deepEqual(result.items, [
    { membershipId: "membership-01", joinedAt: "2026-08-31T12:00:00.123Z", isOwner: true, person: { status: "AVAILABLE", firstName: "Ana", lastName: "Pérez" } },
    { membershipId: "membership-20", joinedAt: "2026-08-31T12:00:00.123Z", isOwner: false, person: { status: "UNAVAILABLE" } },
  ]);
  assert.equal(captured.userId, "owner-1");
  assert.equal(captured.position, null);
  assert.equal(decodeOwnerGroupMembersCursor(result.nextCursor, { groupId: "group-1", userId: "owner-1" }).lastMembershipId, "membership-20");
});

test("servicio E2-11 distingue NO_OPEN_SEASON y corta antes del reader sin Cuenta", async () => {
  let called = false;
  const reader = { async listPage() { called = true; return { scopeStatus: "NO_OPEN_SEASON", rows: [], hasLookahead: false, cursorAnchor: null }; } };
  assert.deepEqual(await serviceWith(reader).listActiveGroupMembersForOwnedGroup({ userId: "owner-1" }, { groupId: "group-1", pageSize: 20 }), { scope: { status: "NO_OPEN_SEASON" }, items: [], nextCursor: null });
  called = false;
  await assert.rejects(() => serviceWith(reader, null).listActiveGroupMembersForOwnedGroup({ userId: "owner-1" }, { groupId: "group-1", pageSize: 20 }), MembershipAccountRequiredError);
  assert.equal(called, false);
});

test("callable E2-11 mapea acceso/contexto y observa sólo métricas allowlisted", async () => {
  assert.equal(toMembershipHttpsError(new MembershipGroupNotAccessibleError()).code, "permission-denied");
  const logs = [];
  const handler = createOwnerActiveRosterCallableHandler({
    validatePayload: validateListActiveGroupMembersForOwnedGroupPayload,
    operation: async () => ({ scope: { status: "OPEN_SEASON" }, items: [{ membershipId: "secret-membership", joinedAt: "2026-01-01T00:00:00.000Z", isOwner: false, person: { status: "UNAVAILABLE" } }], nextCursor: null }),
    logger: { info(...args) { logs.push(args); }, warn(...args) { logs.push(args); }, error(...args) { logs.push(args); } },
  });
  const result = await handler({ groupId: "secret-group" }, { auth: { uid: "secret-owner" } });
  assert.equal(result.items.length, 1);
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0][1], {
    operation: "owner-active-roster-list", stage: "complete", outcome: "OPEN_SEASON", requestedPageSize: 20,
    returnedCount: 1, hasContinuation: false, unavailablePersonCount: 1, durationMs: logs[0][1].durationMs,
  });
  const serialized = JSON.stringify(logs);
  for (const forbidden of ["secret-owner", "secret-group", "secret-membership", "joinedAt", "firstName", "lastName"]) assert.equal(serialized.includes(forbidden), false);
});

test("reader E2-11 distingue una dependencia transitoria de Persona ausente", async () => {
  const unavailable = Object.assign(new Error("synthetic dependency outage"), { code: 14 });
  const reader = createFirestoreActiveGroupMembersForOwnerReader({
    db: { async runTransaction() { throw unavailable; } },
    membershipRepository: {},
    groupCapability: {},
    personCapability: {},
  });
  await assert.rejects(
    () => reader.listPage({ userId: "owner-1", groupId: "group-1", pageSize: 20, position: null }),
    MembershipDependencyUnavailableError
  );
});

test("arquitectura E2-11 conserva reader/DTO y E2-12 limita la acción a terceros AVAILABLE", () => {
  const root = path.resolve(__dirname, "../../../..");
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const reader = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreActiveGroupMembersForOwnerReader.js");
  const service = read("volley-ranking-system/functions/src/memberships/application/membershipService.js");
  const personCapability = read("volley-ranking-system/functions/src/persons/public/activeGroupMemberPersonCapability.js");
  const frontend = read("volley-ranking-frontend/src/components/memberships/ActiveGroupMembersSection.tsx");
  const frontendService = read("volley-ranking-frontend/src/services/membershipsService.ts");
  const rules = read("volley-ranking-system/firestore.rules");
  const indexes = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  for (const pattern of [/where\("groupId", "=="/, /where\("seasonId", "=="/, /where\("estado", "==", "activa"\)/, /orderBy\("fechaIngreso", "asc"\)/, /FieldPath\.documentId\(\), "asc"/, /pageSize \+ 1/, /slice\(0, pageSize\)/, /runTransaction/]) assert.match(reader, pattern);
  assert.doesNotMatch(service, /firebase-admin|collection\("(groups|seasons|personas)"\)/);
  assert.match(personCapability, /firstName: person\.nombre, lastName: person\.apellido/);
  assert.doesNotMatch(reader, /memberIds|adminIds|users\.roles|notification|activity|payment|tournament/i);
  assert.doesNotMatch(`${frontend}\n${frontendService}`, /firebase\/firestore|collection\(|getDoc\(|setDoc\(|updateDoc\(/);
  for (const marker of ["Integrantes", "Cargando integrantes", "NO_OPEN_SEASON", "No hay un roster actual", "Todavía no hay integrantes", "Identidad no disponible", "Owner", "Cargar más", "Reintentar", "ROSTER_CONTEXT_CHANGED", "aria-live", "aria-busy", "role=\"alert\"", "tabIndex={-1}", "min-h-11", "sm:grid-cols-2", "lg:col-span-2"]) assert.match(frontend, new RegExp(marker));
  for (const marker of [/item\.person\.status === "AVAILABLE" && !item\.isOwner/, /availableThirdParty \?/, /Finalizar Membresía/]) assert.match(frontend, marker);
  assert.doesNotMatch(frontend, />\s*(Expulsar|Suspender|Editar)|kebab|checkbox/i);
  for (const collection of ["memberships", "validityPeriods", "activeMembershipGuards", "personas", "seasons", "openSeasonGuards"]) assert.match(rules, new RegExp(collection));
  assert.equal(indexes.indexes.filter((index) => index.collectionGroup === "memberships"
    && index.queryScope === "COLLECTION"
    && JSON.stringify(index.fields) === JSON.stringify([
      { fieldPath: "groupId", mode: "ASCENDING" },
      { fieldPath: "seasonId", mode: "ASCENDING" },
      { fieldPath: "estado", mode: "ASCENDING" },
      { fieldPath: "fechaIngreso", mode: "ASCENDING" },
    ])).length, 1);
});
