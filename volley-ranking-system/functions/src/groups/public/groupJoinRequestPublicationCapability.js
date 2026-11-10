"use strict";
const { InvalidGroupPublicationStateError, hydrateGroupPublication } = require("../domain/groupPublication");

function createGroupJoinRequestPublicationCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  return Object.freeze({
    async getExploreContext({ unitOfWork, groupId }) {
      try {
        const publication = hydrateGroupPublication(await unitOfWork.get(db.collection("groupExplorationPublications").doc(groupId)));
        return Object.freeze({ status: publication ? "published" : "invite_only" });
      } catch (error) {
        if (error instanceof InvalidGroupPublicationStateError) return Object.freeze({ status: "incompatible" });
        throw error;
      }
    },
  });
}

module.exports = { createGroupJoinRequestPublicationCapability };
