const functions = require("firebase-functions/v1");
const { admin, db } = require("./firebase");
const { normalizeGroupAdmins } = require("./services/groupAdminsService");

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

  return group.ownerId || null;
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
  const normalizedAdminIds = cleanStringArray(group.adminIds);
  const adminIdsFromList = cleanStringArray(group.admins?.map((admin) => admin?.userId));
  const ownerFallbackIds = cleanStringArray([group.ownerId]);

  return Array.from(new Set([...normalizedAdminIds, ...adminIdsFromList, ...ownerFallbackIds]));
}

function canManageGroup(group = {}, authContext) {
  if (!authContext?.uid) return false;
  return getGroupAdminIds(group).includes(authContext.uid);
}

function canManageGroupAsOwner(group = {}, authContext) {
  if (!authContext?.uid) return false;
  return normalizeGroupAdmins(group).ownerId === String(authContext.uid);
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
  const isGroupMember =
    !!authContext.uid && (memberIds.includes(authContext.uid) || adminIds.includes(authContext.uid));

  if (!authContext.isSystemAdmin && !isGroupMember) {
    res.status(403).json({ error: "Debes ser integrante del grupo para ver el detalle" });
    return;
  }

  const pendingRequestIds = cleanStringArray(group.pendingRequestIds).filter(
    (id) => !memberIds.includes(id)
  );
  const pendingAdminRequestIds = cleanStringArray(group.pendingAdminRequestIds).filter(
    (id) => !adminIds.includes(id)
  );

  const members = (await Promise.all(memberIds.map((id) => mapUser(String(id)))))
    .filter(Boolean)
    .map((member) => ({ ...member, isAdmin: adminIds.includes(member.id) }));

  const admins = sortMembersByName(members.filter((member) => member.isAdmin));
  const players = sortMembersByName(members.filter((member) => !member.isAdmin));

  const pendingRequests = sortMembersByName(
    (await Promise.all(pendingRequestIds.map((id) => mapUser(String(id))))).filter(Boolean)
  );
  const pendingAdminRequests = sortMembersByName(
    (await Promise.all(pendingAdminRequestIds.map((id) => mapUser(String(id))))).filter(Boolean)
  );

  const canManageMembers = canManageGroup(group, authContext);
  const isGroupAdmin = !!authContext.uid && adminIds.includes(authContext.uid);
  const isGroupOwner = canManageGroupAsOwner(group, authContext);
  const canRequestAdminRole =
    !!authContext.uid && authContext.isSystemAdmin && isGroupMember && !isGroupAdmin;

  const matchesSnap = await db
    .collection("matches")
    .where("groupId", "==", groupId)
    .orderBy("horaInicio", "desc")
    .get();

  const matches = matchesSnap.docs.map((doc) => {
    const match = doc.data();

    return {
      id: doc.id,
      title: match?.titulo || "Partido",
      visibility: match?.visibility || "group_only",
      startsAt: match?.horaInicio?.toDate?.()?.toISOString?.() || null,
      status: match?.estado || null,
    };
  });

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
      ownerId: normalizeGroupAdmins(group).ownerId,
      pendingRequestIds,
      pendingAdminRequestIds,
      canManageMembers,
      canManageAdmins: isGroupOwner,
      canRequestAdminRole,
      pendingAdminRequests,
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
  const normalizedAdmins = normalizeGroupAdmins(group);
  const pendingAdminRequestIds = cleanStringArray(group.pendingAdminRequestIds);

  const isMember = memberIds.includes(authContext.uid);
  const isPending = pendingRequestIds.includes(authContext.uid);
  const isAdmin = normalizedAdmins.adminIds.includes(authContext.uid);
  const isOwner = normalizedAdmins.ownerId === authContext.uid;

  const nextMemberIds = memberIds.filter((id) => id !== authContext.uid);
  const nextPendingRequestIds = pendingRequestIds.filter((id) => id !== authContext.uid);

  let membershipStatus = "none";

  let nextAdmins = normalizedAdmins.admins.map((item) => ({ ...item }));

  if (isMember) {
    if (isOwner && normalizedAdmins.adminIds.length <= 1) {
      res.status(400).json({
        error:
          "El owner no puede abandonar el grupo si es el único admin. Asigna otro admin para que tome su lugar.",
      });
      return;
    }

    membershipStatus = "none";

    const nextPendingAdminIds = pendingAdminRequestIds.filter((id) => id !== authContext.uid);
    pendingAdminRequestIds.length = 0;
    pendingAdminRequestIds.push(...nextPendingAdminIds);

    if (isAdmin) {
      nextAdmins = nextAdmins.filter((item) => item.userId !== authContext.uid);
    }
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

  const normalizedNextAdmins = nextAdmins.map((item, index) => ({
    ...item,
    role: index === 0 ? "owner" : "admin",
    order: index,
  }));

  await db.collection("groups").doc(groupId).update({
    memberIds: Array.from(new Set(nextMemberIds)),
    pendingRequestIds: Array.from(new Set(nextPendingRequestIds)),
    admins: normalizedNextAdmins,
    ownerId: normalizedNextAdmins[0]?.userId || null,
    adminIds: normalizedNextAdmins.map((item) => item.userId),
    pendingAdminRequestIds: Array.from(new Set(pendingAdminRequestIds)),
  });

  res.status(200).json({
    ok: true,
    memberIds: Array.from(new Set(nextMemberIds)),
    pendingRequestIds: Array.from(new Set(nextPendingRequestIds)),
    adminIds: normalizedNextAdmins.map((item) => item.userId),
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

async function handleAdminApplication(req, res, authContext, groupId) {
  if (!authContext.uid || !authContext.isSystemAdmin) {
    res.status(403).json({ error: "Solo un admin puede postularse como admin del grupo" });
    return;
  }

  const group = await getPublicGroupOrAdmin(groupId, authContext);
  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  const adminIds = getGroupAdminIds(group);
  const memberIds = cleanStringArray(group.memberIds);
  if (adminIds.includes(authContext.uid)) {
    res.status(400).json({ error: "Ya eres admin de este grupo" });
    return;
  }

  if (!memberIds.includes(authContext.uid)) {
    res.status(403).json({ error: "Debes ser integrante del grupo para postularte como admin" });
    return;
  }

  const pendingAdminRequestIds = cleanStringArray(group.pendingAdminRequestIds);
  if (!pendingAdminRequestIds.includes(authContext.uid)) {
    pendingAdminRequestIds.push(authContext.uid);
  }

  await db.collection("groups").doc(groupId).update({
    pendingAdminRequestIds: Array.from(new Set(pendingAdminRequestIds)),
  });

  res.status(200).json({ ok: true, pendingAdminRequestIds: Array.from(new Set(pendingAdminRequestIds)) });
}

async function handleAdminRequestAction(req, res, authContext, groupId, userId, action) {
  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) {
      throw new Error("not-found");
    }

    const group = groupSnap.data();

    if (!canManageGroupAsOwner(group, authContext)) {
      throw new Error("forbidden");
    }

    const normalized = normalizeGroupAdmins(group);
    const pendingAdminRequestIds = cleanStringArray(group.pendingAdminRequestIds).filter(
      (id) => id !== String(userId)
    );

    const nextAdmins = [...normalized.admins];

    if (action === "approve" && !normalized.adminIds.includes(String(userId))) {
      nextAdmins.push({
        userId: String(userId),
        role: "admin",
        order: nextAdmins.length,
      });
    }

    const admins = nextAdmins.map((item, index) => ({
      ...item,
      role: index === 0 ? "owner" : "admin",
      order: index,
    }));

    tx.update(groupRef, {
      admins,
      ownerId: admins[0]?.userId || null,
      adminIds: admins.map((a) => a.userId),
      pendingAdminRequestIds,
    });
  }).catch((err) => {
    if (err.message === "not-found") {
      res.status(404).json({ error: "Grupo no encontrado" });
      return;
    }
    if (err.message === "forbidden") {
      res.status(403).json({ error: "Solo el owner puede gestionar solicitudes de administrador" });
      return;
    }
    throw err;
  });

  if (!res.headersSent) {
    res.status(200).json({ ok: true });
  }
}

async function handleAdminRemoval(req, res, authContext, groupId, userId) {
  const groupRef = db.collection("groups").doc(groupId);

  await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) {
      throw new Error("not-found");
    }

    const group = groupSnap.data();
    if (!canManageGroupAsOwner(group, authContext)) {
      throw new Error("forbidden");
    }

    const normalized = normalizeGroupAdmins(group);
    if (!normalized.adminIds.includes(String(userId))) {
      throw new Error("not-admin");
    }

    const filtered = normalized.admins.filter((item) => item.userId !== String(userId));

    if (filtered.length === 0) {
      throw new Error("last-owner");
    }

    const admins = filtered.map((item, index) => ({
      ...item,
      role: index === 0 ? "owner" : "admin",
      order: index,
    }));

    tx.update(groupRef, {
      admins,
      ownerId: admins[0].userId,
      adminIds: admins.map((a) => a.userId),
      pendingAdminRequestIds: cleanStringArray(group.pendingAdminRequestIds).filter(
        (id) => id !== String(userId)
      ),
    });
  }).catch((err) => {
    if (err.message === "not-found") {
      res.status(404).json({ error: "Grupo no encontrado" });
      return;
    }
    if (err.message === "forbidden") {
      res.status(403).json({ error: "Solo el owner puede eliminar administradores" });
      return;
    }
    if (err.message === "not-admin") {
      res.status(404).json({ error: "El usuario no es admin del grupo" });
      return;
    }
    if (err.message === "last-owner") {
      res.status(400).json({ error: "No puedes eliminar al único owner del grupo" });
      return;
    }
    throw err;
  });

  if (!res.headersSent) {
    res.status(200).json({ ok: true });
  }
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

  const adminApplicationMatch = req.path.match(/^\/groups\/([^/]+)\/admin-request$/);
  if (req.method === "POST" && adminApplicationMatch) {
    await handleAdminApplication(req, res, authContext, adminApplicationMatch[1]);
    return;
  }

  const approveAdminRequestMatch = req.path.match(/^\/groups\/([^/]+)\/admin-requests\/([^/]+)\/approve$/);
  if (req.method === "POST" && approveAdminRequestMatch) {
    await handleAdminRequestAction(req, res, authContext, approveAdminRequestMatch[1], approveAdminRequestMatch[2], "approve");
    return;
  }

  const rejectAdminRequestMatch = req.path.match(/^\/groups\/([^/]+)\/admin-requests\/([^/]+)\/reject$/);
  if (req.method === "POST" && rejectAdminRequestMatch) {
    await handleAdminRequestAction(req, res, authContext, rejectAdminRequestMatch[1], rejectAdminRequestMatch[2], "reject");
    return;
  }

  const removeAdminMatch = req.path.match(/^\/groups\/([^/]+)\/admins\/([^/]+)\/remove$/);
  if (req.method === "POST" && removeAdminMatch) {
    await handleAdminRemoval(req, res, authContext, removeAdminMatch[1], removeAdminMatch[2]);
    return;
  }

  res.status(404).json({ error: "Not found" });
});
