"use strict";

const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const { createFirestoreGroupRepository } = require("../infrastructure/firestoreGroupRepository");
const { createFirestoreSeasonRepository } = require("../infrastructure/firestoreSeasonRepository");
const { hydrateOpenSeasonGuard } = require("../infrastructure/firestoreOpenSeasonGuard");

function createAdministrativeMembershipFinalizationContextCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const groupRepository = createFirestoreGroupRepository({ db });
  const seasonRepository = createFirestoreSeasonRepository({ db });
  return Object.freeze({
    async getOwnedGroup({ unitOfWork, groupId, userId }) {
      const snapshot = await unitOfWork.get(groupRepository.reference(groupId));
      if (!snapshot.exists || snapshot.data()?.ownerId !== userId) return Object.freeze({ status: "not_accessible" });
      try {
        const group = groupRepository.fromSnapshot(snapshot);
        return Object.freeze({ status: group.estado === "activo" ? "owned" : "incompatible" });
      } catch (error) {
        if (error instanceof InvalidGroupStateError) return Object.freeze({ status: "incompatible" });
        throw error;
      }
    },
    async getExactOpenSeason({ unitOfWork, groupId, seasonId }) {
      let guard;
      try { guard = hydrateOpenSeasonGuard(await unitOfWork.get(db.collection("openSeasonGuards").doc(groupId)), groupId); }
      catch (error) { return Object.freeze({ status: "not_modifiable" }); }
      let season;
      try { season = await seasonRepository.getById(seasonId, unitOfWork); }
      catch (error) { if (error instanceof InvalidSeasonStateError) return Object.freeze({ status: "not_modifiable" }); throw error; }
      const open = await unitOfWork.get(db.collection("seasons").where("groupId", "==", groupId).where("estado", "==", "abierta").limit(2));
      const valid = guard && season && open.size === 1 && open.docs[0].id === seasonId && guard.seasonId === seasonId
        && season.seasonId === seasonId && season.groupId === groupId && season.estado === "abierta";
      return Object.freeze({ status: valid ? "open" : "not_modifiable" });
    },
  });
}

module.exports = { createAdministrativeMembershipFinalizationContextCapability };
