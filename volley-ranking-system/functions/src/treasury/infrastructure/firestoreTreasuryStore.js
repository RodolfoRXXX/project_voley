"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { createGroupOwnershipContextCapability } = require("../../groups/public/groupOwnershipContextCapability");
const { createTreasuryMembershipAuthorizationCapability } = require("../../memberships/public/treasuryMembershipAuthorizationCapability");
const { createPaymentPersonPresentationCapability } = require("../../persons/public/paymentPersonPresentationCapability");
const { createTreasuryAccountIdentityCapability } = require("../../users/public/treasuryAccountIdentityCapability");
const { createGroupTreasuryAuthorizationCapability } = require("../public/groupTreasuryAuthorizationCapability");
const { CAPABILITY_ID, exact, hash, hydrateGrant, hydrateSlot, receiptId, slotId, validTimestamp } = require("../domain/treasury");
const {
  TreasuryAccountContextError, TreasuryDataIncompatibleError, TreasuryError, TreasuryGrantAlreadyActiveError,
  TreasuryGrantNotAccessibleError, TreasuryGroupNotAccessibleError, TreasuryGroupNotOperationalError,
  TreasuryIdempotencyConflictError, TreasuryMembershipNotEligibleError, TreasuryNotAuthorizedError,
  TreasuryOpenSeasonError, TreasuryTargetAccountLinkError,
} = require("../application/treasuryErrors");

