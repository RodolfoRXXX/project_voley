"use strict";

const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { InvalidMembershipStateError, hydrateMembership } = require("../domain/membership");
const { activeMembershipGuardId } = require("../application/membershipHashing");
const {
  MembershipAccountRequiredError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipGroupNotAccessibleError,
  MembershipIncompatibleStateError,
  MembershipInternalError,
  MembershipRosterContextChangedError,
} = require("../application/membershipErrors");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const { assertMembershipCorrelated, hydrateActiveMembershipGuard } = require("./firestoreActiveMembershipGuard");

function createFirestoreActiveGroupMembersForOwnerReader({ db, membershipRepository, groupCapability, personCapability }) {
  if (!db || !membershipRepository || !groupCapability || !personCapability) {
    throw new TypeError("Owner active Group Members reader dependencies are required");
  }

  function query({ groupId, seasonId, pageSize, position }) {
    let value = db.collection("memberships")
      .where("groupId", "==", groupId)
      .where("seasonId", "==", seasonId)
      .where("estado", "==", "activa")
      .orderBy("fechaIngreso", "asc")
      .orderBy(FieldPath.documentId(), "asc");
    if (position) {
      value = value.startAfter(new Timestamp(position.seconds, position.nanoseconds), position.lastMembershipId);
    }
    return value.limit(pageSize + 1);
  }

  async function requireCandidateIntegrity({ transaction, candidate, groupId, seasonId }) {
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
    return active[0];
  }

  return Object.freeze({
    async listPage({ userId, groupId, pageSize, position }) {
      try {
        return await db.runTransaction(async (transaction) => {
          const ownerPerson = await personCapability.getOwnerPersonReference({ unitOfWork: transaction, userId });
          if (["account_missing", "incompatible"].includes(ownerPerson?.status)) throw new MembershipAccountRequiredError();
          if (!["found", "missing"].includes(ownerPerson?.status)) throw new MembershipIncompatibleStateError("Owner Person reference is incompatible");

          const context = await groupCapability.getOwnedOpenSeasonContext({ unitOfWork: transaction, groupId, userId });
          if (context?.status === "not_accessible") throw new MembershipGroupNotAccessibleError();
          if (context?.status === "incompatible") throw new MembershipIncompatibleStateError("Group roster context is incompatible");
          if (context?.status === "no_open_season") {
            if (position) throw new MembershipRosterContextChangedError();
            return Object.freeze({ scopeStatus: "NO_OPEN_SEASON", rows: Object.freeze([]), hasLookahead: false, cursorAnchor: null });
          }
          if (context?.status !== "open_season") throw new MembershipIncompatibleStateError("Group roster context is invalid");
          if (position && position.seasonId !== context.seasonId) throw new MembershipRosterContextChangedError();

          const pageSnapshot = await transaction.get(query({ groupId, seasonId: context.seasonId, pageSize, position }));
          const included = pageSnapshot.docs.slice(0, pageSize);
          const rows = [];
          for (const document of included) {
            const candidate = hydrateMembership(document.id, document.data());
            const membership = await requireCandidateIntegrity({ transaction, candidate, groupId, seasonId: context.seasonId });
            const person = await personCapability.getPresentation({ unitOfWork: transaction, personId: membership.personId });
            if (!["available", "unavailable"].includes(person?.status)) throw new MembershipIncompatibleStateError("Person projection is invalid");
            rows.push(Object.freeze({
              membership,
              person,
              isOwner: ownerPerson.status === "found" && ownerPerson.personId === membership.personId,
            }));
          }
          const last = included.at(-1);
          const timestamp = last?.get("fechaIngreso");
          return Object.freeze({
            scopeStatus: "OPEN_SEASON",
            seasonId: context.seasonId,
            rows: Object.freeze(rows),
            hasLookahead: pageSnapshot.size > pageSize,
            cursorAnchor: last ? Object.freeze({ seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds, lastMembershipId: last.id }) : null,
          });
        });
      } catch (error) {
        if (error instanceof MembershipError) throw error;
        if (error instanceof InvalidMembershipStateError || error?.name === "InvalidMembershipValidityPeriodError") {
          throw new MembershipIncompatibleStateError(undefined, { cause: error });
        }
        if (isTransientDependencyError(error)) throw new MembershipDependencyUnavailableError({ cause: error });
        throw new MembershipInternalError({ cause: error });
      }
    },
  });
}

module.exports = { createFirestoreActiveGroupMembersForOwnerReader };
