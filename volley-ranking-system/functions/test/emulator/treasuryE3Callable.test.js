"use strict";
const assert = require("node:assert/strict"); const test = require("node:test"); const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard"); const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
async function body(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-02-callable`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E3-02-callable-password!", returnSecureToken: true }) }); const value = await body(response); assert.equal(response.status, 200, JSON.stringify(value)); return { uid: value.localId, idToken: value.idToken, email }; }
async function invoke(host, projectId, name, data, actor) { const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(actor ? { Authorization: `Bearer ${actor.idToken}` } : {}) }, body: JSON.stringify({ data }) }); return { status: response.status, body: await body(response) }; }

test("E3-02 recorre callables reales con clientes Auth sintéticos", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId); const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-02-callable-integration"); const db = app.firestore(); const auth = app.auth();
  const [owner, member] = await Promise.all([signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-02-call-owner@example.invalid"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-02-call-member@example.invalid")]); const prefix = "e3-02-call-"; const timestamp = admin.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z"));
  try {
    await Promise.all([
      db.doc(`users/${owner.uid}`).set({ nombre: "Owner", email: owner.email, photoURL: "", createdAt: timestamp }), db.doc(`users/${member.uid}`).set({ nombre: "Member", email: member.email, photoURL: "", createdAt: timestamp, personaId: `${prefix}member-person` }),
      db.doc(`personas/${prefix}member-person`).set({ nombre: "Mara", apellido: "Sintética", emailContacto: "member@example.invalid", createdAt: timestamp }),
      db.doc(`groups/${prefix}group`).set({ nombre: "Grupo", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: timestamp, schemaVersion: 1 }), db.doc(`seasons/${prefix}season`).set({ groupId: `${prefix}group`, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: timestamp, schemaVersion: 1 }),
      db.doc(`memberships/${prefix}membership`).set({ personId: `${prefix}member-person`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "activa", fechaIngreso: timestamp, createdAt: timestamp, schemaVersion: 1 }),
    ]);
    const host = process.env.FUNCTIONS_EMULATOR_HOST;
    const empty = await invoke(host, projectId, "listGroupTreasuryGrantsForOwner", { groupId: `${prefix}group`, pageSize: 20 }, owner); assert.deepEqual(empty.body?.result?.items, [], JSON.stringify(empty.body));
    const concept = await invoke(host, projectId, "createGroupChargeConcept", { groupId: `${prefix}group`, name: "Cuota", kind: "MONTHLY", defaultAmountMinor: 10000, idempotencyKey: "e3-02-call-concept-001" }, owner); assert.equal(concept.body?.result?.outcome, "CREATED", JSON.stringify(concept.body));
    const granted = await invoke(host, projectId, "grantGroupTreasuryCapability", { groupId: `${prefix}group`, membershipId: `${prefix}membership`, idempotencyKey: "e3-02-call-grant-00001" }, owner); assert.equal(granted.body?.result?.outcome, "GRANTED", JSON.stringify(granted.body));
    const context = await invoke(host, projectId, "getMyGroupTreasuryContext", { groupId: `${prefix}group` }, member); assert.equal(context.body?.result?.canViewEconomy, true, JSON.stringify(context.body));
    const read = await invoke(host, projectId, "listGroupChargeConcepts", { groupId: `${prefix}group`, pageSize: 20 }, member); assert.equal(read.body?.result?.items?.length, 1, JSON.stringify(read.body));
    const forbidden = await invoke(host, projectId, "createGroupChargeConcept", { groupId: `${prefix}group`, name: "No", kind: "MONTHLY", defaultAmountMinor: 1, idempotencyKey: "e3-02-call-forbidden-01" }, member); assert.equal(forbidden.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
    const revoked = await invoke(host, projectId, "revokeGroupTreasuryCapability", { groupId: `${prefix}group`, grantId: granted.body.result.grant.grantId, idempotencyKey: "e3-02-call-revoke-0001" }, owner); assert.equal(revoked.body?.result?.outcome, "REVOKED", JSON.stringify(revoked.body));
    await db.doc(`users/${owner.uid}`).update({ personaId: `${prefix}owner-person` }); await db.doc(`personas/${prefix}owner-person`).set({ nombre: "Olga", apellido: "Sintética", emailContacto: "owner@example.invalid", createdAt: timestamp });
    const history = await invoke(host, projectId, "listGroupTreasuryGrantsForOwner", { groupId: `${prefix}group`, pageSize: 20 }, owner); assert.equal(history.body?.result?.items?.length, 1, JSON.stringify(history.body)); assert.equal(history.body.result.items[0].state, "REVOKED"); assert.equal(history.body.result.items[0].accountId, undefined);
    const denied = await invoke(host, projectId, "listGroupChargeConcepts", { groupId: `${prefix}group`, pageSize: 20 }, member); assert.equal(denied.body?.error?.details?.reason, "GROUP_TREASURY_NOT_AUTHORIZED", JSON.stringify(denied.body));
  } finally {
    for (const name of ["groupCapabilityCommandReceipts", "groupCapabilityGrantSlots", "groupCapabilityGrants", "paymentCommandReceipts", "groupChargeConcepts", "memberships", "seasons", "groups", "personas"]) { const snapshot = await db.collection(name).get(); for (const doc of snapshot.docs.filter((item) => item.id.startsWith(prefix) || item.data()?.groupId === `${prefix}group`)) await doc.ref.delete(); }
    for (const actor of [owner, member]) { await db.doc(`users/${actor.uid}`).delete().catch(() => {}); await auth.deleteUser(actor.uid).catch(() => {}); } await app.delete();
  }
});
