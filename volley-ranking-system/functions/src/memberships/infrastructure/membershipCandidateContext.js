"use strict";
const { activeMembershipGuardId } = require("../application/membershipHashing");
const { hydrateActiveMembershipGuard, assertMembershipCorrelated } = require("./firestoreActiveMembershipGuard");
const { MembershipIncompatibleStateError } = require("../application/membershipErrors");

function createMembershipCandidateContext({ db, membershipRepository }) {
  if (!db || !membershipRepository) throw new TypeError("Membership candidate context dependencies are required");
  return {
    async assertNoActive({ transaction, personId, groupId }) {
      const guardId = activeMembershipGuardId(groupId, personId);
      const guardSnapshot = await transaction.get(db.collection("activeMembershipGuards").doc(guardId));
      const querySnapshot = await transaction.get(membershipRepository.activePairQuery({ personId, groupId }));
      const guard = hydrateActiveMembershipGuard(guardSnapshot, { guardId, personId, groupId });
      if (querySnapshot.size > 1) throw new MembershipIncompatibleStateError("Multiple active Memberships exist");
      const membership = querySnapshot.empty ? null : membershipRepository.fromSnapshot(querySnapshot.docs[0]);
      if (!guard && !membership) return;
      if (!guard || !membership) throw new MembershipIncompatibleStateError("Active Membership and guard are asymmetric");
      assertMembershipCorrelated(membership, guard);
      return membership;
    },
  };
}
module.exports = { createMembershipCandidateContext };
