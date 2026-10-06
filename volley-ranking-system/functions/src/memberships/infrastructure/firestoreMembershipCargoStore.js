"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { InvalidMembershipStateError, changeMembershipCargo, normalizeMembershipCargo } = require("../domain/membership");
const {
  MembershipAccountRequiredError, MembershipDependencyUnavailableError, MembershipEditTokenStaleError,
  MembershipError, MembershipGroupNotAccessibleError, MembershipIdempotencyConflictError,
  MembershipIncompatibleStateError, MembershipSeasonNotModifiableError,
  MembershipTargetNotAccessibleError, MembershipTargetNotActiveError,
} = require("../application/membershipErrors");
const { activeMembershipGuardId, membershipCargoEditToken, membershipLifecycleGuardId } = require("../application/membershipHashing");
const { assertMembershipCorrelated, hydrateActiveMembershipGuard, isAmbiguousTransactionFailure, isMembershipContention } = require("./firestoreActiveMembershipGuard");
const { assertActiveLifecycleCorrelated, hydrateMembershipLifecycleGuard } = require("./firestoreMembershipLifecycleGuard");
const { createMembershipTransactionObserver } = require("./membershipTransactionObservability");

const RECEIPT_FIELDS = Object.freeze(["receiptVersion", "actorUserId", "groupId", "membershipId", "idempotencyKeyHash", "requestHash", "cargo", "confirmedAt", "editToken"]);
const HASH = /^[a-f0-9]{64}$/;
function exact(data, fields) { const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : []; const expected = [...fields].sort(); return keys.length === expected.length && !keys.some((key, index) => key !== expected[index]); }
function validId(value) { return typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/"); }
function validTimestamp(value) { return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime()); }

function hydrateReceipt(snapshot, args) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!exact(data, RECEIPT_FIELDS) || snapshot.id !== args.receiptId || data.receiptVersion !== 1
    || data.actorUserId !== args.actorUserId || !validId(data.actorUserId) || !validId(data.groupId) || !validId(data.membershipId)
    || !HASH.test(data.idempotencyKeyHash) || data.idempotencyKeyHash !== args.idempotencyKeyHash
    || !HASH.test(data.requestHash) || !HASH.test(data.editToken) || !validTimestamp(data.confirmedAt)
    || !(data.cargo === null || (typeof data.cargo === "string" && (() => {
      try { return normalizeMembershipCargo(data.cargo) === data.cargo; } catch { return false; }
    })()))) {
    throw new MembershipIncompatibleStateError();
  }
  return Object.freeze(data);
}

