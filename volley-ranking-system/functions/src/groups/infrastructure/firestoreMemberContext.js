"use strict";

const { InvalidGroupStateError } = require("../domain/group");
const { InvalidSeasonStateError } = require("../domain/season");
const {
  MemberContextDependencyUnavailableError,
  MemberContextError,
  MemberContextIncompatibleError,
  MemberContextInternalError,
} = require("../application/memberContextErrors");
const { hydrateOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");

function requireId(value) {
  if (typeof value !== "string" || !value || value.trim() !== value || value.includes("/")) {
    throw new MemberContextIncompatibleError("Derived Group id is invalid");
  }
  return value;
}

function mapContextError(error) {
  if (error instanceof MemberContextError) return error;
  if (error instanceof InvalidGroupStateError || error instanceof InvalidSeasonStateError
    || error?.reason === "INCOMPATIBLE_STATE") {
    return new MemberContextIncompatibleError(undefined, { cause: error });
  }
  if (isTransientDependencyError(error)) return new MemberContextDependencyUnavailableError({ cause: error });
  return new MemberContextInternalError({ cause: error });
}

function createFirestoreMemberContext({ db, groupRepository, seasonRepository }) {
  if (!db || !groupRepository || !seasonRepository) {
    throw new TypeError("Member context dependencies are required");
  }

  return Object.freeze({
    async getMemberReadableGroupContext({ groupId }) {
      requireId(groupId);
      try {
        const group = await groupRepository.getById(groupId);
        if (!group || group.groupId !== groupId || group.estado !== "activo") {
          throw new MemberContextIncompatibleError("Group is absent or inactive");
        }
        return Object.freeze({ id: group.groupId, nombre: group.nombre, deporte: group.deporte, estado: group.estado });
      } catch (error) {
        throw mapContextError(error);
      }
    },

    async getOpenSeasonContextForMembership({ groupId }) {
      requireId(groupId);
      try {
        return await db.runTransaction(async (transaction) => {
          const openQuery = db.collection("seasons")
            .where("groupId", "==", groupId)
            .where("estado", "==", "abierta")
            .limit(2);
          const openSnapshot = await transaction.get(openQuery);
          const openSeasons = openSnapshot.docs.map((snapshot) => seasonRepository.fromSnapshot(snapshot));
          const guard = hydrateOpenSeasonGuard(
            await transaction.get(db.collection("openSeasonGuards").doc(groupId)),
            groupId
          );

          if (openSeasons.length === 0 && !guard) return null;
          if (openSeasons.length !== 1 || !guard) {
            throw new MemberContextIncompatibleError("Open Season cardinality and guard are inconsistent");
          }
          const season = openSeasons[0];
          if (!season || season.seasonId !== guard.seasonId
            || season.groupId !== groupId || season.estado !== "abierta") {
            throw new MemberContextIncompatibleError("Open Season guard reference is inconsistent");
          }
          return Object.freeze({ id: season.seasonId, groupId: season.groupId, estado: season.estado });
        });
      } catch (error) {
        throw mapContextError(error);
      }
    },
  });
}

module.exports = { createFirestoreMemberContext, mapContextError, requireId };
