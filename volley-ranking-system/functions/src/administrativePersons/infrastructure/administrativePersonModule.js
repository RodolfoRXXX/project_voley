"use strict";

const crypto = require("node:crypto");
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { db } = require("../../firebase");
const { buildAdministrativePerson } = require("../../persons/domain/person");
const { createFirestorePersonRepository } = require("../../persons/infrastructure/firestorePersonRepository");
const { buildMembership } = require("../../memberships/domain/membership");
const { createFirestoreMembershipRepository } = require("../../memberships/infrastructure/firestoreMembershipRepository");
const { activeMembershipGuardId, membershipLifecycleGuardId, sha256LengthPrefixed } = require("../../memberships/application/membershipHashing");
const { createFirestoreActiveRosterCounter } = require("../../memberships/infrastructure/firestoreActiveRosterCounter");
const { createFirestoreActiveRosterSearchProjection } = require("../../memberships/infrastructure/firestoreActiveRosterSearchProjection");
const { createGroupRosterContextCapability } = require("../../groups/public/groupRosterContextCapability");
const { createActiveGroupMemberPersonCapability } = require("../../persons/public/activeGroupMemberPersonCapability");
const { createGroupJoinRequestGroupCapability } = require("../../groups/public/groupJoinRequestGroupCapability");
const { createGroupJoinRequestSeasonCapability } = require("../../groups/public/groupJoinRequestSeasonCapability");
const { createDashboardTaskOutboxCapability } = require("../../dashboardTasks/public/dashboardTaskOutboxCapability");
const { createGroupJoinRequestMembershipCapability } = require("../../memberships/public/groupJoinRequestMembershipCapability");

const people = createFirestorePersonRepository({ db });
const memberships = createFirestoreMembershipRepository({ db });
const groupCapability = createGroupJoinRequestGroupCapability({ db });
const seasonCapability = createGroupJoinRequestSeasonCapability({ db });
const rosterGroup = createGroupRosterContextCapability({ db });
const rosterCounter = createFirestoreActiveRosterCounter({ db, membershipRepository: memberships, groupCapability: rosterGroup });
const rosterSearch = createFirestoreActiveRosterSearchProjection({ db, membershipRepository: memberships, groupCapability: rosterGroup, personCapability: createActiveGroupMemberPersonCapability({ db }) });
const dashboardTasks = createDashboardTaskOutboxCapability({ db });
const membershipActivation = createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability, enableActiveRosterCounter: true, enableActiveRosterSearchProjection: true });