function createFirestoreMembershipCargoStore({
  db, membershipRepository, groupCapability, personCapability, now = () => Timestamp.now(),
  transactionObserver = createMembershipTransactionObserver(),
}) {
  if (!db || !membershipRepository || !groupCapability || !personCapability || typeof now !== "function") throw new TypeError("Membership cargo store dependencies are required");
  const receiptReference = (receiptId) => db.collection("membershipCargoUpdateReceipts").doc(receiptId);

  async function requireAccount(transaction, actorUserId) {
    const account = await personCapability.getOwnerPersonReference({ unitOfWork: transaction, userId: actorUserId });
    if (!["found", "missing"].includes(account?.status)) throw new MembershipAccountRequiredError();
  }
  async function requireOwner(transaction, args, historical = false) {
    const context = await groupCapability[historical ? "getOwnedGroupForHistory" : "getOwnedGroup"]({ unitOfWork: transaction, groupId: args.groupId, userId: args.actorUserId });
    if (context?.status === "not_accessible") throw new MembershipGroupNotAccessibleError();
    if (context?.status !== "owned") throw new MembershipIncompatibleStateError();
    return context;
  }
  async function readMembership(transaction, args) {
    const snapshot = await transaction.get(membershipRepository.reference(args.membershipId));
    if (!snapshot.exists || snapshot.data()?.groupId !== args.groupId) throw new MembershipTargetNotAccessibleError();
    const membership = membershipRepository.fromSnapshot(snapshot);
    if (membership.groupId !== args.groupId) throw new MembershipTargetNotAccessibleError();
    return membership;
  }
  async function requireActiveIntegrity(transaction, membership) {
    if (membership.estado !== "activa") throw new MembershipTargetNotActiveError();
    const guardId = activeMembershipGuardId(membership.groupId, membership.personId);
    const lifecycleId = membershipLifecycleGuardId(membership.groupId, membership.personId);
    const [guardSnapshot, lifecycleSnapshot, activePair] = await Promise.all([
      transaction.get(db.collection("activeMembershipGuards").doc(guardId)),
      transaction.get(db.collection("membershipLifecycleGuards").doc(lifecycleId)),
      transaction.get(membershipRepository.activePairQuery({ personId: membership.personId, groupId: membership.groupId })),
    ]);
    const guard = hydrateActiveMembershipGuard(guardSnapshot, { guardId, personId: membership.personId, groupId: membership.groupId });
    const lifecycle = hydrateMembershipLifecycleGuard(lifecycleSnapshot, { guardId: lifecycleId, personId: membership.personId, groupId: membership.groupId });
    if (!guard || activePair.size !== 1 || activePair.docs[0].id !== membership.membershipId) throw new MembershipIncompatibleStateError();
    const periods = await membershipRepository.requirePeriodIntegrity({ transaction, membership });
    assertMembershipCorrelated(membership, guard, periods.latestPeriod);
    if (lifecycle) assertActiveLifecycleCorrelated(membership, lifecycle, guard, periods.latestPeriod);
  }
  async function requireOpenSeason(transaction, membership) {
    const season = await groupCapability.getExactOpenSeason({ unitOfWork: transaction, groupId: membership.groupId, seasonId: membership.seasonId });
    if (season?.status !== "open") throw new MembershipSeasonNotModifiableError();
  }
  async function presentation(transaction, membership) {
    const person = await personCapability.getPresentation({ unitOfWork: transaction, personId: membership.personId });
    if (!person || !["available", "unavailable"].includes(person.status)) throw new MembershipIncompatibleStateError();
    return person;
  }
  function currentResult(membership, actorUserId, editable) {
    return Object.freeze({
      membershipId: membership.membershipId,
      estado: membership.estado,
      cargo: Object.prototype.hasOwnProperty.call(membership, "cargo") ? membership.cargo : null,
      editToken: editable ? membershipCargoEditToken(actorUserId, membership) : null,
    });
  }
  function map(error) {
    if (error instanceof MembershipError) return error;
    if (error instanceof InvalidMembershipStateError || error?.name === "InvalidMembershipValidityPeriodError") return new MembershipIncompatibleStateError(undefined, { cause: error });
    return new MembershipDependencyUnavailableError({ cause: error });
  }

  async function prepare(args) {
    try {
      return await db.runTransaction(async (transaction) => {
        await requireAccount(transaction, args.actorUserId); await requireOwner(transaction, args);
        const membership = await readMembership(transaction, args);
        await requireActiveIntegrity(transaction, membership); await requireOpenSeason(transaction, membership);
        return Object.freeze({ membership, person: await presentation(transaction, membership), editToken: membershipCargoEditToken(args.actorUserId, membership) });
      });
    } catch (error) { throw map(error); }
  }

  async function execute(args) {
    return db.runTransaction(async (transaction) => {
      await requireAccount(transaction, args.actorUserId); const ownerContext = await requireOwner(transaction, args, true);
      const membership = await readMembership(transaction, args);
      const receiptRef = receiptReference(args.receiptId);
      const receipt = hydrateReceipt(await transaction.get(receiptRef), args);
      if (receipt) {
        if (receipt.groupId !== args.groupId || receipt.membershipId !== args.membershipId || receipt.requestHash !== args.requestHash) throw new MembershipIdempotencyConflictError();
        let editable = false;
        if (membership.estado === "activa") {
          await requireActiveIntegrity(transaction, membership);
          const season = await groupCapability.getExactOpenSeason({ unitOfWork: transaction, groupId: membership.groupId, seasonId: membership.seasonId });
          editable = ownerContext.active && season?.status === "open";
        }
        return Object.freeze({ outcome: "UPDATED", recovered: true, receipt, current: currentResult(membership, args.actorUserId, editable) });
      }
      if (!ownerContext.active) throw new MembershipIncompatibleStateError();
      await requireActiveIntegrity(transaction, membership); await requireOpenSeason(transaction, membership);
      if (membershipCargoEditToken(args.actorUserId, membership) !== args.editToken) throw new MembershipEditTokenStaleError();
      const transition = changeMembershipCargo(membership, args.cargo);
      if (transition.outcome === "NO_CHANGES") return Object.freeze({ outcome: "NO_CHANGES", recovered: false, receipt: null, current: currentResult(membership, args.actorUserId, true) });
      const confirmedAt = now(); const editToken = membershipCargoEditToken(args.actorUserId, transition.membership);
      const receiptData = Object.freeze({ receiptVersion: 1, actorUserId: args.actorUserId, groupId: args.groupId, membershipId: args.membershipId, idempotencyKeyHash: args.idempotencyKeyHash, requestHash: args.requestHash, cargo: transition.cargo, confirmedAt, editToken });
      membershipRepository.updateRoot(transaction, transition.membership); transaction.create(receiptRef, receiptData);
      return Object.freeze({ outcome: "UPDATED", recovered: false, receipt: receiptData, current: currentResult(transition.membership, args.actorUserId, true) });
    });
  }

  return Object.freeze({ receiptReference, hydrateReceipt, prepare, async confirm(args) {
    const observation = transactionObserver.start("membership-cargo-update");
    try { return await execute(args); }
    catch (error) {
      if (isMembershipContention(error) || isAmbiguousTransactionFailure(error)) {
        if (!(error instanceof MembershipError)) observation.record("transaction", error);
        try { return await execute(args); }
        catch (recoveryError) {
          if (!(recoveryError instanceof MembershipError)) observation.record("recovery", recoveryError);
          throw map(recoveryError);
        }
      }
      if (!(error instanceof MembershipError)) observation.record("mapping", error);
      throw map(error);
    }
  } });
}

module.exports = { RECEIPT_FIELDS, createFirestoreMembershipCargoStore, hydrateReceipt };
