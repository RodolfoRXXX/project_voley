"use strict";

const { hydrateGroup, InvalidGroupStateError } = require("../domain/group");

function createGroupObligationPresentationCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  return Object.freeze({
    async get({ unitOfWork, groupId }) {
      const snapshot = await unitOfWork.get(db.collection("groups").doc(groupId));
      if (!snapshot.exists) return Object.freeze({ status: "MISSING" });
      try {
        const group = hydrateGroup(snapshot.id, snapshot.data());
        return Object.freeze({ status: "AVAILABLE", name: group.nombre });
      } catch (error) {
        if (error instanceof InvalidGroupStateError) return Object.freeze({ status: "INCOMPATIBLE" });
        throw error;
      }
    },
  });
}

module.exports = { createGroupObligationPresentationCapability };
