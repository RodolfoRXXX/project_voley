"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  InvalidSeasonStateError,
  SEASON_FIELDS,
  buildSeason,
  hydrateSeason,
  normalizeSeasonName,
  normalizeStartDate,
} = require("../../src/groups/domain/season");
const { toSeasonDto } = require("../../src/groups/application/seasonDto");

const timestamp = { toDate: () => new Date("2026-08-26T12:00:00.000Z") };

test("Temporada normaliza nombre y nace directamente abierta para un Grupo", () => {
  const season = buildSeason({ seasonId: "season-1", groupId: "group-1", nombre: "  Temporada   A\u0301guilas  ", fechaInicio: "2026-02-28" });
  assert.deepEqual(season, { seasonId: "season-1", groupId: "group-1", nombre: "Temporada Águilas", fechaInicio: "2026-02-28", estado: "abierta", schemaVersion: 1 });
  assert.equal(Object.hasOwn(season, "fechaCierre"), false);
  assert.equal(Object.hasOwn(season, "borrador"), false);
});

test("nombre cuenta puntos de código, conserva casing y no exige unicidad", () => {
  assert.equal(normalizeSeasonName("  Apertura   DEL Sur "), "Apertura DEL Sur");
  assert.equal(Array.from(normalizeSeasonName("🏐".repeat(80))).length, 80);
  assert.equal(buildSeason({ seasonId: "a", groupId: "g", nombre: "Mismo", fechaInicio: "2024-02-29" }).nombre,
    buildSeason({ seasonId: "b", groupId: "g", nombre: "Mismo", fechaInicio: "2025-01-01" }).nombre);
});

test("Temporada rechaza IDs, nombres, controles y propiedades de entrada inválidos", () => {
  for (const nombre of ["", "   ", "a\u0000b", "x".repeat(81)]) {
    assert.throws(() => buildSeason({ seasonId: "s", groupId: "g", nombre, fechaInicio: "2026-01-01" }), InvalidSeasonStateError);
  }
  for (const input of [
    { seasonId: "", groupId: "g" },
    { seasonId: "s", groupId: "" },
    { seasonId: "s/x", groupId: "g" },
  ]) assert.throws(() => buildSeason({ ...input, nombre: "Temporada", fechaInicio: "2026-01-01" }), InvalidSeasonStateError);
});

test("fechaInicio acepta ISO civil real y años bisiestos sin usar hoy", () => {
  for (const value of ["2024-02-29", "2026-12-31", "0001-01-01"]) assert.equal(normalizeStartDate(value), value);
  for (const value of ["2023-02-29", "2026-02-30", "2026-13-01", "2026-00-01", "2026-1-01", " 2026-01-01", "2026-01-01T00:00:00Z", new Date()]) {
    assert.throws(() => normalizeStartDate(value), InvalidSeasonStateError);
  }
});

test("rehidratación exige documento schema v1 cerrado y no corrige incompatibles", () => {
  const data = { groupId: "group-1", nombre: "Temporada", fechaInicio: "2026-01-01", estado: "abierta", createdAt: timestamp, schemaVersion: 1 };
  assert.deepEqual(Object.keys(data).sort(), [...SEASON_FIELDS].sort());
  assert.equal(hydrateSeason("season-1", data).groupId, "group-1");
  for (const invalid of [
    { ...data, updatedAt: timestamp },
    { ...data, estado: "borrador" },
    { ...data, fechaCierre: null },
    { ...data, schemaVersion: 2 },
    { ...data, nombre: " Temporada " },
    { ...data, fechaInicio: "2026-02-30" },
    { ...data, createdAt: null },
  ]) assert.throws(() => hydrateSeason("season-1", invalid), InvalidSeasonStateError);
});

test("DTO de Temporada es cerrado y omite schema, guard y tipos Firebase", () => {
  const dto = toSeasonDto(hydrateSeason("season-1", { groupId: "group-1", nombre: "Temporada", fechaInicio: "2026-01-01", estado: "abierta", createdAt: timestamp, schemaVersion: 1 }));
  assert.deepEqual(dto, { id: "season-1", groupId: "group-1", nombre: "Temporada", estado: "abierta", fechaInicio: "2026-01-01", createdAt: "2026-08-26T12:00:00.000Z" });
});
