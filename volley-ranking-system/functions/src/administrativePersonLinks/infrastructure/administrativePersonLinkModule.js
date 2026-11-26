"use strict";

const crypto = require("node:crypto");
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { admin, db } = require("../../firebase");
const { sha256LengthPrefixed } = require("../../memberships/application/membershipHashing");
const {
  emailLookup,
  isEmulator,
  linkingEnabled,
  normalizeEmail,
} = require("./administrativePersonLinkCandidateProjection");

class AdministrativePersonLinkError extends Error {
  constructor(reason, message = reason) { super(message); this.name = "AdministrativePersonLinkError"; this.reason = reason; }
}

const refs = {
  candidates: db.collection("administrativePersonLinkCandidates"),
  credentials: db.collection("accountVerifiedEmailCredentials"),
  decisions: db.collection("administrativePersonLinkDecisions"),
  receipts: db.collection("administrativePersonLinkReceipts"),
  assignments: db.collection("personAccountAssignments"),
  rates: db.collection("administrativePersonLinkRateLimits"),
  users: db.collection("users"),
  people: db.collection("personas"),
  custodies: db.collection("administrativePersonCustodies"),
  groups: db.collection("groups"),
  seasons: db.collection("seasons"),
  memberships: db.collection("memberships"),
  discoverability: db.collection("personDiscoverability"),
  directory: db.collection("discoverablePersonDirectory"),
};

