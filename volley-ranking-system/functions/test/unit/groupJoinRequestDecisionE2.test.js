"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");
const { buildGroupJoinRequest, hydrateGroupJoinRequest } = require("../../src/groupJoinRequests/domain/groupJoinRequest");
const { validateGroupJoinRequestDecisionPayload, validateGroupJoinRequestResultPayload } = require("../../src/groupJoinRequests/application/groupJoinRequestContract");
const { groupJoinRequestDecisionHash, groupJoinRequestDecisionIntentId, groupJoinRequestMembershipHash, groupJoinRequestMembershipIdempotencyHash } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { toApprovalDto, toDecisionResultDto, toOwnGroupJoinRequestDto, toRejectionDto } = require("../../src/groupJoinRequests/application/groupJoinRequestDto");
const { COORDINATION_FIELDS, DECISION_INTENT_FIELDS } = require("../../src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore");

class Time { constructor(ms) { this.ms = ms; this.seconds = Math.floor(ms / 1000); this.nanoseconds = (ms % 1000) * 1e6; } toDate() { return new Date(this.ms); } }
function digest(parts) { const hash = crypto.createHash("sha256"); for (const part of parts) { const value = String(part); hash.update(String(Buffer.byteLength(value))); hash.update(":"); hash.update(value); } return hash.digest("hex"); }
const pending = () => buildGroupJoinRequest({ requestId: "request-1", personId: "person-1", groupId: "group-1", createdAt: new Time(1000) });

test("E2-07 dominio aplica rechazo y aprobación sólo desde pendiente", () => {
  const request = pending();
  const rejected = request.reject({ decisionIntentId: "intent-r", decidedBy: "owner-1", decidedAt: new Time(2000) });
  const approved = request.approveAfterMembership({ decisionIntentId: "intent-a", decidedBy: "owner-1", decidedAt: new Time(2000), membershipId: "membership-1" });
  assert.equal(rejected.estado, "rechazada"); assert.equal(rejected.schemaVersion, 2); assert.equal(Object.hasOwn(rejected, "membershipId"), false);
  assert.equal(approved.estado, "aprobada"); assert.equal(approved.membershipId, "membership-1"); assert.equal(approved.schemaVersion, 2);
  assert.throws(() => rejected.reject({ decisionIntentId: "x", decidedBy: "o", decidedAt: new Time(3000) }));
  assert.throws(() => approved.approveAfterMembership({ decisionIntentId: "x", decidedBy: "o", decidedAt: new Time(3000), membershipId: "m" }));
});

test("E2-07 hidratación discrimina cuatro schemas cerrados", () => {
  const createdAt = new Time(1000), decidedAt = new Time(2000);
  for (const data of [
    { personId: "p", groupId: "g", estado: "pendiente", createdAt, schemaVersion: 1 },
    { personId: "p", groupId: "g", estado: "cancelada", createdAt, cancelledAt: decidedAt, schemaVersion: 1 },
    { personId: "p", groupId: "g", estado: "rechazada", createdAt, decisionIntentId: "i", decidedBy: "o", decidedAt, schemaVersion: 2 },
    { personId: "p", groupId: "g", estado: "aprobada", createdAt, decisionIntentId: "i", decidedBy: "o", decidedAt, membershipId: "m", schemaVersion: 2 },
  ]) assert.equal(hydrateGroupJoinRequest("r", data).estado, data.estado);
  assert.throws(() => hydrateGroupJoinRequest("r", { personId: "p", groupId: "g", estado: "aprobada", createdAt, decisionIntentId: "i", decidedBy: "o", decidedAt, schemaVersion: 2 }));
  assert.throws(() => hydrateGroupJoinRequest("r", { personId: "p", groupId: "g", estado: "rechazada", createdAt, decisionIntentId: "i", decidedBy: "o", decidedAt, membershipId: "m", schemaVersion: 2 }));
  assert.throws(() => hydrateGroupJoinRequest("r", { personId: "p", groupId: "g", estado: "rechazada", createdAt, decisionIntentId: "i", decidedBy: "o", decidedAt: new Time(0), schemaVersion: 2 }));
});

test("E2-07 contratos de decisión y consulta son cerrados", () => {
  const input = { groupId: "g", requestId: "r", idempotencyKey: "decision-key-0001" };
  assert.deepEqual(validateGroupJoinRequestDecisionPayload(input), input);
  assert.deepEqual(validateGroupJoinRequestResultPayload({ groupId: "g", requestId: "r" }), { groupId: "g", requestId: "r" });
  for (const invalid of [{ ...input, personId: "p" }, { ...input, idempotencyKey: "short" }, { groupId: "g", requestId: "r", idempotencyKey: "decision-key-0001", action: "approve" }, null, []]) assert.throws(() => validateGroupJoinRequestDecisionPayload(invalid));
});

