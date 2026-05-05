const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../firebase");

const PENDING_ALERT_PRIORITIES = {
  urgent: 100,
  warning: 200,
  info: 300,
};

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
    updatedAt: now,
  };

  if (!snap.exists) {
    payload.createdAt = now;
  }

  await ref.set(payload, { merge: true });
}

async function resolvePendingAlert(userId, alertId) {
  if (!userId || !alertId) return;

  const ref = getPendingAlertRef(userId, alertId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.status !== "active") return;

  await ref.set(
    {
      status: "resolved",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
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

module.exports = {
  PENDING_ALERT_PRIORITIES,
  resolvePendingAlert,
  syncCompleteProfilePendingAlert,
  upsertPendingAlert,
};
