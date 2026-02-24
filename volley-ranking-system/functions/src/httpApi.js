const functions = require("firebase-functions/v1");
const { admin, db } = require("./firebase");

function getBearerToken(authHeader = "") {
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function isSystemAdmin(req) {
  const token = getBearerToken(req.headers.authorization || "");
  if (!token) return false;

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userSnap = await db.collection("users").doc(decoded.uid).get();
    return userSnap.exists && userSnap.data()?.roles === "admin";
  } catch (_err) {
    return false;
  }
}

function ownerIdFromGroup(group = {}) {
  if (Array.isArray(group.admins) && group.admins.length > 0) {
    const owner = [...group.admins].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];
    if (owner?.userId) return String(owner.userId);
  }

  return group.ownerId || group.adminId || null;
}

async function buildGroupPayload(groupDoc) {
  const group = groupDoc.data();
  const ownerId = ownerIdFromGroup(group);

  let owner = null;
  if (ownerId) {
    const ownerSnap = await db.collection("users").doc(ownerId).get();
    if (ownerSnap.exists) {
      const user = ownerSnap.data();
      owner = {
        name: user?.nombre || "Sin nombre",
        email: user?.email || null,
      };
    }
  }

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

module.exports = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET" || req.path !== "/groups/public") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const allowAll = await isSystemAdmin(req);
  const groupsRef = db.collection("groups");

  const snap = allowAll
    ? await groupsRef.get()
    : await groupsRef.where("visibility", "==", "public").get();

  const groups = await Promise.all(snap.docs.map(buildGroupPayload));

  res.status(200).json({ groups });
});