function requireEnabled() { if (!linkingEnabled()) throw new AdministrativePersonLinkError("FEATURE_DISABLED"); }
function cursorSecret() {
  if (process.env.IUX11B_CURSOR_SECRET) return process.env.IUX11B_CURSOR_SECRET;
  if (isEmulator()) return "iux11b-local-cursor-secret-not-for-production";
  throw new AdministrativePersonLinkError("DEPENDENCY_UNAVAILABLE");
}
function sign(body) { return crypto.createHmac("sha256", cursorSecret()).update(body).digest("base64url"); }
function encode(value) { const body = Buffer.from(JSON.stringify(value)).toString("base64url"); return `${body}.${sign(body)}`; }
function decode(value, kind, actorUserId) {
  try {
    const [body, signature, extra] = value.split("."); const expected = sign(body);
    if (extra || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error();
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (parsed.kind !== kind || parsed.actorUserId !== actorUserId || parsed.expiresAt < Date.now()) throw new Error();
    return parsed;
  } catch { throw new AdministrativePersonLinkError("CURSOR_INVALID"); }
}
const hash = (...parts) => sha256LengthPrefixed(["sportexa:IUX-11B:v1", ...parts]);
const decisionId = (accountId, personId) => hash("decision", accountId, personId);
const receiptId = (accountId, idempotencyKey) => hash("receipt", accountId, idempotencyKey);
const maskEmail = (email) => { const [local, domain] = email.split("@"); return `${local.slice(0, 1)}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`; };

async function verifiedEmail(actorUserId) {
  let record;
  try { record = await admin.auth().getUser(actorUserId); }
  catch { throw new AdministrativePersonLinkError("DEPENDENCY_UNAVAILABLE"); }
  if (!record.email || record.emailVerified !== true) throw new AdministrativePersonLinkError("EMAIL_NOT_VERIFIED");
  const email = normalizeEmail(record.email);
  return Object.freeze({ email, lookup: emailLookup(email), fingerprint: hash("verified-email", email) });
}

function credentialPlan(snapshot, actorUserId, accreditation, now) {
  const previous = snapshot.exists ? snapshot.data() : null;
  const emailRevision = previous?.fingerprint === accreditation.fingerprint && Number.isSafeInteger(previous.emailRevision)
    ? previous.emailRevision : (Number.isSafeInteger(previous?.emailRevision) ? previous.emailRevision + 1 : 1);
  return {
    emailRevision,
    commit(transaction) {
      transaction.set(snapshot.ref, { accountId: actorUserId, fingerprint: accreditation.fingerprint, emailRevision, observedAt: now, firstObservedVerifiedAt: previous?.firstObservedVerifiedAt || now, keyVersion: 1, schemaVersion: 1 });
    },
  };
}

async function readRate(transaction, actorUserId, family, limit, windowMs, nowMs) {
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  const reference = refs.rates.doc(hash("rate", actorUserId, family, String(windowStart)));
  const snapshot = await transaction.get(reference);
  const count = snapshot.exists && Number.isSafeInteger(snapshot.data().count) ? snapshot.data().count : 0;
  if (count >= limit) throw new AdministrativePersonLinkError("RATE_LIMITED");
  return () => transaction.set(reference, { accountId: actorUserId, family, windowStart, windowMs, count: count + 1, updatedAt: Timestamp.now(), schemaVersion: 1 });
}

async function list({ actorUserId, input }) {
  requireEnabled(); const accreditation = await verifiedEmail(actorUserId); const nowMs = Date.now(); const now = Timestamp.now();
  const cursor = input.cursor ? decode(input.cursor, "LIST", actorUserId) : null;
  return db.runTransaction(async (transaction) => {
    const credentialSnapshot = await transaction.get(refs.credentials.doc(actorUserId));
    const credential = credentialPlan(credentialSnapshot, actorUserId, accreditation, now);
    if (cursor && (cursor.emailRevision !== credential.emailRevision || cursor.bucket !== input.bucket)) throw new AdministrativePersonLinkError("CURSOR_INVALID");
    const rateMinute = await readRate(transaction, actorUserId, "LIST_MINUTE", 30, 60000, nowMs);
    const rateBurst = await readRate(transaction, actorUserId, "LIST_BURST", 10, 10000, nowMs);
    let query = refs.candidates.where("emailLookup", "==", accreditation.lookup).orderBy(FieldPath.documentId()).limit(input.pageSize + 1);
    if (cursor?.personId) query = query.startAfter(cursor.personId);
    const snapshot = await transaction.get(query);
    const inspected = snapshot.docs.slice(0, input.pageSize);
    const decisions = await Promise.all(inspected.map((document) => transaction.get(refs.decisions.doc(decisionId(actorUserId, document.id)))));
    const items = [];
    inspected.forEach((document, index) => {
      const candidate = document.data(); const decision = decisions[index].exists ? decisions[index].data() : null;
      const matches = input.bucket === "REJECTED" ? decision?.decision === "REJECTED"
        : input.bucket === "PENDING_MERGE" ? decision?.decision === "RECOGNIZED_PENDING_MERGE"
          : !decision || !["REJECTED", "RECOGNIZED_PENDING_MERGE", "ADOPTED"].includes(decision.decision);
      if (!matches) return;
      items.push(Object.freeze({ candidateRef: encode({ kind: "CANDIDATE", actorUserId, personId: document.id, candidateEmailRevision: candidate.emailRevision, accountEmailRevision: credential.emailRevision, expiresAt: Date.now() + 600000 }), firstName: candidate.firstName, lastName: candidate.lastName, maskedEmail: maskEmail(accreditation.email), originGroupId: candidate.originGroupId, emailRevision: candidate.emailRevision, decisionRevision: decision?.decisionRevision || 0 }));
    });
    credential.commit(transaction); rateMinute(); rateBurst();
    const last = inspected.at(-1); const hasMore = snapshot.size > input.pageSize;
    return Object.freeze({ items: Object.freeze(items), ...(hasMore && last ? { nextCursor: encode({ kind: "LIST", actorUserId, personId: last.id, bucket: input.bucket, emailRevision: credential.emailRevision, expiresAt: Date.now() + 600000 }) } : {}), measurement: Object.freeze({ authReads: 1, firestoreReads: 3 + snapshot.size + decisions.length, firestoreReadBudget: 24, inspectedCandidates: inspected.length, decisionReads: decisions.length }) });
  });
}

async function readCurrentCandidate(transaction, actorUserId, candidateRef, accreditation, credential) {
  const reference = decode(candidateRef, "CANDIDATE", actorUserId);
  if (reference.accountEmailRevision !== credential.emailRevision) throw new AdministrativePersonLinkError("CANDIDATE_STALE");
  const candidateSnapshot = await transaction.get(refs.candidates.doc(reference.personId));
  if (!candidateSnapshot.exists) throw new AdministrativePersonLinkError("CANDIDATE_STALE");
  const candidate = candidateSnapshot.data();
  if (candidate.emailLookup !== accreditation.lookup || candidate.emailRevision !== reference.candidateEmailRevision) throw new AdministrativePersonLinkError("CANDIDATE_STALE");
  return { candidate, candidateSnapshot, reference };
}

async function detail({ actorUserId, input }) {
  requireEnabled(); const accreditation = await verifiedEmail(actorUserId); const nowMs = Date.now(); const now = Timestamp.now();
  return db.runTransaction(async (transaction) => {
    const credentialSnapshot = await transaction.get(refs.credentials.doc(actorUserId)); const credential = credentialPlan(credentialSnapshot, actorUserId, accreditation, now);
    const rate = await readRate(transaction, actorUserId, "DETAIL_MINUTE", 12, 60000, nowMs);
    const current = await readCurrentCandidate(transaction, actorUserId, input.candidateRef, accreditation, credential);
    const [person, custody, decision, group, membershipQuery] = await Promise.all([
      transaction.get(refs.people.doc(current.reference.personId)), transaction.get(refs.custodies.doc(current.reference.personId)), transaction.get(refs.decisions.doc(decisionId(actorUserId, current.reference.personId))), transaction.get(refs.groups.doc(current.candidate.originGroupId)), transaction.get(refs.memberships.where("personId", "==", current.reference.personId).orderBy("fechaIngreso", "desc").limit(1)),
    ]);
    if (!person.exists || !custody.exists || custody.data().state !== "UNLINKED") throw new AdministrativePersonLinkError("CANDIDATE_STALE");
    const membership = membershipQuery.docs[0]; let season = null;
    if (membership?.data()?.seasonId) season = await transaction.get(refs.seasons.doc(membership.data().seasonId));
    credential.commit(transaction); rate();
    const decisionValue = decision.exists ? decision.data() : null;
    return Object.freeze({ candidate: Object.freeze({ candidateRef: input.candidateRef, firstName: person.data().nombre, lastName: person.data().apellido, maskedEmail: maskEmail(accreditation.email), originGroup: Object.freeze({ groupId: group.id, name: group.exists ? (group.data().nombre || "Grupo") : "Grupo no disponible", archived: group.exists && group.data().estado === "archivado" }), participation: membership ? Object.freeze({ membershipId: membership.id, status: membership.data().estado, seasonId: membership.data().seasonId, seasonName: season?.exists ? season.data().nombre : null, seasonStatus: season?.exists ? season.data().estado : null }) : null, emailRevision: current.candidate.emailRevision, decision: decisionValue?.decision || null, decisionRevision: decisionValue?.decisionRevision || 0 }), previewToken: encode({ kind: "PREVIEW", actorUserId, personId: current.reference.personId, candidateEmailRevision: current.candidate.emailRevision, accountEmailRevision: credential.emailRevision, expiresAt: Date.now() + 600000 }), measurement: Object.freeze({ authReads: 1, firestoreReads: season ? 9 : 8, firestoreReadBudget: 9 }) });
  });
}

function commandOperationRef(actorUserId, receipt) { return encode({ kind: "RESULT", actorUserId, receiptId: receipt.id, expiresAt: Date.now() + 86400000 }); }
function commandResult(result, operationRef, recovered = false, firestoreReads = null) { return Object.freeze({ ...result, operationRef, outcome: recovered ? "RECOVERED" : result.outcome, measurement: Object.freeze({ authReads: 1, firestoreReads: recovered ? 1 : firestoreReads, firestoreReadBudget: 12 }) }); }

async function reject({ actorUserId, input }) {
  requireEnabled(); const accreditation = await verifiedEmail(actorUserId); const now = Timestamp.now(); const nowMs = Date.now();
  const receipt = refs.receipts.doc(receiptId(actorUserId, input.idempotencyKey)); const request = hash("REJECT", actorUserId, input.candidateRef, String(input.expectedEmailRevision));
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(receipt); if (existing.exists) { if (existing.data().requestHash !== request) throw new AdministrativePersonLinkError("IDEMPOTENCY_CONFLICT"); return commandResult(existing.data().result, commandOperationRef(actorUserId, receipt), true); }
    const credentialSnapshot = await transaction.get(refs.credentials.doc(actorUserId)); const credential = credentialPlan(credentialSnapshot, actorUserId, accreditation, now);
    const rate = await readRate(transaction, actorUserId, "DECISION_MINUTE", 12, 60000, nowMs);
    const current = await readCurrentCandidate(transaction, actorUserId, input.candidateRef, accreditation, credential);
    if (current.candidate.emailRevision !== input.expectedEmailRevision) throw new AdministrativePersonLinkError("CANDIDATE_STALE");
    const decisionRef = refs.decisions.doc(decisionId(actorUserId, current.reference.personId)); const previous = await transaction.get(decisionRef);
    const decisionRevision = (Number.isSafeInteger(previous.data()?.decisionRevision) ? previous.data().decisionRevision : 0) + 1;
    const result = { outcome: "REJECTED", personId: current.reference.personId, decisionRevision };
    transaction.set(decisionRef, { accountId: actorUserId, personId: current.reference.personId, decision: "REJECTED", decisionRevision, decidedAt: now, schemaVersion: 1 });
    transaction.create(receipt, { actorUserId, action: "REJECT", requestHash: request, result, createdAt: now, schemaVersion: 1 }); credential.commit(transaction); rate();
    return commandResult(result, commandOperationRef(actorUserId, receipt), false, 5);
  });
}

