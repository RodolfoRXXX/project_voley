"use strict";

const assert = require("node:assert/strict"); const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard"); const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreTreasuryStore } = require("../../src/treasury/infrastructure/firestoreTreasuryStore");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");
const { membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-02-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E3-02-password!", returnSecureToken: true }) }); const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function firestoreRequest({ host, projectId, path, idToken, method = "GET", body }) { const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return response.status; }

test("E3-02 concede, revalida lifecycle y reutiliza readers E3-01 sin escritura delegada", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-02-treasury-integration"); const db = app.firestore(); const auth = app.auth();
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-02-owner@example.invalid"); const member = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-02-member@example.invalid"); const ownerB = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-02-owner-b@example.invalid");
  const prefix = "e3-02-"; const base = ts(admin, "2026-01-01T00:00:00Z"); const grantTime = ts(admin, "2026-10-09T15:00:00Z");
  const treasury = createFirestoreTreasuryStore({ db, now: () => grantTime }); const payments = createFirestorePaymentStore({ db, now: () => grantTime });
  try {
    for (const [actor, personId, first] of [[owner, `${prefix}person-owner`, "Olga"], [member, `${prefix}person-member`, "Mara"], [ownerB, `${prefix}person-b`, "Berta"]]) {
      await db.doc(`users/${actor.uid}`).set({ nombre: first, email: actor.email, photoURL: "", createdAt: base,
        ...(actor.uid === owner.uid ? {} : { personaId: personId }) });
      if (actor.uid !== owner.uid) await db.doc(`personas/${personId}`).set({ nombre: first, apellido: "Sintética", emailContacto: `${personId}@example.invalid`, createdAt: base });
    }
    await db.doc(`groups/${prefix}group`).set({ nombre: "Grupo E3-02", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: base, schemaVersion: 1 });
    await db.doc(`seasons/${prefix}season`).set({ groupId: `${prefix}group`, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: base, schemaVersion: 1 });
    await db.doc(`memberships/${prefix}legacy`).set({ personId: `${prefix}person-member`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "activa", fechaIngreso: base, createdAt: base, schemaVersion: 1 });
    await db.doc(`personas/${prefix}person-unlinked`).set({ nombre: "Nora", apellido: "Sin cuenta", emailContacto: "unlinked@example.invalid", createdAt: base });
    await db.doc(`memberships/${prefix}unlinked`).set({ personId: `${prefix}person-unlinked`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "activa", fechaIngreso: base, createdAt: base, schemaVersion: 1 });
    const conceptA = (await payments.createConcept(owner.uid, { groupId: `${prefix}group`, name: "Cuota", kind: "MONTHLY", defaultAmountMinor: 10000, idempotencyKey: "e3-02-concept-key-0001" })).resource;
    await payments.createConcept(owner.uid, { groupId: `${prefix}group`, name: "Seguro", kind: "MONTHLY", defaultAmountMinor: 20000, idempotencyKey: "e3-02-concept-key-0002" });
    const one = (await payments.createConcept(owner.uid, { groupId: `${prefix}group`, name: "Camiseta", kind: "ONE_TIME", defaultAmountMinor: 30000, idempotencyKey: "e3-02-concept-key-0003" })).resource;
    const occurrencePage = await payments.listOccurrences(owner.uid, { groupId: `${prefix}group`, conceptId: one.conceptId, pageSize: 20 });
    await payments.createOccurrence(owner.uid, { groupId: `${prefix}group`, conceptId: one.conceptId, expectedConceptVersion: 1, name: "Entrega", occurrenceListToken: occurrencePage.occurrenceListToken, idempotencyKey: "e3-02-occurrence-key-01" });
    await payments.generate(owner.uid, { groupId: `${prefix}group`, conceptId: conceptA.conceptId, expectedConceptVersion: 1, membershipIds: [`${prefix}legacy`], dueDate: "2026-10-20", baseAmountMinor: 10000, exceptions: [], generationIdempotencyKey: "e3-02-generation-key-1", kind: "MONTHLY", periodKey: "2026-10" });

    let firstGrant;
    await t.test("Owner sin Persona lista y legacy acredita ancla sin materializar Períodos", async () => {
      const empty = await treasury.listForOwner(owner.uid, { groupId: `${prefix}group`, pageSize: 20 }); assert.deepEqual(empty.items, []);
      const input = { groupId: `${prefix}group`, membershipId: `${prefix}legacy`, idempotencyKey: "e3-02-grant-key-00001" };
      const granted = await treasury.grant(owner.uid, input); const retry = await treasury.grant(owner.uid, input); firstGrant = granted.grant;
      assert.equal(granted.outcome, "GRANTED"); assert.equal(retry.outcome, "EXISTING"); assert.equal(retry.grant.grantId, firstGrant.grantId);
      assert.equal((await db.doc(`groups/${prefix}group`).get()).data().ownershipRevision, 1); assert.equal((await db.collection(`memberships/${prefix}legacy/validityPeriods`).get()).empty, true);
      const raced = await Promise.allSettled([treasury.grant(owner.uid, { ...input, idempotencyKey: "e3-02-race-key-000001" }), treasury.grant(owner.uid, { ...input, idempotencyKey: "e3-02-race-key-000002" })]);
      assert.equal(raced.every((item) => item.status === "rejected" && item.reason.reason === "TREASURY_GRANT_ALREADY_ACTIVE"), true);
      assert.equal((await db.collection("groupCapabilityGrants").where("groupId", "==", `${prefix}group`).get()).size, 1);
      await assert.rejects(treasury.grant(owner.uid, { groupId: `${prefix}group`, membershipId: `${prefix}unlinked`, idempotencyKey: "e3-02-unlinked-key-001" }), (error) => error.reason === "TARGET_ACCOUNT_LINK_REQUIRED");
    });

    await t.test("tesorero lee conceptos, ocurrencias y obligaciones pero no candidatos ni mutaciones", async () => {
      assert.equal((await treasury.getMyContext(member.uid, { groupId: `${prefix}group` })).canViewEconomy, true);
      assert.equal((await payments.listConcepts(member.uid, { groupId: `${prefix}group`, pageSize: 20 })).items.length, 3);
      assert.equal((await payments.listOccurrences(member.uid, { groupId: `${prefix}group`, conceptId: one.conceptId, pageSize: 20 })).items.length, 1);
      assert.equal((await payments.listGroupObligations(member.uid, { groupId: `${prefix}group`, pageSize: 20 })).items.length, 1);
      await assert.rejects(payments.listCandidates(member.uid, { groupId: `${prefix}group`, periodKey: "2026-10", pageSize: 20 }), (error) => error.reason === "GROUP_NOT_ACCESSIBLE");
      await assert.rejects(payments.createConcept(member.uid, { groupId: `${prefix}group`, name: "No", kind: "MONTHLY", defaultAmountMinor: 1, idempotencyKey: "e3-02-forbidden-key-01" }), (error) => error.reason === "GROUP_NOT_ACCESSIBLE");
    });

    await t.test("Owner sin Persona revoca; al crear Persona conserva historia y operaciones", async () => {
      const firstPage = await payments.listConcepts(member.uid, { groupId: `${prefix}group`, pageSize: 1 }); assert.ok(firstPage.nextCursor);
      const revoke = { groupId: `${prefix}group`, grantId: firstGrant.grantId, idempotencyKey: "e3-02-revoke-key-0001" };
      assert.equal((await treasury.revoke(owner.uid, revoke)).outcome, "REVOKED"); assert.equal((await treasury.revoke(owner.uid, revoke)).outcome, "EXISTING");
      await assert.rejects(payments.listConcepts(member.uid, { groupId: `${prefix}group`, pageSize: 1, cursor: firstPage.nextCursor }), (error) => error.reason === "GROUP_TREASURY_NOT_AUTHORIZED");
      await db.doc(`users/${owner.uid}`).update({ personaId: `${prefix}person-owner` });
      await db.doc(`personas/${prefix}person-owner`).set({ nombre: "Olga", apellido: "Sintética", emailContacto: "owner@example.invalid", createdAt: base });
      const preserved = await treasury.listForOwner(owner.uid, { groupId: `${prefix}group`, pageSize: 20 }); assert.equal(preserved.items[0].state, "REVOKED");
      const next = await treasury.grant(owner.uid, { groupId: `${prefix}group`, membershipId: `${prefix}legacy`, idempotencyKey: "e3-02-grant-key-00002" }); assert.notEqual(next.grant.grantId, firstGrant.grantId);
      const history = await treasury.listForOwner(owner.uid, { groupId: `${prefix}group`, pageSize: 20 }); assert.deepEqual(history.items.map((item) => item.state).sort(), ["ACTIVE", "REVOKED"]);
    });

    await t.test("finalización/reactivación period-aware y renovación no heredan", async () => {
      await db.doc(`memberships/${prefix}legacy`).set({ personId: `${prefix}person-member`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "finalizada", fechaIngreso: base, createdAt: base, fechaEgreso: grantTime, schemaVersion: 2 });
      await assert.rejects(treasury.getMyContext(member.uid, { groupId: `${prefix}group` }), (error) => error.reason === "GROUP_TREASURY_NOT_AUTHORIZED");
      const firstId = membershipValidityPeriodId(`${prefix}legacy`, 1); const secondId = membershipValidityPeriodId(`${prefix}legacy`, 2);
      await db.doc(`memberships/${prefix}legacy`).set({ personId: `${prefix}person-member`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "activa", fechaIngreso: base, createdAt: base, latestPeriodId: secondId, periodCount: 2, schemaVersion: 3 });
      await db.doc(`memberships/${prefix}legacy/validityPeriods/${firstId}`).set({ ordinal: 1, estado: "cerrado", startedAt: base, endedAt: grantTime, periodSchemaVersion: 1 });
      await db.doc(`memberships/${prefix}legacy/validityPeriods/${secondId}`).set({ ordinal: 2, estado: "abierto", startedAt: ts(admin, "2026-10-09T16:00:00Z"), periodSchemaVersion: 1 });
      await assert.rejects(treasury.getMyContext(member.uid, { groupId: `${prefix}group` }), (error) => error.reason === "GROUP_TREASURY_NOT_AUTHORIZED");
      const periodGrant = await treasury.grant(owner.uid, { groupId: `${prefix}group`, membershipId: `${prefix}legacy`, idempotencyKey: "e3-02-period-grant-001" }); assert.equal(periodGrant.outcome, "GRANTED");
      await db.doc(`memberships/${prefix}renewed`).set({ personId: `${prefix}person-member`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "activa", fechaIngreso: grantTime, createdAt: grantTime, schemaVersion: 1 });
      await db.doc(`memberships/${prefix}legacy`).update({ estado: "finalizada", fechaEgreso: ts(admin, "2026-10-09T17:00:00Z") }); await db.doc(`memberships/${prefix}legacy/validityPeriods/${secondId}`).update({ estado: "cerrado", endedAt: ts(admin, "2026-10-09T17:00:00Z") });
      await assert.rejects(treasury.getMyContext(member.uid, { groupId: `${prefix}group` }), (error) => error.reason === "GROUP_TREASURY_NOT_AUTHORIZED");
    });

    await t.test("fixture técnico A→B→A y archivo invalidan sin transferencia ni revival", async () => {
      await db.doc(`groups/${prefix}group`).update({ ownerId: ownerB.uid, ownershipRevision: 2 }); await db.doc(`groups/${prefix}group`).update({ ownerId: owner.uid, ownershipRevision: 3 });
      await assert.rejects(treasury.getMyContext(member.uid, { groupId: `${prefix}group` }), (error) => error.reason === "GROUP_TREASURY_NOT_AUTHORIZED");
      await db.doc(`groups/${prefix}group`).update({ estado: "archivado", archivedAt: ts(admin, "2026-10-09T18:00:00Z"), schemaVersion: 4 });
      await assert.rejects(treasury.grant(owner.uid, { groupId: `${prefix}group`, membershipId: `${prefix}renewed`, idempotencyKey: "e3-02-archived-key-001" }), (error) => error.reason === "GROUP_NOT_OPERATIONAL");
    });

    await t.test("Rules niegan grants, slots y receipts al cliente", async () => {
      for (const path of ["groupCapabilityGrants/x", "groupCapabilityGrantSlots/x", "groupCapabilityCommandReceipts/x"]) {
        assert.equal(await firestoreRequest({ host: process.env.FIRESTORE_EMULATOR_HOST, projectId, path, idToken: member.idToken }), 403);
        assert.equal(await firestoreRequest({ host: process.env.FIRESTORE_EMULATOR_HOST, projectId, path, idToken: member.idToken, method: "PATCH", body: { fields: { state: { stringValue: "ACTIVE" } } } }), 403);
      }
    });
  } finally {
    for (const name of ["groupCapabilityCommandReceipts", "groupCapabilityGrantSlots", "groupCapabilityGrants", "payments", "paymentGenerationIntents", "paymentCommandReceipts", "groupChargeOccurrences", "groupChargeConcepts", "memberships", "seasons", "groups", "personas"]) { const snapshot = await db.collection(name).get(); for (const doc of snapshot.docs.filter((item) => item.id.startsWith(prefix))) { if (name === "memberships") { const periods = await doc.ref.collection("validityPeriods").get(); for (const period of periods.docs) await period.ref.delete(); } await doc.ref.delete(); } }
    for (const actor of [owner, member, ownerB]) { await db.doc(`users/${actor.uid}`).delete().catch(() => {}); await auth.deleteUser(actor.uid).catch(() => {}); } await app.delete();
  }
});
