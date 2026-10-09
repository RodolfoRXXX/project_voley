"use strict";
const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const test = require("node:test");
const { validateGrant, validateGroup, validateList, validateRevoke } = require("../../src/treasury/application/treasuryContract");
const root = path.resolve(__dirname, "../..");

test("E3-02 expone contratos cerrados y claves idempotentes acotadas", () => {
  assert.deepEqual(validateGrant({ groupId: "g", membershipId: "m", idempotencyKey: "1234567890123456" }), { groupId: "g", membershipId: "m", idempotencyKey: "1234567890123456" });
  assert.deepEqual(validateRevoke({ groupId: "g", grantId: "x", idempotencyKey: "abcdefghijklmnop" }), { groupId: "g", grantId: "x", idempotencyKey: "abcdefghijklmnop" });
  assert.deepEqual(validateGroup({ groupId: "g" }), { groupId: "g" }); assert.equal(validateList({ groupId: "g" }).pageSize, 20);
  for (const payload of [{ groupId: "g", membershipId: "m", idempotencyKey: "short" }, { groupId: "g", membershipId: "m", idempotencyKey: "1234567890123456", capabilityId: "WRITE" }]) assert.throws(() => validateGrant(payload), (error) => error.reason === "VALIDATION_FAILED");
});

test("E3-02 publica sólo la capacidad fija y conserva deny-all", () => {
  const index = fs.readFileSync(path.join(root, "index.js"), "utf8");
  for (const name of ["grantGroupTreasuryCapability", "revokeGroupTreasuryCapability", "listGroupTreasuryGrantsForOwner", "getMyGroupTreasuryContext"]) assert.match(index, new RegExp(`exports\\.${name}`));
  const rules = fs.readFileSync(path.resolve(root, "../firestore.rules"), "utf8");
  for (const collection of ["groupCapabilityGrants", "groupCapabilityGrantSlots", "groupCapabilityCommandReceipts"]) assert.match(rules, new RegExp(`match /${collection}.*[\\s\\S]*?allow read, write: if false`));
  const store = fs.readFileSync(path.join(root, "src/treasury/infrastructure/firestoreTreasuryStore.js"), "utf8");
  assert.match(store, /CAPABILITY_ID/); for (const forbidden of ["updatePagoEstado", "transferGroupOwnership", "pagoEstado", "cargo ===", "cargo =="]) assert.doesNotMatch(store, new RegExp(forbidden));
});

test("E3-02 cruza módulos sólo por capacidades públicas", () => {
  const store = fs.readFileSync(path.join(root, "src/treasury/infrastructure/firestoreTreasuryStore.js"), "utf8");
  for (const boundary of ["groups/public/groupOwnershipContextCapability", "memberships/public/treasuryMembershipAuthorizationCapability", "users/public/treasuryAccountIdentityCapability"]) assert.match(store, new RegExp(boundary));
  assert.doesNotMatch(store, /(?:groups|memberships|users)\/(?:domain|application|infrastructure)\//);
  const payment = fs.readFileSync(path.join(root, "src/payments/infrastructure/firestorePaymentStore.js"), "utf8"); assert.match(payment, /treasury\/public\/groupTreasuryAuthorizationCapability/);
  const deletion = fs.readFileSync(path.join(root, "src/groups/infrastructure/firestoreGroupDeletionStore.js"), "utf8");
  for (const collection of ["groupCapabilityGrants", "groupCapabilityGrantSlots", "groupCapabilityCommandReceipts"]) assert.match(deletion, new RegExp(`"${collection}"`));
});

test("E3-02 separa autorizacion Owner por Cuenta de contexto delegado", () => {
  const identity = fs.readFileSync(path.join(root, "src/users/public/treasuryAccountIdentityCapability.js"), "utf8");
  const store = fs.readFileSync(path.join(root, "src/treasury/infrastructure/firestoreTreasuryStore.js"), "utf8");

  assert.match(identity, /async getCanonicalAccount\(/);
  assert.match(store, /identity\.getCanonicalAccount\(/);
  assert.match(store, /async function requireOwnerAccount\(/);
  assert.match(store, /async function requireActor\(/);
  assert.match(store, /async function getMyContext[\s\S]*?requireActor\(/);
  assert.match(store, /async function listForOwner[\s\S]*?ensureOwnedContext\(/);
  assert.match(store, /async function grant[\s\S]*?ensureOwnedContext\(/);
  assert.match(store, /resolveUniqueAccountForPerson\(/);
});
