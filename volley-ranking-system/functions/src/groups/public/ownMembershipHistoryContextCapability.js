"use strict";

const { createFirestoreGroupRepository } = require("../infrastructure/firestoreGroupRepository");
const { createFirestoreSeasonRepository } = require("../infrastructure/firestoreSeasonRepository");

function createOwnMembershipHistoryContextCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const groupRepository = createFirestoreGroupRepository({ db });
  const seasonRepository = createFirestoreSeasonRepository({ db });

  return Object.freeze({
    async getMany({ unitOfWork, groupIds, seasonIds }) {
      const groupRefs = groupIds.map((id) => groupRepository.reference(id));
      const seasonRefs = seasonIds.map((id) => seasonRepository.reference(id));
      const refs = [...groupRefs, ...seasonRefs];
      const snapshots = refs.length ? await unitOfWork.getAll(...refs) : [];
      const groups = new Map();
      const seasons = new Map();
      snapshots.slice(0, groupRefs.length).forEach((snapshot, index) => {
        groups.set(groupIds[index], groupRepository.fromSnapshot(snapshot));
      });
      snapshots.slice(groupRefs.length).forEach((snapshot, index) => {
        seasons.set(seasonIds[index], seasonRepository.fromSnapshot(snapshot));
      });
      return Object.freeze({ groups, seasons, reads: refs.length });
    },
  });
}

module.exports = { createOwnMembershipHistoryContextCapability };
