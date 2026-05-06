const functions = require("firebase-functions/v1");
const {
  resolvePendingAlert,
  upsertPendingAlert,
} = require("../services/pendingAlertsService");
const { syncAcceptedTournamentAlertsForGroup } = require("../services/tournamentPendingAlertsService");

function cleanStringArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item)).filter(Boolean)));
}

function getGroupAdminIds(group = {}) {
  const adminIds = cleanStringArray(group.adminIds);
  const adminsListIds = cleanStringArray(group.admins?.map((admin) => admin?.userId));
  const ownerIds = cleanStringArray([group.ownerId]);

  return Array.from(new Set([...adminIds, ...adminsListIds, ...ownerIds]));
}

function getGroupOwnerId(group = {}) {
  if (Array.isArray(group.admins) && group.admins.length > 0) {
    const owner = [...group.admins]
      .filter((admin) => admin?.userId)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];

    if (owner?.userId) return String(owner.userId);
  }

  return group.ownerId ? String(group.ownerId) : null;
}

function getJoinRequestsCount(group = {}) {
  const memberIds = new Set(cleanStringArray(group.memberIds));
  return cleanStringArray(group.pendingRequestIds).filter((userId) => !memberIds.has(userId)).length;
}

function getAdminRequestsCount(group = {}) {
  const adminIds = new Set(getGroupAdminIds(group));
  return cleanStringArray(group.pendingAdminRequestIds).filter((userId) => !adminIds.has(userId)).length;
}

function getGroupName(group = {}) {
  return String(group.nombre || group.name || "Grupo");
}

function joinRequestsAlertId(groupId) {
  return `group_join_requests_pending_${groupId}`;
}

function adminRequestsAlertId(groupId) {
  return `group_admin_requests_pending_${groupId}`;
}

async function syncJoinRequestsAlerts(groupId, beforeGroup, afterGroup) {
  const beforeAdminIds = getGroupAdminIds(beforeGroup || {});
  const afterAdminIds = afterGroup ? getGroupAdminIds(afterGroup) : [];
  const affectedAdminIds = Array.from(new Set([...beforeAdminIds, ...afterAdminIds]));
  const pendingCount = afterGroup ? getJoinRequestsCount(afterGroup) : 0;
  const afterAdminIdsSet = new Set(afterAdminIds);
  const alertId = joinRequestsAlertId(groupId);

  await Promise.all(
    affectedAdminIds.map((adminId) => {
      if (afterAdminIdsSet.has(adminId) && pendingCount > 0) {
        return upsertPendingAlert({
          userId: adminId,
          alertId,
          kind: "group_join_requests_pending",
          severity: "warning",
          title: "Solicitudes pendientes de ingreso",
          message: `${getGroupName(afterGroup)} tiene ${pendingCount} solicitud${pendingCount === 1 ? "" : "es"} pendiente${pendingCount === 1 ? "" : "s"}.`,
          link: {
            path: `/admin/groups/${groupId}`,
            label: "Revisar grupo",
          },
          resource: {
            groupId,
          },
          meta: {
            groupName: getGroupName(afterGroup),
            pendingCount,
          },
        });
      }

      return resolvePendingAlert(adminId, alertId);
    })
  );
}

async function syncAdminRequestsAlerts(groupId, beforeGroup, afterGroup) {
  const beforeOwnerId = beforeGroup ? getGroupOwnerId(beforeGroup) : null;
  const afterOwnerId = afterGroup ? getGroupOwnerId(afterGroup) : null;
  const affectedOwnerIds = Array.from(new Set([beforeOwnerId, afterOwnerId].filter(Boolean)));
  const pendingCount = afterGroup ? getAdminRequestsCount(afterGroup) : 0;
  const alertId = adminRequestsAlertId(groupId);

  await Promise.all(
    affectedOwnerIds.map((ownerId) => {
      if (ownerId === afterOwnerId && pendingCount > 0) {
        return upsertPendingAlert({
          userId: ownerId,
          alertId,
          kind: "group_admin_requests_pending",
          severity: "warning",
          title: "Postulaciones a administrador pendientes",
          message: `${getGroupName(afterGroup)} tiene ${pendingCount} postulación${pendingCount === 1 ? "" : "es"} pendiente${pendingCount === 1 ? "" : "s"}.`,
          link: {
            path: `/admin/groups/${groupId}`,
            label: "Revisar grupo",
          },
          resource: {
            groupId,
          },
          meta: {
            groupName: getGroupName(afterGroup),
            pendingCount,
          },
        });
      }

      return resolvePendingAlert(ownerId, alertId);
    })
  );
}

module.exports = functions.firestore
  .document("groups/{groupId}")
  .onWrite(async (change, context) => {
    const beforeGroup = change.before.exists ? change.before.data() : null;
    const afterGroup = change.after.exists ? change.after.data() : null;
    const groupId = context.params.groupId;

    await Promise.all([
      syncJoinRequestsAlerts(groupId, beforeGroup, afterGroup),
      syncAdminRequestsAlerts(groupId, beforeGroup, afterGroup),
      syncAcceptedTournamentAlertsForGroup(groupId, beforeGroup, afterGroup),
    ]);

    return null;
  });