test("E2-07 hashes usan namespaces y length-prefix exactos", () => {
  assert.equal(groupJoinRequestDecisionIntentId("owner", "decision-key-0001"), digest(["sportexa:E2-07:decision-intent:v1", "owner", "decision-key-0001"]));
  assert.equal(groupJoinRequestDecisionHash("r", "p", "g", "approve"), digest(["sportexa:E2-07:decision-request:v1", "contract-v1", "r", "p", "g", "approve"]));
  assert.equal(groupJoinRequestMembershipIdempotencyHash("r", "p", "g"), digest(["sportexa:E2-07:request-membership-idempotency:v1", "r", "p", "g"]));
  assert.equal(groupJoinRequestMembershipHash("r", "p", "g", "s"), digest(["sportexa:E2-07:request-membership:v1", "contract-v1", "r", "p", "g", "s"]));
});

test("E2-07 DTOs omiten identidades y controles privados", () => {
  const request = pending().approveAfterMembership({ decisionIntentId: "intent-a", decidedBy: "owner-1", decidedAt: new Time(2000), membershipId: "membership-1" });
  const member = { membershipId: "membership-1", seasonId: "season-1", personId: "person-1", groupId: "group-1" };
  const approved = toApprovalDto("APPROVED", request, member); const result = toDecisionResultDto({ status: "APPROVED", request, membership: member });
  assert.deepEqual(approved, { outcome: "APPROVED", decision: { requestId: "request-1", estado: "aprobada", decidedAt: "1970-01-01T00:00:02.000Z", membership: { id: "membership-1", seasonId: "season-1" } } });
  assert.equal(JSON.stringify(approved).includes("owner-1"), false); assert.equal(JSON.stringify(result).includes("person-1"), false); assert.equal(JSON.stringify(result).includes("intent-a"), false);
  assert.equal(toRejectionDto("REJECTED", pending().reject({ decisionIntentId: "i", decidedBy: "o", decidedAt: new Time(2000) })).decision.estado, "rechazada");
  assert.equal(toOwnGroupJoinRequestDto(pending(), "APPROVAL_IN_PROGRESS").decisionStatus, "APPROVAL_IN_PROGRESS");
});

test("E2-07 schemas técnicos son exactos", () => {
  assert.deepEqual([...DECISION_INTENT_FIELDS].sort(), ["action", "createdAt", "groupId", "intentVersion", "personId", "requestHash", "requestId", "requestedBy"]);
  assert.deepEqual([...COORDINATION_FIELDS].sort(), ["coordinationVersion", "createdAt", "decisionIntentId", "groupId", "personId", "requestId", "requestedBy", "seasonId"]);
});

test("E2-07 máquina frontend conserva clave y aplica sólo resultado autoritativo", async () => {
  const machine = await import(pathToFileURL(path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/groupJoinRequests/groupJoinRequestDecisionMachine.mjs")));
  let generated = 0; const intent = machine.newDecisionIntent("approve", "r", () => `key-${++generated}`); assert.equal(intent.idempotencyKey, "key-1"); assert.equal(generated, 1);
  const items = [{ id: "r", estado: "pendiente", decisionStatus: "PENDING", createdAt: "x", person: { firstName: "A", lastName: "B" } }];
  assert.equal(machine.applyAuthoritativeDecision(items, { status: "APPROVAL_IN_PROGRESS", request: { id: "r", estado: "pendiente", createdAt: "x" }, startedAt: "y" })[0].decisionStatus, "APPROVAL_IN_PROGRESS");
  assert.deepEqual(machine.applyAuthoritativeDecision(items, { status: "REJECTED", request: { id: "r", estado: "rechazada", createdAt: "x", decidedAt: "y" } }), []);
  assert.equal(machine.shouldConsultAfterDecisionError("CONFLICT"), true); assert.equal(machine.shouldConsultAfterDecisionError("VALIDATION_FAILED"), false);
});

test("E2-07 frontend applies single-flight, stable retries, rotation, Escape and focus", async () => {
  const machine = await import(pathToFileURL(path.resolve(__dirname, "../../../../volley-ranking-frontend/src/components/groupJoinRequests/groupJoinRequestDecisionMachine.mjs")));
  const flights = machine.createRequestFlights();
  assert.equal(flights.start("r1"), true); assert.equal(flights.start("r1"), false); assert.equal(flights.start("r2"), true);
  flights.finish("r1"); assert.equal(flights.start("r1"), true);
  let sequence = 0; const intents = machine.createDecisionIntentRegistry(() => `key-${++sequence}`);
  assert.equal(intents.getOrCreate("approve", "r1").idempotencyKey, "key-1");
  assert.equal(intents.getOrCreate("approve", "r1").idempotencyKey, "key-1");
  assert.equal(intents.getOrCreate("reject", "r1").idempotencyKey, "key-2");
  intents.confirm("approve", "r1"); assert.equal(intents.getOrCreate("approve", "r1").idempotencyKey, "key-3");
  assert.equal(machine.dismissesDecisionDialog("Escape"), true); assert.equal(machine.dismissesDecisionDialog("Enter"), false);
  let focused = 0; let scheduled = 0; machine.scheduleFocus({ focus() { focused += 1; } }, (callback) => { scheduled += 1; callback(); });
  assert.equal(scheduled, 1); assert.equal(focused, 1);
});
