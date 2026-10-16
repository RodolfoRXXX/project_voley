"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { createFirestoreAdministrativeReceiptStore } = require("../../src/administrativeReceipts/infrastructure/firestoreAdministrativeReceiptStore");
const { createFirestorePaymentDeliveryStore } = require("../../src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore");
const contract = require("../../src/administrativeReceipts/application/administrativeReceiptContract");
const domain = require("../../src/administrativeReceipts/domain/administrativeReceipt");

function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }

function injectedAbortBarrierDb(db) {
  const interruption = new Error("E3_04_INJECTED_RETRY_BARRIER");
  let firstAttempt = true; let markReached; let resume; let attempts = 0;
  const reached = new Promise((resolve) => { markReached = resolve; });
  const released = new Promise((resolve) => { resume = resolve; });
  return {
    db: {
      collection: db.collection.bind(db), doc: db.doc.bind(db),
      runTransaction: async (callback) => {
        try { return await db.runTransaction(callback, { maxAttempts: 1 }); }
        catch (error) {
          if (error !== interruption) throw error;
          markReached(); await released;
          return db.runTransaction(callback);
        }
      },
    },
    reached,
    release: () => resume(),
    attempts: () => attempts,
    hook: async () => { attempts += 1; if (firstAttempt) { firstAttempt = false; throw interruption; } },
  };
}

