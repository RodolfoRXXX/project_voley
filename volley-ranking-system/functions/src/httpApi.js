const functions = require("firebase-functions/v1");
const { admin, db } = require("./firebase");

function getBearerToken(authHeader = "") {
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function getAuthContext(req) {
  const token = getBearerToken(req.headers.authorization || "");
  if (!token) {
    return { uid: null, isSystemAdmin: false };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userSnap = await db.collection("users").doc(decoded.uid).get();
    const isSystemAdmin = userSnap.exists && userSnap.data()?.roles === "admin";
    return { uid: decoded.uid, isSystemAdmin };
  } catch (_err) {
    return { uid: null, isSystemAdmin: false };
  }
}

function ownerIdFromGroup(group = {}) {
  if (Array.isArray(group.admins) && group.admins.length > 0) {
    const owner = [...group.admins].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];
    if (owner?.userId) return String(owner.userId);
  }

  return group.ownerId || group.adminId || null;
}

async function mapUser(userId) {
  if (!userId) return null;
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return null;

  const user = userSnap.data();
  return {
    id: userId,
    name: user?.nombre || "Sin nombre",
    email: user?.email || null,
  };
}

async function buildGroupPayload(groupDoc) {
  const group = groupDoc.data();
  const ownerId = ownerIdFromGroup(group);
  const owner = await mapUser(ownerId);

  const matchesCountSnap = await db
    .collection("matches")
    .where("groupId", "==", groupDoc.id)
    .count()
    .get();

  return {
    id: groupDoc.id,
    name: group?.nombre || "",
    description: group?.descripcion || "",
    visibility: group?.visibility === "public" ? "public" : "private",
    joinApproval: group?.joinApproval ?? true,
    totalMatches: matchesCountSnap.data().count || 0,
    owner,
  };
}

async function getPublicGroupOrAdmin(groupId, authContext) {
  const groupSnap = await db.collection("groups").doc(groupId).get();
  if (!groupSnap.exists) return null;

  const group = groupSnap.data();
  const canSee = authContext.isSystemAdmin || group?.visibility === "public";

  if (!canSee) return null;

  return { id: groupSnap.id, ...group };
}

async function handleListPublicGroups(req, res, authContext) {
  const groupsRef = db.collection("groups");
  const snap = authContext.isSystemAdmin
    ? await groupsRef.get()
    : await groupsRef.where("visibility", "==", "public").get();

  const groups = await Promise.all(snap.docs.map(buildGroupPayload));
  res.status(200).json({ groups });
}

async function handleGroupDetail(req, res, authContext, groupId) {
  const group = await getPublicGroupOrAdmin(groupId, authContext);

  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
  const members = (await Promise.all(memberIds.map((id) => mapUser(String(id))))).filter(Boolean);

  const matchesSnap = await db
    .collection("matches")
    .where("groupId", "==", groupId)
    .orderBy("horaInicio", "desc")
    .get();

  const matches = matchesSnap.docs
    .map((doc) => {
      const match = doc.data();
      if (!authContext.isSystemAdmin && match?.visibility !== "public") return null;

      return {
        id: doc.id,
        title: match?.titulo || "Partido",
        visibility: match?.visibility || "group_only",
        startsAt: match?.horaInicio?.toDate?.()?.toISOString?.() || null,
        status: match?.estado || null,
      };
    })
    .filter(Boolean);

  res.status(200).json({
    group: {
      id: groupId,
      name: group?.nombre || "",
      description: group?.descripcion || "",
      visibility: group?.visibility === "public" ? "public" : "private",
      joinApproval: group?.joinApproval ?? true,
      members,
      memberIds,
    },
    matches,
  });
}

async function handleJoinGroup(req, res, authContext, groupId) {
  if (!authContext.uid) {
    res.status(401).json({ error: "Debes iniciar sesión para unirte" });
    return;
  }

  const group = await getPublicGroupOrAdmin(groupId, authContext);
  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  const uniqueMemberIds = Array.from(new Set([...(group.memberIds || []), authContext.uid]));
  await db.collection("groups").doc(groupId).update({ memberIds: uniqueMemberIds });

  res.status(200).json({ ok: true, memberIds: uniqueMemberIds });
}

module.exports = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const authContext = await getAuthContext(req);

  if (req.method === "GET" && req.path === "/groups/public") {
    await handleListPublicGroups(req, res, authContext);
    return;
  }

  const detailMatch = req.path.match(/^\/groups\/([^/]+)\/public$/);
  if (req.method === "GET" && detailMatch) {
    await handleGroupDetail(req, res, authContext, detailMatch[1]);
    return;
  }

  const joinMatch = req.path.match(/^\/groups\/([^/]+)\/join$/);
  if (req.method === "POST" && joinMatch) {
    await handleJoinGroup(req, res, authContext, joinMatch[1]);
    return;
  }

  res.status(404).json({ error: "Not found" });
});
