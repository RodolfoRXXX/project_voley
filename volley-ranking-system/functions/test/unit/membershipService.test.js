"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createMembershipService } = require("../../src/memberships/application/membershipService");
const {
  MembershipAccountRequiredError,
  MembershipDependencyUnavailableError,
  MembershipInternalError,
  MembershipNotAuthorizedError,
  MembershipOpenSeasonRequiredError,
  MembershipPersonIncompatibleError,
  MembershipPersonRequiredError,
  MembershipUnauthenticatedError,
} = require("../../src/memberships/application/membershipErrors");

const timestamp = { toDate: () => new Date("2026-08-27T12:00:00.000Z") };
function persisted(overrides = {}) {
  return { membershipId: "membership-generated", personId: "person-1", groupId: "group-1", seasonId: "season-1", estado: "activa", fechaIngreso: timestamp, createdAt: timestamp, schemaVersion: 1, ...overrides };
}
function setup(overrides = {}) {
  const calls = [];
  const dependencies = {
    selfAccountReader: { async getByUserId(userId) { calls.push("account"); return { userId }; } },
    selfPersonContext: { async getForUser() { calls.push("person"); return { personId: "person-1" }; } },
    ownedGroupContext: { async getForOwner() { calls.push("group"); return { id: "group-1", estado: "activo", ownerUserId: "uid" }; } },
    openSeasonContext: { async getForOwner() { calls.push("season"); return { id: "season-1", groupId: "group-1", estado: "abierta" }; } },
    membershipRepository: { newId() { calls.push("newId"); return "membership-generated"; }, async getById() { calls.push("recover"); return persisted(); } },
    activeMembershipGuard: { async confirmActiveMembership(input) { calls.push("guard"); return { outcome: "CREATED_ACTIVE", membershipId: input.membership.membershipId }; } },
    myMembershipReader: { async getActiveForOwner() { calls.push("reader"); return null; } },
    myCurrentGroupMembershipsReader: {
      async listPage() { calls.push("list-page"); return { candidates: [], hasLookahead: false, cursorAnchor: null }; },
      async requireIntegrity() { calls.push("integrity"); },
    },
    memberGroupContext: {
      async getGroup({ groupId }) { calls.push("member-group"); return { id: groupId, nombre: "Grupo", deporte: "voleibol", estado: "activo" }; },
      async getOpenSeason({ groupId }) { calls.push("member-season"); return { id: "season-1", groupId, estado: "abierta" }; },
    },
    ...overrides,
  };
  return { service: createMembershipService(dependencies), calls };
}

const input = { groupId: "group-1", idempotencyKey: "e2-03-valid-key-0001" };

test("creación valida dependencias en orden y devuelve exclusivamente el DTO confirmado", async () => {
  const { service, calls } = setup();
  const result = await service.createMyMembershipForOwnedGroup({ userId: "uid" }, input);
  assert.deepEqual(calls, ["account", "person", "group", "season", "newId", "guard", "recover"]);
  assert.equal(result.outcome, "CREATED_ACTIVE");
  assert.deepEqual(Object.keys(result.membership).sort(), ["estado", "fechaIngreso", "groupId", "id", "personId", "seasonId"]);
  assert.equal(result.membership.fechaIngreso, "2026-08-27T12:00:00.000Z");
});

test("retry idempotente devuelve la misma Membresía provista por el guard", async () => {
  const existing = persisted({ membershipId: "same-id" });
  const { service } = setup({ activeMembershipGuard: { async confirmActiveMembership() { return { outcome: "EXISTING_IDEMPOTENT", membershipId: "same-id", membership: existing }; } } });
  const result = await service.createMyMembershipForOwnedGroup({ userId: "uid" }, input);
  assert.equal(result.outcome, "EXISTING_IDEMPOTENT");
  assert.equal(result.membership.id, "same-id");
});

test("error de infraestructura desconocido permanece INTERNAL_ERROR sanitizado", async () => {
  const unknown = Object.assign(new Error("detalle interno local"), { code: 13 });
  const { service } = setup({
    activeMembershipGuard: { async confirmActiveMembership() { throw unknown; } },
  });
  await assert.rejects(
    () => service.createMyMembershipForOwnedGroup({ userId: "uid" }, input),
    (error) => error instanceof MembershipInternalError
      && error.reason === "INTERNAL_ERROR"
      && error.message === "Membership operation failed"
      && error.cause === unknown
  );
});

