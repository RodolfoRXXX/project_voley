"use strict";

const { MembershipIncompatibleStateError } = require("../application/membershipErrors");
const { activeMembershipGuardId, membershipLifecycleGuardId } = require("../application/membershipHashing");
const { hydrateMembership } = require("../domain/membership");
const { assertMembershipCorrelated, hydrateActiveMembershipGuard } = require("./firestoreActiveMembershipGuard");
const { assertActiveLifecycleCorrelated, hydrateMembershipLifecycleGuard } = require("./firestoreMembershipLifecycleGuard");

async function requireCanonicalActiveMembership({ db, transaction, membershipRepository, candidate, groupId, seasonId }) {
  if (candidate.groupId !== groupId || candidate.seasonId !== seasonId || candidate.estado !== "activa") {
    throw new MembershipIncompatibleStateError("Membership candidate context is incompatible");
  }
  const activeSnapshot = await transaction.get(membershipRepository.activePairQuery({ personId: candidate.personId, groupId }));
  const active = activeSnapshot.docs.map((document) => hydrateMembership(document.id, document.data()));
  if (active.length !== 1 || active[0].membershipId !== candidate.membershipId) {
    throw new MembershipIncompatibleStateError("Active Membership uniqueness is incompatible");
  }
  const guardId = activeMembershipGuardId(groupId, candidate.personId);
  const guard = hydrateActiveMembershipGuard(
    await transaction.get(db.collection("activeMembershipGuards").doc(guardId)),
    { guardId, personId: candidate.personId, groupId }
  );
  if (!guard) throw new MembershipIncompatibleStateError("Active Membership guard is absent");
  const periods = await membershipRepository.requirePeriodIntegrity({ transaction, membership: active[0] });
  assertMembershipCorrelated(active[0], guard, periods.latestPeriod);
  if ([4, 6].includes(active[0].schemaVersion)) {
    const lifecycleId = membershipLifecycleGuardId(groupId, candidate.personId);
    const lifecycle = hydrateMembershipLifecycleGuard(
      await transaction.get(db.collection("membershipLifecycleGuards").doc(lifecycleId)),
      { guardId: lifecycleId, personId: candidate.personId, groupId }
    );
    assertActiveLifecycleCorrelated(active[0], lifecycle, guard, periods.latestPeriod);
  }
  return active[0];
}

module.exports = { requireCanonicalActiveMembership };
