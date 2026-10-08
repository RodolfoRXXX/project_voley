"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { hydrateGroup, InvalidGroupStateError } = require("../../groups/domain/group");
const { hydrateSeason, InvalidSeasonStateError } = require("../../groups/domain/season");
const { createMembershipObligationEligibilityCapability } = require("../../memberships/public/membershipObligationEligibilityCapability");
const { createPaymentPersonPresentationCapability } = require("../../persons/public/paymentPersonPresentationCapability");
const {
  conceptDto, exact, hash, hydrateConcept, hydrateOccurrence, iso, monthBounds, opaqueId, paymentDto,
  normalizeConceptName, normalizeExceptionReason, requireAmount, requireDueDate, requireId, requireKind, requireVersion, stable,
} = require("../domain/payment");
const {
  PaymentAccountRequiredError, PaymentConceptDeactivatedError, PaymentConceptNotAvailableError,
  PaymentConceptVersionStaleError, PaymentConcurrentModificationError, PaymentDependencyUnavailableError,
  PaymentError, PaymentGroupNotAccessibleError, PaymentGroupNotOperationalError, PaymentIdempotencyConflictError,
  PaymentIncompatibleStateError, PaymentOccurrenceNotAvailableError, PaymentPersonRequiredError,
} = require("../application/paymentErrors");