test("autenticación, cuenta y Persona requerida fallan antes de reservar ID", async () => {
  await assert.rejects(() => setup().service.createMyMembershipForOwnedGroup(null, input), MembershipUnauthenticatedError);
  const missingAccount = setup({ selfAccountReader: { async getByUserId() { return null; } } });
  await assert.rejects(() => missingAccount.service.createMyMembershipForOwnedGroup({ userId: "uid" }, input), MembershipAccountRequiredError);
  const missingPerson = setup({ selfPersonContext: { async getForUser() { return null; } } });
  await assert.rejects(() => missingPerson.service.createMyMembershipForOwnedGroup({ userId: "uid" }, input), MembershipPersonRequiredError);
  assert.equal(missingPerson.calls.includes("newId"), false);
});

test("Persona incompatible y no Owner se conservan sin usar roles globales", async () => {
  await assert.rejects(() => setup({ selfPersonContext: { async getForUser() { throw new MembershipPersonIncompatibleError(); } } }).service.createMyMembershipForOwnedGroup({ userId: "uid" }, input), MembershipPersonIncompatibleError);
  await assert.rejects(() => setup({ ownedGroupContext: { async getForOwner() { throw new MembershipNotAuthorizedError(); } } }).service.createMyMembershipForOwnedGroup({ userId: "global-admin", roles: "admin" }, input), MembershipNotAuthorizedError);
});

test("Temporada abierta es obligatoria y se correlaciona", async () => {
  await assert.rejects(() => setup({ openSeasonContext: { async getForOwner() { return null; } } }).service.createMyMembershipForOwnedGroup({ userId: "uid" }, input), MembershipOpenSeasonRequiredError);
});

test("consulta owner/self-scoped devuelve ausencia o Membresía exacta", async () => {
  assert.deepEqual(await setup().service.getMyMembershipForOwnedGroup({ userId: "uid" }, "group-1"), { membership: null });
  const { service } = setup({ myMembershipReader: { async getActiveForOwner() { return persisted(); } } });
  const result = await service.getMyMembershipForOwnedGroup({ userId: "uid" }, "group-1");
  assert.equal(result.membership.id, "membership-generated");
});

test("listado clasifica sólo fallos transitorios reconocidos como dependencia", async () => {
  for (const code of [4, 8, 14, "deadline-exceeded", "resource-exhausted", "unavailable", "grpc14"]) {
    const transient = Object.assign(new Error("transient"), { code });
    const { service } = setup({
      myCurrentGroupMembershipsReader: { async listPage() { throw transient; }, async requireIntegrity() {} },
    });
    await assert.rejects(
      () => service.listMyCurrentGroupMemberships({ userId: "uid" }, { pageSize: 20 }),
      (error) => error instanceof MembershipDependencyUnavailableError && error.cause === transient
    );
  }
});

test("listado convierte errores de programación y códigos desconocidos en INTERNAL_ERROR sin parcial", async () => {
  for (const unexpected of [new TypeError("bug"), new ReferenceError("bug"), new Error("generic"), Object.assign(new Error("unknown"), { code: 13 })]) {
    const { service } = setup({
      myCurrentGroupMembershipsReader: { async listPage() { throw unexpected; }, async requireIntegrity() {} },
    });
    await assert.rejects(
      () => service.listMyCurrentGroupMemberships({ userId: "uid" }, { pageSize: 20 }),
      (error) => error instanceof MembershipInternalError
        && error.reason === "INTERNAL_ERROR"
        && error.message === "Membership operation failed"
        && error.cause === unexpected
    );
  }
});

