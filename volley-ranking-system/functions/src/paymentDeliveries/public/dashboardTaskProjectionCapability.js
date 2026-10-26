"use strict";

const { FieldPath } = require("firebase-admin/firestore");
const { createPaymentReviewAudienceCapability } = require("./paymentReviewAudienceCapability");
const { TASK_TYPES, taskId } = require("../../dashboardTasks/application/dashboardTaskModel");

function createPaymentDeliveryDashboardTaskProjectionCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  const audience = createPaymentReviewAudienceCapability({ db });

  async function project({ unitOfWork, groupId, snapshots }) {
      const context = await audience.getGroupAudience({ unitOfWork, groupId });
      if (context.status !== "READY") return [];
      return snapshots.filter((doc) => doc.exists && doc.data().groupId === groupId && doc.data().decisionState === "REPORTED").map((doc) => {
        const data = doc.data();
        const recipients = new Set(context.recipients.filter((recipient) => recipient.kind === "OWNER" || recipient.personId !== data.personId).map((recipient) => recipient.accountId));
        return Object.freeze({
          taskId: taskId(TASK_TYPES.PAYMENT_DELIVERY, doc.id), taskType: TASK_TYPES.PAYMENT_DELIVERY,
          resourceId: doc.id, groupId, seasonId: data.seasonId, recipients: [...recipients],
          actionableAt: data.reportedAt, sourceRevision: data.revision,
          route: { name: "group-payment-deliveries", params: { groupId }, query: { deliveryId: doc.id } },
        });
      });
  }

  return Object.freeze({
    async readForGroup({ unitOfWork, groupId }) {
      const deliveries = await unitOfWork.get(db.collection("paymentDeliveries").where("groupId", "==", groupId).where("decisionState", "==", "REPORTED"));
      return project({ unitOfWork, groupId, snapshots: deliveries.docs });
    },
    async readByIds({ unitOfWork, groupId, resourceIds }) {
      const refs = resourceIds.map((id) => db.collection("paymentDeliveries").doc(id));
      return project({ unitOfWork, groupId, snapshots: refs.length ? await unitOfWork.getAll(...refs) : [] });
    },
    async readPage({ unitOfWork, groupId, afterId, limit }) {
      let query = db.collection("paymentDeliveries").where("groupId", "==", groupId).where("decisionState", "==", "REPORTED").orderBy(FieldPath.documentId()).limit(limit);
      if (afterId) query = query.startAfter(afterId);
      const snapshot = await unitOfWork.get(query);
      return { items: await project({ unitOfWork, groupId, snapshots: snapshot.docs }), taskIds: snapshot.docs.map((doc) => doc.id),
        cursor: snapshot.docs.at(-1)?.id || null, exhausted: snapshot.size < limit };
    },
  });
}

module.exports = { createPaymentDeliveryDashboardTaskProjectionCapability };
