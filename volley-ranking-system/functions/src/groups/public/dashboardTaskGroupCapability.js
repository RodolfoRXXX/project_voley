"use strict";

const { hydrateGroup, InvalidGroupStateError } = require("../domain/group");
const { hydrateSeason, InvalidSeasonStateError } = require("../domain/season");

function createDashboardTaskGroupCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const groups = db.collection("groups"); const seasons = db.collection("seasons");
  function group(snapshot) {
    try {
      const value = hydrateGroup(snapshot.id, snapshot.data());
      if (!Number.isSafeInteger(value.ownershipRevision) || value.ownershipRevision < 1) return { status: "INCOMPATIBLE" };
      return { status: "READY", groupId: value.groupId, ownerId: value.ownerId, estado: value.estado,
        ownershipRevision: value.ownershipRevision, name: value.nombre };
    } catch (error) { if (error instanceof InvalidGroupStateError) return { status: "INCOMPATIBLE" }; throw error; }
  }
  return Object.freeze({
    async listOwned({ unitOfWork, accountId }) {
      const snapshot = await unitOfWork.get(groups.where("ownerId", "==", accountId));
      return snapshot.docs.map(group);
    },
    async get({ unitOfWork, groupId }) {
      const snapshot = await unitOfWork.get(groups.doc(groupId));
      return snapshot.exists ? group(snapshot) : { status: "NOT_FOUND" };
    },
    async getSeasonPresentation({ unitOfWork, groupId, seasonId }) {
      const snapshot = await unitOfWork.get(seasons.doc(seasonId));
      if (!snapshot.exists) return { status: "NOT_FOUND" };
      try {
        const value = hydrateSeason(snapshot.id, snapshot.data());
        return value.groupId === groupId ? { status: "READY", seasonId, name: value.nombre } : { status: "INCOMPATIBLE" };
      } catch (error) { if (error instanceof InvalidSeasonStateError) return { status: "INCOMPATIBLE" }; throw error; }
    },
  });
}

module.exports = { createDashboardTaskGroupCapability };
