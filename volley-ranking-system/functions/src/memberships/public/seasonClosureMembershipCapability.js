"use strict";

const { InvalidMembershipStateError } = require("../domain/membership");
const { activeMembershipGuardId, membershipLifecycleGuardId } = require("../application/membershipHashing");
const { createFirestoreMembershipRepository } = require("../infrastructure/firestoreMembershipRepository");
const { assertMembershipCorrelated, hydrateActiveMembershipGuard } = require("../infrastructure/firestoreActiveMembershipGuard");
const { assertActiveLifecycleCorrelated, hydrateMembershipLifecycleGuard } = require("../infrastructure/firestoreMembershipLifecycleGuard");

function createSeasonClosureMembershipCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const repository = createFirestoreMembershipRepository({ db });
  return Object.freeze({
    async findActive({ unitOfWork, groupId, seasonId }) {
      const snapshot = await unitOfWork.get(db.collection("memberships").where("groupId", "==", groupId).where("estado", "==", "activa").limit(1));
      if (snapshot.empty) return Object.freeze({ status: "absent" });
      let membership;
      try { membership = repository.fromSnapshot(snapshot.docs[0]); }
      catch (error) { if (error instanceof InvalidMembershipStateError) return Object.freeze({ status: "period-incompatible" }); throw error; }
      if (membership.groupId !== groupId || membership.seasonId !== seasonId) return Object.freeze({ status: "season-incompatible" });
      const guardId = activeMembershipGuardId(groupId, membership.personId);
      let guard;
      try { guard = hydrateActiveMembershipGuard(await unitOfWork.get(db.collection("activeMembershipGuards").doc(guardId)), { guardId, personId: membership.personId, groupId }); }
      catch { return Object.freeze({ status: "guard-incompatible" }); }
      if (!guard) return Object.freeze({ status: "guard-incompatible" });
      try {
        const periods = await repository.requirePeriodIntegrity({ transaction: unitOfWork, membership });
        assertMembershipCorrelated(membership, guard, periods.latestPeriod);
        if (membership.schemaVersion === 4) {
          const lifecycleId = membershipLifecycleGuardId(groupId, membership.personId);
          const lifecycle = hydrateMembershipLifecycleGuard(await unitOfWork.get(db.collection("membershipLifecycleGuards").doc(lifecycleId)), { guardId: lifecycleId, personId: membership.personId, groupId });
          assertActiveLifecycleCorrelated(membership, lifecycle, guard, periods.latestPeriod);
        }
      } catch (error) {
        if (error instanceof InvalidMembershipStateError) return Object.freeze({ status: "period-incompatible" });
        return Object.freeze({ status: "guard-incompatible" });
      }
      return Object.freeze({ status: "active" });
    },
    async findResidualGuard({ unitOfWork, groupId }) {
      const snapshot = await unitOfWork.get(db.collection("activeMembershipGuards").where("groupId", "==", groupId).limit(1));
      if (snapshot.empty) return Object.freeze({ status: "absent" });
      const document = snapshot.docs[0]; const data = document.data();
      try {
        const guard = hydrateActiveMembershipGuard(document, { guardId: document.id, personId: data?.personId, groupId });
        const membership = await repository.getById(guard.membershipId, unitOfWork);
        if (membership) {
          const periods = await repository.requirePeriodIntegrity({ transaction: unitOfWork, membership });
          assertMembershipCorrelated(membership, guard, periods.latestPeriod);
        }
      } catch { /* The public classification deliberately remains fail-closed. */ }
      return Object.freeze({ status: "guard-incompatible" });
    },
  });
}

module.exports = { createSeasonClosureMembershipCapability };