function createFirestoreTreasuryStore({ db, now = () => Timestamp.now(), testHooks = Object.freeze({}) }) {
  if (!db || typeof now !== "function") throw new TypeError("Treasury store dependencies are required");
  const grants = db.collection("groupCapabilityGrants"); const slots = db.collection("groupCapabilityGrantSlots");
  const receipts = db.collection("groupCapabilityCommandReceipts");
  const ownership = createGroupOwnershipContextCapability({ db });
  const membership = createTreasuryMembershipAuthorizationCapability({ db });
  const identity = createTreasuryAccountIdentityCapability({ db });
  const authorization = createGroupTreasuryAuthorizationCapability({ db });
  const presentation = createPaymentPersonPresentationCapability({ db });

  function map(error) { return error instanceof TreasuryError ? error : new TreasuryDataIncompatibleError({ cause: error }); }
  function requestHash(input) { const { idempotencyKey, ...payload } = input; return hash(JSON.stringify(payload)); }
  function cursor(scope, anchor) { const body = Buffer.from(JSON.stringify({ v: 1, scope, anchor })).toString("base64url"); return `${body}.${hash(body)}`; }
  function readCursor(value, scope) { if (!value) return null; try { const [body, signature, extra] = value.split("."); if (extra || hash(body) !== signature) throw new Error(); const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); if (decoded.v !== 1 || JSON.stringify(decoded.scope) !== JSON.stringify(scope)) throw new Error(); return decoded.anchor; } catch (cause) { throw new TreasuryDataIncompatibleError({ cause }); } }
  function hydrateReceipt(snapshot) {
    if (!snapshot.exists) return null; const data = snapshot.data();
    if (!exact(data, ["receiptId", "command", "actorAccountId", "idempotencyKeyHash", "requestHash", "groupId", "grantId", "outcome", "confirmedAt", "schemaVersion"])
      || data.receiptId !== snapshot.id || !["GRANT", "REVOKE"].includes(data.command) || data.schemaVersion !== 1
      || !/^[a-f0-9]{64}$/.test(data.idempotencyKeyHash) || !/^[a-f0-9]{64}$/.test(data.requestHash)
      || !validTimestamp(data.confirmedAt)) throw new TreasuryDataIncompatibleError();
    return Object.freeze(data);
  }
  function grantDto(grant, person, state = grant.state, lapseReason) { return Object.freeze({
    grantId: grant.grantId, capabilityId: CAPABILITY_ID, membershipId: grant.membershipId, person,
    state, grantedAt: grant.grantedAt.toDate().toISOString(), ...(grant.revokedAt ? { revokedAt: grant.revokedAt.toDate().toISOString() } : {}),
    ...(lapseReason ? { lapseReason } : {}),
  }); }
  async function requireActor(unitOfWork, accountId) {
    const result = await identity.getOwnCanonicalPerson({ unitOfWork, accountId });
    if (result.status !== "READY") throw new TreasuryAccountContextError(); return result;
  }
  async function requireOwnerAccount(unitOfWork, accountId) {
    const result = await identity.getCanonicalAccount({ unitOfWork, accountId });
    if (result.status !== "READY") throw new TreasuryAccountContextError(); return result;
  }
  async function ensureOwnedContext(accountId, groupId, active = true) {
    return db.runTransaction(async (transaction) => {
      await requireOwnerAccount(transaction, accountId);
      const group = await ownership.ensureOwnershipContext({ unitOfWork: transaction, groupId });
      if (group.status !== "READY" || group.ownerId !== accountId) throw new TreasuryGroupNotAccessibleError();
      if (active && group.estado !== "activo") throw new TreasuryGroupNotOperationalError();
      return group;
    });
  }
  async function currentGroup(unitOfWork, accountId, groupId, active = true) {
    await requireOwnerAccount(unitOfWork, accountId); const group = await ownership.getOwnershipContext({ unitOfWork, groupId });
    if (group.status !== "READY" || group.ownerId !== accountId) throw new TreasuryGroupNotAccessibleError();
    if (active && group.estado !== "activo") throw new TreasuryGroupNotOperationalError(); return group;
  }

  async function grant(accountId, input) {
    await ensureOwnedContext(accountId, input.groupId);
    const rid = receiptId(accountId, "GRANT", input.idempotencyKey); const expectedHash = requestHash(input);
    try { return await db.runTransaction(async (transaction) => {
      const group = await currentGroup(transaction, accountId, input.groupId);
      const activation = await membership.getActiveAuthorizationContext({ unitOfWork: transaction, membershipId: input.membershipId, groupId: input.groupId });
      if (activation.status !== "READY") throw new TreasuryMembershipNotEligibleError();
      const season = await membership.requireOpenSeasonContext({ unitOfWork: transaction, groupId: input.groupId, seasonId: activation.seasonId });
      if (season.status !== "OPEN") throw new TreasuryOpenSeasonError();
      const target = await identity.resolveUniqueAccountForPerson({ unitOfWork: transaction, personId: activation.personId });
      if (target.status !== "READY") throw new TreasuryTargetAccountLinkError();
      const person = await presentation.get(transaction, activation.personId);
      const receiptRef = receipts.doc(rid); const receipt = hydrateReceipt(await transaction.get(receiptRef));
      if (receipt) {
        if (receipt.command !== "GRANT" || receipt.actorAccountId !== accountId || receipt.groupId !== input.groupId || receipt.requestHash !== expectedHash) throw new TreasuryIdempotencyConflictError();
        const existing = hydrateGrant(await transaction.get(grants.doc(receipt.grantId))); if (!existing) throw new TreasuryDataIncompatibleError();
        return Object.freeze({ outcome: "EXISTING", grant: grantDto(existing, person) });
      }
      const slotRef = slots.doc(slotId(input.groupId, target.accountId)); const slot = hydrateSlot(await transaction.get(slotRef));
      if (slot) {
        const existing = hydrateGrant(await transaction.get(grants.doc(slot.currentGrantId)));
        if (!existing) throw new TreasuryDataIncompatibleError();
        const effective = await authorization.evaluate({ unitOfWork: transaction, accountId: target.accountId, groupId: input.groupId });
        if (effective.status === "AUTHORIZED") throw new TreasuryGrantAlreadyActiveError();
      }
      const grantRef = grants.doc(); const confirmedAt = now(); const data = Object.freeze({ grantId: grantRef.id,
        capabilityId: CAPABILITY_ID, groupId: input.groupId, membershipId: input.membershipId,
        validityAnchor: activation.validityAnchor, personId: activation.personId, accountId: target.accountId,
        ownerIdAtGrant: group.ownerId, ownershipRevisionAtGrant: group.ownershipRevision, state: "ACTIVE",
        grantedAt: confirmedAt, grantedByAccountId: accountId, schemaVersion: 1 });
      const slotData = { slotId: slotRef.id, groupId: input.groupId, capabilityId: CAPABILITY_ID,
        accountId: target.accountId, currentGrantId: grantRef.id, membershipId: input.membershipId,
        validityAnchor: activation.validityAnchor, ownershipRevision: group.ownershipRevision, updatedAt: confirmedAt, schemaVersion: 1 };
      const receiptData = { receiptId: rid, command: "GRANT", actorAccountId: accountId,
        idempotencyKeyHash: hash(input.idempotencyKey), requestHash: expectedHash, groupId: input.groupId,
        grantId: grantRef.id, outcome: "GRANTED", confirmedAt, schemaVersion: 1 };
      transaction.create(grantRef, data); transaction.set(slotRef, slotData); transaction.create(receiptRef, receiptData);
      if (typeof testHooks.beforeGrantCommit === "function") await testHooks.beforeGrantCommit({ transaction, data });
      return Object.freeze({ outcome: "GRANTED", grant: grantDto(data, person) });
    }); } catch (error) { throw map(error); }
  }

  async function revoke(accountId, input) {
    const rid = receiptId(accountId, "REVOKE", input.idempotencyKey); const expectedHash = requestHash(input);
    try { return await db.runTransaction(async (transaction) => {
      await currentGroup(transaction, accountId, input.groupId);
      const receiptRef = receipts.doc(rid); const receipt = hydrateReceipt(await transaction.get(receiptRef));
      if (receipt) {
        if (receipt.command !== "REVOKE" || receipt.actorAccountId !== accountId || receipt.groupId !== input.groupId || receipt.grantId !== input.grantId || receipt.requestHash !== expectedHash) throw new TreasuryIdempotencyConflictError();
        return Object.freeze({ outcome: "EXISTING", grantId: receipt.grantId, revokedAt: receipt.confirmedAt.toDate().toISOString() });
      }
      const grantRef = grants.doc(input.grantId); const persisted = hydrateGrant(await transaction.get(grantRef));
      if (!persisted || persisted.groupId !== input.groupId) throw new TreasuryGrantNotAccessibleError();
      if (persisted.state === "REVOKED") throw new TreasuryGrantNotAccessibleError();
      const slotRef = slots.doc(slotId(input.groupId, persisted.accountId)); const slot = hydrateSlot(await transaction.get(slotRef));
      const confirmedAt = now();
      transaction.update(grantRef, { state: "REVOKED", revokedAt: confirmedAt, revokedByAccountId: accountId });
      if (slot?.currentGrantId === input.grantId) transaction.delete(slotRef);
      transaction.create(receiptRef, { receiptId: rid, command: "REVOKE", actorAccountId: accountId,
        idempotencyKeyHash: hash(input.idempotencyKey), requestHash: expectedHash, groupId: input.groupId,
        grantId: input.grantId, outcome: "REVOKED", confirmedAt, schemaVersion: 1 });
      return Object.freeze({ outcome: "REVOKED", grantId: input.grantId, revokedAt: confirmedAt.toDate().toISOString() });
    }); } catch (error) { throw map(error); }
  }

  async function projectedState(transaction, group, grant) {
    if (grant.state === "REVOKED") return { state: "REVOKED" };
    if (group.estado !== "activo") return { state: "LAPSED", lapseReason: "GROUP" };
    if (grant.ownerIdAtGrant !== group.ownerId || grant.ownershipRevisionAtGrant !== group.ownershipRevision) return { state: "LAPSED", lapseReason: "OWNERSHIP" };
    const active = await authorization.evaluate({ unitOfWork: transaction, accountId: grant.accountId, groupId: grant.groupId });
    if (active.status === "AUTHORIZED") return { state: "ACTIVE" };
    const activation = await membership.getActiveAuthorizationContext({ unitOfWork: transaction, membershipId: grant.membershipId, groupId: grant.groupId });
    if (activation.status !== "READY" || activation.validityAnchor !== grant.validityAnchor) return { state: "LAPSED", lapseReason: "MEMBERSHIP" };
    const season = await membership.requireOpenSeasonContext({ unitOfWork: transaction, groupId: grant.groupId, seasonId: activation.seasonId });
    return { state: "LAPSED", lapseReason: season.status === "OPEN" ? "MEMBERSHIP" : "SEASON" };
  }

  async function listForOwner(accountId, input) {
    await ensureOwnedContext(accountId, input.groupId, false);
    try { return await db.runTransaction(async (transaction) => {
      const group = await currentGroup(transaction, accountId, input.groupId, false);
      const scope = { contract: "group-treasury-grants", accountId, groupId: input.groupId, capabilityId: CAPABILITY_ID, pageSize: input.pageSize };
      const anchor = readCursor(input.cursor, scope); let query = grants.where("groupId", "==", input.groupId).orderBy("grantedAt", "desc").orderBy("__name__", "desc");
      if (anchor) { const doc = await transaction.get(grants.doc(anchor.id)); if (!doc.exists || doc.data()?.groupId !== input.groupId || doc.data()?.grantedAt?.toMillis?.() !== anchor.grantedAt) throw new TreasuryDataIncompatibleError(); query = query.startAfter(doc.data().grantedAt, anchor.id); }
      const snapshot = await transaction.get(query.limit(input.pageSize + 1)); const docs = snapshot.docs.slice(0, input.pageSize); const items = [];
      for (const doc of docs) { const grant = hydrateGrant(doc); const person = await presentation.get(transaction, grant.personId); const projection = await projectedState(transaction, group, grant); items.push(grantDto(grant, person, projection.state, projection.lapseReason)); }
      const last = docs.at(-1); return Object.freeze({ items: Object.freeze(items), ...(snapshot.size > input.pageSize ? { nextCursor: cursor(scope, { grantedAt: last.data().grantedAt.toMillis(), id: last.id }) } : {}) });
    }); } catch (error) { throw map(error); }
  }

  async function getMyContext(accountId, input) {
    try { return await db.runTransaction(async (transaction) => {
      await requireActor(transaction, accountId); const result = await authorization.evaluate({ unitOfWork: transaction, accountId, groupId: input.groupId });
      if (result.status !== "AUTHORIZED") throw new TreasuryNotAuthorizedError();
      return Object.freeze({ groupId: input.groupId, capabilityId: CAPABILITY_ID, canViewEconomy: true });
    }); } catch (error) { throw map(error); }
  }

  return Object.freeze({ grant, revoke, listForOwner, getMyContext });
}

module.exports = { createFirestoreTreasuryStore };
