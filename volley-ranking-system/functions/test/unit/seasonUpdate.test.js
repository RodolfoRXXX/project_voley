"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateUpdateSeasonPayload } = require("../../src/groups/application/seasonContract");
const { SeasonValidationError } = require("../../src/groups/application/seasonErrors");
const { hydrateSeason } = require("../../src/groups/domain/season");
const { hashSeasonUpdateRequest, seasonEditToken, seasonUpdateReceiptId } = require("../../src/groups/application/seasonHashing");
const { hydrateUpdateReceipt, UPDATE_FIELDS } = require("../../src/groups/infrastructure/seasonReceipts");
const { createSeasonService } = require("../../src/groups/application/seasonService");

const timestamp = { seconds: 1787745600, nanoseconds: 123000000, toDate: () => new Date("2026-08-26T12:00:00.123Z") };
const open = (nombre = "Temporada") => hydrateSeason("season-1", {
  groupId: "group-1", nombre, fechaInicio: "2026-01-01", estado: "abierta", createdAt: timestamp, schemaVersion: 1,
});
const payload = { groupId: "group-1", seasonId: "season-1", nombre: " Temporada  Nueva ",
  expectedEditToken: "a".repeat(64), idempotencyKey: "season-update-1234567890" };

test("E2-17 valida payload exacto, token lowercase y campos inmutables ausentes", () => {
  assert.equal(validateUpdateSeasonPayload(payload), payload);
  for (const field of ["fechaInicio", "uid", "ownerId", "roles", "personaId", "membershipId", "estado",
    "schemaVersion", "createdAt", "updatedAt", "updatedBy", "revision", "reference"]) {
    assert.throws(() => validateUpdateSeasonPayload({ ...payload, [field]: "x" }), SeasonValidationError);
  }
  for (const token of ["A".repeat(64), "a".repeat(63), "g".repeat(64), 123]) {
    assert.throws(() => validateUpdateSeasonPayload({ ...payload, expectedEditToken: token }), SeasonValidationError);
  }
  assert.throws(() => validateUpdateSeasonPayload({ ...payload, idempotencyKey: "short" }), SeasonValidationError);
});

test("token es estable, contextual y cambia sólo con estado editable ligado", () => {
  const token = seasonEditToken(open());
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(seasonEditToken(open()), token);
  assert.notEqual(seasonEditToken(open("Temporada B")), token);
  assert.notEqual(seasonEditToken(Object.freeze({ ...open(), seasonId: "season-2" })), token);
  assert.notEqual(seasonEditToken(Object.freeze({ ...open(), fechaInicio: "2026-02-01" })), token);
  assert.equal(Object.hasOwn(open(), "editToken"), false);
});

test("receipt ID y request hash son deterministas y ligan actor, contexto, nombre y token", () => {
  const command = { ...payload, nombre: "Temporada Nueva" };
  assert.equal(seasonUpdateReceiptId("user-1", command.idempotencyKey), seasonUpdateReceiptId("user-1", command.idempotencyKey));
  assert.notEqual(seasonUpdateReceiptId("user-1", command.idempotencyKey), seasonUpdateReceiptId("user-2", command.idempotencyKey));
  const hash = hashSeasonUpdateRequest("user-1", command);
  for (const changed of [
    { actor: "user-2", command },
    { actor: "user-1", command: { ...command, groupId: "group-2" } },
    { actor: "user-1", command: { ...command, seasonId: "season-2" } },
    { actor: "user-1", command: { ...command, nombre: "Otra" } },
    { actor: "user-1", command: { ...command, expectedEditToken: "b".repeat(64) } },
  ]) assert.notEqual(hashSeasonUpdateRequest(changed.actor, changed.command), hash);
});

test("receipt UPDATED tiene schema cerrado, sin nombre, clave cruda ni snapshot", () => {
  const data = { action: "UPDATE_SEASON", actorUserId: "user-1", groupId: "group-1", seasonId: "season-1",
    requestHash: "a".repeat(64), expectedEditToken: "b".repeat(64), resultEditToken: "c".repeat(64),
    outcome: "UPDATED", confirmedAt: timestamp, receiptVersion: 1 };
  const receipt = hydrateUpdateReceipt({ exists: true, id: "receipt-1", data: () => data }, "receipt-1");
  assert.deepEqual(Object.keys(receipt).sort(), [...UPDATE_FIELDS].sort());
  for (const field of ["nombre", "idempotencyKey", "fechaInicio", "snapshot", "updatedBy", "revision"]) {
    assert.throws(() => hydrateUpdateReceipt({ exists: true, id: "receipt-1", data: () => ({ ...data, [field]: "x" }) }, "receipt-1"));
  }
});

test("servicio normaliza una vez, deriva hashes y expone token sólo para abierta", async () => {
  let command;
  const dependencies = {
    selfAccountReader: { async getByUserId(userId) { return { userId }; } },
    seasonRepository: { newId() { return "unused"; } },
    openSeasonGuard: {},
    openSeasonReader: { async getByIdForOwner() { return open(); }, async getOpenForOwner() { return open(); } },
    seasonUpdateStore: { async update(value) { command = value; return { outcome: "NO_CHANGES" }; } },
  };
  const service = createSeasonService(dependencies);
  const own = await service.getOwnSeason({ userId: "user-1" }, { groupId: "group-1", seasonId: "season-1" });
  assert.equal(own.editToken, seasonEditToken(open()));
  await service.updateSeason({ userId: "user-1" }, payload);
  assert.equal(command.nombre, "Temporada Nueva");
  assert.match(command.receiptId, /^[a-f0-9]{64}$/); assert.match(command.requestHash, /^[a-f0-9]{64}$/);
  await assert.rejects(() => service.updateSeason({ userId: "user-1" }, { ...payload, nombre: "x".repeat(81) }), { reason: "VALIDATION_FAILED" });
});