test("E3-04 evidencia focal de coordinación, recovery e historia v1/v2", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-04-concurrency-evidence"); const db = app.firestore();
  const prefix = "e3-04-evidence-"; const ownerId = `${prefix}owner`; const delegateId = `${prefix}delegate`; const delegatePersonId = `${prefix}delegate-person`;
  const groupId = `${prefix}group`; const seasonId = `${prefix}season`; const delegateMembershipId = `${prefix}delegate-membership`;
  const createdAt = ts(admin, "2026-09-01T12:00:00Z"); const commandAt = ts(admin, "2026-10-14T12:00:00Z");
  const store = createFirestoreAdministrativeReceiptStore({ db, now: () => commandAt }); const deliveries = createFirestorePaymentDeliveryStore({ db, now: () => commandAt });
  const payment = (paymentId, membershipId, personId) => ({ groupId, membershipId, personId, seasonId, conceptId: `${prefix}concept`, conceptSnapshot: { version: 1, name: `Cuota ${paymentId}`, kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 1000 }, amountMinor: 1000, dueDate: "2026-10-20", estado: "PENDING", generationIntentId: `${prefix}intent`, payloadHash: "a".repeat(64), periodKey: "2026-10", createdAt, schemaVersion: 1 });
  const line = (paymentId, amountMinor, expectedBalanceMinor, expectedEconomicRevision) => ({ paymentId, allocationMode: amountMinor === expectedBalanceMinor ? "FULL" : "PARTIAL", amountMinor, expectedBalanceMinor, expectedEconomicRevision });
  const reportLine = (paymentId, amountMinor, expectedBalanceMinor, expectedEconomicRevision) => ({ paymentId, selectionMode: amountMinor === expectedBalanceMinor ? "FULL" : "PARTIAL", requestedAmountMinor: amountMinor, expectedBalanceMinor, expectedEconomicRevision });
  let contextSequence = 0; let recordSequence = 0;
  async function subjectContext(label) {
    contextSequence += 1; const suffix = `${label}-${contextSequence}`; const userId = `${prefix}user-${suffix}`; const personId = `${prefix}person-${suffix}`; const membershipId = `${prefix}membership-${suffix}`;
    await db.doc(`users/${userId}`).set({ email: `${suffix}@example.invalid`, personaId: personId, createdAt });
    await db.doc(`personas/${personId}`).set({ nombre: "Persona", apellido: suffix, createdAt });
    await db.doc(`memberships/${membershipId}`).set({ personId, groupId, seasonId, estado: "finalizada", fechaIngreso: createdAt, fechaEgreso: commandAt, createdAt, schemaVersion: 2 });
    return { userId, personId, membershipId };
  }
  async function prepare(actorId, membershipId, receivedOn, lines, decisions = () => []) {
    const preview = await store.preview(actorId, contract.validatePreview({ groupId, membershipId, receivedOn, lines }));
    recordSequence += 1; return contract.validateRecord({ groupId, membershipId, receivedOn, lines, candidateRevision: preview.candidateRevision, candidateDigest: preview.candidateDigest, relatedNoticeDecisions: decisions(preview.candidates), idempotencyKey: `${prefix}record-${String(recordSequence).padStart(4, "0")}` });
  }
  function noAdministrativeEffects(actorId, input, paymentId) {
    return Promise.all([
      db.doc(`paymentDeliveries/${domain.receiptId(actorId, input.idempotencyKey)}`).get(),
      db.doc(`administrativeReceiptCommandReceipts/${domain.commandReceiptId(actorId, "RECORD", input.idempotencyKey)}`).get(),
      db.collection(`payments/${paymentId}/deliveryApplications`).get(),
    ]).then(([root, receipt, applications]) => ({ root, receipt, applications }));
  }

  try {
    await db.doc(`users/${ownerId}`).set({ email: "owner-evidence@example.invalid", createdAt });
    await db.doc(`users/${delegateId}`).set({ email: "delegate-evidence@example.invalid", personaId: delegatePersonId, createdAt });
    await db.doc(`personas/${delegatePersonId}`).set({ nombre: "Delegada", apellido: "Evidencia", createdAt });
    await db.doc(`groups/${groupId}`).set({ nombre: "Grupo evidencia E3-04", deporte: "voleibol", ownerId, ownershipRevision: 1, estado: "activo", createdAt, schemaVersion: 3 });
    await db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt, schemaVersion: 1 });
    await db.doc(`openSeasonGuards/${groupId}`).set({ seasonId, idempotencyKeyHash: "b".repeat(64), requestHash: "c".repeat(64), createdAt, guardVersion: 1 });
    await db.doc(`memberships/${delegateMembershipId}`).set({ personId: delegatePersonId, groupId, seasonId, estado: "activa", fechaIngreso: createdAt, createdAt, schemaVersion: 1 });
    await db.doc(`activeMembershipGuards/${activeMembershipGuardId(groupId, delegatePersonId)}`).set({ membershipId: delegateMembershipId, personId: delegatePersonId, groupId, seasonId, idempotencyKeyHash: "d".repeat(64), requestHash: "e".repeat(64), createdAt, guardVersion: 1 });

    await t.test("registro E3-04 pierde limpiamente frente a confirmación y rechazo E3-03", async () => {
      for (const decision of ["CONFIRM", "REJECT"]) {
        const subject = await subjectContext(decision.toLowerCase()); const paymentId = `${prefix}coord-${decision.toLowerCase()}`; await db.doc(`payments/${paymentId}`).set(payment(paymentId, subject.membershipId, subject.personId));
        const reported = await deliveries.report(subject.userId, { membershipId: subject.membershipId, declaredPaidOn: "2026-10-13", lines: [reportLine(paymentId, 400, 1000, 1)], idempotencyKey: `${prefix}report-${decision.toLowerCase()}-001` });
        const input = await prepare(ownerId, subject.membershipId, "2026-10-14", [line(paymentId, 1000, 1000, 1)], (candidates) => candidates.map((candidate) => ({ deliveryId: candidate.deliveryId, expectedDeliveryRevision: candidate.expectedDeliveryRevision, relation: "SAME_REQUIRES_ADMINISTRATIVE_RECORD", correctedFields: ["AMOUNT_OR_ALLOCATION", "RECEIVED_DATE"] })));
        const barrier = injectedAbortBarrierDb(db); const blockedStore = createFirestoreAdministrativeReceiptStore({ db: barrier.db, now: () => commandAt, testHooks: { beforeRecordCommit: barrier.hook } }); const pending = blockedStore.record(ownerId, input); await barrier.reached;
        try {
          if (decision === "CONFIRM") await deliveries.confirm(ownerId, { groupId, deliveryId: reported.delivery.deliveryId, idempotencyKey: `${prefix}confirm-coordinate-001` });
          else await deliveries.reject(ownerId, { groupId, deliveryId: reported.delivery.deliveryId, reasonCode: "PAYMENT_NOT_RECEIVED", idempotencyKey: `${prefix}reject-coordinate-001` });
        } finally { barrier.release(); }
        await assert.rejects(pending, (error) => error.reason === "RELATED_NOTICE_REVIEW_STALE"); assert.equal(barrier.attempts(), 1);
        const effects = await noAdministrativeEffects(ownerId, input, paymentId); assert.equal(effects.root.exists, false); assert.equal(effects.receipt.exists, false);
        const persistedDelivery = (await db.doc(`paymentDeliveries/${reported.delivery.deliveryId}`).get()).data(); assert.equal(persistedDelivery.decisionState, decision === "CONFIRM" ? "CONFIRMED" : "REJECTED");
        if (decision === "CONFIRM") { assert.equal(effects.applications.size, 1); assert.equal(effects.applications.docs[0].data().deliveryId, reported.delivery.deliveryId); assert.equal(effects.applications.docs[0].data().source, undefined); assert.equal((await db.doc(`payments/${paymentId}`).get()).data().netConfirmedIncomeMinor, 400); }
        else { assert.equal(effects.applications.size, 0); assert.equal((await db.doc(`payments/${paymentId}`).get()).data().schemaVersion, 1); }
      }
    });

    await t.test("revocación corta el retry delegado antes de cualquier efecto", async () => {
      const grant = await store.grant(ownerId, contract.validateGrant({ groupId, membershipId: delegateMembershipId, idempotencyKey: `${prefix}grant-revoke-001` }));
      const subject = await subjectContext("revoke"); const paymentId = `${prefix}delegate-revoke`; await db.doc(`payments/${paymentId}`).set(payment(paymentId, subject.membershipId, subject.personId)); const input = await prepare(delegateId, subject.membershipId, "2026-10-14", [line(paymentId, 1000, 1000, 1)]);
      const barrier = injectedAbortBarrierDb(db); const blockedStore = createFirestoreAdministrativeReceiptStore({ db: barrier.db, now: () => commandAt, testHooks: { beforeRecordCommit: barrier.hook } }); const pending = blockedStore.record(delegateId, input); await barrier.reached;
      try { await store.revoke(ownerId, contract.validateRevoke({ groupId, grantId: grant.grant.grantId, idempotencyKey: `${prefix}revoke-overlap-001` })); } finally { barrier.release(); }
      await assert.rejects(pending, (error) => error.reason === "ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED"); assert.equal(barrier.attempts(), 1);
      const effects = await noAdministrativeEffects(delegateId, input, paymentId); assert.equal(effects.root.exists, false); assert.equal(effects.receipt.exists, false); assert.equal(effects.applications.size, 0); assert.equal((await db.doc(`payments/${paymentId}`).get()).data().schemaVersion, 1);
    });

    await t.test("reversión sobre Pago compartido invalida el registro solapado y restaura importes", async () => {
      const subject = await subjectContext("shared"); const paymentId = `${prefix}shared`; await db.doc(`payments/${paymentId}`).set(payment(paymentId, subject.membershipId, subject.personId));
      const firstInput = await prepare(ownerId, subject.membershipId, "2026-10-14", [line(paymentId, 400, 1000, 1)]); const first = await store.record(ownerId, firstInput); assert.equal(first.receipt.totalMinor, 400);
      const secondInput = await prepare(ownerId, subject.membershipId, "2026-10-14", [line(paymentId, 600, 600, 2)]); const barrier = injectedAbortBarrierDb(db); const blockedStore = createFirestoreAdministrativeReceiptStore({ db: barrier.db, now: () => commandAt, testHooks: { beforeRecordCommit: barrier.hook } }); const pending = blockedStore.record(ownerId, secondInput); await barrier.reached;
      try { await store.reverse(ownerId, contract.validateReverse({ groupId, receiptId: first.receipt.receiptId, reason: "Restaurar importe original", idempotencyKey: `${prefix}reverse-shared-001` })); } finally { barrier.release(); }
      await assert.rejects(pending, (error) => error.reason === "ADMINISTRATIVE_RECEIPT_DRAFT_STALE"); assert.equal(barrier.attempts(), 1);
      const current = (await db.doc(`payments/${paymentId}`).get()).data(); assert.equal(current.netConfirmedIncomeMinor, 0); assert.equal(current.balanceMinor, 1000); assert.equal(current.estado, "PENDING");
      const applications = await db.collection(`payments/${paymentId}/deliveryApplications`).get(); assert.equal(applications.size, 1); assert.equal(applications.docs[0].data().applicationState, "REVERSED");
      const effects = await noAdministrativeEffects(ownerId, secondInput, paymentId); assert.equal(effects.root.exists, false); assert.equal(effects.receipt.exists, false);
    });

    await t.test("recovery administrativo valida evidencia original después de un movimiento legítimo", async () => {
      const subject = await subjectContext("recovery"); const paymentId = `${prefix}recovery`; await db.doc(`payments/${paymentId}`).set(payment(paymentId, subject.membershipId, subject.personId));
      const input = await prepare(ownerId, subject.membershipId, "2026-10-14", [line(paymentId, 400, 1000, 1)]); const first = await store.record(ownerId, input); assert.equal(first.receipt.totalMinor, 400);
      const informed = await deliveries.report(subject.userId, { membershipId: subject.membershipId, declaredPaidOn: "2026-10-14", lines: [reportLine(paymentId, 300, 600, 2)], idempotencyKey: `${prefix}recovery-report-001` }); await deliveries.confirm(ownerId, { groupId, deliveryId: informed.delivery.deliveryId, idempotencyKey: `${prefix}recovery-confirm-001` });
      const guardRef = db.doc(`paymentReceiptCandidateGuards/${domain.guardId(groupId, subject.membershipId)}`); const guardBefore = (await guardRef.get()).data().revision; const recovered = await store.record(ownerId, input); const guardAfter = (await guardRef.get()).data().revision;
      assert.equal(recovered.outcome, "EXISTING"); assert.equal(recovered.currentEconomicState, "NOT_RECOMPUTED"); assert.equal(recovered.receipt.receiptId, first.receipt.receiptId); assert.equal(recovered.receipt.totalMinor, 400); assert.equal(guardAfter, guardBefore);
      const current = (await db.doc(`payments/${paymentId}`).get()).data(); assert.equal(current.netConfirmedIncomeMinor, 700); assert.equal(current.balanceMinor, 300); const applications = await db.collection(`payments/${paymentId}/deliveryApplications`).get(); assert.equal(applications.size, 2); assert.equal(new Set(applications.docs.map((doc) => doc.id)).size, 2);
      const serialized = JSON.stringify(await store.getOwner(ownerId, { groupId, receiptId: first.receipt.receiptId })); assert.doesNotThrow(() => JSON.parse(serialized));
    });

    await t.test("historia v1/v2 resuelve empates por ID y conserva anclas independientes", async () => {
      const expectedDocs = (await db.collection("paymentDeliveries").where("groupId", "==", groupId).get()).docs.filter((doc) => doc.data().origin === "ADMINISTRATIVE" || doc.data().decisionState === "CONFIRMED"); assert.ok(expectedDocs.some((doc) => doc.data().schemaVersion === 1)); assert.ok(expectedDocs.some((doc) => doc.data().schemaVersion === 2));
      const expectedIds = expectedDocs.map((doc) => doc.id).sort((left, right) => right.localeCompare(left)); const emitted = []; let cursor;
      do { const page = await store.listOwner(ownerId, { groupId, pageSize: 2, ...(cursor ? { cursor } : {}) }); emitted.push(...page.items); cursor = page.nextCursor; } while (cursor);
      assert.deepEqual(emitted.map((item) => item.receiptId), expectedIds); assert.equal(new Set(emitted.map((item) => item.receiptId)).size, emitted.length); assert.equal(emitted.every((item) => item.eventAt === commandAt.toDate().toISOString()), true); assert.deepEqual(new Set(emitted.map((item) => item.origin)), new Set(["INFORMED", "ADMINISTRATIVE"]));
    });

    await t.test("archivo corta el retry delegado antes de cualquier efecto", async () => {
      await store.grant(ownerId, contract.validateGrant({ groupId, membershipId: delegateMembershipId, idempotencyKey: `${prefix}grant-archive-001` }));
      const subject = await subjectContext("archive"); const paymentId = `${prefix}delegate-archive`; await db.doc(`payments/${paymentId}`).set(payment(paymentId, subject.membershipId, subject.personId)); const input = await prepare(delegateId, subject.membershipId, "2026-10-14", [line(paymentId, 1000, 1000, 1)]);
      const barrier = injectedAbortBarrierDb(db); const blockedStore = createFirestoreAdministrativeReceiptStore({ db: barrier.db, now: () => commandAt, testHooks: { beforeRecordCommit: barrier.hook } }); const pending = blockedStore.record(delegateId, input); await barrier.reached;
      try { await db.doc(`groups/${groupId}`).update({ estado: "archivado", archivedAt: commandAt, schemaVersion: 4 }); } finally { barrier.release(); }
      await assert.rejects(pending, (error) => error.reason === "ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED"); assert.equal(barrier.attempts(), 1);
      const effects = await noAdministrativeEffects(delegateId, input, paymentId); assert.equal(effects.root.exists, false); assert.equal(effects.receipt.exists, false); assert.equal(effects.applications.size, 0); assert.equal((await db.doc(`payments/${paymentId}`).get()).data().schemaVersion, 1);
    });
  } finally {
    for (const name of ["administrativeReceiptCommandReceipts", "paymentReceiptCandidateGuards", "groupCapabilityCommandReceipts", "groupCapabilityGrantSlots", "groupCapabilityGrants", "paymentDeliveryCommandReceipts", "paymentDeliveryReversals", "paymentDeliveries", "payments", "activeMembershipGuards", "openSeasonGuards", "memberships", "seasons", "groups", "personas", "users"]) {
      const snapshot = await db.collection(name).get(); for (const doc of snapshot.docs.filter((item) => item.id.startsWith(prefix) || item.data()?.groupId === groupId)) { for (const subcollection of await doc.ref.listCollections()) { const children = await subcollection.get(); for (const child of children.docs) await child.ref.delete(); } await doc.ref.delete(); }
    }
    await app.delete();
  }
});
