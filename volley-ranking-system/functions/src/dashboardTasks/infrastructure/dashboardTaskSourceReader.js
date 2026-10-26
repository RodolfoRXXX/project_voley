"use strict";

const { createGroupJoinRequestTaskSource } = require("./groupJoinRequestTaskSource");
const { createPaymentDeliveryDashboardTaskProjectionCapability } = require("../../paymentDeliveries/public/dashboardTaskProjectionCapability");
const { TASK_TYPES, taskId } = require("../application/dashboardTaskModel");

const RESOURCE_TYPES = Object.freeze({ JOIN_REQUEST: "GROUP_JOIN_REQUEST", PAYMENT_DELIVERY: "PAYMENT_DELIVERY" });

function createDashboardTaskSourceReader({ db }) {
  const n20 = createGroupJoinRequestTaskSource({ db });
  const n31 = createPaymentDeliveryDashboardTaskProjectionCapability({ db });
  return Object.freeze({
    async readGroup({ unitOfWork, groupId }) {
      const [requests, deliveries] = await Promise.all([
        n20.readForGroup({ unitOfWork, groupId }), n31.readForGroup({ unitOfWork, groupId }),
      ]);
      return [...requests, ...deliveries];
    },
    async readResources({ unitOfWork, groupId, resourceType, resourceIds }) {
      if (resourceType === RESOURCE_TYPES.JOIN_REQUEST) {
        const items = await n20.readByIds({ unitOfWork, groupId, resourceIds });
        return { items, taskIds: resourceIds.map((id) => taskId(TASK_TYPES.JOIN_REQUEST, id)) };
      }
      if (resourceType === RESOURCE_TYPES.PAYMENT_DELIVERY) {
        const items = await n31.readByIds({ unitOfWork, groupId, resourceIds });
        return { items, taskIds: resourceIds.map((id) => taskId(TASK_TYPES.PAYMENT_DELIVERY, id)) };
      }
      throw Object.assign(new Error("Unsupported dashboard task resource event"), { code: "PROJECTION_EVENT_UNSUPPORTED" });
    },
    async readPage({ unitOfWork, groupId, phase, afterId, limit }) {
      if (phase === TASK_TYPES.JOIN_REQUEST) {
        const page = await n20.readPage({ unitOfWork, groupId, afterId, limit });
        return { ...page, taskIds: page.taskIds.map((id) => taskId(TASK_TYPES.JOIN_REQUEST, id)) };
      }
      if (phase === TASK_TYPES.PAYMENT_DELIVERY) {
        const page = await n31.readPage({ unitOfWork, groupId, afterId, limit });
        return { ...page, taskIds: page.taskIds.map((id) => taskId(TASK_TYPES.PAYMENT_DELIVERY, id)) };
      }
      throw Object.assign(new Error("Unsupported dashboard task scan phase"), { code: "PROJECTION_PHASE_UNSUPPORTED" });
    },
  });
}

module.exports = { createDashboardTaskSourceReader, RESOURCE_TYPES };
