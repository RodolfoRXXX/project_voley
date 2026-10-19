"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestorePaymentStore } = require("../../src/payments/infrastructure/firestorePaymentStore");
const { paymentDto, opaqueId } = require("../../src/payments/domain/payment");

function ts(admin, value) { return admin.firestore.Timestamp.fromDate(new Date(value)); }

test("E3-05 anula sólo obligaciones íntegras, conserva identidad y recupera outcomes", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-05-void"); const db = app.firestore();
  const p = "e3-05-", owner = `${p}owner`, member = `${p}member`, outsider = `${p}outsider`, person = `${p}person`, group = `${p}group`, season = `${p}season`, membership = `${p}membership`, concept = `${p}concept`;
  const createdAt = ts(admin, "2026-09-01T12:00:00Z"), now = ts(admin, "2026-10-16T12:00:00Z");
  const store = createFirestorePaymentStore({ db, now: () => now });
  const payment = (id, version = 1) => ({ groupId: group, membershipId: membership, personId: person, seasonId: season, conceptId: concept, conceptSnapshot: { version: 1, name: id, kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 1000 }, amountMinor: 1000, dueDate: "2026-10-20", estado: "PENDING", ...(version === 2 ? { confirmedIncomeMinor: 0, reversedIncomeMinor: 0, netConfirmedIncomeMinor: 0, balanceMinor: 1000, economicState: "PENDING", economicRevision: 2 } : {}), generationIntentId: `${p}intent`, payloadHash: "a".repeat(64), periodKey: "2026-10", createdAt, schemaVersion: version });
  const input = (paymentId, key, revision = 1) => ({ groupId: group, paymentId, expectedEconomicRevision: revision, reasonCode: "DUPLICATE", explanation: "Obligación sintética duplicada", idempotencyKey: key });
  async function set(path, data) { await db.doc(path).set(data); }
  try {
    await set(`users/${owner}`, { email: "owner-e3-05@example.invalid", personaId: `${p}owner-person`, createdAt }); await set(`users/${member}`, { email: "member-e3-05@example.invalid", personaId: person, createdAt }); await set(`users/${outsider}`, { email: "outside-e3-05@example.invalid", personaId: `${p}outside-person`, createdAt });
    await set(`personas/${person}`, { nombre: "Sujeto", apellido: "Sintético", createdAt }); await set(`groups/${group}`, { nombre: "Grupo E3-05", deporte: "voleibol", ownerId: owner, ownershipRevision: 1, estado: "activo", createdAt, schemaVersion: 3 }); await set(`seasons/${season}`, { groupId: group, nombre: "2026", fechaInicio: "2026-01-01", estado: "cerrada", fechaCierre: "2026-10-01", closedAt: createdAt, createdAt, schemaVersion: 2 }); await set(`memberships/${membership}`, { personId: person, groupId: group, seasonId: season, estado: "finalizada", fechaIngreso: createdAt, fechaEgreso: now, createdAt, schemaVersion: 2 });

    await t.test("v1 y v2 evolucionan a v3 exacta; retry no incrementa y privacidad por audiencia", async () => {
      for (const [id, version, revision] of [[`${p}v1`, 1, 1], [`${p}v2`, 2, 2]]) {
        await set(`payments/${id}`, payment(id, version)); const command = input(id, `${p}void-${version}-key-0001`, revision); const result = await store.voidPayment(owner, command); assert.equal(result.outcome, "VOIDED");
        const saved = (await db.doc(`payments/${id}`).get()).data(); assert.equal(saved.schemaVersion, 3); assert.equal(saved.amountMinor, 1000); assert.equal(saved.balanceMinor, 0); assert.equal(saved.voidedAmountMinor, 1000); assert.equal(saved.economicRevision, revision + 1); assert.equal(saved.estado, "VOIDED"); assert.equal(saved.generationIntentId, `${p}intent`);
        const retry = await store.voidPayment(owner, command); assert.equal(retry.outcome, "EXISTING"); assert.equal((await db.doc(`payments/${id}`).get()).data().economicRevision, revision + 1);
        await assert.rejects(store.voidPayment(owner, { ...command, idempotencyKey: `${p}other-${version}-key-001` }), (error) => error.reason === "INCOMPATIBLE_STATE");
      }
      const own = await store.listMyObligations(member, { status: "VOIDED", pageSize: 20 }); assert.equal(own.items.length, 2); assert.equal(JSON.stringify(own).includes("voidExplanation"), false); assert.equal(own.items.every((x) => x.voidReasonCode === "DUPLICATE"), true);
      const firstPage = await store.listMyObligations(member, { status: "VOIDED", pageSize: 1 }); assert.equal(firstPage.items.length, 1); assert.equal(typeof firstPage.nextCursor, "string"); const secondPage = await store.listMyObligations(member, { status: "VOIDED", pageSize: 1, cursor: firstPage.nextCursor }); assert.equal(secondPage.items.length, 1); assert.notEqual(firstPage.items[0].paymentId, secondPage.items[0].paymentId);
      const ownDetail = await store.getMyPaymentObligationDetail(member, { paymentId: `${p}v1` }); assert.equal(ownDetail.lifecycle, "VOIDED"); assert.equal(ownDetail.context.groupName, "Grupo E3-05"); assert.equal(ownDetail.context.seasonName, "2026"); assert.equal(ownDetail.voidReasonCode, "DUPLICATE"); assert.equal(ownDetail.voidExplanation, undefined); assert.equal(ownDetail.voidedBy, undefined);
      const ownerPage = await store.listGroupObligations(owner, { groupId: group, status: "VOIDED", pageSize: 20 }); assert.equal(ownerPage.items.every((x) => x.voidExplanation === "Obligación sintética duplicada"), true); assert.equal(JSON.stringify(ownerPage).includes(owner), false);
      const treasuryDto = paymentDto({ paymentId: `${p}privacy`, ...payment(`${p}privacy`, 2), lifecycle: "VOIDED", voidedAmountMinor: 1000, voidReasonCode: "DUPLICATE", voidExplanation: "interno", voidedAt: now, voidedByAccountId: owner, balanceMinor: 0, estado: "VOIDED", economicState: "VOIDED", schemaVersion: 3 }, { owner: true, treasury: true, person: { status: "UNAVAILABLE" } }); assert.equal(treasuryDto.voidReasonCode, undefined); assert.equal(treasuryDto.voidExplanation, undefined); assert.equal(treasuryDto.voidedBy, undefined);
      await assert.rejects(store.voidPayment(outsider, input(`${p}v1`, `${p}outside-key-0001`)), (error) => error.reason === "GROUP_NOT_ACCESSIBLE");
      const malformed = `${p}malformed-v3`; const valid = (await db.doc(`payments/${p}v1`).get()).data(); await set(`payments/${malformed}`, { ...valid, balanceMinor: 1 }); await assert.rejects(store.getMyPaymentObligationDetail(member, { paymentId: malformed }), (error) => error.reason === "INCOMPATIBLE_STATE"); await db.doc(`payments/${malformed}`).delete();
    });

    await t.test("aplicaciones APPLIED/REVERSED, stale y aviso 25 bloquean; REJECTED no bloquea", async () => {
      for (const state of ["APPLIED", "REVERSED"]) { const id = `${p}application-${state.toLowerCase()}`; await set(`payments/${id}`, payment(id)); await set(`payments/${id}/deliveryApplications/${p}${state}`, { applicationState: state }); await assert.rejects(store.voidPayment(owner, input(id, `${p}${state.toLowerCase()}-key-0001`)), (error) => error.reason === "PAYMENT_NOT_VOIDABLE"); }
      const staleId = `${p}stale`; await set(`payments/${staleId}`, payment(staleId, 2)); await assert.rejects(store.voidPayment(owner, input(staleId, `${p}stale-key-000001`, 1)), (error) => error.reason === "PAYMENT_VOID_STALE");
      const noticePayment = `${p}notice-payment`; await set(`payments/${noticePayment}`, payment(noticePayment)); const batch = db.batch(); for (let index = 1; index <= 25; index += 1) { const id = `${p}notice-${String(index).padStart(2, "0")}`; batch.set(db.doc(`paymentDeliveries/${id}`), { deliveryId: id, groupId: group, membershipId: membership, decisionState: "REPORTED", lines: [{ paymentId: index === 25 ? noticePayment : `${p}other-${index}` }], reportedAt: now, schemaVersion: 1 }); } await batch.commit();
      await assert.rejects(store.voidPayment(owner, input(noticePayment, `${p}notice-key-00001`)), (error) => error.reason === "PAYMENT_PENDING_NOTICE"); await db.doc(`paymentDeliveries/${p}notice-25`).update({ decisionState: "REJECTED" }); const voided = await store.voidPayment(owner, input(noticePayment, `${p}notice-key-00002`)); assert.equal(voided.outcome, "VOIDED");
    });

    await t.test("aviso y anulación solapados serializan por guard; dos anulaciones convergen; aborto inyectado queda aparte", async () => {
      const noticeRaceId = `${p}race-notice`; await set(`payments/${noticeRaceId}`, payment(noticeRaceId)); let release; let entered; const enteredPromise = new Promise((resolve) => { entered = resolve; }); const releasePromise = new Promise((resolve) => { release = resolve; }); let paused = false;
      const racingStore = createFirestorePaymentStore({ db, now: () => now, testHooks: { async afterVoidReads() { if (paused) return; paused = true; entered(); await releasePromise; } } }); const voidPromise = racingStore.voidPayment(owner, input(noticeRaceId, `${p}race-notice-key1`)); await enteredPromise;
      const guardRef = db.doc(`paymentReceiptCandidateGuards/${opaqueId("payment-receipt-candidate-guard", group, membership)}`); const deliveryRef = db.doc(`paymentDeliveries/${p}race-notice-root`); const noticePromise = db.runTransaction(async (transaction) => { const [guardSnapshot, paymentSnapshot] = await Promise.all([transaction.get(guardRef), transaction.get(db.doc(`payments/${noticeRaceId}`))]); if (paymentSnapshot.data()?.estado === "VOIDED") { const error = new Error("payment already voided"); error.reason = "PAYMENT_NOT_OPEN"; throw error; } const guard = guardSnapshot.data(); transaction.set(guardRef, guardSnapshot.exists ? { ...guard, revision: guard.revision + 1, updatedAt: now } : { guardId: guardRef.id, groupId: group, membershipId: membership, revision: 1, createdAt: now, updatedAt: now, schemaVersion: 1 }); transaction.create(deliveryRef, { deliveryId: deliveryRef.id, groupId: group, membershipId: membership, decisionState: "REPORTED", lines: [{ paymentId: noticeRaceId }], reportedAt: now, schemaVersion: 1 }); return "REPORTED"; }); release();
      const [voidRace, noticeRace] = await Promise.allSettled([voidPromise, noticePromise]); assert.notEqual(voidRace.status, noticeRace.status); if (noticeRace.status === "fulfilled") { assert.equal(noticeRace.value, "REPORTED"); assert.equal(voidRace.reason.reason, "PAYMENT_PENDING_NOTICE"); assert.equal((await db.doc(`payments/${noticeRaceId}`).get()).data().estado, "PENDING"); await deliveryRef.update({ decisionState: "REJECTED" }); } else { assert.equal(voidRace.value.outcome, "VOIDED"); assert.equal(noticeRace.reason.reason, "PAYMENT_NOT_OPEN"); assert.equal((await deliveryRef.get()).exists, false); }

      const twoId = `${p}race-two`; await set(`payments/${twoId}`, payment(twoId)); const same = input(twoId, `${p}race-two-same-key`); const results = await Promise.all([store.voidPayment(owner, same), store.voidPayment(owner, same)]); assert.deepEqual(results.map((x) => x.outcome).sort(), ["EXISTING", "VOIDED"]); assert.equal((await db.doc(`payments/${twoId}`).get()).data().economicRevision, 2);

      const abortedId = `${p}injected-abort`; await set(`payments/${abortedId}`, payment(abortedId)); const aborted = createFirestorePaymentStore({ db, now: () => now, testHooks: { afterVoidReads() { const error = new Error("synthetic injected abort"); error.code = "aborted"; throw error; } } });
      const result = await aborted.voidPayment(owner, input(abortedId, `${p}abort-key-000001`)); assert.equal(result.outcome, "PENDING_RECOVERY"); assert.equal((await db.doc(`payments/${abortedId}`).get()).data().estado, "PENDING");
    });

    await t.test("archivo exige prearchivo y no muta Membresía/Temporada", async () => {
      const membershipBefore = (await db.doc(`memberships/${membership}`).get()).data(), seasonBefore = (await db.doc(`seasons/${season}`).get()).data(); const archivedAt = ts(admin, "2026-10-01T12:00:00Z"); await db.doc(`groups/${group}`).set({ nombre: "Grupo E3-05", deporte: "voleibol", ownerId: owner, ownershipRevision: 1, estado: "archivado", createdAt, archivedAt, schemaVersion: 4 });
      const pre = `${p}prearchive`; await set(`payments/${pre}`, { ...payment(pre), createdAt: ts(admin, "2026-09-30T12:00:00Z") }); assert.equal((await store.voidPayment(owner, input(pre, `${p}pre-key-00000001`))).outcome, "VOIDED");
      const post = `${p}postarchive`; await set(`payments/${post}`, { ...payment(post), createdAt: ts(admin, "2026-10-02T12:00:00Z") }); await assert.rejects(store.voidPayment(owner, input(post, `${p}post-key-0000001`)), (error) => error.reason === "PAYMENT_NOT_PREARCHIVE"); assert.deepEqual((await db.doc(`memberships/${membership}`).get()).data(), membershipBefore); assert.deepEqual((await db.doc(`seasons/${season}`).get()).data(), seasonBefore);
      await db.doc(`groups/${group}`).set({ nombre: "Grupo E3-05", deporte: "voleibol", ownerId: owner, ownershipRevision: 1, estado: "activo", createdAt, schemaVersion: 3 });
    });

    await t.test("generación original conserva outcome y una intención nueva no recrea la clave", async () => {
      await db.doc(`seasons/${season}`).update({ estado: "abierta", fechaCierre: admin.firestore.FieldValue.delete(), closedAt: admin.firestore.FieldValue.delete(), schemaVersion: 1 }); await db.doc(`memberships/${membership}`).update({ estado: "activa", fechaEgreso: admin.firestore.FieldValue.delete(), schemaVersion: 1 });
      await set(`groupChargeConcepts/${concept}`, { groupId: group, name: "Cuota generada", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 1000, estado: "ACTIVE", version: 1, createdAt, updatedAt: createdAt, schemaVersion: 1 });
      const generation = (key) => ({ groupId: group, conceptId: concept, expectedConceptVersion: 1, membershipIds: [membership], dueDate: "2026-10-20", baseAmountMinor: 1000, exceptions: [], generationIdempotencyKey: key, kind: "MONTHLY", periodKey: "2026-10" });
      const originalInput = generation(`${p}generation-key-001`), created = await store.generate(owner, originalInput), id = created.rows[0].payment.paymentId; await store.voidPayment(owner, input(id, `${p}generated-void-key`, 1));
      const recovered = await store.generate(owner, originalInput); assert.equal(recovered.rows[0].outcome, "CREATED"); assert.equal(recovered.rows[0].payment.estado, "VOIDED"); const newIntent = await store.generate(owner, generation(`${p}generation-key-002`)); assert.equal(newIntent.rows[0].outcome, "FAILED"); assert.equal(newIntent.rows[0].errorCode, "OBLIGATION_VOIDED"); assert.equal((await db.collection("payments").where("membershipId", "==", membership).where("periodKey", "==", "2026-10").get()).docs.filter((doc) => doc.id === id).length, 1);
    });

    await t.test("pérdida de respuesta queda recuperable sin segundo incremento", async () => {
      const id = `${p}lost-response`; await set(`payments/${id}`, payment(id)); const uncertain = createFirestorePaymentStore({ db, now: () => now, testHooks: { afterVoidCommit() { const error = new Error("synthetic response loss"); error.code = "unavailable"; throw error; } } }); const command = input(id, `${p}lost-key-0000001`); const first = await uncertain.voidPayment(owner, command); assert.equal(first.outcome, "PENDING_RECOVERY"); const revision = (await db.doc(`payments/${id}`).get()).data().economicRevision; const recovered = await store.voidPayment(owner, command); assert.equal(recovered.outcome, "EXISTING"); assert.equal((await db.doc(`payments/${id}`).get()).data().economicRevision, revision);
    });
  } finally {
    for (const name of ["paymentCommandReceipts", "paymentReceiptCandidateGuards", "paymentDeliveries", "paymentGenerationIntents", "groupChargeConcepts", "payments", "memberships", "seasons", "groups", "personas", "users"]) { const snapshot = await db.collection(name).get(); for (const doc of snapshot.docs) if (doc.id.startsWith(p)) { for (const sub of await doc.ref.listCollections()) { const children = await sub.get(); for (const child of children.docs) await child.ref.delete(); } await doc.ref.delete(); } }
    await app.delete();
  }
});

test("E3-05 guard id estable", () => { assert.equal(opaqueId("payment-receipt-candidate-guard", "g", "m").length, 64); });
