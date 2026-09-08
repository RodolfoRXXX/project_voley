"use strict";

const { InvalidSeasonStateError } = require("../domain/season");
const { createFirestoreSeasonRepository } = require("../infrastructure/firestoreSeasonRepository");
const { hydrateOpenSeasonGuard } = require("../infrastructure/firestoreOpenSeasonGuard");

function createGroupJoinRequestSeasonCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const repository = createFirestoreSeasonRepository({ db });

  async function readOpen({ unitOfWork, groupId }) {
    try {
      const guardSnapshot = await unitOfWork.get(db.collection("openSeasonGuards").doc(groupId));
      const openSnapshot = await unitOfWork.get(db.collection("seasons").where("groupId", "==", groupId).where("estado", "==", "abierta").limit(2));
      const guard = hydrateOpenSeasonGuard(guardSnapshot, groupId);
      if (!guard && openSnapshot.empty) return Object.freeze({ status: "absent" });
      if (!guard || openSnapshot.size !== 1) return Object.freeze({ status: "incompatible" });
      const season = repository.fromSnapshot(openSnapshot.docs[0]);
      if (!season || season.seasonId !== guard.seasonId || season.groupId !== groupId || season.estado !== "abierta") return Object.freeze({ status: "incompatible" });
      return Object.freeze({ status: "open", seasonId: season.seasonId, groupId });
    } catch (error) {
      if (error instanceof InvalidSeasonStateError || error?.reason === "INCOMPATIBLE_STATE") return Object.freeze({ status: "incompatible" });
      throw error;
    }
  }

  return Object.freeze({
    async getOpenContextForOwnedGroup(args) { return readOpen(args); },
    async assertOpenSeasonForMembership({ unitOfWork, groupId, seasonId }) {
      const context = await readOpen({ unitOfWork, groupId });
      if (context.status !== "open") return context;
      return Object.freeze({ status: context.seasonId === seasonId ? "open" : "changed", seasonId: context.seasonId, groupId });
    },
  });
}

module.exports = { createGroupJoinRequestSeasonCapability };
