"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  GROUP_FIELDS,
  InvalidGroupStateError,
  buildGroup,
  hydrateGroup,
  normalizeGroupName,
} = require("../../src/groups/domain/group");
const { toGroupDto } = require("../../src/groups/application/groupDto");

const timestamp = { toDate: () => new Date("2026-08-26T12:00:00.000Z") };

test("Grupo normaliza nombre Unicode y crea exactamente un Owner con estado activo", () => {
  const group = buildGroup({ groupId: "opaque-id", nombre: "  Vóley   Ñandú  ", deporte: " VOLEIBOL ", ownerId: "uid-1" });
  assert.deepEqual(group, {
    groupId: "opaque-id",
    nombre: "Vóley Ñandú",
    deporte: "voleibol",
    ownerId: "uid-1",
    estado: "activo",
    schemaVersion: 1,
  });
  assert.equal(Object.hasOwn(group, "memberIds"), false);
  assert.equal(Object.hasOwn(group, "adminIds"), false);
  assert.equal(Object.hasOwn(group, "temporadaId"), false);
});

test("Grupo cuenta puntos de código, conserva casing/acentos y no exige nombre único", () => {
  assert.equal(normalizeGroupName("  Águilas   DEL Sur "), "Águilas DEL Sur");
  assert.equal(Array.from(normalizeGroupName("🏐".repeat(80))).length, 80);
  const first = buildGroup({ groupId: "one", nombre: "Mismo", deporte: "voleibol", ownerId: "u1" });
  const second = buildGroup({ groupId: "two", nombre: "Mismo", deporte: "voleibol", ownerId: "u2" });
  assert.equal(first.nombre, second.nombre);
});

test("Grupo rechaza nombre, deporte, Owner e IDs inválidos", () => {
  for (const nombre of ["", "   ", "a\u0000b", "x".repeat(81)]) {
    assert.throws(() => buildGroup({ groupId: "id", nombre, deporte: "voleibol", ownerId: "uid" }), InvalidGroupStateError);
  }
  assert.throws(() => buildGroup({ groupId: "id", nombre: "Grupo", deporte: "futbol", ownerId: "uid" }), InvalidGroupStateError);
  assert.throws(() => buildGroup({ groupId: "id", nombre: "Grupo", deporte: "voleibol", ownerId: "" }), InvalidGroupStateError);
});

test("rehidratación exige el esquema canónico cerrado y valores v1 exactos", () => {
  const data = { nombre: "Grupo", deporte: "voleibol", ownerId: "uid", estado: "activo", createdAt: timestamp, schemaVersion: 1 };
  const hydrated = hydrateGroup("opaque", data);
  assert.deepEqual(Object.keys(data).sort(), [...GROUP_FIELDS].sort());
  assert.equal(hydrated.groupId, "opaque");
  for (const invalid of [
    { ...data, memberIds: [] },
    { ...data, estado: "borrador" },
    { ...data, schemaVersion: 2 },
    { ...data, ownerId: "" },
    { ...data, createdAt: null },
    { ...data, nombre: " Grupo " },
  ]) assert.throws(() => hydrateGroup("opaque", invalid), InvalidGroupStateError);
});

test("DTO público es exacto, serializa ISO y no filtra tipos Firebase", () => {
  const dto = toGroupDto(hydrateGroup("opaque", { nombre: "Grupo", deporte: "voleibol", ownerId: "uid", estado: "activo", createdAt: timestamp, schemaVersion: 1 }));
  assert.deepEqual(dto, { id: "opaque", nombre: "Grupo", deporte: "voleibol", estado: "activo", ownerUserId: "uid", createdAt: "2026-08-26T12:00:00.000Z" });
});
