"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");

test("E3-01 serializa cambios de autoridad y ciclo de vida alrededor del claim", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-01-serialization"); const db = app.firestore(); const prefix = "e3-serial-";
  const ownerId = `${prefix}owner`; const foreignId = `${prefix}foreign`; const groupId = `${prefix}group`; const seasonId = `${prefix}season`;
  const now = () => admin.firestore.Timestamp.fromDate(new Date("2026-10-08T15:00:00Z")); const base = createFirestorePaymentStore({ db, now });
  const monthlyInput = (concept, membershipId, key) => ({ groupId, conceptId: concept.conceptId, expectedConceptVersion: concept.version, membershipIds: [membershipId], dueDate: "2026-10-20", baseAmountMinor: concept.defaultAmountMinor, exceptions: [], generationIdempotencyKey: key, kind: "MONTHLY", periodKey: "2026-10" });
  const seedMembership = (id) => db.doc(`memberships/${id}`).set({ personId: `${prefix}person`, groupId, seasonId, estado: "activa", fechaIngreso: now(), createdAt: now(), schemaVersion: 1 });
  try {
    await Promise.all([
      db.doc(`users/${ownerId}`).set({ nombre: "Owner", email: "owner@example.invalid", photoURL: "", createdAt: now(), personaId: `${prefix}owner-person` }),
      db.doc(`users/${foreignId}`).set({ nombre: "Foreign", email: "foreign@example.invalid", photoURL: "", createdAt: now(), personaId: `${prefix}foreign-person` }),
      db.doc(`groups/${groupId}`).set({ nombre: "Grupo serial", deporte: "voleibol", ownerId, estado: "activo", createdAt: now(), schemaVersion: 1 }),
      db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: now(), schemaVersion: 1 }),
      db.doc(`personas/${prefix}person`).set({ nombre: "Mara", apellido: "Sintética", emailContacto: "member@example.invalid", createdAt: now() }),
      db.doc(`personas/${prefix}owner-person`).set({ nombre: "Olga", apellido: "Sintética", emailContacto: "owner@example.invalid", createdAt: now() }),
      db.doc(`personas/${prefix}foreign-person`).set({ nombre: "Fina", apellido: "Sintética", emailContacto: "foreign@example.invalid", createdAt: now() }),
    ]);
    const created = await base.createConcept(ownerId, { groupId, name: "Cuota serial", kind: "MONTHLY", defaultAmountMinor: 100000, idempotencyKey: "e3-serial-concept-key-01" }); let concept = created.resource;

    await t.test("cambio de concepto antes del claim rechaza stale; después conserva el snapshot reclamado", async () => {
      concept = (await base.changeConceptAmount(ownerId, { groupId, conceptId: concept.conceptId, defaultAmountMinor: 110000, expectedVersion: concept.version, idempotencyKey: "e3-serial-amount-key-001" })).resource;
      await seedMembership(`${prefix}concept-before`);
      await assert.rejects(base.generate(ownerId, { ...monthlyInput({ ...concept, version: concept.version - 1, defaultAmountMinor: 100000 }, `${prefix}concept-before`, "e3-serial-concept-before"), baseAmountMinor: 100000 }), (error) => error.reason === "CONCEPT_VERSION_STALE");
      assert.equal((await db.collection("paymentGenerationIntents").where("groupId", "==", groupId).get()).size, 0);
      await seedMembership(`${prefix}concept-after`); let renamed;
      const hooked = createFirestorePaymentStore({ db, now, testHooks: { afterClaim: async () => { renamed = (await base.renameConcept(ownerId, { groupId, conceptId: concept.conceptId, name: "Cuota renombrada", expectedVersion: concept.version, idempotencyKey: "e3-serial-rename-key-001" })).resource; } } });
      const claimedConcept = concept; const result = await hooked.generate(ownerId, monthlyInput(concept, `${prefix}concept-after`, "e3-serial-concept-after")); concept = renamed; assert.equal(result.rows[0].outcome, "CREATED"); assert.equal(result.rows[0].payment.concept.version, claimedConcept.version); assert.equal(result.rows[0].payment.concept.name, claimedConcept.name);
    });

    await t.test("desactivación antes del claim rechaza sin filas; después del claim terminaliza la fila", async () => {
      const beforeConcept = (await base.createConcept(ownerId, { groupId, name: "Antes inactivo", kind: "MONTHLY", defaultAmountMinor: 120000, idempotencyKey: "e3-serial-before-concept" })).resource;
      await base.deactivateConcept(ownerId, { groupId, conceptId: beforeConcept.conceptId, expectedVersion: beforeConcept.version, idempotencyKey: "e3-serial-before-deactivate" }); await seedMembership(`${prefix}deactivate-before`);
      await assert.rejects(base.generate(ownerId, monthlyInput(beforeConcept, `${prefix}deactivate-before`, "e3-serial-deactivate-before")), (error) => error.reason === "CHARGE_CONCEPT_DEACTIVATED");
      const afterConcept = (await base.createConcept(ownerId, { groupId, name: "Después inactivo", kind: "MONTHLY", defaultAmountMinor: 130000, idempotencyKey: "e3-serial-after-concept" })).resource; await seedMembership(`${prefix}deactivate-after`);
      const hooked = createFirestorePaymentStore({ db, now, testHooks: { afterClaim: () => base.deactivateConcept(ownerId, { groupId, conceptId: afterConcept.conceptId, expectedVersion: afterConcept.version, idempotencyKey: "e3-serial-after-deactivate" }) } });
      const result = await hooked.generate(ownerId, monthlyInput(afterConcept, `${prefix}deactivate-after`, "e3-serial-deactivate-after")); assert.deepEqual([result.rows[0].outcome, result.rows[0].errorCode], ["FAILED", "CHARGE_CONCEPT_DEACTIVATED"]);
    });

    await t.test("archivo de Grupo y cierre de Temporada posteriores al claim impiden confirmar", async () => {
      await seedMembership(`${prefix}archive-after`); const archiveStore = createFirestorePaymentStore({ db, now, testHooks: { afterClaim: () => db.doc(`groups/${groupId}`).update({ estado: "archivado", archivedAt: now(), schemaVersion: 2 }) } });
      let result = await archiveStore.generate(ownerId, monthlyInput(concept, `${prefix}archive-after`, "e3-serial-archive-after")); assert.deepEqual([result.rows[0].outcome, result.rows[0].errorCode], ["FAILED", "GROUP_NOT_OPERATIONAL"]);
      await db.doc(`groups/${groupId}`).set({ nombre: "Grupo serial", deporte: "voleibol", ownerId, estado: "activo", createdAt: now(), schemaVersion: 1 });
      await seedMembership(`${prefix}season-after`); const seasonStore = createFirestorePaymentStore({ db, now, testHooks: { afterClaim: () => db.doc(`seasons/${seasonId}`).update({ estado: "cerrada", closedAt: now(), closedBy: ownerId, schemaVersion: 2 }) } });
      result = await seasonStore.generate(ownerId, monthlyInput(concept, `${prefix}season-after`, "e3-serial-season-after")); await db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: now(), schemaVersion: 1 }); assert.deepEqual([result.rows[0].outcome, result.rows[0].errorCode], ["FAILED", "OPEN_SEASON_REQUIRED"]);
    });

    await t.test("finalización de Membresía posterior al claim bloquea ONE_TIME", async () => {
      const oneTime = (await base.createConcept(ownerId, { groupId, name: "Camiseta serial", kind: "ONE_TIME", defaultAmountMinor: 200000, idempotencyKey: "e3-serial-one-concept-01" })).resource;
      const listed = await base.listOccurrences(ownerId, { groupId, conceptId: oneTime.conceptId, pageSize: 20 }); const occurrence = (await base.createOccurrence(ownerId, { groupId, conceptId: oneTime.conceptId, expectedConceptVersion: oneTime.version, name: "Entrega serial", occurrenceListToken: listed.occurrenceListToken, idempotencyKey: "e3-serial-occurrence-key" })).resource;
      const membershipId = `${prefix}membership-after`; await seedMembership(membershipId); const hooked = createFirestorePaymentStore({ db, now, testHooks: { afterClaim: () => db.doc(`memberships/${membershipId}`).update({ estado: "finalizada", fechaEgreso: now(), schemaVersion: 2 }) } });
      const result = await hooked.generate(ownerId, { groupId, conceptId: oneTime.conceptId, expectedConceptVersion: oneTime.version, membershipIds: [membershipId], dueDate: "2026-10-20", baseAmountMinor: oneTime.defaultAmountMinor, exceptions: [], generationIdempotencyKey: "e3-serial-membership-after", kind: "ONE_TIME", occurrenceKey: occurrence.occurrenceKey }); assert.deepEqual([result.rows[0].outcome, result.rows[0].errorCode], ["FAILED", "MEMBERSHIP_NOT_ELIGIBLE"]);
    });

    await t.test("pérdida de ownership después del claim revoca generación y recovery", async () => {
      const membershipId = `${prefix}owner-after`; await seedMembership(membershipId); const input = monthlyInput(concept, membershipId, "e3-serial-owner-after");
      const hooked = createFirestorePaymentStore({ db, now, testHooks: { afterClaim: () => db.doc(`groups/${groupId}`).update({ ownerId: foreignId }) } });
      await assert.rejects(hooked.generate(ownerId, input), (error) => error.reason === "GROUP_NOT_ACCESSIBLE"); await assert.rejects(base.generate(ownerId, input), (error) => error.reason === "GROUP_NOT_ACCESSIBLE");
      const intent = (await db.collection("paymentGenerationIntents").where("groupId", "==", groupId).where("actorUserId", "==", ownerId).get()).docs.find((doc) => doc.data().membershipIds.includes(membershipId)); assert.equal((await intent.ref.collection("rows").doc(membershipId).get()).data().status, "PENDING"); assert.equal((await db.collection("payments").where("membershipId", "==", membershipId).get()).size, 0);
      await db.doc(`groups/${groupId}`).update({ ownerId });
    });

    await t.test("fallo técnico inyectado antes de confirmar deja UNCERTAIN recuperable", async () => {
      const membershipId = `${prefix}technical-before`; await seedMembership(membershipId); const input = monthlyInput(concept, membershipId, "e3-serial-technical-before"); let injected = false;
      const hooked = createFirestorePaymentStore({ db, now, testHooks: { beforeRowTransaction: () => { if (!injected) { injected = true; throw Object.assign(new Error("synthetic unavailable"), { code: "unavailable" }); } } } });
      const pending = await hooked.generate(ownerId, input); assert.equal(pending.rows[0].outcome, "PENDING_RECOVERY"); const rowRef = db.doc(`paymentGenerationIntents/${pending.generationIntentId}/rows/${membershipId}`); assert.equal((await rowRef.get()).data().status, "UNCERTAIN"); assert.equal((await db.collection("payments").where("membershipId", "==", membershipId).get()).size, 0);
      const recovered = await base.generate(ownerId, input); assert.equal(recovered.rows[0].outcome, "CREATED");
    });

    await t.test("pérdida de respuesta inyectada tras commit conserva CREATED y retry único", async () => {
      const membershipId = `${prefix}response-loss`; await seedMembership(membershipId); const input = monthlyInput(concept, membershipId, "e3-serial-response-loss"); let injected = false;
      const hooked = createFirestorePaymentStore({ db, now, testHooks: { afterRowCommit: () => { if (!injected) { injected = true; throw Object.assign(new Error("synthetic response loss"), { code: "unavailable" }); } } } });
      const pending = await hooked.generate(ownerId, input); assert.equal(pending.rows[0].outcome, "PENDING_RECOVERY"); const rowRef = db.doc(`paymentGenerationIntents/${pending.generationIntentId}/rows/${membershipId}`); assert.equal((await rowRef.get()).data().status, "CREATED"); assert.equal((await db.collection("payments").where("membershipId", "==", membershipId).get()).size, 1);
      const recovered = await base.generate(ownerId, input); assert.equal(recovered.rows[0].outcome, "CREATED"); assert.equal((await db.collection("payments").where("membershipId", "==", membershipId).get()).size, 1);
    });
  } finally {
    const intents = await db.collection("paymentGenerationIntents").where("groupId", "==", groupId).get(); for (const intent of intents.docs) { const rows = await intent.ref.collection("rows").get(); const batch = db.batch(); rows.docs.forEach((row) => batch.delete(row.ref)); batch.delete(intent.ref); await batch.commit(); }
    for (const collection of ["payments", "groupChargeOccurrences", "groupChargeConcepts", "paymentCommandReceipts", "memberships", "seasons", "groups", "personas", "users"]) { const snapshot = await db.collection(collection).get(); const batch = db.batch(); snapshot.docs.filter((doc) => doc.id.startsWith(prefix)).forEach((doc) => batch.delete(doc.ref)); await batch.commit(); } await app.delete();
  }
});
