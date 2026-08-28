"use strict";

const {
  assertMembershipCorrelated,
  hydrateActiveMembershipGuard,
  mapInfrastructureError,
  requireOwnedGroup,
} = require("./firestoreActiveMembershipGuard");
const { activeMembershipGuardId } = require("../application/membershipHashing");
const { MembershipIncompatibleStateError } = require("../application/membershipErrors");

function createFirestoreMyMembershipReader({ db, groupRepository, membershipRepository }) {
  if (!db || !groupRepository || !membershipRepository) throw new TypeError("My Membership reader dependencies are required");

  return {
    async getActiveForOwner({ userId, personId, groupId }) {
      try {
        return await db.runTransaction(async (transaction) => {
          await requireOwnedGroup({ groupRepository, transaction, groupId, userId });
          const guardId = activeMembershipGuardId(groupId, personId);
          const guard = hydrateActiveMembershipGuard(
            await transaction.get(db.collection("activeMembershipGuards").doc(guardId)),
            { guardId, personId, groupId }
          );
          if (!guard) {
            const active = await transaction.get(membershipRepository.activePairQuery({ personId, groupId }));
            if (!active.empty) throw new MembershipIncompatibleStateError("Active Membership exists without its guard");
            return null;
          }
          const membership = await membershipRepository.getById(guard.membershipId, transaction);
          assertMembershipCorrelated(membership, guard);
          return membership;
        });
      } catch (error) {
        throw mapInfrastructureError(error);
      }
    },
  };
}

module.exports = { createFirestoreMyMembershipReader };