async function reconsider({ actorUserId, input }) {
  requireEnabled(); const accreditation = await verifiedEmail(actorUserId); const now = Timestamp.now(); const nowMs = Date.now();
  const receipt = refs.receipts.doc(receiptId(actorUserId, input.idempotencyKey)); const request = hash("RECONSIDER", actorUserId, input.candidateRef, String(input.expectedDecisionRevision));
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(receipt); if (existing.exists) { if (existing.data().requestHash !== request) throw new AdministrativePersonLinkError("IDEMPOTENCY_CONFLICT"); return commandResult(existing.data().result, commandOperationRef(actorUserId, receipt), true); }
    const credentialSnapshot = await transaction.get(refs.credentials.doc(actorUserId)); const credential = credentialPlan(credentialSnapshot, actorUserId, accreditation, now);
    const rate = await readRate(transaction, actorUserId, "DECISION_MINUTE", 12, 60000, nowMs);
    const current = await readCurrentCandidate(transaction, actorUserId, input.candidateRef, accreditation, credential);
    const decisionRef = refs.decisions.doc(decisionId(actorUserId, current.reference.personId)); const decision = await transaction.get(decisionRef);
    if (!decision.exists || decision.data().decision !== "REJECTED") throw new AdministrativePersonLinkError("NOT_REJECTED");
    if (decision.data().decisionRevision !== input.expectedDecisionRevision) throw new AdministrativePersonLinkError("CONFLICT");
    const result = { outcome: "RECONSIDERED", personId: current.reference.personId, decisionRevision: input.expectedDecisionRevision + 1 };
    transaction.delete(decisionRef); transaction.create(receipt, { actorUserId, action: "RECONSIDER", requestHash: request, result, createdAt: now, schemaVersion: 1 }); credential.commit(transaction); rate();
    return commandResult(result, commandOperationRef(actorUserId, receipt), false, 5);
  });
}