function createFirestorePaymentStore({ db, now = () => Timestamp.now(), testHooks = Object.freeze({}) }) {
  if (!db || typeof now !== "function" || !testHooks || typeof testHooks !== "object") throw new TypeError("Payment store dependencies are required");
  const concepts = db.collection("groupChargeConcepts"); const occurrences = db.collection("groupChargeOccurrences");
  const payments = db.collection("payments"); const intents = db.collection("paymentGenerationIntents");
  const receipts = db.collection("paymentCommandReceipts");
  const membershipCapability = createMembershipObligationEligibilityCapability({ db });
  const personPresentation = createPaymentPersonPresentationCapability({ db });

  function isTransient(error) { return ["cancelled", "deadline-exceeded", "resource-exhausted", "aborted", "unavailable", 1, 4, 8, 10, 14].includes(error?.code); }
  function map(error) {
    if (error instanceof PaymentError) return error;
    if (isTransient(error)) return new PaymentDependencyUnavailableError({ cause: error });
    return new PaymentIncompatibleStateError({ cause: error });
  }
  async function account(transaction, userId, requirePerson = false) {
    const snapshot = await transaction.get(db.collection("users").doc(userId));
    const data = snapshot.data();
    if (!snapshot.exists || !data || typeof data.email !== "string" || !data.email.trim()) throw new PaymentAccountRequiredError();
    if (requirePerson && (typeof data.personaId !== "string" || !data.personaId || data.personaId !== data.personaId.trim())) throw new PaymentPersonRequiredError();
    return data;
  }
  async function ownedGroup(transaction, userId, groupId, { active = true } = {}) {
    await account(transaction, userId);
    const snapshot = await transaction.get(db.collection("groups").doc(groupId));
    if (!snapshot.exists || snapshot.data()?.ownerId !== userId) throw new PaymentGroupNotAccessibleError();
    let group; try { group = hydrateGroup(snapshot.id, snapshot.data()); } catch (cause) { if (cause instanceof InvalidGroupStateError) throw new PaymentIncompatibleStateError({ cause }); throw cause; }
    if (active && group.estado !== "activo") throw new PaymentGroupNotOperationalError();
    return group;
  }
  function cursor(scope, anchor) { const body = Buffer.from(JSON.stringify({ v: 1, scope, anchor })).toString("base64url"); return `${body}.${hash(body)}`; }
  function readCursor(value, scope) {
    if (!value) return null;
    try { const [body, signature, extra] = value.split("."); if (extra || hash(body) !== signature) throw new Error(); const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); if (decoded.v !== 1 || stable(decoded.scope) !== stable(scope)) throw new Error(); return decoded.anchor; }
    catch (cause) { throw new PaymentConcurrentModificationError({ cause }); }
  }
  function receiptId(userId, groupId, operation, key) { return opaqueId("payment-command", userId, groupId, operation, key); }
  function requestHash(input) { const { idempotencyKey, ...rest } = input; return hash(rest); }
  function receiptResult(receipt) { return Object.freeze({ outcome: receipt.outcome, recovered: true, resource: receipt.resource }); }
  function commandReceipt(data) {
    if (!exact(data, ["actorUserId", "groupId", "operation", "idempotencyKeyHash", "requestHash", "outcome", "resource", "createdAt", "schemaVersion"]) || data.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(data.idempotencyKeyHash) || !/^[a-f0-9]{64}$/.test(data.requestHash) || typeof data.actorUserId !== "string" || !data.resource || !iso(data.createdAt)) throw new PaymentIncompatibleStateError();
    return data;
  }
  async function mutateConcept(userId, input, operation) {
    const id = receiptId(userId, input.groupId, operation, input.idempotencyKey); const expectedHash = requestHash(input);
    try {
      return await db.runTransaction(async (transaction) => {
        await ownedGroup(transaction, userId, input.groupId);
        const receiptRef = receipts.doc(id); const receiptSnapshot = await transaction.get(receiptRef);
        if (receiptSnapshot.exists) { const stored = commandReceipt(receiptSnapshot.data()); if (stored.actorUserId !== userId || stored.groupId !== input.groupId || stored.operation !== operation || stored.requestHash !== expectedHash) throw new PaymentIdempotencyConflictError(); return receiptResult(stored); }
        if (operation === "CREATE_CONCEPT") {
          const conceptId = concepts.doc().id; const timestamp = now();
          const concept = { groupId: input.groupId, name: input.name, kind: input.kind, currency: "ARS", defaultAmountMinor: input.defaultAmountMinor, estado: "ACTIVE", version: 1, createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 };
          transaction.create(concepts.doc(conceptId), concept); const resource = conceptDto({ conceptId, ...concept });
          transaction.create(receiptRef, { actorUserId: userId, groupId: input.groupId, operation, idempotencyKeyHash: hash(input.idempotencyKey), requestHash: expectedHash, outcome: "CREATED", resource, createdAt: timestamp, schemaVersion: 1 });
          return Object.freeze({ outcome: "CREATED", recovered: false, resource });
        }
        const conceptRef = concepts.doc(input.conceptId); const snapshot = await transaction.get(conceptRef);
        if (!snapshot.exists || snapshot.data()?.groupId !== input.groupId) throw new PaymentConceptNotAvailableError();
        const concept = hydrateConcept(snapshot.id, snapshot.data());
        if (concept.version !== input.expectedVersion) throw new PaymentConceptVersionStaleError();
        const noChange = operation === "RENAME_CONCEPT" ? concept.name === input.name : operation === "CHANGE_CONCEPT_AMOUNT" ? concept.defaultAmountMinor === input.defaultAmountMinor : concept.estado === "INACTIVE";
        if (noChange) return Object.freeze({ outcome: "NO_CHANGES", recovered: false, resource: conceptDto(concept) });
        if (concept.estado !== "ACTIVE") throw new PaymentConceptDeactivatedError();
        const timestamp = now(); const changes = { updatedAt: timestamp, version: concept.version + 1, ...(operation === "RENAME_CONCEPT" ? { name: input.name } : operation === "CHANGE_CONCEPT_AMOUNT" ? { defaultAmountMinor: input.defaultAmountMinor } : { estado: "INACTIVE" }) };
        const updated = { ...concept, ...changes }; const resource = conceptDto(updated); transaction.update(conceptRef, changes);
        transaction.create(receiptRef, { actorUserId: userId, groupId: input.groupId, operation, idempotencyKeyHash: hash(input.idempotencyKey), requestHash: expectedHash, outcome: "UPDATED", resource, createdAt: timestamp, schemaVersion: 1 });
        return Object.freeze({ outcome: "UPDATED", recovered: false, resource });
      });
    } catch (error) { throw map(error); }
  }

  async function occurrenceToken(transaction, groupId, conceptId, conceptVersion) {
    const snapshot = await transaction.get(occurrences.where("groupId", "==", groupId).where("conceptId", "==", conceptId));
    const identities = snapshot.docs.map((doc) => `${doc.id}:${doc.data()?.estado}`).sort();
    return hash({ groupId, conceptId, conceptVersion, identities });
  }
  function assertConcept(concept, groupId, { active = false, version, kind } = {}) {
    if (!concept || concept.groupId !== groupId || (kind && concept.kind !== kind)) throw new PaymentConceptNotAvailableError();
    if (active && concept.estado !== "ACTIVE") throw new PaymentConceptDeactivatedError();
    if (version !== undefined && concept.version !== version) throw new PaymentConceptVersionStaleError();
  }

  async function listConcepts(userId, input) {
    try { return await db.runTransaction(async (transaction) => {
      await ownedGroup(transaction, userId, input.groupId, { active: false });
      const scope = { contract: "concepts", userId, groupId: input.groupId, pageSize: input.pageSize }; const anchor = readCursor(input.cursor, scope);
      let query = concepts.where("groupId", "==", input.groupId).orderBy("name", "asc").orderBy("__name__", "asc");
      if (anchor) { const anchorDoc = await transaction.get(concepts.doc(anchor.id)); if (!anchorDoc.exists || anchorDoc.data()?.groupId !== input.groupId || anchorDoc.data()?.name !== anchor.name) throw new PaymentConcurrentModificationError(); query = query.startAfter(anchor.name, anchor.id); }
      const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = docs.map((doc) => conceptDto(hydrateConcept(doc.id, doc.data()))); const last = docs.at(-1);
      return Object.freeze({ items: Object.freeze(items), ...(snapshot.size > input.pageSize ? { nextCursor: cursor(scope, { name: last.data().name, id: last.id }) } : {}) });
    }); } catch (error) { throw map(error); }
  }

  async function listOccurrences(userId, input) {
    try { return await db.runTransaction(async (transaction) => {
      await ownedGroup(transaction, userId, input.groupId, { active: false }); const conceptSnapshot = await transaction.get(concepts.doc(input.conceptId)); const concept = conceptSnapshot.exists ? hydrateConcept(conceptSnapshot.id, conceptSnapshot.data()) : null; assertConcept(concept, input.groupId);
      const scope = { contract: "occurrences", userId, groupId: input.groupId, conceptId: input.conceptId, pageSize: input.pageSize }; const anchor = readCursor(input.cursor, scope);
      let query = occurrences.where("groupId", "==", input.groupId).where("conceptId", "==", input.conceptId).orderBy("createdAt", "desc").orderBy("__name__", "desc");
      if (anchor) { const ref = occurrences.doc(anchor.id); const doc = await transaction.get(ref); if (!doc.exists || doc.data()?.groupId !== input.groupId || doc.data()?.conceptId !== input.conceptId || iso(doc.data()?.createdAt) !== anchor.createdAt) throw new PaymentConcurrentModificationError(); query = query.startAfter(doc.data().createdAt, anchor.id); }
      const [snapshot, listToken] = await Promise.all([transaction.get(query.limit(input.pageSize + 1)), occurrenceToken(transaction, input.groupId, input.conceptId, concept.version)]); const docs = snapshot.docs.slice(0, input.pageSize); const last = docs.at(-1);
      return Object.freeze({ items: Object.freeze(docs.map((doc) => require("../domain/payment").occurrenceDto(hydrateOccurrence(doc.id, doc.data())))), occurrenceListToken: listToken, ...(snapshot.size > input.pageSize ? { nextCursor: cursor(scope, { createdAt: iso(last.data().createdAt), id: last.id }) } : {}) });
    }); } catch (error) { throw map(error); }
  }

  async function createOccurrence(userId, input) {
    const operation = "CREATE_OCCURRENCE"; const id = receiptId(userId, input.groupId, operation, input.idempotencyKey); const expectedHash = requestHash(input);
    try { return await db.runTransaction(async (transaction) => {
      await ownedGroup(transaction, userId, input.groupId); const receiptRef = receipts.doc(id); const receiptSnapshot = await transaction.get(receiptRef);
      if (receiptSnapshot.exists) { const stored = commandReceipt(receiptSnapshot.data()); if (stored.requestHash !== expectedHash || stored.actorUserId !== userId || stored.groupId !== input.groupId) throw new PaymentIdempotencyConflictError(); return receiptResult(stored); }
      const conceptSnapshot = await transaction.get(concepts.doc(input.conceptId)); const concept = conceptSnapshot.exists ? hydrateConcept(conceptSnapshot.id, conceptSnapshot.data()) : null; assertConcept(concept, input.groupId, { active: true, version: input.expectedConceptVersion, kind: "ONE_TIME" });
      if (await occurrenceToken(transaction, input.groupId, input.conceptId, concept.version) !== input.occurrenceListToken) throw new PaymentConcurrentModificationError();
      const occurrenceKey = occurrences.doc().id; const timestamp = now(); const data = { groupId: input.groupId, conceptId: input.conceptId, createdUnderConceptVersion: concept.version, name: input.name, estado: "UNUSED", createdAt: timestamp, schemaVersion: 1 }; const resource = require("../domain/payment").occurrenceDto({ occurrenceKey, ...data });
      transaction.create(occurrences.doc(occurrenceKey), data); transaction.create(receiptRef, { actorUserId: userId, groupId: input.groupId, operation, idempotencyKeyHash: hash(input.idempotencyKey), requestHash: expectedHash, outcome: "CREATED", resource, createdAt: timestamp, schemaVersion: 1 }); return Object.freeze({ outcome: "CREATED", recovered: false, resource });
    }); } catch (error) { throw map(error); }
  }

  function paymentIdFor(row, snapshot) { return opaqueId("payment", snapshot.kind, snapshot.groupId, row.membershipId, snapshot.conceptId, snapshot.kind === "MONTHLY" ? snapshot.periodKey : snapshot.occurrenceKey); }
  function rowPayload(intent, membershipId) { const exception = intent.exceptions.find((item) => item.membershipId === membershipId); return Object.freeze({ membershipId, appliedAmountMinor: exception?.amountMinor ?? intent.baseAmountMinor, ...(exception ? { exceptionReason: exception.reason } : {}) }); }
  function hydrateIntent(data) {
    try {
      const monthly = data?.kind === "MONTHLY"; const fields = ["actorUserId", "groupId", "idempotencyKeyHash", "requestHash", "conceptSnapshot", "kind", "dueDate", "baseAmountMinor", "exceptions", monthly ? "periodKey" : "occurrenceKey", "membershipIds", "status", "createdAt", "updatedAt", "schemaVersion"];
      if (!exact(data, fields) || data.schemaVersion !== 1 || !["PENDING", "COMPLETE"].includes(data.status) || !/^[a-f0-9]{64}$/.test(data.idempotencyKeyHash) || !/^[a-f0-9]{64}$/.test(data.requestHash) || !iso(data.createdAt) || !iso(data.updatedAt)) throw new Error();
      requireId(data.actorUserId); requireId(data.groupId); requireKind(data.kind); requireDueDate(data.dueDate); requireAmount(data.baseAmountMinor);
      if (!exact(data.conceptSnapshot, ["conceptId", "version", "name", "kind", "currency", "defaultAmountMinor"]) || data.conceptSnapshot.kind !== data.kind || data.conceptSnapshot.currency !== "ARS" || normalizeConceptName(data.conceptSnapshot.name) !== data.conceptSnapshot.name) throw new Error(); requireId(data.conceptSnapshot.conceptId); requireVersion(data.conceptSnapshot.version); requireAmount(data.conceptSnapshot.defaultAmountMinor);
      if (!Array.isArray(data.membershipIds) || data.membershipIds.length < 1 || data.membershipIds.length > 50 || new Set(data.membershipIds).size !== data.membershipIds.length) throw new Error(); data.membershipIds.forEach(requireId);
      if (!Array.isArray(data.exceptions) || data.exceptions.length > 50) throw new Error(); for (const item of data.exceptions) { if (!exact(item, ["membershipId", "amountMinor", "reason"]) || !data.membershipIds.includes(item.membershipId) || normalizeExceptionReason(item.reason) !== item.reason) throw new Error(); requireId(item.membershipId); requireAmount(item.amountMinor); }
      if (monthly ? !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.periodKey) : requireId(data.occurrenceKey) !== data.occurrenceKey) throw new Error();
      return Object.freeze(data);
    } catch (cause) { throw new PaymentIncompatibleStateError({ cause }); }
  }
  function hydrateRow(data, membershipId) {
    try {
      const hasException = Object.hasOwn(data || {}, "exceptionReason"); const hasPayment = Object.hasOwn(data || {}, "paymentId"); const hasError = Object.hasOwn(data || {}, "errorCode"); const fields = ["membershipId", "appliedAmountMinor", ...(hasException ? ["exceptionReason"] : []), "payloadHash", "status", ...(hasPayment ? ["paymentId"] : []), ...(hasError ? ["errorCode"] : []), "createdAt", "updatedAt", "schemaVersion"];
      if (!exact(data, fields) || data.membershipId !== membershipId || data.schemaVersion !== 1 || !["PENDING", "UNCERTAIN", "CREATED", "EXISTING", "FAILED"].includes(data.status) || !/^[a-f0-9]{64}$/.test(data.payloadHash) || !iso(data.createdAt) || !iso(data.updatedAt)) throw new Error(); requireAmount(data.appliedAmountMinor);
      if (hasException && normalizeExceptionReason(data.exceptionReason) !== data.exceptionReason) throw new Error(); if (hasPayment) requireId(data.paymentId); if (hasError && (typeof data.errorCode !== "string" || !data.errorCode)) throw new Error();
      if (["CREATED", "EXISTING"].includes(data.status) && !hasPayment) throw new Error(); if (data.status === "FAILED" && !hasError) throw new Error(); if (["PENDING", "UNCERTAIN"].includes(data.status) && (hasPayment || hasError)) throw new Error();
      return Object.freeze(data);
    } catch (cause) { throw new PaymentIncompatibleStateError({ cause }); }
  }
  function persistedPayment(doc) {
    if (!doc.exists) return null; const data = doc.data();
    try {
      const hasPeriod = Object.hasOwn(data || {}, "periodKey"); const hasOccurrence = Object.hasOwn(data || {}, "occurrenceKey"); const hasException = Object.hasOwn(data || {}, "exceptionReason");
      const fields = ["groupId", "membershipId", "personId", "seasonId", "conceptId", "conceptSnapshot", "amountMinor", "dueDate", "estado", "generationIntentId", "payloadHash", "createdAt", "schemaVersion", hasPeriod ? "periodKey" : "occurrenceKey", ...(hasException ? ["exceptionReason"] : [])];
      if (hasPeriod === hasOccurrence || !exact(data, fields) || data.schemaVersion !== 1 || data.estado !== "PENDING" || !/^[a-f0-9]{64}$/.test(data.payloadHash) || !iso(data.createdAt)) throw new Error();
      for (const id of [data.groupId, data.membershipId, data.personId, data.seasonId, data.conceptId, data.generationIntentId]) requireId(id); requireAmount(data.amountMinor); requireDueDate(data.dueDate);
      if (!exact(data.conceptSnapshot, ["version", "name", "kind", "currency", "defaultAmountMinor"]) || data.conceptSnapshot.currency !== "ARS") throw new Error(); requireVersion(data.conceptSnapshot.version); requireKind(data.conceptSnapshot.kind); requireAmount(data.conceptSnapshot.defaultAmountMinor);
      if (normalizeConceptName(data.conceptSnapshot.name) !== data.conceptSnapshot.name) throw new Error();
      if (hasPeriod && (data.conceptSnapshot.kind !== "MONTHLY" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.periodKey))) throw new Error(); if (hasOccurrence && (data.conceptSnapshot.kind !== "ONE_TIME" || requireId(data.occurrenceKey) !== data.occurrenceKey)) throw new Error();
      if (hasException && normalizeExceptionReason(data.exceptionReason) !== data.exceptionReason) throw new Error();
      return Object.freeze({ paymentId: doc.id, ...data });
    } catch (cause) { if (cause instanceof PaymentIncompatibleStateError) throw cause; throw new PaymentIncompatibleStateError({ cause }); }
  }
  function economicShape(payment) { const { paymentId, createdAt, generationIntentId, payloadHash, schemaVersion, estado, ...shape } = payment; return shape; }
  function expectedPayment(intent, row, eligibility) { return { groupId: intent.groupId, membershipId: row.membershipId, personId: eligibility.personId, seasonId: eligibility.seasonId, conceptId: intent.conceptSnapshot.conceptId, conceptSnapshot: { version: intent.conceptSnapshot.version, name: intent.conceptSnapshot.name, kind: intent.conceptSnapshot.kind, currency: "ARS", defaultAmountMinor: intent.conceptSnapshot.defaultAmountMinor }, amountMinor: row.appliedAmountMinor, ...(row.exceptionReason ? { exceptionReason: row.exceptionReason } : {}), dueDate: intent.dueDate, ...(intent.kind === "MONTHLY" ? { periodKey: intent.periodKey } : { occurrenceKey: intent.occurrenceKey }) };
  }

  async function evaluateMembership(transaction, input) { return membershipCapability.evaluate(transaction, input); }

  function terminal(row) { return ["CREATED", "EXISTING", "FAILED"].includes(row?.status); }
  function publicRow(row, payment) { return Object.freeze({ membershipId: row.membershipId, outcome: terminal(row) ? row.status : "PENDING_RECOVERY", ...(row.errorCode ? { errorCode: row.errorCode } : {}), ...(payment ? { payment: paymentDto(payment, { owner: true }) } : {}) }); }
  async function claimIntent(userId, input) {
    const intentId = opaqueId("payment-generation", userId, input.groupId, input.generationIdempotencyKey); const expectedHash = hash(input); const intentRef = intents.doc(intentId);
    try { return await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(intentRef); const group = await ownedGroup(transaction, userId, input.groupId, { active: !existing.exists });
      if (existing.exists) { const data = hydrateIntent(existing.data()); if (data.actorUserId !== userId || data.groupId !== input.groupId || data.requestHash !== expectedHash) throw new PaymentIdempotencyConflictError(); return Object.freeze({ intentId, intent: data, group }); }
      const conceptSnapshot = await transaction.get(concepts.doc(input.conceptId)); const concept = conceptSnapshot.exists ? hydrateConcept(conceptSnapshot.id, conceptSnapshot.data()) : null; assertConcept(concept, input.groupId, { active: true, version: input.expectedConceptVersion, kind: input.kind });
      if (input.baseAmountMinor !== concept.defaultAmountMinor) throw new PaymentConceptVersionStaleError();
      if (input.kind === "ONE_TIME") { const occurrenceSnapshot = await transaction.get(occurrences.doc(input.occurrenceKey)); const occurrence = occurrenceSnapshot.exists ? hydrateOccurrence(occurrenceSnapshot.id, occurrenceSnapshot.data()) : null; if (!occurrence || occurrence.groupId !== input.groupId || occurrence.conceptId !== input.conceptId) throw new PaymentOccurrenceNotAvailableError(); }
      const timestamp = now(); const data = { actorUserId: userId, groupId: input.groupId, idempotencyKeyHash: hash(input.generationIdempotencyKey), requestHash: expectedHash, conceptSnapshot: { conceptId: concept.conceptId, version: concept.version, name: concept.name, kind: concept.kind, currency: "ARS", defaultAmountMinor: concept.defaultAmountMinor }, kind: input.kind, dueDate: input.dueDate, baseAmountMinor: input.baseAmountMinor, exceptions: input.exceptions, ...(input.kind === "MONTHLY" ? { periodKey: input.periodKey } : { occurrenceKey: input.occurrenceKey }), membershipIds: input.membershipIds, status: "PENDING", createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 };
      transaction.create(intentRef, data); for (const membershipId of input.membershipIds) { const row = rowPayload(data, membershipId); transaction.create(intentRef.collection("rows").doc(membershipId), { ...row, payloadHash: hash({ ...row, conceptSnapshot: data.conceptSnapshot, dueDate: data.dueDate, kind: data.kind, periodKey: data.periodKey, occurrenceKey: data.occurrenceKey }), status: "PENDING", createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 }); }
      return Object.freeze({ intentId, intent: data, group });
    }); } catch (error) { throw map(error); }
  }

  async function processRow(userId, intentId, intent, membershipId) {
    const intentRef = intents.doc(intentId); const rowRef = intentRef.collection("rows").doc(membershipId);
    try {
      if (typeof testHooks.beforeRowTransaction === "function") await testHooks.beforeRowTransaction({ userId, intentId, membershipId });
      const result = await db.runTransaction(async (transaction) => {
        await ownedGroup(transaction, userId, intent.groupId, { active: false }); const rowSnapshot = await transaction.get(rowRef); if (!rowSnapshot.exists) throw new PaymentIncompatibleStateError(); const row = hydrateRow(rowSnapshot.data(), membershipId);
        const paymentId = paymentIdFor(row, { ...intent, conceptId: intent.conceptSnapshot.conceptId }); const paymentRef = payments.doc(paymentId); const paymentSnapshot = await transaction.get(paymentRef); const existingPayment = persistedPayment(paymentSnapshot);
        if (terminal(row)) return publicRow(row, row.paymentId ? existingPayment : null);
        if (existingPayment && existingPayment.generationIntentId === intentId && existingPayment.payloadHash === row.payloadHash) { const timestamp = now(); transaction.update(rowRef, { status: "CREATED", paymentId, updatedAt: timestamp }); return publicRow({ ...row, status: "CREATED" }, existingPayment); }
        const groupSnapshot = await transaction.get(db.collection("groups").doc(intent.groupId)); let group; try { group = groupSnapshot.exists ? hydrateGroup(groupSnapshot.id, groupSnapshot.data()) : null; } catch (cause) { throw new PaymentIncompatibleStateError({ cause }); }
        if (!group || group.ownerId !== userId) throw new PaymentGroupNotAccessibleError();
        const fail = (errorCode, payment = null) => { const timestamp = now(); transaction.update(rowRef, { status: "FAILED", errorCode, ...(payment ? { paymentId: payment.paymentId } : {}), updatedAt: timestamp }); return publicRow({ ...row, status: "FAILED", errorCode }, payment); };
        if (group.estado !== "activo") return fail("GROUP_NOT_OPERATIONAL");
        const conceptSnapshot = await transaction.get(concepts.doc(intent.conceptSnapshot.conceptId)); const concept = conceptSnapshot.exists ? hydrateConcept(conceptSnapshot.id, conceptSnapshot.data()) : null;
        if (!concept || concept.groupId !== intent.groupId || concept.kind !== intent.kind) return fail("CHARGE_CONCEPT_NOT_AVAILABLE"); if (concept.estado !== "ACTIVE") return fail("CHARGE_CONCEPT_DEACTIVATED");
        let occurrence = null; if (intent.kind === "ONE_TIME") { const snapshot = await transaction.get(occurrences.doc(intent.occurrenceKey)); occurrence = snapshot.exists ? hydrateOccurrence(snapshot.id, snapshot.data()) : null; if (!occurrence || occurrence.groupId !== intent.groupId || occurrence.conceptId !== concept.conceptId) return fail("OCCURRENCE_NOT_AVAILABLE"); }
        const eligibility = await evaluateMembership(transaction, { membershipId, groupId: intent.groupId, kind: intent.kind, periodKey: intent.periodKey });
        if (eligibility.outcome !== "ELIGIBLE") return fail(eligibility.outcome === "SEASON_CLOSED" ? "OPEN_SEASON_REQUIRED" : eligibility.outcome === "NOT_OVERLAPPING" ? "MEMBERSHIP_VALIDITY_NOT_OVERLAPPING" : eligibility.outcome === "NOT_ACTIVE" ? "MEMBERSHIP_NOT_ELIGIBLE" : "MEMBERSHIP_VALIDITY_UNPROVABLE");
        const expected = expectedPayment(intent, row, eligibility);
        if (existingPayment) return stable(economicShape(existingPayment)) === stable(expected) ? (() => { const timestamp = now(); transaction.update(rowRef, { status: "EXISTING", paymentId, updatedAt: timestamp }); return publicRow({ ...row, status: "EXISTING" }, existingPayment); })() : fail("OBLIGATION_PAYLOAD_CONFLICT", existingPayment);
        const timestamp = now(); const created = { ...expected, estado: "PENDING", generationIntentId: intentId, payloadHash: row.payloadHash, createdAt: timestamp, schemaVersion: 1 }; transaction.create(paymentRef, created); transaction.update(rowRef, { status: "CREATED", paymentId, updatedAt: timestamp }); if (occurrence?.estado === "UNUSED") transaction.update(occurrences.doc(occurrence.occurrenceKey), { estado: "USED", firstUsedAt: timestamp }); return publicRow({ ...row, status: "CREATED" }, { paymentId, ...created });
      });
      if (typeof testHooks.afterRowCommit === "function") await testHooks.afterRowCommit({ userId, intentId, membershipId, result });
      return result;
    } catch (error) {
      const mapped = map(error); if (!(mapped instanceof PaymentDependencyUnavailableError)) throw mapped;
      try { await db.runTransaction(async (transaction) => { const snapshot = await transaction.get(rowRef); if (snapshot.exists && !terminal(snapshot.data())) transaction.update(rowRef, { status: "UNCERTAIN", updatedAt: now() }); }); } catch (_) { /* PENDING remains recoverable. */ }
      return Object.freeze({ membershipId, outcome: "PENDING_RECOVERY" });
    }
  }

  async function generate(userId, input) {
    const claimed = await claimIntent(userId, input); const rows = [];
    if (typeof testHooks.afterClaim === "function") await testHooks.afterClaim({ userId, intentId: claimed.intentId, intent: claimed.intent });
    for (const membershipId of claimed.intent.membershipIds) rows.push(await processRow(userId, claimed.intentId, claimed.intent, membershipId));
    const complete = rows.every((row) => row.outcome !== "PENDING_RECOVERY");
    if (complete) { try { await intents.doc(claimed.intentId).update({ status: "COMPLETE", updatedAt: now() }); } catch (_) { /* rows are authoritative */ } }
    return Object.freeze({ generationIntentId: claimed.intentId, complete, rows: Object.freeze(rows) });
  }

  async function listCandidates(userId, input) {
    try { return await db.runTransaction(async (transaction) => {
      await ownedGroup(transaction, userId, input.groupId); const seasonQuery = db.collection("seasons").where("groupId", "==", input.groupId).where("estado", "==", "abierta").limit(2); const seasonSnapshot = await transaction.get(seasonQuery); if (seasonSnapshot.size !== 1) throw new PaymentError("OPEN_SEASON_REQUIRED"); const season = hydrateSeason(seasonSnapshot.docs[0].id, seasonSnapshot.docs[0].data());
      const scope = { contract: "monthly-candidates", userId, groupId: input.groupId, seasonId: season.seasonId, periodKey: input.periodKey, pageSize: input.pageSize }; const anchor = readCursor(input.cursor, scope); const bounds = monthBounds(input.periodKey);
      let query = db.collection("memberships").where("groupId", "==", input.groupId).where("seasonId", "==", season.seasonId).where("estado", "in", ["activa", "finalizada"]).where("fechaIngreso", "<", Timestamp.fromDate(bounds.next)).orderBy("fechaIngreso", "asc").orderBy("__name__", "asc");
      if (anchor) { const doc = await transaction.get(db.collection("memberships").doc(anchor.id)); if (!doc.exists || doc.data()?.groupId !== input.groupId || doc.data()?.seasonId !== season.seasonId || iso(doc.data()?.fechaIngreso) !== anchor.joinedAt) throw new PaymentConcurrentModificationError(); query = query.startAfter(doc.data().fechaIngreso, anchor.id); }
      const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = [];
      for (const doc of docs) { const candidate = membershipCapability.candidateFromSnapshot(doc); if (candidate.outcome === "UNPROVABLE") { items.push({ membershipId: doc.id, membershipState: "FINALIZED", joinedAt: iso(doc.data()?.fechaIngreso), person: { status: "UNAVAILABLE" }, eligibility: "UNPROVABLE" }); continue; } const eligibility = await evaluateMembership(transaction, { membershipId: doc.id, groupId: input.groupId, kind: "MONTHLY", periodKey: input.periodKey }); const person = await personPresentation.get(transaction, candidate.personId); items.push({ membershipId: doc.id, membershipState: candidate.membershipState, joinedAt: candidate.joinedAt, ...(candidate.leftAt ? { leftAt: candidate.leftAt } : {}), person, eligibility: eligibility.outcome === "ELIGIBLE" ? "ELIGIBLE" : eligibility.outcome === "NOT_OVERLAPPING" ? "NOT_OVERLAPPING" : "UNPROVABLE" }); }
      const last = docs.at(-1); return Object.freeze({ items: Object.freeze(items), ...(snapshot.size > input.pageSize ? { nextCursor: cursor(scope, { joinedAt: iso(last.data().fechaIngreso), id: last.id }) } : {}) });
    }); } catch (error) { throw map(error); }
  }

  async function listPayments(userId, input, own) {
    try { return await db.runTransaction(async (transaction) => {
      let field; let value; let group = null;
      if (own) { const user = await account(transaction, userId, true); field = "personId"; value = user.personaId; }
      else { group = await ownedGroup(transaction, userId, input.groupId, { active: false }); field = "groupId"; value = input.groupId; }
      const scope = { contract: own ? "my-obligations" : "group-obligations", userId, ...(group ? { groupId: group.groupId } : { personId: value }), pageSize: input.pageSize }; const anchor = readCursor(input.cursor, scope);
      let query = payments.where(field, "==", value).orderBy("dueDate", "desc").orderBy("__name__", "desc");
      if (anchor) { const doc = await transaction.get(payments.doc(anchor.id)); if (!doc.exists || doc.data()?.[field] !== value || doc.data()?.dueDate !== anchor.dueDate) throw new PaymentConcurrentModificationError(); query = query.startAfter(anchor.dueDate, anchor.id); }
      const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = [];
      for (const doc of docs) { const payment = persistedPayment(doc); const person = own ? undefined : await personPresentation.get(transaction, payment.personId); items.push(paymentDto(payment, { owner: !own, person })); }
      const last = docs.at(-1); return Object.freeze({ items: Object.freeze(items), ...(snapshot.size > input.pageSize ? { nextCursor: cursor(scope, { dueDate: last.data().dueDate, id: last.id }) } : {}) });
    }); } catch (error) { throw map(error); }
  }

  return Object.freeze({
    createConcept: (userId, input) => mutateConcept(userId, input, "CREATE_CONCEPT"),
    renameConcept: (userId, input) => mutateConcept(userId, input, "RENAME_CONCEPT"),
    changeConceptAmount: (userId, input) => mutateConcept(userId, input, "CHANGE_CONCEPT_AMOUNT"),
    deactivateConcept: (userId, input) => mutateConcept(userId, input, "DEACTIVATE_CONCEPT"),
    listConcepts, listOccurrences, createOccurrence, listCandidates, generate,
    listGroupObligations: (userId, input) => listPayments(userId, input, false),
    listMyObligations: (userId, input) => listPayments(userId, input, true),
    evaluateMembership,
  });
}

module.exports = { createFirestorePaymentStore };