test("listado reconoce dependencia en cause y corta ciclos de causa", async () => {
  const transient = Object.assign(new Error("outer"), { cause: Object.assign(new Error("inner"), { code: "grpc/8" }) });
  const first = new Error("cycle-a");
  const second = new Error("cycle-b");
  first.cause = second;
  second.cause = first;
  for (const [unexpected, Expected] of [[transient, MembershipDependencyUnavailableError], [first, MembershipInternalError]]) {
    const { service } = setup({
      memberGroupContext: {
        async getGroup() { throw unexpected; },
        async getOpenSeason() { throw new Error("must not run"); },
      },
      myCurrentGroupMembershipsReader: {
        async listPage() { return { candidates: [persisted()], hasLookahead: false, cursorAnchor: null }; },
        async requireIntegrity() {},
      },
    });
    await assert.rejects(
      () => service.listMyCurrentGroupMemberships({ userId: "uid" }, { pageSize: 20 }),
      (error) => error instanceof Expected
    );
  }
});

test("listado propio compone DTO exacto y excluye temporada no coincidente", async () => {
  const candidates = [persisted(), persisted({ membershipId: "membership-2", groupId: "group-2", seasonId: "season-old" })];
  const { service, calls } = setup({
    myCurrentGroupMembershipsReader: {
      async listPage(input) { calls.push(["list-page", input]); return { candidates, hasLookahead: false, cursorAnchor: null }; },
      async requireIntegrity({ candidate }) { calls.push(["integrity", candidate.membershipId]); },
    },
    memberGroupContext: {
      async getGroup({ groupId }) { return { id: groupId, nombre: `Grupo ${groupId}`, deporte: "voleibol", estado: "activo" }; },
      async getOpenSeason({ groupId }) { return { id: groupId === "group-1" ? "season-1" : "season-new", groupId, estado: "abierta" }; },
    },
  });
  const result = await service.listMyCurrentGroupMemberships({ userId: "uid", roles: "admin" }, { pageSize: 20 });
  assert.equal(result.items.length, 1);
  assert.deepEqual(Object.keys(result).sort(), ["items", "nextCursor"]);
  assert.deepEqual(Object.keys(result.items[0]).sort(), ["group", "membership"]);
  assert.deepEqual(Object.keys(result.items[0].membership).sort(), ["estado", "fechaIngreso", "id", "seasonId"]);
  assert.deepEqual(Object.keys(result.items[0].group).sort(), ["deporte", "estado", "id", "nombre"]);
  assert.equal(JSON.stringify(result).includes("personId"), false);
  assert.equal(result.nextCursor, null);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0] === "integrity").length, 2);
});

test("PERSON_REQUIRED ocurre antes del reader de Membresías", async () => {
  const { service, calls } = setup({ selfPersonContext: { async getForUser() { calls.push("person"); return null; } } });
  await assert.rejects(() => service.listMyCurrentGroupMemberships({ userId: "uid" }, { pageSize: 20 }), MembershipPersonRequiredError);
  assert.equal(calls.includes("list-page"), false);
});

test("página filtrada conserva cursor desde el último crudo procesado", async () => {
  const anchor = { seconds: 1788177600, nanoseconds: 0, lastMembershipId: "membership-raw" };
  const { service } = setup({
    myCurrentGroupMembershipsReader: {
      async listPage() { return { candidates: [persisted()], hasLookahead: true, cursorAnchor: anchor }; },
      async requireIntegrity() {},
    },
    memberGroupContext: {
      async getGroup() { return { id: "group-1", nombre: "Grupo", deporte: "voleibol", estado: "activo" }; },
      async getOpenSeason() { return null; },
    },
  });
  const result = await service.listMyCurrentGroupMemberships({ userId: "uid" }, { pageSize: 1 });
  assert.deepEqual(result.items, []);
  assert.equal(typeof result.nextCursor, "string");
});

test("corrupción o dependencia corta la página sin lista parcial", async () => {
  const incompatible = new (require("../../src/memberships/application/membershipErrors").MembershipIncompatibleStateError)();
  const { service } = setup({
    myCurrentGroupMembershipsReader: {
      async listPage() { return { candidates: [persisted(), persisted({ membershipId: "membership-2" })], hasLookahead: false, cursorAnchor: null }; },
      async requireIntegrity({ candidate }) { if (candidate.membershipId === "membership-2") throw incompatible; },
    },
  });
  await assert.rejects(() => service.listMyCurrentGroupMemberships({ userId: "uid" }, { pageSize: 20 }), (error) => error === incompatible);
});
