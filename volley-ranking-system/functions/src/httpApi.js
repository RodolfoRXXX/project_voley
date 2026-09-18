"use strict";

const functions = require("firebase-functions/v1");
const { admin, db } = require("./firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { getPublicVapidKey } = require("./services/pushService");
const { MAIL_AND_PUSH_SECRETS } = require("./config/functionSecrets");

const LEGACY_GROUP_CAPABILITY_RETIRED = "LEGACY_GROUP_CAPABILITY_RETIRED";
const LEGACY_GROUP_CAPABILITY_RETIRED_MESSAGE = "Esta capacidad ya no está disponible.";
const DEFAULT_ALLOWED_CORS_ORIGINS = ["https://sportexa.site", "https://www.sportexa.site"];
const LOCAL_ALLOWED_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];
const RETIRED_LEGACY_GROUP_ROUTES = [
  ["POST", /^\/groups\/[^/]+\/members\/[^/]+\/add$/],
  ["POST", /^\/groups\/[^/]+\/members\/[^/]+\/remove$/],
  ["GET", /^\/groups\/[^/]+\/members\/search$/],
  ["POST", /^\/groups\/[^/]+\/admin-request$/],
  ["POST", /^\/groups\/[^/]+\/admin-requests\/[^/]+\/approve$/],
  ["POST", /^\/groups\/[^/]+\/admin-requests\/[^/]+\/reject$/],
  ["POST", /^\/groups\/[^/]+\/admins\/[^/]+\/add$/],
  ["POST", /^\/groups\/[^/]+\/admins\/[^/]+\/remove$/],
];

function normalizeOrigin(value) {
  if (!value) return null;
  try { return new URL(String(value).trim()).origin; } catch (_error) { return null; }
}

function getAllowedCorsOrigins() {
  const configuredOrigins = String(process.env.HTTP_API_ALLOWED_ORIGINS || "").split(",").map(normalizeOrigin).filter(Boolean);
  const webAppOrigin = normalizeOrigin(process.env.WEB_APP_URL);
  const localOrigins = process.env.FUNCTIONS_EMULATOR === "true" ? LOCAL_ALLOWED_CORS_ORIGINS : [];
  return new Set([...DEFAULT_ALLOWED_CORS_ORIGINS, ...localOrigins, ...configuredOrigins, ...(webAppOrigin ? [webAppOrigin] : [])]);
}

function applyCors(req, res) {
  const rawOrigin = req.headers.origin;
  if (!rawOrigin) return true;
  const requestOrigin = normalizeOrigin(rawOrigin);
  if (!requestOrigin || !getAllowedCorsOrigins().has(requestOrigin)) return false;
  res.set("Access-Control-Allow-Origin", requestOrigin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Max-Age", "3600");
  return true;
}

function matchRetiredLegacyGroupCapability(method, requestPath) {
  return RETIRED_LEGACY_GROUP_ROUTES.some(([expectedMethod, pattern]) => expectedMethod === method && pattern.test(requestPath));
}

function sendRetiredLegacyGroupCapability(res) {
  res.status(410).type("application/json").json({
    error: { code: LEGACY_GROUP_CAPABILITY_RETIRED, message: LEGACY_GROUP_CAPABILITY_RETIRED_MESSAGE },
  });
}

function isLegacyPublicActiveGroup(group) {
  return group?.schemaVersion !== 1 && group?.visibility === "public" && group?.activo === true;
}

async function countPublicMatches(groupId) {
  const snapshot = await db.collection("matches").where("groupId", "==", groupId).get();
  return snapshot.docs.filter((document) => document.data()?.visibility === "public").length;
}

async function handleListPublicGroups(_req, res) {
  const snapshot = await db.collection("groups").where("visibility", "==", "public").get();
  const groups = await Promise.all(snapshot.docs.filter((document) => isLegacyPublicActiveGroup(document.data())).map(async (document) => {
    const group = document.data();
    return {
      id: document.id,
      name: typeof group.nombre === "string" ? group.nombre : "",
      description: typeof group.descripcion === "string" ? group.descripcion : "",
      visibility: "public",
      active: true,
      totalMatches: await countPublicMatches(document.id),
    };
  }));
  res.status(200).json({ groups });
}

async function handleGroupDetail(_req, res, groupId) {
  const snapshot = await db.collection("groups").doc(groupId).get();
  if (!snapshot.exists || !isLegacyPublicActiveGroup(snapshot.data())) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }
  const group = snapshot.data();
  const matchesSnapshot = await db.collection("matches").where("groupId", "==", groupId).get();
  const matches = matchesSnapshot.docs.filter((document) => document.data()?.visibility === "public").map((document) => {
    const match = document.data();
    return {
      id: document.id,
      title: typeof match.titulo === "string" ? match.titulo : "Partido",
      visibility: "public",
      startsAt: match.horaInicio?.toDate?.()?.toISOString?.() || null,
      status: typeof match.estado === "string" ? match.estado : null,
    };
  });
  res.status(200).json({
    group: {
      id: snapshot.id,
      name: typeof group.nombre === "string" ? group.nombre : "",
      description: typeof group.descripcion === "string" ? group.descripcion : "",
      visibility: "public",
      active: true,
    },
    matches,
  });
}

