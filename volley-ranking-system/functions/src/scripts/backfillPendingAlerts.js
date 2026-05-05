const { db } = require("../firebase");
const {
  syncCompleteProfilePendingAlert,
  upsertPendingAlert,
} = require("../services/pendingAlertsService");

const shouldWrite = process.argv.includes("--write");

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

function getGroupName(group = {}) {
  return String(group.nombre || group.name || "Grupo");
}

function getJoinRequestsCount(group = {}) {
  const memberIds = new Set(cleanStringArray(group.memberIds));
  return cleanStringArray(group.pendingRequestIds).filter((userId) => !memberIds.has(userId)).length;
}

function getAdminRequestsCount(group = {}) {
  const adminIds = new Set(getGroupAdminIds(group));
  return cleanStringArray(group.pendingAdminRequestIds).filter((userId) => !adminIds.has(userId)).length;
}

async function maybeWrite(description, operation) {
  if (!shouldWrite) {
    console.log(`[dry-run] ${description}`);
    return;
  }

  await operation();
  console.log(`[write] ${description}`);
}

async function backfillCompleteProfileAlerts() {
  const usersSnap = await db.collection("users").get();
  let processed = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (user?.onboarded === true) continue;

    processed += 1;
    await maybeWrite(`complete_profile -> ${userDoc.id}`, () =>
      syncCompleteProfilePendingAlert(userDoc.id, user)
    );
  }

  return processed;
}

async function backfillGroupAlerts() {
  const groupsSnap = await db.collection("groups").get();
  let processed = 0;

  for (const groupDoc of groupsSnap.docs) {
    const groupId = groupDoc.id;
    const group = groupDoc.data();
    const groupName = getGroupName(group);
    const joinRequestsCount = getJoinRequestsCount(group);
    const adminRequestsCount = getAdminRequestsCount(group);

    if (joinRequestsCount > 0) {
      for (const adminId of getGroupAdminIds(group)) {
        processed += 1;
        await maybeWrite(`group_join_requests_pending -> ${adminId}/${groupId}`, () =>
          upsertPendingAlert({
            userId: adminId,
            alertId: `group_join_requests_pending_${groupId}`,
            kind: "group_join_requests_pending",
            severity: "warning",
            title: "Solicitudes pendientes de ingreso",
            message: `${groupName} tiene ${joinRequestsCount} solicitud${joinRequestsCount === 1 ? "" : "es"} pendiente${joinRequestsCount === 1 ? "" : "s"}.`,
            link: {
              path: `/admin/groups/${groupId}`,
              label: "Revisar grupo",
            },
            resource: {
              groupId,
            },
            meta: {
              groupName,
              pendingCount: joinRequestsCount,
            },
          })
        );
      }
    }

    if (adminRequestsCount > 0) {
      const ownerId = getGroupOwnerId(group);
      if (!ownerId) continue;

      processed += 1;
      await maybeWrite(`group_admin_requests_pending -> ${ownerId}/${groupId}`, () =>
        upsertPendingAlert({
          userId: ownerId,
          alertId: `group_admin_requests_pending_${groupId}`,
          kind: "group_admin_requests_pending",
          severity: "warning",
          title: "Postulaciones a administrador pendientes",
          message: `${groupName} tiene ${adminRequestsCount} postulación${adminRequestsCount === 1 ? "" : "es"} pendiente${adminRequestsCount === 1 ? "" : "s"}.`,
          link: {
            path: `/admin/groups/${groupId}`,
            label: "Revisar grupo",
          },
          resource: {
            groupId,
          },
          meta: {
            groupName,
            pendingCount: adminRequestsCount,
          },
        })
      );
    }
  }

  return processed;
}

async function main() {
  console.log(`Backfill de pendingAlerts iniciado en modo ${shouldWrite ? "write" : "dry-run"}.`);

  const completeProfileCount = await backfillCompleteProfileAlerts();
  const groupAlertsCount = await backfillGroupAlerts();

  console.log("Backfill de pendingAlerts finalizado.", {
    mode: shouldWrite ? "write" : "dry-run",
    completeProfileCount,
    groupAlertsCount,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill de pendingAlerts falló", error);
    process.exit(1);
  });