class AdministrativePersonError extends Error { constructor(reason, message = reason) { super(message); this.name = "AdministrativePersonError"; this.reason = reason; } }
const receiptId = (actor, key) => sha256LengthPrefixed(["sportexa:IUX-11A:administrative-person-command:v1", actor, key]);
const requestHash = (...values) => sha256LengthPrefixed(["sportexa:IUX-11A:administrative-person-request:v1", ...values.map((value) => value ?? "<none>")]);
const presentation = (person) => Object.freeze({ status: "available", firstName: person.nombre, lastName: person.apellido });
const tokenSecret = process.env.IUX11A_CURSOR_SECRET || process.env.IUX10_CURSOR_SECRET || crypto.randomBytes(32).toString("base64url");
const sign = (body) => crypto.createHmac("sha256", tokenSecret).update(body).digest("base64url");
function encodeToken(value) { const body = Buffer.from(JSON.stringify(value)).toString("base64url"); return `${body}.${sign(body)}`; }
function decodeToken(token) { try { const [body, signature, extra] = token.split("."); const expected = sign(body); if (extra || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error(); return JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { throw new AdministrativePersonError("CURSOR_INVALID"); } }

function readCustody(snapshot, personId) {
  if (!snapshot.exists) return null;
  const value = snapshot.data();
  if (snapshot.id !== personId || value.personId !== personId || value.state !== "UNLINKED" || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new AdministrativePersonError("INCOMPATIBLE_STATE");
  return value;
}

async function ownerContext(transaction, actorUserId, groupId, historical) {
  const context = await groupCapability[historical ? "getOwnedHistoricalContext" : "getOwnedContext"]({ unitOfWork: transaction, groupId, userId: actorUserId });
  if (context?.status === "not_authorized") throw new AdministrativePersonError("NOT_AUTHORIZED");
  if (context?.status !== "owned") throw new AdministrativePersonError(historical ? "ORPHANED_CUSTODY" : "GROUP_NOT_ACTIVE");
}

async function create({ actorUserId, input }) {
  const commandRef = db.collection("administrativePersonCommandReceipts").doc(receiptId(actorUserId, input.idempotencyKey));
  const personId = people.newId(); const membershipId = memberships.newId();
  const hash = requestHash("CREATE", actorUserId, input.groupId, input.firstName, input.lastName, input.contactEmail);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(commandRef);
    if (existing.exists) {
      const data = existing.data();
      if (data.requestHash !== hash || data.actorUserId !== actorUserId) throw new AdministrativePersonError("IDEMPOTENCY_CONFLICT");
      return Object.freeze({ ...data.result, outcome: "RECOVERED" });
    }
    await ownerContext(transaction, actorUserId, input.groupId, false);
    const season = await seasonCapability.getOpenContextForOwnedGroup({ unitOfWork: transaction, groupId: input.groupId });
    if (season?.status === "absent") throw new AdministrativePersonError("OPEN_SEASON_REQUIRED");
    if (season?.status !== "open") throw new AdministrativePersonError("INCOMPATIBLE_STATE");
    const person = buildAdministrativePerson({ personId, firstName: input.firstName, lastName: input.lastName, contactEmail: input.contactEmail });
    const membership = buildMembership({ membershipId, personId, groupId: input.groupId, seasonId: season.seasonId });
    const activeRef = db.collection("activeMembershipGuards").doc(activeMembershipGuardId(input.groupId, personId));
    const lifecycleRef = db.collection("membershipLifecycleGuards").doc(membershipLifecycleGuardId(input.groupId, personId));
    const timestamp = Timestamp.now();
    const counterPlan = await rosterCounter.prepareActivation(transaction, membership, 1);
    const searchPlan = await rosterSearch.prepareActivation(transaction, membership, 1, presentation(person));
    const taskPlan = await dashboardTasks.prepare(transaction, { kind: "N31_AUDIENCE_CHANGED", idempotencyIdentity: `${commandRef.id}:membership-activation`, groupId: input.groupId, resourceType: "MEMBERSHIP", resourceIds: [membershipId], fingerprintParts: [membershipId, 1, "active"] });
    people.createAdministrative(transaction, person, timestamp);
    transaction.create(db.collection("administrativePersonCustodies").doc(personId), { personId, originGroupId: input.groupId, custodianGroupId: input.groupId, createdByAccountId: actorUserId, state: "UNLINKED", revision: 1, createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 });
    memberships.createInitial(transaction, membership, timestamp);
    transaction.create(activeRef, { membershipId, personId, groupId: input.groupId, seasonId: season.seasonId, activationOrdinal: 1, activatedAt: timestamp, activationIdempotencyHash: sha256LengthPrefixed(["sportexa:IUX-11A:activation", commandRef.id]), activationRequestHash: hash, guardVersion: 2 });
    transaction.create(lifecycleRef, { membershipId, personId, groupId: input.groupId, seasonId: season.seasonId, rootState: "active", lastActivationOrdinal: 1, lifecycleGuardVersion: 3 });
    counterPlan.commit(); searchPlan.commit(); taskPlan.commit();
    const result = { personId, membershipId, groupId: input.groupId, seasonId: season.seasonId, revision: 1 };
    transaction.create(commandRef, { action: "CREATE", actorUserId, groupId: input.groupId, personId, requestHash: hash, result, createdAt: timestamp, schemaVersion: 1 });
    return Object.freeze({ ...result, outcome: "CREATED" });
  });
}

async function update({ actorUserId, input }) {
  const commandRef = db.collection("administrativePersonCommandReceipts").doc(receiptId(actorUserId, input.idempotencyKey));
  const hash = requestHash("UPDATE", actorUserId, input.groupId, input.personId, input.firstName, input.lastName, input.contactEmail, input.expectedRevision);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(commandRef);
    if (existing.exists) {
      const data = existing.data(); if (data.requestHash !== hash || data.actorUserId !== actorUserId) throw new AdministrativePersonError("IDEMPOTENCY_CONFLICT");
      return Object.freeze({ ...data.result, outcome: "RECOVERED" });
    }
    const custodyRef = db.collection("administrativePersonCustodies").doc(input.personId);
    const custody = readCustody(await transaction.get(custodyRef), input.personId);
    if (!custody || custody.custodianGroupId !== input.groupId) throw new AdministrativePersonError("NOT_FOUND");
    await ownerContext(transaction, actorUserId, input.groupId, true);
    if (custody.revision !== input.expectedRevision) throw new AdministrativePersonError("STALE_REVISION");
    const previous = await people.getById(input.personId, transaction);
    if (!previous || previous.schemaVersion !== 2) throw new AdministrativePersonError("INCOMPATIBLE_STATE");
    const person = buildAdministrativePerson({ personId: input.personId, firstName: input.firstName, lastName: input.lastName, contactEmail: input.contactEmail });
    const active = await transaction.get(memberships.activePairQuery({ personId: input.personId, groupId: input.groupId }));
    if (active.size > 1) throw new AdministrativePersonError("INCOMPATIBLE_STATE");
    let searchPlan = null;
    if (!active.empty) { const membership = memberships.fromSnapshot(active.docs[0]); searchPlan = await rosterSearch.prepareActivation(transaction, membership, membership.periodCount || 1, presentation(person)); }
    const timestamp = Timestamp.now(); const revision = custody.revision + 1;
    people.updateAdministrative(transaction, person);
    transaction.update(custodyRef, { revision, updatedAt: timestamp });
    searchPlan?.commit();
    const result = { personId: input.personId, groupId: input.groupId, revision };
    transaction.create(commandRef, { action: "UPDATE", actorUserId, groupId: input.groupId, personId: input.personId, requestHash: hash, before: { firstName: previous.nombre, lastName: previous.apellido, contactEmail: previous.emailContacto }, after: { firstName: person.nombre, lastName: person.apellido, contactEmail: person.emailContacto }, result, createdAt: timestamp, schemaVersion: 1 });
    return Object.freeze({ ...result, outcome: "UPDATED" });
  });
}

