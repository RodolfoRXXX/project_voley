"use strict";

const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { hydrateMembership, InvalidMembershipStateError } = require("../domain/membership");
const { activeMembershipGuardId } = require("../application/membershipHashing");
const { MembershipIncompatibleStateError } = require("../application/membershipErrors");
const {
  assertMembershipCorrelated,
  hydrateActiveMembershipGuard,
  mapInfrastructureError,
} = require("./firestoreActiveMembershipGuard");

function createFirestoreMyCurrentGroupMembershipsReader({ db, membershipRepository }) {
  if (!db || !membershipRepository) throw new TypeError("My current Group Memberships reader dependencies are required");

  function primaryQuery({ personId, pageSize, position }) {
    let query = db.collection("memberships")
      .where("personId", "==", personId)
      .where("estado", "==", "activa")
      .orderBy("fechaIngreso", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (position) {
      query = query.startAfter(
        new Timestamp(position.seconds, position.nanoseconds),
        position.lastMembershipId
      );
    }
    return query.limit(pageSize + 1);
  }

  return {
    async listPage({ personId, pageSize, position }) {
      try {
        const snapshot = await primaryQuery({ personId, pageSize, position }).get();
        const processedSnapshots = snapshot.docs.slice(0, pageSize);
        const candidates = processedSnapshots.map((document) => {
          const membership = hydrateMembership(document.id, document.data());
          if (membership.personId !== personId || membership.estado !== "activa") {
            throw new MembershipIncompatibleStateError("Membership candidate is not owned by the derived Person");
          }
          return membership;
        });
        const last = processedSnapshots.at(-1);
        const anchorTimestamp = last?.get("fechaIngreso");
        return Object.freeze({
          candidates: Object.freeze(candidates),
          hasLookahead: snapshot.docs.length > pageSize,
          cursorAnchor: last ? Object.freeze({
            seconds: anchorTimestamp.seconds,
            nanoseconds: anchorTimestamp.nanoseconds,
            lastMembershipId: last.id,
          }) : null,
        });
      } catch (error) {
        if (error instanceof InvalidMembershipStateError) {
          throw new MembershipIncompatibleStateError(undefined, { cause: error });
        }
        throw mapInfrastructureError(error);
      }
    },

    async requireIntegrity({ personId, candidate }) {
      try {
        const active = await membershipRepository.activePairQuery({ personId, groupId: candidate.groupId }).get();
        const memberships = active.docs.map((document) => hydrateMembership(document.id, document.data()));
        if (memberships.length !== 1 || memberships[0].membershipId !== candidate.membershipId) {
          throw new MembershipIncompatibleStateError("Active Membership uniqueness is incompatible");
        }
        const guardId = activeMembershipGuardId(candidate.groupId, personId);
        const guard = hydrateActiveMembershipGuard(
          await db.collection("activeMembershipGuards").doc(guardId).get(),
          { guardId, personId, groupId: candidate.groupId }
        );
        if (!guard) throw new MembershipIncompatibleStateError("Active Membership guard is absent");
        assertMembershipCorrelated(candidate, guard);
        assertMembershipCorrelated(memberships[0], guard);
        return candidate;
      } catch (error) {
        if (error instanceof InvalidMembershipStateError) {
          throw new MembershipIncompatibleStateError(undefined, { cause: error });
        }
        throw mapInfrastructureError(error);
      }
    },
  };
}

module.exports = { createFirestoreMyCurrentGroupMembershipsReader };