function getBearerToken(authHeader = "") {
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function getPushSubscriberUid(req) {
  const token = getBearerToken(req.headers.authorization || "");
  if (!token) return null;
  try { return (await admin.auth().verifyIdToken(token)).uid || null; } catch (_error) { return null; }
}

function handleGetPushPublicKey(_req, res) {
  res.status(200).json({ ok: true, vapidPublicKey: getPublicVapidKey() });
}

function isValidPushSubscription(subscription) {
  return !!(subscription && typeof subscription.endpoint === "string" && subscription.endpoint
    && subscription.keys && typeof subscription.keys.p256dh === "string" && typeof subscription.keys.auth === "string");
}

const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 5;
const PUSH_SUBSCRIPTION_RETENTION_DAYS = 180;

async function cleanupUserPushSubscriptions(userId) {
  const cutoff = new Date(Date.now() - PUSH_SUBSCRIPTION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const snapshot = await db.collection("push_subscriptions").where("user_id", "==", String(userId)).orderBy("created_at", "desc").get();
  const batch = db.batch();
  let deleted = 0;
  snapshot.docs.forEach((document, index) => {
    const createdAt = document.data()?.created_at?.toDate?.();
    if ((createdAt instanceof Date && createdAt <= cutoff) || index >= MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
      batch.delete(document.ref);
      deleted += 1;
    }
  });
  if (deleted) await batch.commit();
}

async function handlePushSubscribe(req, res, uid) {
  if (!uid) { res.status(401).json({ error: "Debes iniciar sesión" }); return; }
  const subscription = req.body?.subscription || req.body;
  if (!isValidPushSubscription(subscription)) { res.status(400).json({ error: "Subscription inválida" }); return; }
  const endpoint = String(subscription.endpoint);
  const existing = await db.collection("push_subscriptions").where("endpoint", "==", endpoint).limit(1).get();
  const payload = {
    user_id: uid,
    p256dh_key: String(subscription.keys.p256dh),
    auth_key: String(subscription.keys.auth),
    user_agent: req.headers["user-agent"] || "",
  };
  if (existing.empty) await db.collection("push_subscriptions").add({ ...payload, endpoint, created_at: FieldValue.serverTimestamp(), last_used_at: null });
  else await existing.docs[0].ref.update({ ...payload, last_used_at: FieldValue.serverTimestamp() });
  await cleanupUserPushSubscriptions(uid);
  res.status(200).json({ ok: true, vapidPublicKey: getPublicVapidKey() });
}

module.exports = functions.runWith({ secrets: MAIL_AND_PUSH_SECRETS }).https.onRequest(async (req, res) => {
  const isAllowedCorsOrigin = applyCors(req, res);
  if (req.method === "OPTIONS") { res.status(isAllowedCorsOrigin ? 204 : 403).send(""); return; }
  if (!isAllowedCorsOrigin) { res.status(403).json({ error: "Origen no permitido" }); return; }
  if (matchRetiredLegacyGroupCapability(req.method, req.path)) { sendRetiredLegacyGroupCapability(res); return; }
  if (req.method === "GET" && req.path === "/groups/public") { await handleListPublicGroups(req, res); return; }
  const detailMatch = req.path.match(/^\/groups\/([^/]+)\/public$/);
  if (req.method === "GET" && detailMatch) { await handleGroupDetail(req, res, detailMatch[1]); return; }
  if (req.method === "GET" && req.path === "/push/vapid-public-key") { handleGetPushPublicKey(req, res); return; }
  if (req.method === "POST" && req.path === "/push/subscribe") {
    const uid = await getPushSubscriberUid(req);
    await handlePushSubscribe(req, res, uid);
    return;
  }
  res.status(404).json({ error: "Not found" });
});

module.exports.__test = {
  isLegacyPublicActiveGroup,
  matchRetiredLegacyGroupCapability,
};
