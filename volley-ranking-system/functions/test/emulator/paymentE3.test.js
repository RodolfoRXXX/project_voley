"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");
const { membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { createFirestoreGroupDeletionStore } = require("../../src/groups/infrastructure/firestoreGroupDeletionStore");
const { createFirestoreGroupRepository } = require("../../src/groups/infrastructure/firestoreGroupRepository");
const { createFirestoreMembershipRepository } = require("../../src/memberships/infrastructure/firestoreMembershipRepository");
const { createFirestoreGroupJoinRequestRepository } = require("../../src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository");

function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }
async function firestoreRequest({ host, projectId, path, idToken, method = "GET", body }) { const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, body: await response.text() }; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-01-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E3-01-synthetic-password!", returnSecureToken: true }) }); const body = await response.json(); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
function generation(concept, membershipIds, key, overrides = {}) { return { groupId: "e3-group", conceptId: concept.conceptId, expectedConceptVersion: concept.version, membershipIds, dueDate: "2026-10-20", baseAmountMinor: concept.defaultAmountMinor, exceptions: [], generationIdempotencyKey: key, kind: "MONTHLY", periodKey: "2026-10", ...overrides }; }

test("E3-01 persiste conceptos, obligaciones, recovery idempotente, privacidad y períodos extensos", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-01-payment-integration"); const db = app.firestore(); const auth = app.auth(); const store = createFirestorePaymentStore({ db, now: () => ts(admin, "2026-10-08T15:00:00Z") });
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-owner@example.invalid"); const member = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-member@example.invalid"); const foreign = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-foreign@example.invalid");
  const refs = [];
  const set = async (path, data) => { const ref = db.doc(path); refs.push(ref); await ref.set(data); };
  try {
    await set(`users/${owner.uid}`, { nombre: "Owner", email: owner.email, photoURL: "", createdAt: ts(admin, "2026-01-01T00:00:00Z"), personaId: "person-owner" });
    await set(`users/${member.uid}`, { nombre: "Member", email: member.email, photoURL: "", createdAt: ts(admin, "2026-01-01T00:00:00Z"), personaId: "person-member" });
    await set(`users/${foreign.uid}`, { nombre: "Foreign", email: foreign.email, photoURL: "", createdAt: ts(admin, "2026-01-01T00:00:00Z"), personaId: "person-foreign" });
    for (const [id, name] of [["person-owner", "Ona"], ["person-member", "Mara"], ["person-foreign", "Fina"]]) await set(`personas/${id}`, { nombre: name, apellido: "Sintética", emailContacto: `${id}@example.invalid`, createdAt: ts(admin, "2026-01-01T00:00:00Z") });
    await set("groups/e3-group", { nombre: "Grupo E3", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: ts(admin, "2026-01-01T00:00:00Z"), schemaVersion: 1 });
    await set("seasons/e3-season", { groupId: "e3-group", nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: ts(admin, "2026-01-01T00:00:00Z"), schemaVersion: 1 });
    await set("memberships/e3-active", { personId: "person-member", groupId: "e3-group", seasonId: "e3-season", estado: "activa", fechaIngreso: ts(admin, "2026-01-10T12:00:00Z"), createdAt: ts(admin, "2026-01-10T12:00:00Z"), schemaVersion: 1 });
    await set("memberships/e3-finalized", { personId: "person-member", groupId: "e3-group", seasonId: "e3-season", estado: "finalizada", fechaIngreso: ts(admin, "2026-08-01T12:00:00Z"), createdAt: ts(admin, "2026-08-01T12:00:00Z"), fechaEgreso: ts(admin, "2026-10-15T12:00:00Z"), schemaVersion: 2 });
    const periodMembership = "e3-many-periods"; const periodCount = 25; const latestPeriodId = membershipValidityPeriodId(periodMembership, periodCount);
    await set(`memberships/${periodMembership}`, { personId: "person-member", groupId: "e3-group", seasonId: "e3-season", estado: "finalizada", fechaIngreso: ts(admin, "2026-10-01T12:00:00Z"), createdAt: ts(admin, "2026-10-01T12:00:00Z"), latestPeriodId, periodCount, fechaEgreso: ts(admin, "2026-10-25T12:00:00Z"), schemaVersion: 3 });
    for (let ordinal = 1; ordinal <= periodCount; ordinal += 1) { const id = membershipValidityPeriodId(periodMembership, ordinal); const start = `2026-10-${String(ordinal).padStart(2, "0")}T12:00:00Z`; const end = ordinal === 1 ? "2026-10-02T12:00:00Z" : start; await set(`memberships/${periodMembership}/validityPeriods/${id}`, { ordinal, estado: "cerrado", startedAt: ts(admin, start), endedAt: ts(admin, end), periodSchemaVersion: 1 }); }
    await set("memberships/e3-concurrent", { personId: "person-member", groupId: "e3-group", seasonId: "e3-season", estado: "activa", fechaIngreso: ts(admin, "2026-09-01T12:00:00Z"), createdAt: ts(admin, "2026-09-01T12:00:00Z"), schemaVersion: 1 });

    let monthly;
    await t.test("conceptos son Owner-only, versionados e idempotentes", async () => {
      const input = { groupId: "e3-group", name: "Cuota mensual", kind: "MONTHLY", defaultAmountMinor: 150000, idempotencyKey: "e3-concept-key-000001" };
      const created = await store.createConcept(owner.uid, input); const recovered = await store.createConcept(owner.uid, input); monthly = created.resource;
      assert.equal(created.outcome, "CREATED"); assert.equal(recovered.recovered, true); assert.equal(recovered.resource.conceptId, monthly.conceptId);
      await assert.rejects(store.listConcepts(foreign.uid, { groupId: "e3-group", pageSize: 20 }), (error) => error.reason === "GROUP_TREASURY_NOT_AUTHORIZED");
      const changed = await store.changeConceptAmount(owner.uid, { groupId: "e3-group", conceptId: monthly.conceptId, defaultAmountMinor: 175000, expectedVersion: 1, idempotencyKey: "e3-amount-key-0000001" }); monthly = changed.resource; assert.equal(monthly.version, 2);
    });

    await t.test("selección mensual incluye finalizadas y no trunca al superar 20 Períodos", async () => {
      const page = await store.listCandidates(owner.uid, { groupId: "e3-group", periodKey: "2026-10", pageSize: 20 }); const byId = new Map(page.items.map((item) => [item.membershipId, item]));
      assert.equal(byId.get("e3-active").eligibility, "ELIGIBLE"); assert.equal(byId.get("e3-finalized").membershipState, "FINALIZED"); assert.equal(byId.get("e3-finalized").eligibility, "ELIGIBLE"); assert.equal(byId.get(periodMembership).eligibility, "ELIGIBLE");
    });

    let firstIntent;
    await t.test("generación por fila fija snapshot, es única y conserva terminales", async () => {
      const input = generation(monthly, ["e3-active", "e3-finalized", periodMembership], "e3-generation-key-001"); const result = await store.generate(owner.uid, input); firstIntent = result.generationIntentId; assert.equal(result.complete, true); assert.deepEqual(result.rows.map((row) => row.outcome), ["CREATED", "CREATED", "CREATED"]);
      const retry = await store.generate(owner.uid, input); assert.equal(retry.generationIntentId, firstIntent); assert.deepEqual(retry.rows.map((row) => row.outcome), ["CREATED", "CREATED", "CREATED"]);
      const sameEconomic = await store.generate(owner.uid, generation(monthly, ["e3-active"], "e3-generation-key-002")); assert.equal(sameEconomic.rows[0].outcome, "EXISTING");
      const conflict = await store.generate(owner.uid, generation(monthly, ["e3-active"], "e3-generation-key-003", { dueDate: "2026-10-25" })); assert.equal(conflict.rows[0].outcome, "FAILED"); assert.equal(conflict.rows[0].errorCode, "OBLIGATION_PAYLOAD_CONFLICT"); assert.equal((await db.collection("payments").get()).size, 3);
      const payment = (await db.collection("payments").where("membershipId", "==", "e3-active").get()).docs[0].data(); assert.equal(payment.conceptSnapshot.version, 2); assert.equal(payment.conceptSnapshot.defaultAmountMinor, 175000);
    });

    await t.test("consulta propia deriva Persona, incluye exintegrantes y no expone groupId", async () => {
      await set("groups/e3-archived-group", { nombre: "Grupo Histórico", deporte: "voleibol", ownerId: owner.uid, estado: "archivado", createdAt: ts(admin, "2025-01-01T00:00:00Z"), archivedAt: ts(admin, "2026-09-01T00:00:00Z"), schemaVersion: 2 });
      await set("payments/e3-archived-payment", { groupId: "e3-archived-group", membershipId: "e3-archived-membership", personId: "person-member", seasonId: "e3-archived-season", conceptId: "e3-archived-concept", conceptSnapshot: { version: 1, name: "Cuota histórica", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 90000 }, amountMinor: 90000, dueDate: "2026-08-20", estado: "PENDING", generationIntentId: "e3-archived-intent", payloadHash: "a".repeat(64), periodKey: "2026-08", createdAt: ts(admin, "2026-08-01T00:00:00Z"), schemaVersion: 1 });
      const own = await store.listMyObligations(member.uid, { pageSize: 20 }); assert.equal(own.items.length, 4); assert.equal(own.items.every((item) => item.groupId === undefined), true);
      assert.deepEqual(new Set(own.items.map((item) => item.groupName)), new Set(["Grupo E3", "Grupo Histórico"]));
      const foreignOwn = await store.listMyObligations(foreign.uid, { pageSize: 20 }); assert.equal(foreignOwn.items.length, 0);
    });

    await t.test("MONTHLY permite otro mes elegible y conserva la obligación histórica", async () => {
      const september = await store.generate(owner.uid, generation(monthly, ["e3-active"], "e3-generation-september", { periodKey: "2026-09", dueDate: "2026-09-20" })); assert.equal(september.rows[0].outcome, "CREATED");
      const payments = await db.collection("payments").where("membershipId", "==", "e3-active").get(); assert.equal(payments.size, 2); const periods = payments.docs.map((doc) => doc.data().periodKey).sort(); assert.deepEqual(periods, ["2026-09", "2026-10"]); assert.equal(payments.docs.every((doc) => doc.data().conceptSnapshot.version === 2), true);
    });

    await t.test("generaciones concurrentes con keys distintas convergen por unicidad económica", async () => {
      const results = await Promise.all([store.generate(owner.uid, generation(monthly, ["e3-concurrent"], "e3-concurrent-key-001")), store.generate(owner.uid, generation(monthly, ["e3-concurrent"], "e3-concurrent-key-002"))]);
      assert.deepEqual(results.map((result) => result.rows[0].outcome).sort(), ["CREATED", "EXISTING"]); assert.equal((await db.collection("payments").where("membershipId", "==", "e3-concurrent").get()).size, 1);
    });

    await t.test("recovery incierto reconcilia Pago confirmado aun con concepto luego desactivado", async () => {
      await db.doc(`paymentGenerationIntents/${firstIntent}/rows/e3-active`).update({ status: "UNCERTAIN", paymentId: admin.firestore.FieldValue.delete(), updatedAt: ts(admin, "2026-10-08T15:00:01Z") });
      const deactivated = await store.deactivateConcept(owner.uid, { groupId: "e3-group", conceptId: monthly.conceptId, expectedVersion: monthly.version, idempotencyKey: "e3-deactivate-key-0001" }); assert.equal(deactivated.resource.estado, "INACTIVE");
      const recovered = await store.generate(owner.uid, generation(monthly, ["e3-active", "e3-finalized", periodMembership], "e3-generation-key-001")); assert.equal(recovered.rows[0].outcome, "CREATED"); assert.equal(recovered.complete, true);
    });

    await t.test("ONE_TIME exige ocurrencia listada y Membresía activa", async () => {
      const created = await store.createConcept(owner.uid, { groupId: "e3-group", name: "Camiseta", kind: "ONE_TIME", defaultAmountMinor: 250000, idempotencyKey: "e3-one-time-concept-01" }); const concept = created.resource; const listed = await store.listOccurrences(owner.uid, { groupId: "e3-group", conceptId: concept.conceptId, pageSize: 20 }); assert.equal(listed.items.length, 0);
      const occurrence = (await store.createOccurrence(owner.uid, { groupId: "e3-group", conceptId: concept.conceptId, expectedConceptVersion: concept.version, name: "Entrega 2026", occurrenceListToken: listed.occurrenceListToken, idempotencyKey: "e3-occurrence-key-0001" })).resource;
      const result = await store.generate(owner.uid, { groupId: "e3-group", conceptId: concept.conceptId, expectedConceptVersion: concept.version, membershipIds: ["e3-active", "e3-finalized"], dueDate: "2026-10-30", baseAmountMinor: concept.defaultAmountMinor, exceptions: [], generationIdempotencyKey: "e3-one-time-generation", kind: "ONE_TIME", occurrenceKey: occurrence.occurrenceKey }); assert.deepEqual(result.rows.map((row) => [row.outcome, row.errorCode]), [["CREATED", undefined], ["FAILED", "MEMBERSHIP_NOT_ELIGIBLE"]]);
    });

    await t.test("cualquier referencia Pago bloquea eliminación de Grupo sin cascada", async () => {
      await set("groups/e3-payment-only-group", { nombre: "Sólo Pago", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: ts(admin, "2026-01-01T00:00:00Z"), schemaVersion: 1 });
      await set(`groupCreationGuards/${owner.uid}`, { groupId: "e3-payment-only-group", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: ts(admin, "2026-01-01T00:00:00Z"), guardVersion: 1 });
      await set("payments/e3-deletion-blocker", { groupId: "e3-payment-only-group" });
      const deletionStore = createFirestoreGroupDeletionStore({ db, groupRepository: createFirestoreGroupRepository({ db }), membershipRepository: createFirestoreMembershipRepository({ db }), joinRequestRepository: createFirestoreGroupJoinRequestRepository({ db }) });
      const prepared = await deletionStore.prepare({ userId: owner.uid, groupId: "e3-payment-only-group" }); assert.deepEqual(prepared.eligibility.blockers, ["FUNCTIONAL_REFERENCES_EXIST"]); assert.equal((await db.doc("payments/e3-deletion-blocker").get()).exists, true);
    });

    await t.test("archivo conserva consultas y bloquea toda mutación nueva", async () => {
      await db.doc("groups/e3-group").set({ nombre: "Grupo E3", deporte: "voleibol", ownerId: owner.uid, estado: "archivado", createdAt: ts(admin, "2026-01-01T00:00:00Z"), archivedAt: ts(admin, "2026-10-09T00:00:00Z"), schemaVersion: 2 });
      assert.ok((await store.listGroupObligations(owner.uid, { groupId: "e3-group", pageSize: 20 })).items.length >= 4);
      await assert.rejects(store.createConcept(owner.uid, { groupId: "e3-group", name: "No", kind: "MONTHLY", defaultAmountMinor: 100, idempotencyKey: "e3-archived-key-00001" }), (error) => error.reason === "GROUP_NOT_OPERATIONAL");
    });

    await t.test("Rules niegan acceso directo a todas las colecciones E3-01", async () => {
      const paths = ["groupChargeConcepts/x", "groupChargeOccurrences/x", "payments/x", `paymentGenerationIntents/${firstIntent}`, `paymentGenerationIntents/${firstIntent}/rows/e3-active`, "paymentCommandReceipts/x"];
      for (const path of paths) { const read = await firestoreRequest({ host: process.env.FIRESTORE_EMULATOR_HOST, projectId, path, idToken: owner.idToken }); const write = await firestoreRequest({ host: process.env.FIRESTORE_EMULATOR_HOST, projectId, path, idToken: owner.idToken, method: "PATCH", body: { fields: { manipulated: { booleanValue: true } } } }); assert.equal(read.status, 403, `${path}: ${read.body}`); assert.equal(write.status, 403, `${path}: ${write.body}`); }
    });
  } finally {
    const collections = ["payments", "groupChargeOccurrences", "groupChargeConcepts", "paymentCommandReceipts"];
    for (const name of collections) { const snapshot = await db.collection(name).get(); const batch = db.batch(); snapshot.docs.forEach((doc) => batch.delete(doc.ref)); await batch.commit(); }
    const intentSnapshot = await db.collection("paymentGenerationIntents").get(); for (const intent of intentSnapshot.docs) { const rowSnapshot = await intent.ref.collection("rows").get(); const batch = db.batch(); rowSnapshot.docs.forEach((doc) => batch.delete(doc.ref)); batch.delete(intent.ref); await batch.commit(); }
    for (const ref of refs.reverse()) await ref.delete().catch(() => {}); await Promise.allSettled([owner, member, foreign].map((actor) => auth.deleteUser(actor.uid))); await app.delete();
  }
});