async function list({ actorUserId, input }) {
  return db.runTransaction(async (transaction) => {
    await ownerContext(transaction, actorUserId, input.groupId, true);
    const anchor = input.cursor ? decodeToken(input.cursor) : null;
    if (anchor && (anchor.actorUserId !== actorUserId || anchor.groupId !== input.groupId || anchor.expiresAt < Date.now() || typeof anchor.personId !== "string")) throw new AdministrativePersonError("CURSOR_INVALID");
    const rows = []; let scanAnchor = anchor?.personId || null; let exhausted = false; let scans = 0;
    const openGuard = await transaction.get(db.collection("openSeasonGuards").doc(input.groupId));
    const openSeasonId = openGuard.exists && typeof openGuard.data().seasonId === "string" ? openGuard.data().seasonId : null;
    while (rows.length <= input.pageSize && !exhausted && scans < 5) {
      let query = db.collection("administrativePersonCustodies").where("custodianGroupId", "==", input.groupId).orderBy(FieldPath.documentId()).limit(input.pageSize + 1);
      if (scanAnchor) query = query.startAfter(scanAnchor);
      const snapshot = await transaction.get(query); scans += 1; exhausted = snapshot.size < input.pageSize + 1;
      for (const document of snapshot.docs) {
        scanAnchor = document.id;
        const custody = readCustody(document, document.id);
        const person = await people.getById(custody.personId, transaction);
        if (!person || person.schemaVersion !== 2) throw new AdministrativePersonError("INCOMPATIBLE_STATE");
        const membership = await membershipActivation.prepareForGroupJoinRequest({ unitOfWork: transaction, personId: person.personId, groupId: input.groupId });
        if (membership.status === "active") continue;
        const reincorporation = membership.status === "absent" ? "CREATE" : membership.seasonId === openSeasonId ? "REACTIVATE" : "RENEW";
        rows.push({ sourceId: document.id, item: Object.freeze({ personId: person.personId, firstName: person.nombre, lastName: person.apellido, contactEmail: person.emailContacto, revision: custody.revision, reincorporation }) });
        if (rows.length > input.pageSize) break;
      }
    }
    const delivered = rows.slice(0, input.pageSize); const lastDelivered = delivered.at(-1);
    const continuationAnchor = rows.length > input.pageSize ? lastDelivered?.sourceId : !exhausted && scans >= 5 ? scanAnchor : null;
    return Object.freeze({ items: Object.freeze(delivered.map((row) => row.item)), ...(continuationAnchor ? { nextCursor: encodeToken({ actorUserId, groupId: input.groupId, personId: continuationAnchor, expiresAt: Date.now() + 600000 }) } : {}) });
  });
}

