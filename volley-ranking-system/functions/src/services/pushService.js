const webPush = require("web-push");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../firebase");

const COLLECTION = "push_subscriptions";

const vapidPublicKey = process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.NEXT_PUBLIC_PUSH_VAPID_PRIVATE_KEY;
const vapidSubject = process.env.NEXT_PUBLIC_PUSH_VAPID_SUBJECT || "mailto:soporte@sportexa.app";

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn("[PushService] VAPID keys are not configured. Push notifications are disabled.");
}

function normalizePayload(payload) {
  return {
    title: String(payload?.title || "Notificación"),
    body: String(payload?.body || ""),
    url: payload?.url ? String(payload.url) : undefined,
  };
}

async function removeByEndpoint(endpoint) {
  if (!endpoint) return;
  const snap = await db.collection(COLLECTION).where("endpoint", "==", endpoint).get();
  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

async function sendToSubscription(subscriptionDoc, payload) {
  const subscription = {
    endpoint: subscriptionDoc.endpoint,
    keys: {
      p256dh: subscriptionDoc.p256dh_key,
      auth: subscriptionDoc.auth_key,
    },
  };

  try {
    await webPush.sendNotification(subscription, JSON.stringify(normalizePayload(payload)));

    await db.collection(COLLECTION).doc(subscriptionDoc.id).update({
      last_used_at: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  } catch (error) {
    const statusCode = Number(error?.statusCode || 0);
    const isGone = statusCode === 404 || statusCode === 410;

    if (isGone) {
      await removeByEndpoint(subscriptionDoc.endpoint);
    }

    return {
      ok: false,
      statusCode,
      isGone,
      error: error?.message || "push_failed",
    };
  }
}

async function sendToUser(userId, payload) {
  if (!userId) return { sent: 0, failed: 0 };

  const snap = await db.collection(COLLECTION).where("user_id", "==", String(userId)).get();
  if (snap.empty) return { sent: 0, failed: 0 };

  const results = await Promise.all(
    snap.docs.map((docSnap) => sendToSubscription({ id: docSnap.id, ...docSnap.data() }, payload))
  );

  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };
}

async function sendToManyUsers(userIds, payload) {
  const uniqueUserIds = Array.from(new Set((userIds || []).filter(Boolean).map(String)));
  if (!uniqueUserIds.length) return { sent: 0, failed: 0 };

  const allResults = await Promise.all(uniqueUserIds.map((userId) => sendToUser(userId, payload)));
  return allResults.reduce(
    (acc, current) => {
      acc.sent += current.sent;
      acc.failed += current.failed;
      return acc;
    },
    { sent: 0, failed: 0 }
  );
}

function getPublicVapidKey() {
  return vapidPublicKey || "";
}

module.exports = {
  sendToUser,
  sendToManyUsers,
  getPublicVapidKey,
};
