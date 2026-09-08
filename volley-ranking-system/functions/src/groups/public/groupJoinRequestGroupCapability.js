"use strict";

const { InvalidGroupStateError } = require("../domain/group");
const { createFirestoreGroupRepository } = require("../infrastructure/firestoreGroupRepository");

function createGroupJoinRequestGroupCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const repository = createFirestoreGroupRepository({ db });

  async function read(groupId, unitOfWork) {
    try {
      return await repository.getById(groupId, unitOfWork);
    } catch (error) {
      if (error instanceof InvalidGroupStateError) return false;
      throw error;
    }
  }

  return Object.freeze({
    async getCandidateContext({ unitOfWork, groupId, userId }) {
      const group = await read(groupId, unitOfWork);
      if (!group || group.estado !== "activo") return Object.freeze({ status: "not_available" });
      return Object.freeze({
        status: "available",
        isOwner: group.ownerId === userId,
        group: Object.freeze({ id: group.groupId, nombre: group.nombre, deporte: group.deporte }),
      });
    },

    async getOwnedContext({ unitOfWork, groupId, userId }) {
      const group = await read(groupId, unitOfWork);
      if (!group || group.estado !== "activo") return Object.freeze({ status: "incompatible" });
      return Object.freeze({ status: group.ownerId === userId ? "owned" : "not_authorized" });
    },

    async getGroupContextForMembership({ unitOfWork, groupId }) {
      const group = await read(groupId, unitOfWork);
      if (!group || group.estado !== "activo") return Object.freeze({ status: "incompatible" });
      return Object.freeze({ status: "active", groupId: group.groupId });
    },
  });
}

module.exports = { createGroupJoinRequestGroupCapability };
