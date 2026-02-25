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
    photoURL: user?.photoURL || null,
    positions: Array.isArray(user?.posicionesPreferidas) ? user.posicionesPreferidas : [],
  };
}

function sortMembersByName(members = []) {
  return [...members].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item))));
}

function getGroupAdminIds(group = {}) {
  const adminIds = cleanStringArray(group.adminIds);
  if (adminIds.length > 0) return adminIds;
  return cleanStringArray(group.admins?.map((admin) => admin?.userId));
}

function canManageGroup(group = {}, authContext) {
  if (authContext?.isSystemAdmin) return true;
  if (!authContext?.uid) return false;
  return getGroupAdminIds(group).includes(authContext.uid);
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
    active: group?.activo !== false,
    totalMatches: matchesCountSnap.data().count || 0,
    owner,
    memberIds: cleanStringArray(group?.memberIds),
    adminIds: getGroupAdminIds(group),
    pendingRequestIds: cleanStringArray(group?.pendingRequestIds),
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
    ? await groupsRef.where("activo", "==", true).get()
    : await groupsRef.where("visibility", "==", "public").where("activo", "==", true).get();

  const groups = await Promise.all(snap.docs.map(buildGroupPayload));
  res.status(200).json({ groups });
}

async function handleGroupDetail(req, res, authContext, groupId) {
  const group = await getPublicGroupOrAdmin(groupId, authContext);

  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  const memberIds = cleanStringArray(group.memberIds);
  const adminIds = getGroupAdminIds(group);
  const pendingRequestIds = cleanStringArray(group.pendingRequestIds).filter(
    (id) => !memberIds.includes(id)
  );

  const members = (await Promise.all(memberIds.map((id) => mapUser(String(id)))))
    .filter(Boolean)
    .map((member) => ({ ...member, isAdmin: adminIds.includes(member.id) }));

  const admins = sortMembersByName(members.filter((member) => member.isAdmin));
  const players = sortMembersByName(members.filter((member) => !member.isAdmin));

  const pendingRequests = sortMembersByName(
    (await Promise.all(pendingRequestIds.map((id) => mapUser(String(id))))).filter(Boolean)
  );

  const canManageMembers = canManageGroup(group, authContext);

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
      members: [...admins, ...players],
      pendingRequests,
      memberIds,
      adminIds,
      pendingRequestIds,
      canManageMembers,
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

  const memberIds = cleanStringArray(group.memberIds);
  const pendingRequestIds = cleanStringArray(group.pendingRequestIds);

  const isMember = memberIds.includes(authContext.uid);
  const isPending = pendingRequestIds.includes(authContext.uid);

  const nextMemberIds = memberIds.filter((id) => id !== authContext.uid);
  const nextPendingRequestIds = pendingRequestIds.filter((id) => id !== authContext.uid);

  let membershipStatus = "none";

  if (isMember) {
    membershipStatus = "none";
  } else if (group.joinApproval ?? true) {
    if (isPending) {
      membershipStatus = "none";
    } else {
      nextPendingRequestIds.push(authContext.uid);
      membershipStatus = "pending";
    }
  } else {
    nextMemberIds.push(authContext.uid);
    membershipStatus = "member";
  }

  await db.collection("groups").doc(groupId).update({
    memberIds: Array.from(new Set(nextMemberIds)),
    pendingRequestIds: Array.from(new Set(nextPendingRequestIds)),
  });

  res.status(200).json({
    ok: true,
    memberIds: Array.from(new Set(nextMemberIds)),
    pendingRequestIds: Array.from(new Set(nextPendingRequestIds)),
    membershipStatus,
  });
}

async function handleGroupMemberRemoval(req, res, authContext, groupId, userId) {
  const group = await getPublicGroupOrAdmin(groupId, authContext);
  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  if (!canManageGroup(group, authContext)) {
    res.status(403).json({ error: "No tienes permisos para gestionar integrantes" });
    return;
  }

  const memberIds = cleanStringArray(group.memberIds).filter((id) => id !== String(userId));

  await db.collection("groups").doc(groupId).update({ memberIds });
  res.status(200).json({ ok: true, memberIds });
}

async function handleJoinRequestAction(req, res, authContext, groupId, userId, action) {
  const group = await getPublicGroupOrAdmin(groupId, authContext);
  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  if (!canManageGroup(group, authContext)) {
    res.status(403).json({ error: "No tienes permisos para gestionar solicitudes" });
    return;
  }

  const memberIds = cleanStringArray(group.memberIds);
  const pendingRequestIds = cleanStringArray(group.pendingRequestIds).filter((id) => id !== String(userId));

  if (action === "approve" && !memberIds.includes(String(userId))) {
    memberIds.push(String(userId));
  }

  await db.collection("groups").doc(groupId).update({
    memberIds: Array.from(new Set(memberIds)),
    pendingRequestIds,
  });

  res.status(200).json({
    ok: true,
    memberIds: Array.from(new Set(memberIds)),
    pendingRequestIds,
  });
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

  const removeMemberMatch = req.path.match(/^\/groups\/([^/]+)\/members\/([^/]+)\/remove$/);
  if (req.method === "POST" && removeMemberMatch) {
    await handleGroupMemberRemoval(req, res, authContext, removeMemberMatch[1], removeMemberMatch[2]);
    return;
  }

  const approveJoinRequestMatch = req.path.match(/^\/groups\/([^/]+)\/requests\/([^/]+)\/approve$/);
  if (req.method === "POST" && approveJoinRequestMatch) {
    await handleJoinRequestAction(req, res, authContext, approveJoinRequestMatch[1], approveJoinRequestMatch[2], "approve");
    return;
  }

  const rejectJoinRequestMatch = req.path.match(/^\/groups\/([^/]+)\/requests\/([^/]+)\/reject$/);
  if (req.method === "POST" && rejectJoinRequestMatch) {
    await handleJoinRequestAction(req, res, authContext, rejectJoinRequestMatch[1], rejectJoinRequestMatch[2], "reject");
    return;
  }

  res.status(404).json({ error: "Not found" });
});