async function recognize({ actorUserId, input }) {
  requireEnabled(); const accreditation = await verifiedEmail(actorUserId); const now = Timestamp.now(); const nowMs = Date.now();
  const preview = decode(input.previewToken, "PREVIEW", actorUserId); const receipt = refs.receipts.doc(receiptId(actorUserId, input.idempotencyKey));
  const request = hash("RECOGNIZE", actorUserId, input.candidateRef, input.previewToken, String(input.expectedEmailRevision));
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(receipt); if (existing.exists) { if (existing.data().requestHash !== request) throw new AdministrativePersonLinkError("IDEMPOTENCY_CONFLICT"); return commandResult(existing.data().result, commandOperationRef(actorUserId, receipt), true); }
    const credentialSnapshot = await transaction.get(refs.credentials.doc(actorUserId)); const credential = credentialPlan(credentialSnapshot, actorUserId, accreditation, now);
    const decisionRate = await readRate(transaction, actorUserId, "DECISION_MINUTE", 12, 60000, nowMs);
    const current = await readCurrentCandidate(transaction, actorUserId, input.candidateRef, accreditation, credential);
    if (preview.personId !== current.reference.personId || preview.candidateEmailRevision !== current.candidate.emailRevision || preview.accountEmailRevision !== credential.emailRevision || current.candidate.emailRevision !== input.expectedEmailRevision) throw new AdministrativePersonLinkError("CANDIDATE_STALE");
    const userRef = refs.users.doc(actorUserId); const assignmentRef = refs.assignments.doc(current.reference.personId); const custodyRef = refs.custodies.doc(current.reference.personId); const personRef = refs.people.doc(current.reference.personId); const decisionRef = refs.decisions.doc(decisionId(actorUserId, current.reference.personId)); const preferenceRef = refs.discoverability.doc(current.reference.personId);
    const [user, assignment, custody, person, previousDecision, preference] = await Promise.all([transaction.get(userRef), transaction.get(assignmentRef), transaction.get(custodyRef), transaction.get(personRef), transaction.get(decisionRef), transaction.get(preferenceRef)]);
    if (!user.exists || !person.exists || !custody.exists || custody.data().state !== "UNLINKED" || custody.data().emailRevision !== current.candidate.emailRevision) throw new AdministrativePersonLinkError("CANDIDATE_STALE");
    if (assignment.exists && assignment.data().accountId !== actorUserId) throw new AdministrativePersonLinkError("ALREADY_CLAIMED");
    const decisionRevision = (Number.isSafeInteger(previousDecision.data()?.decisionRevision) ? previousDecision.data().decisionRevision : 0) + 1;
    let result;
    if (typeof user.data().personaId === "string" && user.data().personaId) {
      result = { outcome: "RECOGNIZED_PENDING_MERGE", personId: current.reference.personId, currentPersonId: user.data().personaId, decisionRevision };
      transaction.set(decisionRef, { accountId: actorUserId, personId: current.reference.personId, decision: "RECOGNIZED_PENDING_MERGE", observedEmailRevision: current.candidate.emailRevision, observedAccountEmailRevision: credential.emailRevision, decisionRevision, decidedAt: now, schemaVersion: 1 });
    } else {
      const adoptionRate = await readRate(transaction, actorUserId, "ADOPTION_MINUTE", 6, 60000, nowMs);
      let directoryRef = null;
      if (preference.exists && typeof preference.data().candidateRef === "string" && preference.data().candidateRef) { directoryRef = refs.directory.doc(preference.data().candidateRef); await transaction.get(directoryRef); }
      result = { outcome: "ADOPTED", personId: current.reference.personId, decisionRevision };
      transaction.update(userRef, { personaId: current.reference.personId });
      transaction.create(assignmentRef, { accountId: actorUserId, personId: current.reference.personId, kind: "SIMPLE_PRIMARY", assignedAt: now, schemaVersion: 1 });
      transaction.update(custodyRef, { state: "LINKED", linkedAccountId: actorUserId, linkedAt: now, revision: custody.data().revision + 1, updatedAt: now, schemaVersion: 2 });
      transaction.delete(current.candidateSnapshot.ref);
      transaction.set(decisionRef, { accountId: actorUserId, personId: current.reference.personId, decision: "ADOPTED", observedEmailRevision: current.candidate.emailRevision, observedAccountEmailRevision: credential.emailRevision, decisionRevision, decidedAt: now, schemaVersion: 1 });
      if (preference.exists) transaction.delete(preferenceRef); if (directoryRef) transaction.delete(directoryRef); adoptionRate();
    }
    transaction.create(receipt, { actorUserId, action: "RECOGNIZE", requestHash: request, result, createdAt: now, schemaVersion: 1 }); credential.commit(transaction); decisionRate();
    return commandResult(result, commandOperationRef(actorUserId, receipt), false, result.outcome === "ADOPTED" ? (preference.exists && preference.data().candidateRef ? 12 : 11) : 10);
  });
}

async function result({ actorUserId, input }) {
  requireEnabled(); const reference = decode(input.operationRef, "RESULT", actorUserId); const snapshot = await refs.receipts.doc(reference.receiptId).get();
  if (!snapshot.exists || snapshot.data().actorUserId !== actorUserId) throw new AdministrativePersonLinkError("NOT_FOUND");
  return commandResult(snapshot.data().result, input.operationRef, true);
}

module.exports = { AdministrativePersonLinkError, detail, list, recognize, reconsider, reject, result };
