"use strict";

const { MembershipError } = require("../application/membershipErrors");
const { InvalidMembershipStateError } = require("../domain/membership");
const { createFirestoreMembershipRepository } = require("../infrastructure/firestoreMembershipRepository");
const { createMembershipCandidateContext } = require("../infrastructure/membershipCandidateContext");

function createGroupJoinRequestMembershipCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const context = createMembershipCandidateContext({
    db,
    membershipRepository: createFirestoreMembershipRepository({ db }),
  });

  return Object.freeze({
    async getActiveContext({ unitOfWork, personId, groupId }) {
      try {
        const membership = await context.assertNoActive({ transaction: unitOfWork, personId, groupId });
        return Object.freeze({ status: membership ? "active" : "absent" });
      } catch (error) {
        if (error instanceof InvalidMembershipStateError || (error instanceof MembershipError && error.reason === "INCOMPATIBLE_STATE")) {
          return Object.freeze({ status: "incompatible" });
        }
        throw error;
      }
    },
  });
}

module.exports = { createGroupJoinRequestMembershipCapability };
