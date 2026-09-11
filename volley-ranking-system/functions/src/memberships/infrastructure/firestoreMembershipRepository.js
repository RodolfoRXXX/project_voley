"use strict";

const { createInitialMembership, hydrateMembership, assertPeriodBoundary } = require("../domain/membership");
const { hydrateMembershipValidityPeriod } = require("../domain/membershipValidityPeriod");
const { membershipValidityPeriodId } = require("../application/membershipHashing");
const { InvalidMembershipStateError } = require("../domain/membership");

function createFirestoreMembershipRepository({ db }) {
  if (!db) throw new TypeError("db is required");

  function reference(membershipId) { return db.collection("memberships").doc(membershipId); }
  function periodReference(membershipId, periodId) { return reference(membershipId).collection("validityPeriods").doc(periodId); }
  function openPeriodsQuery(membershipId) { return reference(membershipId).collection("validityPeriods").where("estado", "==", "abierto").limit(2); }
  function fromSnapshot(snapshot) { return snapshot.exists ? hydrateMembership(snapshot.id, snapshot.data()) : null; }
  function periodFromSnapshot(snapshot) { return snapshot.exists ? hydrateMembershipValidityPeriod(snapshot.id, snapshot.data()) : null; }
  function rootData(membership) { const { membershipId, ...data } = membership; return data; }
  function periodData(period) { const { periodId, ...data } = period; return data; }

  async function requirePeriodIntegrity({ transaction, membership }) {
    if (!membership) throw new InvalidMembershipStateError("Membership is required");
    const firstId = membershipValidityPeriodId(membership.membershipId, 1);
    if (membership.schemaVersion !== 3) {
      const [firstSnapshot, openSnapshot] = await Promise.all([
        transaction.get(periodReference(membership.membershipId, firstId)),
        transaction.get(openPeriodsQuery(membership.membershipId)),
      ]);
      if (firstSnapshot.exists || !openSnapshot.empty) throw new InvalidMembershipStateError("Legacy Membership has unexpected validity periods");
      return Object.freeze({ firstPeriod: null, latestPeriod: null, openPeriods: Object.freeze([]) });
    }
    const expectedLatestId = membershipValidityPeriodId(membership.membershipId, membership.periodCount);
    if (membership.latestPeriodId !== expectedLatestId) throw new InvalidMembershipStateError("Latest validity period id is inconsistent");
    const firstRef = periodReference(membership.membershipId, firstId);
    const latestRef = periodReference(membership.membershipId, expectedLatestId);
    const firstSnapshot = await transaction.get(firstRef);
    const latestSnapshot = expectedLatestId === firstId ? firstSnapshot : await transaction.get(latestRef);
    const openSnapshot = await transaction.get(openPeriodsQuery(membership.membershipId));
    const firstPeriod = periodFromSnapshot(firstSnapshot);
    const latestPeriod = periodFromSnapshot(latestSnapshot);
    const openPeriods = openSnapshot.docs.map(periodFromSnapshot);
    assertPeriodBoundary(membership, firstPeriod, latestPeriod);
    if (membership.estado === "activa") {
      if (openPeriods.length !== 1 || openPeriods[0].periodId !== membership.latestPeriodId) throw new InvalidMembershipStateError("Active Membership must have exactly one current validity period");
    } else if (openPeriods.length !== 0) {
      throw new InvalidMembershipStateError("Finalized Membership cannot have open validity periods");
    }
    return Object.freeze({ firstPeriod, latestPeriod, openPeriods: Object.freeze(openPeriods) });
  }

  function persistRoot(transaction, membership) { transaction.set(reference(membership.membershipId), rootData(membership)); }
  function persistPeriods(transaction, membershipId, periods) {
    for (const period of periods) transaction.set(periodReference(membershipId, period.periodId), periodData(period));
  }
  async function getById(membershipId, transaction) {
    const snapshot = transaction ? await transaction.get(reference(membershipId)) : await reference(membershipId).get();
    return fromSnapshot(snapshot);
  }

  return {
    newId() { return db.collection("memberships").doc().id; },
    reference,
    periodReference,
    periodId: membershipValidityPeriodId,
    openPeriodsQuery,
    fromSnapshot,
    periodFromSnapshot,
    getById,
    async getAggregateById(membershipId, transaction) {
      const membership = await getById(membershipId, transaction);
      if (!membership) return null;
      const periods = await requirePeriodIntegrity({ transaction, membership });
      return Object.freeze({ membership, ...periods });
    },
    requirePeriodIntegrity,
    activePairQuery({ personId, groupId }) { return db.collection("memberships").where("personId", "==", personId).where("groupId", "==", groupId).where("estado", "==", "activa").limit(2); },
    finalizedPairQuery({ personId, groupId }) { return db.collection("memberships").where("personId", "==", personId).where("groupId", "==", groupId).where("estado", "==", "finalizada").limit(2); },
    createInitial(transaction, membership, activatedAt) {
      const aggregate = createInitialMembership(membership, activatedAt, membershipValidityPeriodId(membership.membershipId, 1));
      transaction.create(reference(membership.membershipId), rootData(aggregate.membership));
      for (const period of aggregate.periods) transaction.create(periodReference(membership.membershipId, period.periodId), periodData(period));
      return aggregate;
    },
    persistTransition(transaction, transition) {
      persistRoot(transaction, transition.membership);
      persistPeriods(transaction, transition.membership.membershipId, transition.periods);
    },
    updateFinalized(transaction, membership) { persistRoot(transaction, membership); },
  };
}

module.exports = { createFirestoreMembershipRepository };
