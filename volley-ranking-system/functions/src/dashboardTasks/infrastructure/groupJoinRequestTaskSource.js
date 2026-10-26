"use strict";

const { createGroupJoinRequestDashboardTaskProjectionCapability } = require("../../groupJoinRequests/public/dashboardTaskProjectionCapability");
const { createGroupOwnershipContextCapability } = require("../../groups/public/groupOwnershipContextCapability");
const { createTreasuryAccountIdentityCapability } = require("../../users/public/treasuryAccountIdentityCapability");
const { TASK_TYPES, taskId } = require("../application/dashboardTaskModel");

function createGroupJoinRequestTaskSource({ db }) {
  const source = createGroupJoinRequestDashboardTaskProjectionCapability({ db });
  const ownership = createGroupOwnershipContextCapability({ db });
  const identities = createTreasuryAccountIdentityCapability({ db });
  async function owner(unitOfWork, groupId) {
    const group = await ownership.getOwnershipContext({ unitOfWork, groupId });
    if (group.status !== "READY" || group.estado !== "activo") return null;
    if ((await identities.getCanonicalAccount({ unitOfWork, accountId: group.ownerId })).status !== "READY") return null;
    return group.ownerId;
  }
  function project(requests, groupId, ownerId) {
    if (!ownerId) return [];
    return requests.map((request) => ({
      taskId: taskId(TASK_TYPES.JOIN_REQUEST, request.requestId), taskType: TASK_TYPES.JOIN_REQUEST, resourceId: request.requestId,
      groupId, seasonId: null, recipients: [ownerId], actionableAt: request.createdAt,
      sourceRevision: request.sourceRevision,
      route: { name: "group-join-requests", params: { groupId }, query: { requestId: request.requestId } },
    }));
  }
  return Object.freeze({
    async readForGroup({ unitOfWork, groupId }) {
      const ownerId = await owner(unitOfWork, groupId);
      return project(await source.readForGroup({ unitOfWork, groupId }), groupId, ownerId);
    },
    async readByIds({ unitOfWork, groupId, resourceIds }) {
      const ownerId = await owner(unitOfWork, groupId);
      return project(await source.readByIds({ unitOfWork, groupId, resourceIds }), groupId, ownerId);
    },
    async readPage({ unitOfWork, groupId, afterId, limit }) {
      const ownerId = await owner(unitOfWork, groupId);
      const page = await source.readPage({ unitOfWork, groupId, afterId, limit });
      return { ...page, items: project(page.items, groupId, ownerId) };
    },
  });
}

module.exports = { createGroupJoinRequestTaskSource };