async function prepareReincorporation({ actorUserId, input }) {
  return db.runTransaction(async (transaction) => {
    await ownerContext(transaction, actorUserId, input.groupId, false);
    const custody = readCustody(await transaction.get(db.collection("administrativePersonCustodies").doc(input.personId)), input.personId);
    if (!custody || custody.custodianGroupId !== input.groupId) throw new AdministrativePersonError("NOT_FOUND");
    const season = await seasonCapability.getOpenContextForOwnedGroup({ unitOfWork: transaction, groupId: input.groupId });
    if (season?.status === "absent") throw new AdministrativePersonError("OPEN_SEASON_REQUIRED");
    if (season?.status !== "open") throw new AdministrativePersonError("INCOMPATIBLE_STATE");
    const membership = await membershipActivation.prepareForGroupJoinRequest({ unitOfWork: transaction, personId: input.personId, groupId: input.groupId });
    if (membership.status === "active") throw new AdministrativePersonError("ALREADY_ACTIVE");
    const strategy = membership.status === "absent" ? "CREATE" : membership.seasonId === season.seasonId ? "REACTIVATE" : "RENEW";
    const membershipId = strategy === "RENEW" ? membership.renewalMembershipId : membership.membershipId;
    const plan = { actorUserId, groupId: input.groupId, personId: input.personId, custodyRevision: custody.revision, seasonId: season.seasonId, strategy, membershipId, expectedActivationOrdinal: strategy === "RENEW" ? 1 : membership.nextActivationOrdinal, ...(strategy === "RENEW" ? { previousMembershipId: membership.membershipId } : {}), expiresAt: Date.now() + 600000 };
    return Object.freeze({
      strategy,
      destinationSeason: Object.freeze({ seasonId: season.seasonId, name: season.seasonName }),
      previewToken: encodeToken(plan),
    });
  });
}

async function confirmReincorporation({ actorUserId, input }) {
  const plan = decodeToken(input.previewToken);
  if (plan.expiresAt < Date.now() || plan.actorUserId !== actorUserId || plan.groupId !== input.groupId || plan.personId !== input.personId || !["CREATE", "REACTIVATE", "RENEW"].includes(plan.strategy)) throw new AdministrativePersonError("CONTEXT_CHANGED");
  await db.runTransaction(async (transaction) => {
    await ownerContext(transaction, actorUserId, input.groupId, false);
    const custody = readCustody(await transaction.get(db.collection("administrativePersonCustodies").doc(input.personId)), input.personId);
    if (!custody || custody.custodianGroupId !== input.groupId || custody.revision !== plan.custodyRevision) throw new AdministrativePersonError("CONTEXT_CHANGED");
    const season = await seasonCapability.getOpenContextForOwnedGroup({ unitOfWork: transaction, groupId: input.groupId });
    if (season?.status !== "open" || season.seasonId !== plan.seasonId) throw new AdministrativePersonError("CONTEXT_CHANGED");
  });
  const idempotencyKeyHash = sha256LengthPrefixed(["sportexa:IUX-11A.1:reincorporation-key:v1", actorUserId, input.idempotencyKey]);
  try {
    const activation = await membershipActivation.createOrRecoverForGroupJoinRequest({ requestId: idempotencyKeyHash, decisionIntentId: idempotencyKeyHash, authorizedBy: actorUserId, personId: input.personId, groupId: input.groupId, seasonId: plan.seasonId, membershipId: plan.membershipId, expectedActivationOrdinal: plan.expectedActivationOrdinal, idempotencyKeyHash, requestHash: sha256LengthPrefixed(["sportexa:IUX-11A.1:reincorporation-request:v1", actorUserId, input.groupId, input.personId, input.previewToken]), approvalEffect: `${plan.strategy}_MEMBERSHIP`, ...(plan.previousMembershipId ? { previousMembershipId: plan.previousMembershipId } : {}) });
    return Object.freeze({ outcome: activation.outcome, strategy: plan.strategy, membershipId: activation.membershipId });
  } catch (error) {
    if (error?.reason === "MEMBERSHIP_ALREADY_EXISTS") throw new AdministrativePersonError("ALREADY_ACTIVE");
    if (["NOT_AUTHORIZED", "OPEN_SEASON_REQUIRED"].includes(error?.reason)) throw new AdministrativePersonError(error.reason);
    if (["INCOMPATIBLE_STATE", "SEASON_INCOMPATIBLE", "MEMBERSHIP_SEASON_NOT_REACTIVATABLE", "MEMBERSHIP_PREDECESSOR_INCOMPATIBLE"].includes(error?.reason)) throw new AdministrativePersonError("CONTEXT_CHANGED");
    throw error;
  }
}

module.exports = { AdministrativePersonError, confirmReincorporation, create, list, prepareReincorporation, update };
