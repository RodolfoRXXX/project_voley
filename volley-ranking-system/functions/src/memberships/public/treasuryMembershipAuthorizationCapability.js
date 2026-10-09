"use strict";

const { createHash } = require("node:crypto");
const { hydrateMembership, hasPeriodMetadata, InvalidMembershipStateError } = require("../domain/membership");
const { hydrateMembershipValidityPeriod, InvalidMembershipValidityPeriodError } = require("../domain/membershipValidityPeriod");
const { membershipValidityPeriodId } = require("../application/membershipHashing");

const anchor = (...parts) => createHash("sha256").update(parts.join("\u0000")).digest("hex");

function createTreasuryMembershipAuthorizationCapability({ db }) {
  if (!db) throw new TypeError("db is required");

  async function getActiveAuthorizationContext({ unitOfWork, membershipId, groupId }) {
    try {
      const root = await unitOfWork.get(db.collection("memberships").doc(membershipId));
      if (!root.exists) return Object.freeze({ status: "NOT_ACTIVE" });
      const membership = hydrateMembership(root.id, root.data());
      if (membership.groupId !== groupId || membership.estado !== "activa") return Object.freeze({ status: "NOT_ACTIVE" });
      const periods = root.ref.collection("validityPeriods");
      if (!hasPeriodMetadata(membership)) {
        const unexpected = await unitOfWork.get(periods.limit(1));
        if (!unexpected.empty) return Object.freeze({ status: "INCOMPATIBLE" });
        return Object.freeze({ status: "READY", membershipId, personId: membership.personId, groupId,
          seasonId: membership.seasonId,
          validityAnchor: anchor("legacy-membership-activation", membershipId, String(membership.fechaIngreso.toMillis())) });
      }
      if (membership.latestPeriodId !== membershipValidityPeriodId(membershipId, membership.periodCount)) {
        return Object.freeze({ status: "INCOMPATIBLE" });
      }
      const firstId = membershipValidityPeriodId(membershipId, 1);
      const [first, latest, open] = await Promise.all([
        unitOfWork.get(periods.doc(firstId)),
        unitOfWork.get(periods.doc(membership.latestPeriodId)),
        unitOfWork.get(periods.where("estado", "==", "abierto").limit(2)),
      ]);
      if (!first.exists || !latest.exists || open.size !== 1 || open.docs[0].id !== membership.latestPeriodId) {
        return Object.freeze({ status: "INCOMPATIBLE" });
      }
      const firstPeriod = hydrateMembershipValidityPeriod(first.id, first.data()); const period = hydrateMembershipValidityPeriod(latest.id, latest.data());
      if (firstPeriod.ordinal !== 1 || firstPeriod.startedAt.toMillis() !== membership.fechaIngreso.toMillis()
        || period.estado !== "abierto" || period.ordinal !== membership.periodCount) return Object.freeze({ status: "INCOMPATIBLE" });
      return Object.freeze({ status: "READY", membershipId, personId: membership.personId, groupId,
        seasonId: membership.seasonId, validityAnchor: anchor("membership-period", membershipId, period.periodId) });
    } catch (error) {
      if (error instanceof InvalidMembershipStateError || error instanceof InvalidMembershipValidityPeriodError) {
        return Object.freeze({ status: "INCOMPATIBLE" });
      }
      throw error;
    }
  }

  async function requireOpenSeasonContext({ unitOfWork, groupId, seasonId }) {
    const snapshot = await unitOfWork.get(db.collection("seasons").doc(seasonId));
    const data = snapshot.data();
    if (!snapshot.exists || data?.groupId !== groupId) return Object.freeze({ status: "INCOMPATIBLE" });
    if (data.estado !== "abierta" || data.schemaVersion !== 1) return Object.freeze({ status: "NOT_OPEN" });
    return Object.freeze({ status: "OPEN", seasonId });
  }

  return Object.freeze({ getActiveAuthorizationContext, requireOpenSeasonContext });
}

module.exports = { createTreasuryMembershipAuthorizationCapability };
