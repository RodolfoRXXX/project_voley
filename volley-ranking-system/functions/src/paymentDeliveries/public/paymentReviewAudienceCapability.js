"use strict";

const { createGroupOwnershipContextCapability } = require("../../groups/public/groupOwnershipContextCapability");
const { createTreasuryMembershipAuthorizationCapability } = require("../../memberships/public/treasuryMembershipAuthorizationCapability");
const { createTreasuryAccountIdentityCapability } = require("../../users/public/treasuryAccountIdentityCapability");
const d = require("../domain/paymentDelivery");

function createPaymentReviewAudienceCapability({ db }) {
  const ownership = createGroupOwnershipContextCapability({ db });
  const memberships = createTreasuryMembershipAuthorizationCapability({ db });
  const identities = createTreasuryAccountIdentityCapability({ db });
  const grants = db.collection("groupCapabilityGrants"); const slots = db.collection("groupCapabilityGrantSlots");
  const validGrant = (snapshot) => snapshot.exists && snapshot.data()?.grantId === snapshot.id
    && snapshot.data().capabilityId === d.CAPABILITY_ID && snapshot.data().schemaVersion === 1
    && ["ACTIVE", "REVOKED"].includes(snapshot.data().state) ? snapshot.data() : null;

  async function evaluateGrant(unitOfWork, group, grant, slotSnapshot) {
    if (!grant || grant.state !== "ACTIVE" || grant.groupId !== group.groupId || group.estado !== "activo"
      || grant.ownerIdAtGrant !== group.ownerId || grant.ownershipRevisionAtGrant !== group.ownershipRevision) return null;
    const slot = slotSnapshot || await unitOfWork.get(slots.doc(d.reviewSlotId(group.groupId, grant.accountId)));
    if (!slot.exists || slot.id !== d.reviewSlotId(group.groupId, grant.accountId) || slot.data()?.slotId !== slot.id
      || slot.data()?.capabilityId !== d.CAPABILITY_ID || slot.data()?.schemaVersion !== 1
      || slot.data()?.currentGrantId !== grant.grantId || slot.data()?.membershipId !== grant.membershipId
      || slot.data()?.validityAnchor !== grant.validityAnchor || slot.data()?.ownershipRevision !== group.ownershipRevision) return null;
    const [activation, target] = await Promise.all([
      memberships.getActiveAuthorizationContext({ unitOfWork, membershipId: grant.membershipId, groupId: group.groupId }),
      identities.resolveUniqueAccountForPerson({ unitOfWork, personId: grant.personId }),
    ]);
    if (activation.status !== "READY" || activation.validityAnchor !== grant.validityAnchor
      || target.status !== "READY" || target.accountId !== grant.accountId) return null;
    const season = await memberships.requireOpenSeasonContext({ unitOfWork, groupId: group.groupId, seasonId: activation.seasonId });
    return season.status === "OPEN" ? { accountId: grant.accountId, personId: grant.personId, grantId: grant.grantId } : null;
  }

  return Object.freeze({
    async getGroupAudience({ unitOfWork, groupId }) {
      const group = await ownership.getOwnershipContext({ unitOfWork, groupId });
      if (group.status !== "READY") return { status: group.status, recipients: [] };
      const owner = await identities.getCanonicalAccount({ unitOfWork, accountId: group.ownerId });
      const recipients = owner.status === "READY" ? [{ accountId: group.ownerId, kind: "OWNER" }] : [];
      if (group.estado === "activo") {
        const snapshot = await unitOfWork.get(grants.where("groupId", "==", groupId).where("capabilityId", "==", d.CAPABILITY_ID).where("state", "==", "ACTIVE"));
        for (const document of snapshot.docs) { const reviewer = await evaluateGrant(unitOfWork, group, validGrant(document)); if (reviewer) recipients.push({ ...reviewer, kind: "REVIEWER" }); }
      }
      return { status: "READY", group, recipients };
    },
    async evaluateAccount({ unitOfWork, accountId, group, deliveryPersonId }) {
      if (group.ownerId === accountId) return { status: "AUTHORIZED", kind: "OWNER", group };
      if (group.estado !== "activo") return { status: "DENIED" };
      const own = await identities.getOwnCanonicalPerson({ unitOfWork, accountId }); if (own.status !== "READY") return { status: "DENIED" };
      const slot = await unitOfWork.get(slots.doc(d.reviewSlotId(group.groupId, accountId))); if (!slot.exists) return { status: "DENIED" };
      const grant = validGrant(await unitOfWork.get(grants.doc(slot.data().currentGrantId))); const reviewer = await evaluateGrant(unitOfWork, group, grant, slot);
      if (!reviewer) return { status: "DENIED" };
      if (deliveryPersonId && deliveryPersonId === reviewer.personId) return { status: "SELF_REVIEW" };
      return { status: "AUTHORIZED", kind: "REVIEWER", group, personId: reviewer.personId, grantId: reviewer.grantId };
    },
  });
}

module.exports = { createPaymentReviewAudienceCapability };
