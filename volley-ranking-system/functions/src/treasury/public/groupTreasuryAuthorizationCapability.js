"use strict";

const { createGroupOwnershipContextCapability } = require("../../groups/public/groupOwnershipContextCapability");
const { createTreasuryMembershipAuthorizationCapability } = require("../../memberships/public/treasuryMembershipAuthorizationCapability");
const { createTreasuryAccountIdentityCapability } = require("../../users/public/treasuryAccountIdentityCapability");
const { CAPABILITY_ID, hydrateGrant, hydrateSlot, slotId } = require("../domain/treasury");

function createGroupTreasuryAuthorizationCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const ownership = createGroupOwnershipContextCapability({ db });
  const membership = createTreasuryMembershipAuthorizationCapability({ db });
  const identity = createTreasuryAccountIdentityCapability({ db });

  async function evaluate({ unitOfWork, accountId, groupId }) {
    try {
      const [group, own] = await Promise.all([
        ownership.getOwnershipContext({ unitOfWork, groupId }),
        identity.getOwnCanonicalPerson({ unitOfWork, accountId }),
      ]);
      if (group.status !== "READY" || group.estado !== "activo" || own.status !== "READY") return Object.freeze({ status: "NOT_AUTHORIZED" });
      const slotSnapshot = await unitOfWork.get(db.collection("groupCapabilityGrantSlots").doc(slotId(groupId, accountId)));
      const slot = hydrateSlot(slotSnapshot);
      if (!slot || slot.groupId !== groupId || slot.accountId !== accountId || slot.capabilityId !== CAPABILITY_ID) return Object.freeze({ status: "NOT_AUTHORIZED" });
      const grant = hydrateGrant(await unitOfWork.get(db.collection("groupCapabilityGrants").doc(slot.currentGrantId)));
      if (!grant || grant.state !== "ACTIVE" || grant.groupId !== groupId || grant.accountId !== accountId
        || grant.personId !== own.personId || grant.membershipId !== slot.membershipId
        || grant.validityAnchor !== slot.validityAnchor || grant.ownershipRevisionAtGrant !== slot.ownershipRevision
        || grant.ownerIdAtGrant !== group.ownerId || grant.ownershipRevisionAtGrant !== group.ownershipRevision) {
        return Object.freeze({ status: "NOT_AUTHORIZED" });
      }
      const [activation, target] = await Promise.all([
        membership.getActiveAuthorizationContext({ unitOfWork, membershipId: grant.membershipId, groupId }),
        identity.resolveUniqueAccountForPerson({ unitOfWork, personId: grant.personId }),
      ]);
      if (activation.status !== "READY" || activation.personId !== grant.personId
        || activation.validityAnchor !== grant.validityAnchor || target.status !== "READY" || target.accountId !== accountId) {
        return Object.freeze({ status: "NOT_AUTHORIZED" });
      }
      const season = await membership.requireOpenSeasonContext({ unitOfWork, groupId, seasonId: activation.seasonId });
      if (season.status !== "OPEN") return Object.freeze({ status: "NOT_AUTHORIZED" });
      return Object.freeze({ status: "AUTHORIZED", groupId, capabilityId: CAPABILITY_ID, grantId: grant.grantId });
    } catch (_) { return Object.freeze({ status: "INCOMPATIBLE" }); }
  }

  return Object.freeze({ evaluate });
}

module.exports = { createGroupTreasuryAuthorizationCapability };
