"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");
const { createFirestorePaymentDeliveryStore } = require("../../src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore");

function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }

test("E3-06 corrige principal con historia, concurrencia, recovery y privacidad", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-06-principal"); const db = app.firestore();
  const p = "e3-06-", owner = `${p}owner`, member = `${p}member`, outsider = `${p}outsider`, person = `${p}person`, group = `${p}group`, season = `${p}season`, membership = `${p}membership`, concept = `${p}concept`;
  const createdAt = ts(admin, "2026-09-01T12:00:00Z"), now = ts(admin, "2026-10-19T12:00:00Z"); const store = createFirestorePaymentStore({ db, now: () => now }); const detailStore = createFirestorePaymentDeliveryStore({ db, now: () => now });
  const payment = (id, { amount = 1000, net = 0, revision = 1 } = {}) => ({ groupId: group, membershipId: membership, personId: person, seasonId: season, conceptId: concept,
    conceptSnapshot: { version: 1, name: id, kind: "MONTHLY", currency: "ARS", defaultAmountMinor: amount }, amountMinor: amount, dueDate: "2026-10-20",
    estado: net === 0 ? "PENDING" : net === amount ? "SETTLED" : "PARTIAL", ...(revision > 1 ? { confirmedIncomeMinor: net, reversedIncomeMinor: 0, netConfirmedIncomeMinor: net, balanceMinor: amount - net, economicState: net === 0 ? "PENDING" : net === amount ? "SETTLED" : "PARTIAL", economicRevision: revision } : {}),
    generationIntentId: `${p}intent`, payloadHash: "b".repeat(64), periodKey: "2026-10", createdAt, schemaVersion: revision > 1 ? 2 : 1 });
  const input = (paymentId, key, newPrincipalMinor, expectedEconomicRevision = 1) => ({ groupId: group, paymentId, newPrincipalMinor, expectedEconomicRevision, reasonCode: "AMOUNT_ENTRY_ERROR", explanation: "Importe sintético corregido", idempotencyKey: key });
  async function set(path, data) { await db.doc(path).set(data); }
  try {
    await set(`users/${owner}`, { email: "owner-e3-06@example.invalid", personaId: `${p}owner-person`, createdAt }); await set(`users/${member}`, { email: "member-e3-06@example.invalid", personaId: person, createdAt }); await set(`users/${outsider}`, { email: "outside-e3-06@example.invalid", personaId: `${p}outside-person`, createdAt });
    await set(`personas/${person}`, { nombre: "Sujeto", apellido: "Sintético", createdAt }); await set(`groups/${group}`, { nombre: "Grupo E3-06", deporte: "voleibol", ownerId: owner, ownershipRevision: 1, estado: "activo", createdAt, schemaVersion: 3 }); await set(`seasons/${season}`, { groupId: group, nombre: "2026", fechaInicio: "2026-01-01", estado: "cerrada", fechaCierre: "2026-10-01", closedAt: createdAt, createdAt, schemaVersion: 2 }); await set(`memberships/${membership}`, { personId: person, groupId: group, seasonId: season, estado: "finalizada", fechaIngreso: createdAt, fechaEgreso: now, createdAt, schemaVersion: 2 });

    await t.test("aumenta/disminuye, deriva estados y conserva original", async () => {
      const pending = `${p}pending`; await set(`payments/${pending}`, payment(pending)); const up = input(pending, `${p}pending-up-key01`, 1500); assert.equal((await store.correctPaymentPrincipal(owner, up)).outcome, "CORRECTED");
      let root = (await db.doc(`payments/${pending}`).get()).data(); assert.equal(root.amountMinor, 1000); assert.equal(root.currentPrincipalMinor, 1500); assert.equal(root.balanceMinor, 1500); assert.equal(root.schemaVersion, 4); assert.equal((await store.correctPaymentPrincipal(owner, up)).outcome, "EXISTING");
      const partial = `${p}partial`; await set(`payments/${partial}`, payment(partial, { amount: 1000, net: 400, revision: 2 })); await store.correctPaymentPrincipal(owner, input(partial, `${p}partial-key-0001`, 400, 2)); root = (await db.doc(`payments/${partial}`).get()).data(); assert.equal(root.estado, "SETTLED"); assert.equal(root.balanceMinor, 0);
      await store.correctPaymentPrincipal(owner, input(partial, `${p}settled-up-key01`, 900, 3)); root = (await db.doc(`payments/${partial}`).get()).data(); assert.equal(root.estado, "PARTIAL"); assert.equal(root.balanceMinor, 500);
      await assert.rejects(store.correctPaymentPrincipal(owner, input(partial, `${p}below-net-key01`, 399, 4)), (error) => error.reason === "PRINCIPAL_BELOW_NET_INCOME");
      await assert.rejects(store.correctPaymentPrincipal(owner, input(partial, `${p}unchanged-key001`, 900, 4)), (error) => error.reason === "PRINCIPAL_UNCHANGED");
    });

    await t.test("historia pagina y minimiza por audiencia", async () => {
      const id = `${p}history`; await set(`payments/${id}`, payment(id)); let revision = 1; let amount = 1000;
      for (let index = 1; index <= 21; index += 1) { amount += 10; await store.correctPaymentPrincipal(owner, input(id, `${p}history-${String(index).padStart(2, "0")}-key`, amount, revision)); revision += 1; }
      const ownerPage = await store.listPaymentPrincipalCorrections(owner, { paymentId: id, pageSize: 20 }); assert.equal(ownerPage.items.length, 20); assert.equal(typeof ownerPage.nextCursor, "string"); assert.equal(typeof ownerPage.items[0].explanation, "string"); assert.equal(ownerPage.items[0].actor.label, "Owner del Grupo");
      const embedded = await detailStore.getOwnerObligationDetail(owner, { groupId: group, paymentId: id, pageSize: 20 }); assert.equal(embedded.principalCorrections.length, 20); assert.equal(embedded.correctionNextCursor, ownerPage.nextCursor);
      await store.correctPaymentPrincipal(owner, input(id, `${p}history-new-head`, amount + 10, revision));
      for (const cursor of [ownerPage.nextCursor, embedded.correctionNextCursor]) await assert.rejects(store.listPaymentPrincipalCorrections(owner, { paymentId: id, pageSize: 20, cursor }), (error) => error.reason === "CONCURRENT_MODIFICATION");
      const fresh = await store.listPaymentPrincipalCorrections(owner, { paymentId: id, pageSize: 20 }); const tail = await store.listPaymentPrincipalCorrections(owner, { paymentId: id, pageSize: 20, cursor: fresh.nextCursor }); assert.equal(tail.items.length, 2); assert.equal(tail.nextCursor, undefined);
      const subject = await store.listPaymentPrincipalCorrections(member, { paymentId: id, pageSize: 1 }); assert.equal(subject.audience, "SUBJECT"); assert.equal(subject.items[0].explanation, undefined); assert.equal(subject.items[0].actor, undefined); assert.equal(typeof subject.items[0].reasonCode, "string");
      await assert.rejects(store.listPaymentPrincipalCorrections(outsider, { paymentId: id, pageSize: 20 }), (error) => error.reason === "PAYMENT_NOT_ACCESSIBLE");
    });

    await t.test("aviso completo, stale, correcciones solapadas y aborto inyectado", async () => {
      const id = `${p}notice`; await set(`payments/${id}`, payment(id)); const batch = db.batch(); for (let index = 1; index <= 25; index += 1) { const deliveryId = `${p}notice-${String(index).padStart(2, "0")}`; batch.set(db.doc(`paymentDeliveries/${deliveryId}`), { deliveryId, groupId: group, membershipId: membership, decisionState: "REPORTED", lines: [{ paymentId: index === 25 ? id : `${p}other-${index}` }], reportedAt: now, schemaVersion: 1 }); } await batch.commit();
      await assert.rejects(store.correctPaymentPrincipal(owner, input(id, `${p}notice-block-key`, 1200)), (error) => error.reason === "PAYMENT_PENDING_NOTICE"); await db.doc(`paymentDeliveries/${p}notice-25`).update({ decisionState: "REJECTED" });
      const first = input(id, `${p}race-first-key01`, 1200); const second = input(id, `${p}race-second-key1`, 1300); const settled = await Promise.allSettled([store.correctPaymentPrincipal(owner, first), store.correctPaymentPrincipal(owner, second)]); assert.equal(settled.filter((x) => x.status === "fulfilled" && x.value.outcome === "CORRECTED").length, 1); const loserIndex = settled.findIndex((x) => x.status === "rejected" || x.value.outcome === "PENDING_RECOVERY"); assert.notEqual(loserIndex, -1); if (settled[loserIndex].status === "rejected") assert.equal(settled[loserIndex].reason.reason, "PAYMENT_PRINCIPAL_STALE"); else await assert.rejects(store.correctPaymentPrincipal(owner, loserIndex === 0 ? first : second), (error) => error.reason === "PAYMENT_PRINCIPAL_STALE");
      const abortId = `${p}abort`; await set(`payments/${abortId}`, payment(abortId)); const aborted = createFirestorePaymentStore({ db, now: () => now, testHooks: { afterCorrectionReads() { const error = new Error("synthetic abort"); error.code = "aborted"; throw error; } } }); const result = await aborted.correctPaymentPrincipal(owner, input(abortId, `${p}abort-key-00001`, 1100)); assert.equal(result.outcome, "PENDING_RECOVERY"); assert.equal((await db.doc(`payments/${abortId}`).get()).data().schemaVersion, 1);
    });

    await t.test("archivo admite prearchivo y rechaza una raíz posterior", async () => {
      const archivedAt = ts(admin, "2026-10-10T12:00:00Z"); await db.doc(`groups/${group}`).update({ estado: "archivado", archivedAt, schemaVersion: 4 });
      const before = `${p}prearchive`; await set(`payments/${before}`, payment(before)); assert.equal((await store.correctPaymentPrincipal(owner, input(before, `${p}prearchive-key01`, 1100))).outcome, "CORRECTED");
      const after = `${p}postarchive`; await set(`payments/${after}`, { ...payment(after), createdAt: ts(admin, "2026-10-11T12:00:00Z") });
      await assert.rejects(store.correctPaymentPrincipal(owner, input(after, `${p}postarchive-key1`, 1100)), (error) => error.reason === "PAYMENT_NOT_PREARCHIVE");
      await db.doc(`groups/${group}`).update({ estado: "activo", archivedAt: admin.firestore.FieldValue.delete(), schemaVersion: 3 });
    });

    await t.test("recovery sobrevive otra corrección y anulación v4 conserva ambas historias", async () => {
      const id = `${p}recovery`; await set(`payments/${id}`, payment(id)); const original = input(id, `${p}recovery-key-001`, 1200); await store.correctPaymentPrincipal(owner, original); await store.correctPaymentPrincipal(owner, input(id, `${p}later-key-000001`, 1400, 2)); const recovered = await store.correctPaymentPrincipal(owner, original); assert.equal(recovered.outcome, "EXISTING"); assert.equal(recovered.resource.correction.toPrincipalMinor, 1200); assert.equal(recovered.resource.currentPrincipalMinor, 1400);
      const voided = await store.voidPayment(owner, { groupId: group, paymentId: id, expectedEconomicRevision: 3, reasonCode: "NOT_OWED", explanation: "No correspondía exigirla", idempotencyKey: `${p}void-key-0000001` }); assert.equal(voided.outcome, "VOIDED"); const root = (await db.doc(`payments/${id}`).get()).data(); assert.equal(root.schemaVersion, 4); assert.equal(root.amountMinor, 1000); assert.equal(root.currentPrincipalMinor, 1400); assert.equal(root.voidedAmountMinor, 1400); assert.equal(root.balanceMinor, 0); assert.equal((await db.doc(`payments/${id}/principalCorrections/${root.lastPrincipalCorrectionId}`).get()).exists, true);
      assert.equal((await store.correctPaymentPrincipal(owner, original)).outcome, "EXISTING"); await assert.rejects(store.correctPaymentPrincipal(owner, input(id, `${p}after-void-key01`, 1500, 4)), (error) => error.reason === "PAYMENT_VOIDED");
    });
  } finally {
    for (const name of ["paymentCommandReceipts", "paymentReceiptCandidateGuards", "paymentDeliveries", "payments", "memberships", "seasons", "groups", "personas", "users"]) { const snapshot = await db.collection(name).get(); for (const doc of snapshot.docs) if (doc.id.startsWith(p)) { for (const sub of await doc.ref.listCollections()) { const children = await sub.get(); for (const child of children.docs) await child.ref.delete(); } await doc.ref.delete(); } }
    await app.delete();
  }
});
