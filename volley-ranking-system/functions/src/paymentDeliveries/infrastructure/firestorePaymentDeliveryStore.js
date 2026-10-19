"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { createGroupOwnershipContextCapability } = require("../../groups/public/groupOwnershipContextCapability");
const { createTreasuryMembershipAuthorizationCapability } = require("../../memberships/public/treasuryMembershipAuthorizationCapability");
const { createTreasuryAccountIdentityCapability } = require("../../users/public/treasuryAccountIdentityCapability");
const { createPaymentPersonPresentationCapability } = require("../../persons/public/paymentPersonPresentationCapability");
const { createGroupTreasuryAuthorizationCapability } = require("../../treasury/public/groupTreasuryAuthorizationCapability");
const { createFirestorePaymentDeliveryRepository } = require("./firestorePaymentDeliveryRepository");
const { createFirestorePaymentEconomicRepository } = require("./firestorePaymentEconomicRepository");
const { createFirestorePaymentReviewRepository } = require("./firestorePaymentReviewRepository");
const d = require("../domain/paymentDelivery");
const e = require("../application/paymentDeliveryErrors");

function createFirestorePaymentDeliveryStore({ db, now = () => Timestamp.now(), testHooks = Object.freeze({}) }) {
  if (!db || typeof now !== "function") throw new TypeError("Payment delivery store dependencies are required");
  const deliveryRepository = createFirestorePaymentDeliveryRepository({ db }); const economicRepository = createFirestorePaymentEconomicRepository({ db }); const reviewRepository = createFirestorePaymentReviewRepository({ db });
  const deliveries = deliveryRepository.deliveries;
  const receipts = deliveryRepository.commandReceipts; const reversals = deliveryRepository.reversals;
  const candidateGuards = db.collection("paymentReceiptCandidateGuards");
  const grants = reviewRepository.grants; const slots = reviewRepository.slots; const capabilityReceipts = reviewRepository.commandReceipts;
  const ownership = createGroupOwnershipContextCapability({ db }); const membershipAuth = createTreasuryMembershipAuthorizationCapability({ db });
  const identity = createTreasuryAccountIdentityCapability({ db }); const personPresentation = createPaymentPersonPresentationCapability({ db });
  const treasuryAuthorization = createGroupTreasuryAuthorizationCapability({ db });

  function map(error) {
    if (error instanceof e.PaymentDeliveryError) return error;
    if (["ABORTED", 10, "10"].includes(error?.code)) return new e.DeliveryConcurrentModificationError({ cause: error });
    if (["UNAVAILABLE", 14, "14", "DEADLINE_EXCEEDED", 4, "4"].includes(error?.code)) return new e.PaymentDeliveryError("PENDING_RECOVERY", "Delivery command requires recovery", { cause: error });
    return error;
  }
  function encodeCursor(scope, anchor) { return Buffer.from(JSON.stringify({ v: 1, scope: d.hash(scope), anchor })).toString("base64url"); }
  function encodePaymentCursor(scope, anchor) { const body = Buffer.from(JSON.stringify({ v: 1, scope, anchor })).toString("base64url"); return `${body}.${d.hash(body)}`; }
  function decodeCursor(value, scope) { if (!value) return null; try { const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); if (!d.exact(parsed, ["v", "scope", "anchor"]) || parsed.v !== 1 || parsed.scope !== d.hash(scope)) throw new Error(); return parsed.anchor; } catch (_) { throw new e.DeliveryConcurrentModificationError(); } }
  function timestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }
  function validGroup(snapshot) {
    if (!snapshot.exists) throw new e.DeliveryNotAccessibleError(); const data = snapshot.data();
    const ownershipRevision = data.ownershipRevision ?? ([1, 2].includes(data.schemaVersion) ? 1 : null);
    if (!["activo", "archivado"].includes(data?.estado) || typeof data.ownerId !== "string" || !Number.isSafeInteger(ownershipRevision) || ownershipRevision < 1) throw new e.DeliveryIncompatibleStateError();
    if (data.estado === "archivado" && !timestamp(data.archivedAt)) throw new e.DeliveryIncompatibleStateError();
    return { groupId: snapshot.id, ownerId: data.ownerId, ownershipRevision, estado: data.estado, archivedAt: data.archivedAt };
  }
  async function account(transaction, accountId, personRequired = false) {
    const snapshot = await transaction.get(db.collection("users").doc(accountId)); const data = snapshot.data();
    if (!snapshot.exists || typeof data?.email !== "string" || !data.email.trim()) throw new e.DeliveryAccountRequiredError();
    if (personRequired && (typeof data.personaId !== "string" || !data.personaId.trim())) throw new e.DeliveryPersonRequiredError();
    return { accountId, ...(data.personaId ? { personId: data.personaId } : {}) };
  }
  function membershipContext(snapshot) {
    if (!snapshot.exists) throw new e.DeliveryNotAccessibleError(); const data = snapshot.data();
    for (const field of ["groupId", "seasonId", "personId"]) if (typeof data?.[field] !== "string" || !data[field]) throw new e.DeliveryIncompatibleStateError();
    if (!["activa", "finalizada"].includes(data.estado) || !timestamp(data.fechaIngreso) || (data.estado === "finalizada" && !timestamp(data.fechaEgreso))) throw new e.DeliveryIncompatibleStateError();
    return { membershipId: snapshot.id, groupId: data.groupId, seasonId: data.seasonId, personId: data.personId, estado: data.estado };
  }
  function prearchive(payment, group) {
    return group.estado === "activo" || (group.estado === "archivado" && timestamp(payment.createdAt)
      && payment.createdAt.toMillis() <= group.archivedAt.toMillis() && typeof payment.generationIntentId === "string"
      && /^[a-f0-9]{64}$/.test(payment.payloadHash || ""));
  }
  function hydrateDelivery(snapshot) {
    if (!snapshot.exists) return null; const data = snapshot.data();
    try {
      const required = ["deliveryId", "groupId", "seasonId", "membershipId", "personId", "reportedByAccountId", "declaredPaidOn", "lines", "declaredTotalMinor", "decisionState", "reportedAt", "revision", "schemaVersion"];
      required.forEach((field) => { if (!Object.hasOwn(data, field)) throw new Error(); });
      if (data.deliveryId !== snapshot.id || ![1, 2].includes(data.schemaVersion) || (data.schemaVersion === 2 && (data.origin !== "INFORMED" || data.receiptId !== snapshot.id)) || !["REPORTED", "CONFIRMED", "REJECTED", "RESOLVED_BY_ADMINISTRATIVE_RECEIPT"].includes(data.decisionState)
        || !Array.isArray(data.lines) || data.lines.length < 1 || data.lines.length > d.MAX_LINES || !timestamp(data.reportedAt)) throw new Error();
      [data.deliveryId, data.groupId, data.seasonId, data.membershipId, data.personId, data.reportedByAccountId].forEach(d.id);
      if (data.declaredTotalMinor !== data.lines.reduce((sum, line) => sum + line.requestedAmountMinor, 0)) throw new Error();
      if (data.decisionState === "CONFIRMED" && (!["APPLIED", "REVERSED"].includes(data.applicationState) || !timestamp(data.confirmedAt))) throw new Error();
      if (data.decisionState === "REJECTED" && (!timestamp(data.rejectedAt) || !data.rejection)) throw new Error();
      if (data.decisionState === "RESOLVED_BY_ADMINISTRATIVE_RECEIPT" && (!timestamp(data.resolution?.resolvedAt) || data.resolution?.administrativeReceiptId !== data.resolvedByAdministrativeReceiptId || !Array.isArray(data.resolution?.correctedFields))) throw new Error();
      return Object.freeze({ ...data });
    } catch (cause) { throw new e.DeliveryIncompatibleStateError({ cause }); }
  }
  function hydrateReceipt(snapshot) {
    if (!snapshot.exists) return null; const data = snapshot.data();
    if (data?.receiptId !== snapshot.id || data.schemaVersion !== 1 || !timestamp(data.completedAt)
      || !/^[a-f0-9]{64}$/.test(data.requestHash || "") || !/^[a-f0-9]{64}$/.test(data.idempotencyKeyHash || "")) throw new e.DeliveryIncompatibleStateError();
    return data;
  }
  function receiptData(ref, actorId, operation, input, delivery, outcome, completedAt) { return { receiptId: ref.id, actorAccountId: actorId, operation,
    idempotencyKeyHash: d.hash(input.idempotencyKey), requestHash: d.requestHash(input), groupId: delivery.groupId,
    deliveryId: delivery.deliveryId, outcome, completedAt, schemaVersion: 1 }; }
  function assertReceipt(receipt, actorId, operation, input) { if (receipt.actorAccountId !== actorId || receipt.operation !== operation || receipt.requestHash !== d.requestHash(input) || receipt.deliveryId !== input.deliveryId && operation !== "REPORT") throw new e.DeliveryIdempotencyConflictError(); }
  async function candidateGuardMutation(transaction, groupId, membershipId, at) {
    const guardId = d.opaqueId("payment-receipt-candidate-guard", groupId, membershipId); const ref = candidateGuards.doc(guardId); const snapshot = await transaction.get(ref); const data = snapshot.data();
    if (snapshot.exists && (data?.guardId !== guardId || data.groupId !== groupId || data.membershipId !== membershipId || data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1)) throw new e.DeliveryIncompatibleStateError();
    return { ref, data: snapshot.exists ? { ...data, revision: data.revision + 1, updatedAt: at } : { guardId, groupId, membershipId, revision: 1, createdAt: at, updatedAt: at, schemaVersion: 1 } };
  }

  function grantShape(snapshot) {
    if (!snapshot.exists) return null; const data = snapshot.data();
    if (data?.grantId !== snapshot.id || data.capabilityId !== d.CAPABILITY_ID || !["ACTIVE", "REVOKED"].includes(data.state) || data.schemaVersion !== 1) throw new e.DeliveryIncompatibleStateError();
    return data;
  }
  function slotShape(snapshot) {
    if (!snapshot.exists) return null; const data = snapshot.data();
    if (data?.slotId !== snapshot.id || data.capabilityId !== d.CAPABILITY_ID || data.schemaVersion !== 1) throw new e.DeliveryIncompatibleStateError();
    return data;
  }
  async function reviewerAuthorization(transaction, accountId, groupId, { delivery, ownerOnly = false } = {}) {
    await account(transaction, accountId, false); const group = validGroup(await transaction.get(db.collection("groups").doc(groupId)));
    if (group.ownerId === accountId) return { kind: "OWNER", group };
    if (ownerOnly || group.estado !== "activo") throw new e.ReviewNotAuthorizedError();
    const own = await identity.getOwnCanonicalPerson({ unitOfWork: transaction, accountId });
    if (own.status !== "READY") throw new e.ReviewNotAuthorizedError();
    const slot = slotShape(await transaction.get(slots.doc(d.reviewSlotId(groupId, accountId))));
    if (!slot) throw new e.ReviewNotAuthorizedError(); const grant = grantShape(await transaction.get(grants.doc(slot.currentGrantId)));
    if (!grant || grant.state !== "ACTIVE" || grant.accountId !== accountId || grant.groupId !== groupId || grant.personId !== own.personId
      || grant.ownerIdAtGrant !== group.ownerId || grant.ownershipRevisionAtGrant !== group.ownershipRevision
      || slot.membershipId !== grant.membershipId || slot.validityAnchor !== grant.validityAnchor || slot.ownershipRevision !== group.ownershipRevision) throw new e.ReviewNotAuthorizedError();
    const [activation, target] = await Promise.all([membershipAuth.getActiveAuthorizationContext({ unitOfWork: transaction, membershipId: grant.membershipId, groupId }), identity.resolveUniqueAccountForPerson({ unitOfWork: transaction, personId: grant.personId })]);
    if (activation.status !== "READY" || activation.validityAnchor !== grant.validityAnchor || target.status !== "READY" || target.accountId !== accountId) throw new e.ReviewNotAuthorizedError();
    const season = await membershipAuth.requireOpenSeasonContext({ unitOfWork: transaction, groupId, seasonId: activation.seasonId });
    if (season.status !== "OPEN") throw new e.ReviewNotAuthorizedError();
    if (delivery && delivery.personId === own.personId) throw new e.SelfReviewForbiddenError();
    return { kind: "REVIEWER", group, personId: own.personId, grantId: grant.grantId };
  }
  async function obligationDetailAuthorization(transaction, accountId, groupId, audience) {
    if (audience === "OWNER") return reviewerAuthorization(transaction, accountId, groupId, { ownerOnly: true });
    await account(transaction, accountId, false); const group = validGroup(await transaction.get(db.collection("groups").doc(groupId)));
    const authorization = await treasuryAuthorization.evaluate({ unitOfWork: transaction, accountId, groupId });
    if (authorization.status !== "AUTHORIZED") throw new e.TreasuryDetailNotAuthorizedError();
    return { kind: "TREASURY", group };
  }

  async function report(accountId, input) {
    const rid = d.receiptId(accountId, "REPORT", input.idempotencyKey); const receiptRef = receipts.doc(rid); const deliveryRef = deliveries.doc(d.deliveryId(accountId, input.idempotencyKey));
    try { return await db.runTransaction(async (transaction) => {
      const persistedReceipt = hydrateReceipt(await transaction.get(receiptRef)); const actor = await account(transaction, accountId, true);
      if (persistedReceipt) { assertReceipt(persistedReceipt, accountId, "REPORT", input); const persisted = hydrateDelivery(await transaction.get(deliveries.doc(persistedReceipt.deliveryId))); if (!persisted || persisted.reportedByAccountId !== accountId) throw new e.DeliveryIncompatibleStateError(); return { outcome: "EXISTING", delivery: d.deliveryDto(persisted) }; }
      const membership = membershipContext(await transaction.get(db.collection("memberships").doc(input.membershipId)));
      if (membership.personId !== actor.personId) throw new e.DeliveryNotAccessibleError(); const group = validGroup(await transaction.get(db.collection("groups").doc(membership.groupId)));
      const season = await transaction.get(db.collection("seasons").doc(membership.seasonId)); if (!season.exists || season.data()?.groupId !== membership.groupId) throw new e.DeliveryIncompatibleStateError();
      const paymentSnapshots = await Promise.all(input.lines.map((line) => transaction.get(economicRepository.paymentRef(line.paymentId)))); const stale = []; const hydrated = [];
      for (let index = 0; index < input.lines.length; index += 1) { const line = input.lines[index]; const payment = d.economicPayment(paymentSnapshots[index]);
        if (!payment || payment.membershipId !== membership.membershipId || payment.groupId !== membership.groupId || payment.seasonId !== membership.seasonId || payment.personId !== actor.personId) throw new e.DeliveryScopeMismatchError();
        if (!prearchive(payment, group)) throw new e.PrearchivePaymentRequiredError();
        if (payment.balanceMinor !== line.expectedBalanceMinor || payment.economicRevision !== line.expectedEconomicRevision) stale.push({ paymentId: line.paymentId, balanceMinor: payment.balanceMinor, economicRevision: payment.economicRevision });
        hydrated.push(payment);
      }
      if (stale.length) throw new e.DeliveryDraftStaleError({ details: { lines: stale } });
      const at = now(); const guard = await candidateGuardMutation(transaction, membership.groupId, membership.membershipId, at); const lines = input.lines.map((line, index) => ({ lineId: d.applicationId(deliveryRef.id, line.paymentId), paymentId: line.paymentId, selectionMode: line.selectionMode,
        requestedAmountMinor: line.requestedAmountMinor, expectedBalanceMinor: line.expectedBalanceMinor, expectedEconomicRevision: line.expectedEconomicRevision,
        conceptName: hydrated[index].conceptSnapshot.name, dueDate: hydrated[index].dueDate }));
      const data = { deliveryId: deliveryRef.id, groupId: membership.groupId, seasonId: membership.seasonId, membershipId: membership.membershipId, personId: membership.personId,
        reportedByAccountId: accountId, declaredPaidOn: input.declaredPaidOn, lines, declaredTotalMinor: lines.reduce((sum, line) => sum + line.requestedAmountMinor, 0),
        decisionState: "REPORTED", reportedAt: at, revision: 1, schemaVersion: 1 };
      const receipt = receiptData(receiptRef, accountId, "REPORT", input, data, "REPORTED", at); transaction.create(deliveryRef, data); transaction.create(receiptRef, receipt); transaction.set(guard.ref, guard.data);
      if (typeof testHooks.beforeReportCommit === "function") await testHooks.beforeReportCommit({ transaction, data });
      return { outcome: "REPORTED", delivery: d.deliveryDto(data) };
    }); } catch (error) { throw map(error); }
  }

  async function decide(accountId, input, operation) {
    const rid = d.receiptId(accountId, operation, input.idempotencyKey); const receiptRef = receipts.doc(rid); const deliveryRef = deliveries.doc(input.deliveryId);
    try { return await db.runTransaction(async (transaction) => {
      const persistedReceipt = hydrateReceipt(await transaction.get(receiptRef)); const delivery = hydrateDelivery(await transaction.get(deliveryRef));
      if (!delivery || delivery.groupId !== input.groupId) throw new e.DeliveryNotAccessibleError(); const authorization = await reviewerAuthorization(transaction, accountId, input.groupId, { delivery });
      if (persistedReceipt) { assertReceipt(persistedReceipt, accountId, operation, input); if (operation === "CONFIRM") await verifyApplications(transaction, delivery, "APPLIED"); return { outcome: "EXISTING", delivery: d.deliveryDto(delivery) }; }
      if (delivery.decisionState !== "REPORTED") throw new e.DeliveryAlreadyDecidedError(); const at = now(); const guard = await candidateGuardMutation(transaction, delivery.groupId, delivery.membershipId, at);
      if (operation === "REJECT") { const rejection = { reasonCode: input.reasonCode, ...(input.reasonNote ? { reasonNote: input.reasonNote } : {}), decidedByAccountId: accountId };
        const updated = { ...delivery, decisionState: "REJECTED", rejection, rejectedAt: at, revision: delivery.revision + 1 };
        transaction.update(deliveryRef, { decisionState: "REJECTED", rejection, rejectedAt: at, revision: updated.revision }); transaction.create(receiptRef, receiptData(receiptRef, accountId, operation, input, delivery, "REJECTED", at)); transaction.set(guard.ref, guard.data); return { outcome: "REJECTED", delivery: d.deliveryDto(updated) }; }
      if (typeof testHooks.afterConfirmAuthorization === "function") await testHooks.afterConfirmAuthorization({ transaction, delivery, authorization });
      const paymentSnapshots = await Promise.all(delivery.lines.map((line) => transaction.get(economicRepository.paymentRef(line.paymentId))));
      const applicationSnapshots = await Promise.all(delivery.lines.map((line) => transaction.get(economicRepository.applicationRef(line.paymentId, line.lineId))));
      if (applicationSnapshots.some((snapshot) => snapshot.exists)) throw new e.DeliveryIncompatibleStateError(); const hydrated = paymentSnapshots.map(d.economicPayment);
      const stale = []; hydrated.forEach((payment, index) => { const line = delivery.lines[index]; if (!payment || payment.groupId !== delivery.groupId || payment.membershipId !== delivery.membershipId || payment.personId !== delivery.personId || payment.seasonId !== delivery.seasonId) throw new e.DeliveryIncompatibleStateError(); if (!prearchive(payment, authorization.group)) throw new e.PrearchivePaymentRequiredError(); if (line.requestedAmountMinor > payment.balanceMinor) stale.push({ lineId: line.lineId, balanceMinor: payment.balanceMinor }); });
      if (stale.length) throw new e.DeliveryStaleBalanceError({ details: { lines: stale, decisionState: "REPORTED" } });
      hydrated.forEach((payment, index) => { const line = delivery.lines[index]; transaction.update(economicRepository.paymentRef(payment.paymentId), d.paymentUpdate(payment, line.requestedAmountMinor, 0)); transaction.create(economicRepository.applicationRef(payment.paymentId, line.lineId), { applicationId: line.lineId, deliveryId: delivery.deliveryId, lineId: line.lineId, paymentId: payment.paymentId, appliedAmountMinor: line.requestedAmountMinor, applicationState: "APPLIED", confirmedAt: at, confirmedByAccountId: accountId, schemaVersion: 1 }); });
      const updated = { ...delivery, decisionState: "CONFIRMED", applicationState: "APPLIED", confirmedAt: at, confirmedByAccountId: accountId, confirmedByKind: authorization.kind, revision: delivery.revision + 1 };
      transaction.update(deliveryRef, { decisionState: "CONFIRMED", applicationState: "APPLIED", confirmedAt: at, confirmedByAccountId: accountId, confirmedByKind: authorization.kind, revision: updated.revision }); transaction.create(receiptRef, receiptData(receiptRef, accountId, operation, input, delivery, "CONFIRMED", at)); transaction.set(guard.ref, guard.data);
      if (typeof testHooks.beforeConfirmCommit === "function") await testHooks.beforeConfirmCommit({ transaction, delivery, payments: hydrated });
      return { outcome: "CONFIRMED", delivery: d.deliveryDto(updated) };
    }); } catch (error) { throw map(error); }
  }
  async function verifyApplications(transaction, delivery, expectedState) {
    if (delivery.decisionState !== "CONFIRMED" || delivery.applicationState !== expectedState) throw new e.DeliveryIncompatibleStateError();
    const snapshots = await Promise.all(delivery.lines.map((line) => transaction.get(economicRepository.applicationRef(line.paymentId, line.lineId))));
    snapshots.forEach((snapshot, index) => { const app = snapshot.data(); const line = delivery.lines[index]; if (!snapshot.exists || app.deliveryId !== delivery.deliveryId || app.paymentId !== line.paymentId || app.appliedAmountMinor !== line.requestedAmountMinor || app.applicationState !== expectedState) throw new e.DeliveryIncompatibleStateError(); });
  }

  async function reverse(accountId, input) {
    const operation = "REVERSE"; const rid = d.receiptId(accountId, operation, input.idempotencyKey); const receiptRef = receipts.doc(rid); const deliveryRef = deliveries.doc(input.deliveryId);
    try { return await db.runTransaction(async (transaction) => {
      const persistedReceipt = hydrateReceipt(await transaction.get(receiptRef)); const delivery = hydrateDelivery(await transaction.get(deliveryRef));
      if (!delivery || delivery.groupId !== input.groupId) throw new e.DeliveryNotAccessibleError(); const authorization = await reviewerAuthorization(transaction, accountId, input.groupId, { delivery, ownerOnly: true });
      const applicationRefs = delivery.lines.map((line) => economicRepository.applicationRef(line.paymentId, line.lineId));
      const applicationSnapshots = await Promise.all(applicationRefs.map((ref) => transaction.get(ref)));
      if (persistedReceipt) { assertReceipt(persistedReceipt, accountId, operation, input); if (delivery.decisionState !== "CONFIRMED" || delivery.applicationState !== "REVERSED" || applicationSnapshots.some((snap) => snap.data()?.applicationState !== "REVERSED")) throw new e.DeliveryIncompatibleStateError(); return { outcome: "EXISTING", delivery: d.deliveryDto(delivery) }; }
      if (delivery.decisionState !== "CONFIRMED" || delivery.applicationState !== "APPLIED") throw new e.DeliveryNotReversibleError();
      const paymentSnapshots = await Promise.all(delivery.lines.map((line) => transaction.get(economicRepository.paymentRef(line.paymentId)))); const hydrated = paymentSnapshots.map(d.economicPayment);
      applicationSnapshots.forEach((snapshot, index) => { const app = snapshot.data(); const line = delivery.lines[index]; if (!snapshot.exists || app?.deliveryId !== delivery.deliveryId || app?.paymentId !== line.paymentId || app?.appliedAmountMinor !== line.requestedAmountMinor || app?.applicationState !== "APPLIED") throw new e.DeliveryIncompatibleStateError(); });
      hydrated.forEach((payment) => { if (!payment || !prearchive(payment, authorization.group)) throw new e.PrearchivePaymentRequiredError(); });
      const at = now(); const reversalId = d.opaqueId("payment-delivery-reversal", delivery.deliveryId);
      hydrated.forEach((payment, index) => { const line = delivery.lines[index]; transaction.update(economicRepository.paymentRef(payment.paymentId), d.paymentUpdate(payment, 0, line.requestedAmountMinor)); transaction.update(applicationRefs[index], { applicationState: "REVERSED", reversalId, reversedAt: at }); });
      const reversal = { reversalId, deliveryId: delivery.deliveryId, reason: input.reason, reversedAt: at, reversedByAccountId: accountId, schemaVersion: 1 };
      const updated = { ...delivery, applicationState: "REVERSED", reversal, reversalId, reversedAt: at, revision: delivery.revision + 1 };
      transaction.create(reversals.doc(reversalId), reversal); transaction.update(deliveryRef, { applicationState: "REVERSED", reversal, reversalId, reversedAt: at, revision: updated.revision }); transaction.create(receiptRef, receiptData(receiptRef, accountId, operation, input, delivery, "REVERSED", at));
      if (typeof testHooks.beforeReverseCommit === "function") await testHooks.beforeReverseCommit({ transaction, delivery, payments: hydrated });
      return { outcome: "REVERSED", delivery: d.deliveryDto(updated) };
    }); } catch (error) { throw map(error); }
  }

  async function ownAuthorization(transaction, accountId) { return account(transaction, accountId, true); }
  async function listOwn(accountId, input) { try { return await db.runTransaction(async (transaction) => { const actor = await ownAuthorization(transaction, accountId); const scope = { contract: "my-payment-deliveries", accountId, personId: actor.personId, membershipId: input.membershipId || null, pageSize: input.pageSize }; const anchor = decodeCursor(input.cursor, scope); let query = deliveries.where("personId", "==", actor.personId); if (input.membershipId) query = query.where("membershipId", "==", input.membershipId); query = query.orderBy("reportedAt", "desc").orderBy("__name__", "desc"); if (anchor) query = query.startAfter(Timestamp.fromMillis(anchor.at), anchor.id); const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = docs.map((doc) => d.deliveryDto(hydrateDelivery(doc))); const last = docs.at(-1); return { items, ...(snapshot.size > input.pageSize ? { nextCursor: encodeCursor(scope, { at: last.data().reportedAt.toMillis(), id: last.id }) } : {}) }; }); } catch (error) { throw map(error); } }
  async function getOwn(accountId, input) { try { return await db.runTransaction(async (transaction) => { const actor = await ownAuthorization(transaction, accountId); const delivery = hydrateDelivery(await transaction.get(deliveries.doc(input.deliveryId))); if (!delivery || delivery.personId !== actor.personId) throw new e.DeliveryNotAccessibleError(); return d.deliveryDto(delivery); }); } catch (error) { throw map(error); } }
  async function listPending(accountId, input) { try { return await db.runTransaction(async (transaction) => { const auth = await reviewerAuthorization(transaction, accountId, input.groupId); const scope = { contract: "pending-payment-deliveries", accountId, groupId: input.groupId, pageSize: input.pageSize }; const anchor = decodeCursor(input.cursor, scope); let query = deliveries.where("groupId", "==", input.groupId).where("decisionState", "==", "REPORTED").orderBy("reportedAt", "asc").orderBy("__name__", "asc"); if (anchor) query = query.startAfter(Timestamp.fromMillis(anchor.at), anchor.id); const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const candidates = snapshot.docs.filter((doc) => auth.kind === "OWNER" || doc.data().personId !== auth.personId); const docs = candidates.slice(0, input.pageSize); const items = []; for (const doc of docs) items.push(d.deliveryDto(hydrateDelivery(doc), { includeLines: false, person: await personPresentation.get(transaction, doc.data().personId) })); const last = docs.at(-1); return { items, ...(snapshot.size > input.pageSize && last ? { nextCursor: encodeCursor(scope, { at: last.data().reportedAt.toMillis(), id: last.id }) } : {}) }; }); } catch (error) { throw map(error); } }
  async function getPending(accountId, input) { try { return await db.runTransaction(async (transaction) => { const delivery = hydrateDelivery(await transaction.get(deliveries.doc(input.deliveryId))); if (!delivery || delivery.groupId !== input.groupId || delivery.decisionState !== "REPORTED") throw new e.DeliveryNotAccessibleError(); await reviewerAuthorization(transaction, accountId, input.groupId, { delivery }); const person = await personPresentation.get(transaction, delivery.personId); return d.deliveryDto(delivery, { person }); }); } catch (error) { throw map(error); } }
  async function listReportedForPayments(accountId, input) { try { return await db.runTransaction(async (transaction) => {
    const authorization = await reviewerAuthorization(transaction, accountId, input.groupId);
    const paymentSnapshots = await Promise.all(input.obligations.map((item) => transaction.get(economicRepository.paymentRef(item.paymentId))));
    const visible = new Map();
    paymentSnapshots.forEach((snapshot, index) => { const payment = d.economicPayment(snapshot); const requested = input.obligations[index]; if (!payment || payment.groupId !== input.groupId || payment.membershipId !== requested.membershipId) throw new e.DeliveryNotAccessibleError(); visible.set(payment.paymentId, payment); });
    const membershipIds = [...new Set([...visible.values()].map((payment) => payment.membershipId))];
    const snapshot = await transaction.get(deliveries.where("groupId", "==", input.groupId).where("decisionState", "==", "REPORTED").where("membershipId", "in", membershipIds));
    const items = [];
    for (const doc of snapshot.docs) { const delivery = hydrateDelivery(doc); if (authorization.kind !== "OWNER" && delivery.personId === authorization.personId) continue; const matchingPaymentIds = delivery.lines.map((line) => line.paymentId).filter((paymentId) => visible.get(paymentId)?.membershipId === delivery.membershipId); if (!matchingPaymentIds.length) continue; items.push({ ...d.deliveryDto(delivery, { includeLines: false }), matchingPaymentIds }); }
    items.sort((left, right) => left.reportedAt.localeCompare(right.reportedAt) || left.deliveryId.localeCompare(right.deliveryId));
    return { items };
  }); } catch (error) { throw map(error); } }
  async function getObligationDetail(accountId, input, audience) { try { return await db.runTransaction(async (transaction) => {
    const authorization = await obligationDetailAuthorization(transaction, accountId, input.groupId, audience);
    const paymentSnapshot = await transaction.get(economicRepository.paymentRef(input.paymentId)); const payment = d.economicPayment(paymentSnapshot);
    if (!payment || payment.groupId !== input.groupId) throw new e.DeliveryNotAccessibleError();
    const applicationScope = { contract: "payment-obligation-detail-v1", audience, accountId, groupId: input.groupId, paymentId: input.paymentId, order: "__name__:asc", pageSize: input.pageSize }; const applicationAnchor = decodeCursor(input.cursor, applicationScope);
    if (applicationAnchor && (!d.exact(applicationAnchor, ["id"]) || typeof applicationAnchor.id !== "string" || !applicationAnchor.id)) throw new e.DeliveryConcurrentModificationError();
    let applicationQuery = economicRepository.paymentRef(payment.paymentId).collection("deliveryApplications").orderBy("__name__", "asc");
    if (applicationAnchor) { const anchorSnapshot = await transaction.get(economicRepository.applicationRef(payment.paymentId, applicationAnchor.id)); if (!anchorSnapshot.exists || anchorSnapshot.data()?.paymentId !== payment.paymentId) throw new e.DeliveryConcurrentModificationError(); applicationQuery = applicationQuery.startAfter(applicationAnchor.id); }
    const correctionQuery = audience === "OWNER" && !input.cursor ? economicRepository.paymentRef(payment.paymentId).collection("principalCorrections").orderBy("toEconomicRevision", "desc").orderBy("__name__", "desc").limit(21) : null;
    const [membershipSnapshot, groupSnapshot, seasonSnapshot, applicationSnapshot, correctionSnapshot] = await Promise.all([
      transaction.get(db.collection("memberships").doc(payment.membershipId)), transaction.get(db.collection("groups").doc(payment.groupId)),
      transaction.get(db.collection("seasons").doc(payment.seasonId)), transaction.get(applicationQuery.limit(input.pageSize + 1)), correctionQuery ? transaction.get(correctionQuery) : Promise.resolve(null),
    ]);
    const membership = membershipContext(membershipSnapshot); if (membership.groupId !== payment.groupId || membership.seasonId !== payment.seasonId || membership.personId !== payment.personId) throw new e.DeliveryIncompatibleStateError();
    const person = await personPresentation.get(transaction, payment.personId); const groupData = groupSnapshot.data(); const seasonData = seasonSnapshot.data();
    if (!groupSnapshot.exists || groupSnapshot.id !== authorization.group.groupId || !seasonSnapshot.exists || seasonData?.groupId !== payment.groupId) throw new e.DeliveryIncompatibleStateError();
    let occurrenceName; if (payment.occurrenceKey) { const occurrence = await transaction.get(db.collection("groupChargeOccurrences").doc(payment.occurrenceKey)); if (occurrence.exists && occurrence.data()?.groupId === payment.groupId && occurrence.data()?.conceptId === payment.conceptId && typeof occurrence.data()?.name === "string") occurrenceName = occurrence.data().name; }
    const actorCache = new Map();
    async function actorPresentation(actorAccountId, fallback) { if (!actorCache.has(actorAccountId)) actorCache.set(actorAccountId, (async () => { const actor = await account(transaction, actorAccountId, false); if (actor.personId) { const presented = await personPresentation.get(transaction, actor.personId); if (presented.status === "AVAILABLE") return { label: `${presented.firstName} ${presented.lastName}` }; } return { label: fallback }; })()); return actorCache.get(actorAccountId); }
    const applications = [];
    const applicationDocs = applicationSnapshot.docs.slice(0, input.pageSize);
    for (const applicationDoc of applicationDocs) {
      const application = applicationDoc.data(); if (application.paymentId !== payment.paymentId || !Number.isSafeInteger(application.appliedAmountMinor) || application.appliedAmountMinor <= 0 || !["APPLIED", "REVERSED"].includes(application.applicationState)) throw new e.DeliveryIncompatibleStateError();
      if (application.source?.kind === "ADMINISTRATIVE") {
        const rootSnapshot = await transaction.get(deliveries.doc(application.source.receiptId)); const root = rootSnapshot.data();
        if (!rootSnapshot.exists || root?.schemaVersion !== 2 || root.origin !== "ADMINISTRATIVE" || root.receiptId !== rootSnapshot.id || root.groupId !== payment.groupId || !root.lines?.some((line) => line.paymentId === payment.paymentId && line.lineId === application.lineId && line.amountMinor === application.appliedAmountMinor)) throw new e.DeliveryIncompatibleStateError();
        applications.push({ origin: "ADMINISTRATIVE", eventLabel: "Registrado", effectiveOn: root.receivedOn, eventAt: d.iso(root.recordedAt), amountMinor: application.appliedAmountMinor, applicationState: application.applicationState, actor: audience === "OWNER" ? await actorPresentation(root.recordedByAccountId, root.recordedByKind === "OWNER" ? "Owner del Grupo" : "Registrante autorizado") : { label: "la administración" }, ...(root.reversedAt ? { reversedAt: d.iso(root.reversedAt), reversalReason: root.reversal?.reason } : {}) });
      } else {
        const rootSnapshot = await transaction.get(deliveries.doc(application.deliveryId)); const root = hydrateDelivery(rootSnapshot);
        if (!root || root.groupId !== payment.groupId || root.decisionState !== "CONFIRMED" || !root.lines.some((line) => line.paymentId === payment.paymentId && line.lineId === application.lineId && line.requestedAmountMinor === application.appliedAmountMinor)) throw new e.DeliveryIncompatibleStateError();
        applications.push({ origin: "INFORMED", eventLabel: "Confirmado", effectiveOn: root.declaredPaidOn, eventAt: d.iso(root.confirmedAt), amountMinor: application.appliedAmountMinor, applicationState: application.applicationState, actor: audience === "OWNER" ? await actorPresentation(root.confirmedByAccountId, root.confirmedByKind === "OWNER" ? "Owner del Grupo" : "Revisor autorizado") : { label: "la administración" }, ...(root.reversedAt ? { reversedAt: d.iso(root.reversedAt), reversalReason: root.reversal?.reason } : {}) });
      }
    }
    applications.sort((left, right) => right.eventAt.localeCompare(left.eventAt));
    const pendingNotices = [];
    if (audience === "OWNER") { const pendingSnapshot = await transaction.get(deliveries.where("membershipId", "==", payment.membershipId).where("decisionState", "==", "REPORTED"));
      for (const doc of pendingSnapshot.docs) { const delivery = hydrateDelivery(doc); if (delivery.groupId !== payment.groupId || delivery.personId !== payment.personId || delivery.seasonId !== payment.seasonId) throw new e.DeliveryIncompatibleStateError(); if (delivery.lines.some((line) => line.paymentId === payment.paymentId)) pendingNotices.push({ deliveryId: delivery.deliveryId, declaredPaidOn: delivery.declaredPaidOn, declaredTotalMinor: delivery.declaredTotalMinor, reportedAt: d.iso(delivery.reportedAt) }); } }
    const applicationLast = applicationDocs.at(-1);
    let principalCorrections; let correctionNextCursor;
    if (audience === "OWNER" && correctionSnapshot) {
      const correctionDocs = correctionSnapshot.docs.slice(0, 20); const corrections = correctionDocs.map(d.principalCorrection);
      for (const item of corrections) if (item.paymentId !== payment.paymentId || item.groupId !== payment.groupId) throw new e.DeliveryIncompatibleStateError();
      if (payment.schemaVersion === 4) { const newest = corrections[0]; if (!newest || newest.correctionId !== payment.lastPrincipalCorrectionId || newest.toEconomicRevision > payment.economicRevision || payment.principalCorrectionCount < corrections.length) throw new e.DeliveryIncompatibleStateError(); }
      else if (corrections.length) throw new e.DeliveryIncompatibleStateError();
      principalCorrections = corrections.map((item) => d.principalCorrectionDto(item, true)); const last = corrections.at(-1);
      if (correctionSnapshot.size > 20 && last) correctionNextCursor = encodePaymentCursor({ contract: "payment-principal-corrections-v1", userId: accountId, audience: "OWNER", paymentId: payment.paymentId, order: "revision-desc-id-desc", pageSize: 20 }, { revision: last.toEconomicRevision, id: last.correctionId, seen: 20, total: payment.principalCorrectionCount, headId: payment.lastPrincipalCorrectionId });
    }
    const voidPresentation = payment.lifecycle === "VOIDED" ? { lifecycle: "VOIDED", voidedAmountMinor: payment.voidedAmountMinor, voidedAt: d.iso(payment.voidedAt), ...(audience === "OWNER" ? { voidReasonCode: payment.voidReasonCode, voidExplanation: payment.voidExplanation, voidedBy: { label: "Owner del Grupo" } } : {}) } : {};
    return { audience, person, context: { ...(typeof groupData?.nombre === "string" && groupData.nombre ? { groupName: groupData.nombre } : {}), ...(typeof seasonData?.nombre === "string" && seasonData.nombre ? { seasonName: seasonData.nombre } : {}) }, obligation: { concept: { name: payment.conceptSnapshot.name, kind: payment.conceptSnapshot.kind, version: payment.conceptSnapshot.version, defaultAmountMinor: payment.conceptSnapshot.defaultAmountMinor }, ...(payment.periodKey ? { periodKey: payment.periodKey } : {}), ...(occurrenceName ? { occurrenceName } : {}), ...(audience === "OWNER" ? { amountMinor: payment.amountMinor } : {}), currentPrincipalMinor: payment.currentPrincipalMinor ?? payment.amountMinor, dueDate: payment.dueDate, netConfirmedIncomeMinor: payment.netConfirmedIncomeMinor, balanceMinor: payment.balanceMinor, estado: payment.economicState, economicRevision: payment.economicRevision, ...(payment.lastCorrectedAt ? { lastCorrectedAt: d.iso(payment.lastCorrectedAt) } : {}), ...voidPresentation }, applications, ...(audience === "OWNER" ? { pendingNotices, principalCorrections: principalCorrections || [], ...(correctionNextCursor ? { correctionNextCursor } : {}) } : {}), ...(applicationSnapshot.size > input.pageSize && applicationLast ? { nextCursor: encodeCursor(applicationScope, { id: applicationLast.id }) } : {}) };
  }); } catch (error) { throw map(error); } }
  const getOwnerObligationDetail = (accountId, input) => getObligationDetail(accountId, input, "OWNER");
  const getTreasuryObligationDetail = (accountId, input) => getObligationDetail(accountId, input, "TREASURY");
  async function listHistory(accountId, input) { try { return await db.runTransaction(async (transaction) => { await reviewerAuthorization(transaction, accountId, input.groupId, { ownerOnly: true }); const scope = { contract: "owner-confirmed-payment-deliveries", accountId, ...input, cursor: undefined }; const anchor = decodeCursor(input.cursor, scope); let query = deliveries.where("groupId", "==", input.groupId).where("decisionState", "==", "CONFIRMED"); if (input.applicationState) query = query.where("applicationState", "==", input.applicationState); if (input.membershipId) query = query.where("membershipId", "==", input.membershipId); if (input.confirmedFrom) query = query.where("confirmedAt", ">=", Timestamp.fromDate(new Date(`${input.confirmedFrom}T00:00:00-03:00`))); if (input.confirmedTo) query = query.where("confirmedAt", "<", Timestamp.fromDate(new Date(`${input.confirmedTo}T23:59:59.999-03:00`))); query = query.orderBy("confirmedAt", "desc").orderBy("__name__", "desc"); if (anchor) query = query.startAfter(Timestamp.fromMillis(anchor.at), anchor.id); const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = []; for (const doc of docs) items.push(d.deliveryDto(hydrateDelivery(doc), { includeLines: false, person: await personPresentation.get(transaction, doc.data().personId) })); const last = docs.at(-1); return { items, ...(snapshot.size > input.pageSize ? { nextCursor: encodeCursor(scope, { at: last.data().confirmedAt.toMillis(), id: last.id }) } : {}) }; }); } catch (error) { throw map(error); } }
  async function getHistory(accountId, input) { try { return await db.runTransaction(async (transaction) => { await reviewerAuthorization(transaction, accountId, input.groupId, { ownerOnly: true }); const delivery = hydrateDelivery(await transaction.get(deliveries.doc(input.deliveryId))); if (!delivery || delivery.groupId !== input.groupId || delivery.decisionState !== "CONFIRMED") throw new e.DeliveryNotAccessibleError(); await verifyApplications(transaction, delivery, delivery.applicationState); return d.deliveryDto(delivery, { person: await personPresentation.get(transaction, delivery.personId) }); }); } catch (error) { throw map(error); } }
  async function getReviewOutcome(accountId, input) { try { return await db.runTransaction(async (transaction) => { await reviewerAuthorization(transaction, accountId, input.groupId); const delivery = hydrateDelivery(await transaction.get(deliveries.doc(input.deliveryId))); if (!delivery || delivery.groupId !== input.groupId || ![delivery.confirmedByAccountId, delivery.rejection?.decidedByAccountId].includes(accountId)) throw new e.DeliveryNotAccessibleError(); return d.deliveryDto(delivery); }); } catch (error) { throw map(error); } }

  async function grantReview(accountId, input) {
    const rid = d.receiptId(accountId, "GRANT_REVIEW", input.idempotencyKey); const receiptRef = capabilityReceipts.doc(rid);
    await db.runTransaction(async (transaction) => { const context = await ownership.ensureOwnershipContext({ unitOfWork: transaction, groupId: input.groupId }); if (context.status !== "READY") throw new e.ReviewNotAuthorizedError(); });
    try { return await db.runTransaction(async (transaction) => { const existingReceipt = hydrateReceipt(await transaction.get(receiptRef)); const group = validGroup(await transaction.get(db.collection("groups").doc(input.groupId))); await account(transaction, accountId, false); if (group.ownerId !== accountId) throw new e.ReviewNotAuthorizedError(); if (group.estado !== "activo") throw new e.ReviewNotAuthorizedError();
      if (existingReceipt) { if (existingReceipt.requestHash !== d.requestHash(input) || existingReceipt.operation !== "GRANT_REVIEW") throw new e.DeliveryIdempotencyConflictError(); const existingGrant = grantShape(await transaction.get(grants.doc(existingReceipt.grantId))); return { outcome: "EXISTING", grant: reviewGrantDto(existingGrant) }; }
      const activation = await membershipAuth.getActiveAuthorizationContext({ unitOfWork: transaction, membershipId: input.membershipId, groupId: input.groupId }); if (activation.status !== "READY") throw new e.ReviewNotAuthorizedError(); const season = await membershipAuth.requireOpenSeasonContext({ unitOfWork: transaction, groupId: input.groupId, seasonId: activation.seasonId }); if (season.status !== "OPEN") throw new e.ReviewNotAuthorizedError(); const target = await identity.resolveUniqueAccountForPerson({ unitOfWork: transaction, personId: activation.personId }); if (target.status !== "READY") throw new e.ReviewNotAuthorizedError();
      const slotRef = slots.doc(d.reviewSlotId(input.groupId, target.accountId)); const slot = slotShape(await transaction.get(slotRef)); if (slot) { const current = grantShape(await transaction.get(grants.doc(slot.currentGrantId))); if (current?.state === "ACTIVE") throw new e.PaymentDeliveryError("REVIEW_GRANT_ALREADY_ACTIVE"); }
      const at = now(); const grantRef = grants.doc(); const grant = { grantId: grantRef.id, capabilityId: d.CAPABILITY_ID, groupId: input.groupId, membershipId: input.membershipId, validityAnchor: activation.validityAnchor, personId: activation.personId, accountId: target.accountId, ownerIdAtGrant: group.ownerId, ownershipRevisionAtGrant: group.ownershipRevision, state: "ACTIVE", grantedAt: at, grantedByAccountId: accountId, schemaVersion: 1 };
      const slotData = { slotId: slotRef.id, groupId: input.groupId, capabilityId: d.CAPABILITY_ID, accountId: target.accountId, currentGrantId: grantRef.id, membershipId: input.membershipId, validityAnchor: activation.validityAnchor, ownershipRevision: group.ownershipRevision, updatedAt: at, schemaVersion: 1 };
      transaction.create(grantRef, grant); transaction.set(slotRef, slotData); transaction.create(receiptRef, { receiptId: rid, actorAccountId: accountId, operation: "GRANT_REVIEW", idempotencyKeyHash: d.hash(input.idempotencyKey), requestHash: d.requestHash(input), groupId: input.groupId, deliveryId: "authorization", grantId: grantRef.id, outcome: "GRANTED", completedAt: at, schemaVersion: 1 }); return { outcome: "GRANTED", grant: reviewGrantDto(grant) };
    }); } catch (error) { throw map(error); }
  }
  function reviewGrantDto(grant, state = grant?.state, person) { if (!grant) throw new e.DeliveryIncompatibleStateError(); return { grantId: grant.grantId, membershipId: grant.membershipId, capabilityId: d.CAPABILITY_ID, state, grantedAt: d.iso(grant.grantedAt), ...(grant.revokedAt ? { revokedAt: d.iso(grant.revokedAt) } : {}), ...(person ? { person } : {}) }; }
  async function projectedGrantState(transaction, group, grant) { if (grant.state === "REVOKED") return "REVOKED"; if (group.estado !== "activo" || grant.ownerIdAtGrant !== group.ownerId || grant.ownershipRevisionAtGrant !== group.ownershipRevision) return "LAPSED"; const slot = slotShape(await transaction.get(slots.doc(d.reviewSlotId(group.groupId, grant.accountId)))); if (!slot || slot.currentGrantId !== grant.grantId) return "LAPSED"; const activation = await membershipAuth.getActiveAuthorizationContext({ unitOfWork: transaction, membershipId: grant.membershipId, groupId: group.groupId }); if (activation.status !== "READY" || activation.validityAnchor !== grant.validityAnchor) return "LAPSED"; const target = await identity.resolveUniqueAccountForPerson({ unitOfWork: transaction, personId: grant.personId }); if (target.status !== "READY" || target.accountId !== grant.accountId) return "LAPSED"; const season = await membershipAuth.requireOpenSeasonContext({ unitOfWork: transaction, groupId: group.groupId, seasonId: activation.seasonId }); return season.status === "OPEN" ? "ACTIVE" : "LAPSED"; }
  async function revokeReview(accountId, input) { const rid = d.receiptId(accountId, "REVOKE_REVIEW", input.idempotencyKey); const receiptRef = capabilityReceipts.doc(rid); try { return await db.runTransaction(async (transaction) => { const existingReceipt = hydrateReceipt(await transaction.get(receiptRef)); const group = validGroup(await transaction.get(db.collection("groups").doc(input.groupId))); await account(transaction, accountId, false); if (group.ownerId !== accountId || group.estado !== "activo") throw new e.ReviewNotAuthorizedError(); if (existingReceipt) { if (existingReceipt.requestHash !== d.requestHash(input) || existingReceipt.operation !== "REVOKE_REVIEW") throw new e.DeliveryIdempotencyConflictError(); return { outcome: "EXISTING", grantId: existingReceipt.grantId }; } const grantRef = grants.doc(input.grantId); const grant = grantShape(await transaction.get(grantRef)); if (!grant || grant.groupId !== input.groupId || grant.state !== "ACTIVE") throw new e.DeliveryNotAccessibleError(); const slotRef = slots.doc(d.reviewSlotId(input.groupId, grant.accountId)); const slot = slotShape(await transaction.get(slotRef)); const at = now(); transaction.update(grantRef, { state: "REVOKED", revokedAt: at, revokedByAccountId: accountId }); if (slot?.currentGrantId === grant.grantId) transaction.delete(slotRef); transaction.create(receiptRef, { receiptId: rid, actorAccountId: accountId, operation: "REVOKE_REVIEW", idempotencyKeyHash: d.hash(input.idempotencyKey), requestHash: d.requestHash(input), groupId: input.groupId, deliveryId: "authorization", grantId: grant.grantId, outcome: "REVOKED", completedAt: at, schemaVersion: 1 }); return { outcome: "REVOKED", grantId: grant.grantId, revokedAt: d.iso(at) }; }); } catch (error) { throw map(error); } }
  async function listReviewGrants(accountId, input) { try { return await db.runTransaction(async (transaction) => { const authorization = await reviewerAuthorization(transaction, accountId, input.groupId, { ownerOnly: true }); const scope = { contract: "payment-review-grants", accountId, groupId: input.groupId, pageSize: input.pageSize }; const anchor = decodeCursor(input.cursor, scope); let query = grants.where("groupId", "==", input.groupId).where("capabilityId", "==", d.CAPABILITY_ID).orderBy("grantedAt", "desc").orderBy("__name__", "desc"); if (anchor) query = query.startAfter(Timestamp.fromMillis(anchor.at), anchor.id); const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = []; for (const doc of docs) { const grant = grantShape(doc); const [state, person] = await Promise.all([projectedGrantState(transaction, authorization.group, grant), personPresentation.get(transaction, grant.personId)]); items.push(reviewGrantDto(grant, state, person)); } const last = docs.at(-1); return { items, ...(snapshot.size > input.pageSize ? { nextCursor: encodeCursor(scope, { at: last.data().grantedAt.toMillis(), id: last.id }) } : {}) }; }); } catch (error) { throw map(error); } }
  async function getReviewContext(accountId, input) { try { return await db.runTransaction(async (transaction) => { const authorization = await reviewerAuthorization(transaction, accountId, input.groupId); if (authorization.kind !== "REVIEWER") throw new e.ReviewNotAuthorizedError(); return { groupId: input.groupId, capabilityId: d.CAPABILITY_ID, canReviewPaymentNotices: true }; }); } catch (error) { throw map(error); } }

  return Object.freeze({ report, confirm: (accountId, input) => decide(accountId, input, "CONFIRM"), reject: (accountId, input) => decide(accountId, input, "REJECT"), reverse,
    listOwn, getOwn, listPending, getPending, listReportedForPayments, getOwnerObligationDetail, getTreasuryObligationDetail, listHistory, getHistory, getReviewOutcome,
    grantReview, revokeReview, listReviewGrants, getReviewContext });
}

module.exports = { createFirestorePaymentDeliveryStore };
