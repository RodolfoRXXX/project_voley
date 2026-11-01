const collator = new Intl.Collator("es", { sensitivity: "base" });

export function membershipRelationKey(item) {
  return `${item.group.id}\0${item.membership.seasonId}\0${item.membership.fechaIngreso}`;
}

export function historyRelationKey(item) {
  return `${item.group.id}\0${item.season.id}\0${item.joinedAt}`;
}

export function mergePresentableGroups(ownedGroups, memberships) {
  const byId = new Map();
  for (const group of ownedGroups) {
    if (group.estado !== "activo") continue;
    byId.set(group.id, {
      groupId: group.id, name: group.nombre, sport: group.deporte, state: group.estado,
      administers: true, participates: false,
    });
  }
  for (const item of memberships) {
    const current = byId.get(item.group.id);
    byId.set(item.group.id, {
      groupId: item.group.id,
      name: current?.name ?? item.group.nombre,
      sport: current?.sport ?? item.group.deporte,
      state: current?.state ?? item.group.estado,
      administers: current?.administers ?? false,
      participates: true,
      membershipId: item.membership.id,
      membershipKey: membershipRelationKey(item),
    });
  }
  return [...byId.values()].sort((left, right) => collator.compare(left.name, right.name)
    || left.groupId.localeCompare(right.groupId));
}

export function filterPresentableGroups(items, filter) {
  if (filter === "admin") return items.filter((item) => item.administers);
  if (filter === "member") return items.filter((item) => item.participates);
  return items;
}

export function visibleHistoryItems(items, visibleMembershipKeys) {
  return items.filter((item) => item.status !== "CURRENT" || !visibleMembershipKeys.has(historyRelationKey(item)));
}

export async function collectCurrentMembershipPages(fetchPage, isCurrent = () => true, onItems = () => {}) {
  const items = [];
  const seenCursors = new Set();
  let cursor;
  do {
    const page = await fetchPage(cursor);
    if (!isCurrent()) return { items, cancelled: true };
    items.push(...page.items);
    onItems([...items]);
    const next = page.nextCursor ?? undefined;
    if (next && (next === cursor || seenCursors.has(next))) throw new Error("MEMBERSHIP_CURSOR_REPEATED");
    if (next) seenCursors.add(next);
    cursor = next;
  } while (cursor);
  return { items, cancelled: false };
}
