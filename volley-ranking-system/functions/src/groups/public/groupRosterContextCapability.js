"use strict";

const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const { createFirestoreGroupRepository } = require("../infrastructure/firestoreGroupRepository");
const { createFirestoreSeasonRepository } = require("../infrastructure/firestoreSeasonRepository");
const { hydrateOpenSeasonGuard } = require("../infrastructure/firestoreOpenSeasonGuard");

function createGroupRosterContextCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const groupRepository = createFirestoreGroupRepository({ db });
  const seasonRepository = createFirestoreSeasonRepository({ db });

  return Object.freeze({
    async getOwnedOpenSeasonContext({ unitOfWork, groupId, userId }) {
      const groupSnapshot = await unitOfWork.get(groupRepository.reference(groupId));
      if (!groupSnapshot.exists) return Object.freeze({ status: "not_accessible" });

      let group;
      try {
        group = groupRepository.fromSnapshot(groupSnapshot);
      } catch (error) {
        if (error instanceof InvalidGroupStateError) {
          return Object.freeze({ status: groupSnapshot.data()?.ownerId === userId ? "incompatible" : "not_accessible" });
        }
        throw error;
      }
      if (group.ownerId !== userId) return Object.freeze({ status: "not_accessible" });
      if (group.estado !== "activo") return Object.freeze({ status: "incompatible" });

      const guardSnapshot = await unitOfWork.get(db.collection("openSeasonGuards").doc(groupId));
      let guard;
      try {
        guard = hydrateOpenSeasonGuard(guardSnapshot, groupId);
      } catch (error) {
        if (error?.reason === "INCOMPATIBLE_STATE") return Object.freeze({ status: "incompatible" });
        throw error;
      }
      const openSnapshot = await unitOfWork.get(db.collection("seasons")
        .where("groupId", "==", groupId)
        .where("estado", "==", "abierta")
        .limit(2));
      if (openSnapshot.empty && !guard) return Object.freeze({ status: "no_open_season" });
      if (!guard || openSnapshot.size !== 1) return Object.freeze({ status: "incompatible" });

      let season;
      try {
        season = seasonRepository.fromSnapshot(openSnapshot.docs[0]);
      } catch (error) {
        if (error instanceof InvalidSeasonStateError) return Object.freeze({ status: "incompatible" });
        throw error;
      }
      if (!season || season.seasonId !== guard.seasonId || season.groupId !== groupId || season.estado !== "abierta") {
        return Object.freeze({ status: "incompatible" });
      }
      return Object.freeze({ status: "open_season", groupId, seasonId: season.seasonId });
    },
  });
}

module.exports = { createGroupRosterContextCapability };
