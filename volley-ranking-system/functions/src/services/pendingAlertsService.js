const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../firebase");

const PENDING_ALERT_PRIORITIES = {
  urgent: 100,
  warning: 200,
  info: 300,
};

const TOURNAMENT_PENDING_ALERT_KIND_PREFIX = "tournament_";
const TOURNAMENT_GROUP_PENDING_ALERT_KINDS = new Set([
  "group_accepted_in_tournament",
  "group_tournament_team_missing_players",
  "group_tournament_team_payment_pending",
]);

function isTournamentPendingAlertKind(kind) {
  return String(kind || "").startsWith(TOURNAMENT_PENDING_ALERT_KIND_PREFIX)
    || TOURNAMENT_GROUP_PENDING_ALERT_KINDS.has(String(kind || ""));
}

function logTournamentPendingAlertChange(action, { userId, alertId, kind, severity, resource = {}, meta = {} }) {
  if (!isTournamentPendingAlertKind(kind)) return;

  console.log("pendingAlerts.tournamentKindChange", {
    action,
    kind,
    severity: severity || null,
    userId: String(userId),
    alertId: String(alertId),
    tournamentId: resource?.tournamentId || null,
    groupId: resource?.groupId || null,
    pendingCount: typeof meta?.pendingCount === "number" ? meta.pendingCount : null,
    missingPlayersCount: typeof meta?.missingPlayersCount === "number" ? meta.missingPlayersCount : null,
    paymentStatus: meta?.paymentStatus || null,
  });
}

function getPendingAlertRef(userId, alertId) {
  return db
    .collection("users")
    .doc(String(userId))
    .collection("pendingAlerts")
    .doc(String(alertId));
}

async function upsertPendingAlert({
  userId,
  alertId,
  kind,
  severity,
  title,
  message,
  link,
  resource = {},
  meta = {},
  expiresAt = null,
}) {
  if (!userId || !alertId || !kind || !severity) return;

  const ref = getPendingAlertRef(userId, alertId);
  const snap = await ref.get();
  const now = FieldValue.serverTimestamp();

  const payload = {
    kind,
    severity,
    title,
    message,
    status: "active",
    priority: PENDING_ALERT_PRIORITIES[severity],
    dedupeKey: `${userId}:${alertId}`,
    actorScope: {
      userId: String(userId),
    },
    link,
    resource,
    meta,
    expiresAt,
    updatedAt: now,
  };

  if (!snap.exists) {
    payload.createdAt = now;
  }

  await ref.set(payload, { merge: true });
  logTournamentPendingAlertChange("active", payload);
}

async function resolvePendingAlert(userId, alertId) {
  if (!userId || !alertId) return;

  const ref = getPendingAlertRef(userId, alertId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.status !== "active") return;

  const alert = snap.data() || {};

  await ref.set(
    {
      status: "resolved",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logTournamentPendingAlertChange("resolved", {
    userId,
    alertId,
    kind: alert.kind,
    severity: alert.severity,
    resource: alert.resource,
    meta: alert.meta,
  });
}

async function syncCompleteProfilePendingAlert(userId, user = {}) {
  const alertId = "complete_profile";

  if (user?.onboarded === true) {
    await resolvePendingAlert(userId, alertId);
    return;
  }

  await upsertPendingAlert({
    userId,
    alertId,
    kind: "complete_profile",
    severity: "urgent",
    title: "Completá tu perfil",
    message: "Necesario para unirte a grupos y participar en partidos.",
    link: {
      path: "/profile/info",
      label: "Ir a Mi info",
    },
  });
}

async function createGroupMembershipResultAlert({
  userId,
  groupId,
  groupName,
  decision,
}) {
  if (!userId || !groupId || !["accepted", "rejected"].includes(decision)) return;

  const isAccepted = decision === "accepted";
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await upsertPendingAlert({
    userId,
    alertId: `group_membership_result_${groupId}`,
    kind: "group_membership_result",
    severity: "info",
    title: isAccepted ? "Solicitud de grupo aceptada" : "Solicitud de grupo rechazada",
    message: isAccepted
      ? `Fuiste aceptado en ${groupName || "el grupo"}.`
      : `Tu solicitud para unirte a ${groupName || "el grupo"} fue rechazada.`,
    link: {
      path: isAccepted ? `/groups/${groupId}` : "/groups",
      label: isAccepted ? "Ver grupo" : "Ver grupos",
    },
    resource: {
      groupId,
    },
    meta: {
      groupName: groupName || "Grupo",
      decision,
    },
    expiresAt,
  });
}

module.exports = {
  PENDING_ALERT_PRIORITIES,
  TOURNAMENT_GROUP_PENDING_ALERT_KINDS,
  createGroupMembershipResultAlert,
  isTournamentPendingAlertKind,
  resolvePendingAlert,
  syncCompleteProfilePendingAlert,
  upsertPendingAlert,
};
