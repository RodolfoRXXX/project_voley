function normalizeGroupAdmins(group = {}) {
  if (Array.isArray(group.admins) && group.admins.length > 0) {
    const deduped = [];
    const seen = new Set();

    for (const item of group.admins) {
      const userId = String(item?.userId || "").trim();
      if (!userId || seen.has(userId)) continue;
      seen.add(userId);
      deduped.push({
        userId,
        role: item?.role === "owner" ? "owner" : "admin",
        order: Number.isInteger(item?.order) ? item.order : deduped.length,
        addedAt: item?.addedAt,
        addedBy: item?.addedBy,
      });
    }

    deduped.sort((a, b) => a.order - b.order);

    const admins = deduped.map((admin, index) => ({
      ...admin,
      role: index === 0 ? "owner" : "admin",
      order: index,
    }));

    return {
      admins,
      ownerId: admins[0].userId,
      adminIds: admins.map((a) => a.userId),
    };
  }

  if (group.adminId) {
    const ownerId = String(group.adminId);
    return {
      admins: [{ userId: ownerId, role: "owner", order: 0 }],
      ownerId,
      adminIds: [ownerId],
    };
  }

  return {
    admins: [],
    ownerId: null,
    adminIds: [],
  };
}

function isGroupAdmin(group, uid) {
  const { adminIds } = normalizeGroupAdmins(group);
  return adminIds.includes(String(uid));
}

function isGroupOwner(group, uid) {
  const { ownerId } = normalizeGroupAdmins(group);
  return String(ownerId) === String(uid);
}

module.exports = {
  normalizeGroupAdmins,
  isGroupAdmin,
  isGroupOwner,
};
