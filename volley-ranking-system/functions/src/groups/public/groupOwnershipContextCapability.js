"use strict";

const { InvalidGroupStateError } = require("../domain/group");

const ACTIVE_LEGACY = 1;
const ARCHIVED_LEGACY = 2;
const ACTIVE_OWNERSHIP = 3;
const ARCHIVED_OWNERSHIP = 4;

function createGroupOwnershipContextCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const reference = (groupId) => db.collection("groups").doc(groupId);

  function context(snapshot, { requireRevision = true } = {}) {
    if (!snapshot.exists) return Object.freeze({ status: "NOT_FOUND" });
    const data = snapshot.data();
    const compatible = (data?.estado === "activo" && [ACTIVE_LEGACY, ACTIVE_OWNERSHIP].includes(data.schemaVersion))
      || (data?.estado === "archivado" && [ARCHIVED_LEGACY, ARCHIVED_OWNERSHIP].includes(data.schemaVersion));
    if (!compatible || typeof data.ownerId !== "string" || !data.ownerId.trim()) return Object.freeze({ status: "INCOMPATIBLE" });
    if (requireRevision && (!Number.isSafeInteger(data.ownershipRevision) || data.ownershipRevision < 1)) {
      return Object.freeze({ status: "INCOMPATIBLE" });
    }
    return Object.freeze({ status: "READY", groupId: snapshot.id, ownerId: data.ownerId,
      estado: data.estado, ...(requireRevision ? { ownershipRevision: data.ownershipRevision } : {}) });
  }

  return Object.freeze({
    async ensureOwnershipContext({ unitOfWork, groupId }) {
      const ref = reference(groupId); const snapshot = await unitOfWork.get(ref);
      if (!snapshot.exists) return Object.freeze({ status: "NOT_FOUND" });
      const data = snapshot.data();
      if ([ACTIVE_OWNERSHIP, ARCHIVED_OWNERSHIP].includes(data?.schemaVersion)) return context(snapshot);
      if (data?.estado !== "activo" || data?.schemaVersion !== ACTIVE_LEGACY) return Object.freeze({ status: "INCOMPATIBLE" });
      if (Object.hasOwn(data, "ownershipRevision")) return Object.freeze({ status: "INCOMPATIBLE" });
      unitOfWork.update(ref, { ownershipRevision: 1, schemaVersion: ACTIVE_OWNERSHIP });
      return Object.freeze({ status: "READY", groupId, ownerId: data.ownerId, estado: data.estado, ownershipRevision: 1 });
    },
    async getOwnershipContext({ unitOfWork, groupId }) {
      try { return context(await unitOfWork.get(reference(groupId))); }
      catch (error) { if (error instanceof InvalidGroupStateError) return Object.freeze({ status: "INCOMPATIBLE" }); throw error; }
    },
  });
}

module.exports = { createGroupOwnershipContextCapability };
