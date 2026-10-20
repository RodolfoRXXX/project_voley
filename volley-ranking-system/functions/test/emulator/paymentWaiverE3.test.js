"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");

function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }
async function directWaiverEvent(host, projectId, paymentId, eventId, method = "GET") {
  return fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/payments/${paymentId}/waiverEvents/${eventId}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(method === "PATCH" ? { body: JSON.stringify({ fields: { type: { stringValue: "FORBIDDEN" } } }) } : {}),
  });
}

test("E3-07 condona y revierte deuda con historia, coordinación y recovery", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-07-waiver"); const db = app.firestore();
  const p = "e3-07-", owner = `${p}owner`, member = `${p}member`, outsider = `${p}outsider`, person = `${p}person`, group = `${p}group`, season = `${p}season`, membership = `${p}membership`, concept = `${p}concept`;
  const createdAt = ts(admin, "2026-09-01T12:00:00Z"), now = ts(admin, "2026-10-20T12:00:00Z"); const store = createFirestorePaymentStore({ db, now: () => now });
  const payment = (id, amount = 1000) => ({ groupId: group, membershipId: membership, personId: person, seasonId: season, conceptId: concept, conceptSnapshot: { version: 1, name: id, kind: "MONTHLY", currency: "ARS", defaultAmountMinor: amount }, amountMinor: amount, dueDate: "2026-10-20", estado: "PENDING", generationIntentId: `${p}intent`, payloadHash: "b".repeat(64), periodKey: "2026-10", createdAt, schemaVersion: 1 });
  const waive = (paymentId, key, amountMinor, expectedBalanceMinor, expectedEconomicRevision, mode = "PARTIAL", explanation = "Condonación sintética") => ({ groupId: group, paymentId, mode, amountMinor, expectedBalanceMinor, expectedEconomicRevision, reasonCode: "FINANCIAL_ASSISTANCE", internalExplanation: explanation, idempotencyKey: key });
  const reverse = (paymentId, waiverId, key, expectedEconomicRevision, expectedWaiverHistoryRevision, explanation = "Reversión sintética") => ({ groupId: group, paymentId, waiverId, expectedEconomicRevision, expectedWaiverHistoryRevision, reasonCode: "WAIVER_WRONG_AMOUNT", internalExplanation: explanation, idempotencyKey: key });
  async function set(path, data) { await db.doc(path).set(data); }
  try {
    await set(`users/${owner}`, { email: "owner-e3-07@example.invalid", personaId: `${p}owner-person`, createdAt }); await set(`users/${member}`, { email: "member-e3-07@example.invalid", personaId: person, createdAt }); await set(`users/${outsider}`, { email: "outsider-e3-07@example.invalid", personaId: `${p}outside-person`, createdAt });
    await set(`personas/${person}`, { nombre: "Sujeto", apellido: "Sintético", createdAt }); await set(`groups/${group}`, { nombre: "Grupo E3-07", deporte: "voleibol", ownerId: owner, ownershipRevision: 1, estado: "activo", createdAt, schemaVersion: 3 }); await set(`seasons/${season}`, { groupId: group, nombre: "2026", fechaInicio: "2026-01-01", estado: "cerrada", fechaCierre: "2026-10-01", closedAt: createdAt, createdAt, schemaVersion: 2 }); await set(`memberships/${membership}`, { personId: person, groupId: group, seasonId: season, estado: "finalizada", fechaIngreso: createdAt, fechaEgreso: now, createdAt, schemaVersion: 2 });

    await t.test("parcial, total fija, sucesivas y reversión exacta", async () => {
      const id = `${p}basic`; await set(`payments/${id}`, payment(id));
      const first = await store.waivePaymentDebt(owner, waive(id, `${p}basic-waive-001`, 300, 1000, 1)); assert.equal(first.outcome, "WAIVED"); assert.equal(first.current.balanceMinor, 700); assert.equal(first.current.estado, "PARTIAL");
      await assert.rejects(store.waivePaymentDebt(outsider, waive(id, `${p}outsider-waive01`, 100, 700, 2)), (error) => error.reason === "GROUP_NOT_ACCESSIBLE");
      const secondInput = waive(id, `${p}basic-total-001`, 700, 700, 2, "TOTAL"); const second = await store.waivePaymentDebt(owner, secondInput); assert.equal(second.current.balanceMinor, 0); assert.equal(second.current.estado, "SETTLED");
      assert.equal((await store.waivePaymentDebt(owner, secondInput)).outcome, "EXISTING"); await assert.rejects(store.waivePaymentDebt(owner, { ...secondInput, internalExplanation: "otra explicación" }), (error) => error.reason === "IDEMPOTENCY_CONFLICT");
      const reverted = await store.reversePaymentWaiver(owner, reverse(id, second.resource.waiverId, `${p}basic-reverse01`, 3, 2)); assert.equal(reverted.current.balanceMinor, 700); assert.equal(reverted.current.estado, "PARTIAL"); assert.equal(reverted.current.currentWaivedAmountMinor, 300);
      await assert.rejects(store.reversePaymentWaiver(owner, reverse(id, second.resource.waiverId, `${p}basic-reverse02`, 4, 3)), (error) => error.reason === "WAIVER_ALREADY_REVERSED");
      const root = (await db.doc(`payments/${id}`).get()).data(); assert.equal(root.schemaVersion, 5); assert.equal(root.grossWaivedAmountMinor, 1000); assert.equal(root.reversedWaivedAmountMinor, 700); assert.equal(root.balanceMinor, 700);
      assert.equal((await directWaiverEvent(process.env.FIRESTORE_EMULATOR_HOST, projectId, id, first.resource.waiverId)).status, 403);
      assert.equal((await directWaiverEvent(process.env.FIRESTORE_EMULATOR_HOST, projectId, id, first.resource.waiverId, "PATCH")).status, 403);
    });

    await t.test("reversión desde saldada deriva PENDING y nunca SETTLED", async () => {
      const id = `${p}pending`; await set(`payments/${id}`, payment(id)); const applied = await store.waivePaymentDebt(owner, waive(id, `${p}pending-total01`, 1000, 1000, 1, "TOTAL"));
      const result = await store.reversePaymentWaiver(owner, reverse(id, applied.resource.waiverId, `${p}pending-reverse1`, 2, 1)); assert.equal(result.current.balanceMinor, 1000); assert.equal(result.current.estado, "PENDING"); assert.notEqual(result.current.estado, "SETTLED");
    });

    await t.test("25 avisos se leen completos y bloquean ambos comandos sin decidirlos", async () => {
      const id = `${p}notices`; await set(`payments/${id}`, payment(id)); const batch = db.batch(); for (let index = 1; index <= 25; index += 1) { const deliveryId = `${p}notice-${String(index).padStart(2, "0")}`; batch.set(db.doc(`paymentDeliveries/${deliveryId}`), { deliveryId, groupId: group, membershipId: membership, decisionState: "REPORTED", lines: [{ paymentId: index === 25 ? id : `${p}other-${index}` }], reportedAt: now, schemaVersion: 1 }); } await batch.commit();
      await assert.rejects(store.waivePaymentDebt(owner, waive(id, `${p}notice-waive001`, 100, 1000, 1)), (error) => error.reason === "PAYMENT_PENDING_NOTICE");
      await db.doc(`paymentDeliveries/${p}notice-25`).update({ decisionState: "REJECTED" }); const applied = await store.waivePaymentDebt(owner, waive(id, `${p}notice-waive002`, 100, 1000, 1)); await db.doc(`paymentDeliveries/${p}notice-25`).update({ decisionState: "REPORTED" });
      await assert.rejects(store.reversePaymentWaiver(owner, reverse(id, applied.resource.waiverId, `${p}notice-reverse1`, 2, 1)), (error) => error.reason === "PAYMENT_PENDING_NOTICE"); assert.equal((await db.doc(`paymentDeliveries/${p}notice-25`).get()).data().decisionState, "REPORTED");
      const notices = await db.collection("paymentDeliveries").where("membershipId", "==", membership).get(); for (const doc of notices.docs) await doc.ref.delete();
    });

    await t.test("piso de corrección, bloqueo de anulación y recovery posterior", async () => {
      const id = `${p}interactions`; await set(`payments/${id}`, payment(id)); const original = waive(id, `${p}interaction-waive`, 400, 1000, 1); const applied = await store.waivePaymentDebt(owner, original);
      await assert.rejects(store.correctPaymentPrincipal(owner, { groupId: group, paymentId: id, newPrincipalMinor: 399, expectedEconomicRevision: 2, reasonCode: "AMOUNT_ENTRY_ERROR", explanation: "Debajo del piso", idempotencyKey: `${p}floor-low-key01` }), (error) => error.reason === "PRINCIPAL_BELOW_NET_INCOME");
      assert.equal((await store.correctPaymentPrincipal(owner, { groupId: group, paymentId: id, newPrincipalMinor: 900, expectedEconomicRevision: 2, reasonCode: "AMOUNT_ENTRY_ERROR", explanation: "Principal corregido", idempotencyKey: `${p}floor-ok-key001` })).outcome, "CORRECTED");
      const recovered = await store.waivePaymentDebt(owner, original); assert.equal(recovered.outcome, "EXISTING"); assert.equal(recovered.resource.composition.balanceMinor, 600); assert.equal(recovered.current.balanceMinor, 500);
      await assert.rejects(store.voidPayment(owner, { groupId: group, paymentId: id, expectedEconomicRevision: 3, reasonCode: "NOT_OWED", explanation: "No correspondía", idempotencyKey: `${p}void-block-key01` }), (error) => error.reason === "PAYMENT_HAS_WAIVER_HISTORY");
      await store.reversePaymentWaiver(owner, reverse(id, applied.resource.waiverId, `${p}interaction-rev1`, 3, 1)); await assert.rejects(store.voidPayment(owner, { groupId: group, paymentId: id, expectedEconomicRevision: 4, reasonCode: "NOT_OWED", explanation: "No correspondía", idempotencyKey: `${p}void-block-key02` }), (error) => error.reason === "PAYMENT_HAS_WAIVER_HISTORY");
    });

    await t.test("historia pagina, minimiza privacidad e invalida cursor por nueva cabeza", async () => {
      const id = `${p}history`; await set(`payments/${id}`, payment(id, 5000)); let revision = 1; let history = 0; const waivers = [];
      for (let index = 1; index <= 11; index += 1) { const applied = await store.waivePaymentDebt(owner, waive(id, `${p}history-waive-${String(index).padStart(2, "0")}`, 10, 5000, revision)); revision += 1; history += 1; waivers.push(applied.resource.waiverId); if (index <= 10) { await store.reversePaymentWaiver(owner, reverse(id, applied.resource.waiverId, `${p}history-rev-${String(index).padStart(2, "0")}`, revision, history)); revision += 1; history += 1; } }
      const first = await store.listPaymentWaiverHistory(owner, { paymentId: id, pageSize: 20 }); assert.equal(first.items.length, 20); assert.equal(typeof first.nextCursor, "string"); assert.equal(typeof first.items[0].internalExplanation, "string");
      const subject = await store.listPaymentWaiverHistory(member, { paymentId: id, pageSize: 1 }); assert.equal(subject.audience, "SUBJECT"); assert.equal(subject.items[0].internalExplanation, undefined); assert.equal(subject.items[0].actor, undefined); assert.equal(subject.items[0].internalReasonCode, undefined);
      await assert.rejects(store.listPaymentWaiverHistory(outsider, { paymentId: id, pageSize: 1 }), (error) => error.reason === "PAYMENT_NOT_ACCESSIBLE");
      await store.reversePaymentWaiver(owner, reverse(id, waivers.at(-1), `${p}history-new-head`, revision, history)); await assert.rejects(store.listPaymentWaiverHistory(owner, { paymentId: id, pageSize: 20, cursor: first.nextCursor }), (error) => error.reason === "CONCURRENT_MODIFICATION");
      const fresh = await store.listPaymentWaiverHistory(owner, { paymentId: id, pageSize: 20 }); const tail = await store.listPaymentWaiverHistory(owner, { paymentId: id, pageSize: 20, cursor: fresh.nextCursor }); assert.equal(fresh.items.length, 20); assert.equal(tail.items.length, 2);
    });

    await t.test("operaciones realmente solapadas serializan y aborto inyectado sólo deja recovery", async () => {
      const id = `${p}race`; await set(`payments/${id}`, payment(id)); const one = waive(id, `${p}race-waive-key01`, 100, 1000, 1); const two = waive(id, `${p}race-waive-key02`, 200, 1000, 1); const settled = await Promise.allSettled([store.waivePaymentDebt(owner, one), store.waivePaymentDebt(owner, two)]); assert.equal(settled.filter((item) => item.status === "fulfilled" && item.value.outcome === "WAIVED").length, 1); assert.equal(settled.filter((item) => item.status === "rejected" || item.value.outcome === "PENDING_RECOVERY").length, 1);
      const abortId = `${p}abort`; await set(`payments/${abortId}`, payment(abortId)); const aborted = createFirestorePaymentStore({ db, now: () => now, testHooks: { afterWaiverReads() { const error = new Error("synthetic abort"); error.code = "aborted"; throw error; } } }); const result = await aborted.waivePaymentDebt(owner, waive(abortId, `${p}abort-waive-key1`, 100, 1000, 1)); assert.equal(result.outcome, "PENDING_RECOVERY"); assert.equal((await db.doc(`payments/${abortId}`).get()).data().schemaVersion, 1);
    });

    await t.test("archivo admite Pago prearchivo y rechaza raíz posterior", async () => {
      const archivedAt = ts(admin, "2026-10-10T12:00:00Z"); await db.doc(`groups/${group}`).update({ estado: "archivado", archivedAt, schemaVersion: 4 }); const before = `${p}prearchive`; await set(`payments/${before}`, payment(before)); assert.equal((await store.waivePaymentDebt(owner, waive(before, `${p}prearchive-waive`, 100, 1000, 1))).outcome, "WAIVED"); const after = `${p}postarchive`; await set(`payments/${after}`, { ...payment(after), createdAt: ts(admin, "2026-10-11T12:00:00Z") }); await assert.rejects(store.waivePaymentDebt(owner, waive(after, `${p}postarchive-waive`, 100, 1000, 1)), (error) => error.reason === "PAYMENT_NOT_PREARCHIVE"); await db.doc(`groups/${group}`).update({ estado: "activo", archivedAt: admin.firestore.FieldValue.delete(), schemaVersion: 3 });
    });
  } finally {
    for (const name of ["paymentCommandReceipts", "paymentReceiptCandidateGuards", "paymentDeliveries", "payments", "memberships", "seasons", "groups", "personas", "users"]) { const snapshot = await db.collection(name).get(); for (const doc of snapshot.docs) if (doc.id.startsWith(p)) { for (const sub of await doc.ref.listCollections()) { const children = await sub.get(); for (const child of children.docs) await child.ref.delete(); } await doc.ref.delete(); } } await app.delete();
  }
});
