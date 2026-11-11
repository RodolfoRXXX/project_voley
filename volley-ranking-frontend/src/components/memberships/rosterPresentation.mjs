export function mergeRosterPages(current, page) {
  const seen = new Set();
  return [...current, ...page].filter((item) => {
    if (item.isOwner || seen.has(item.membershipId)) return false;
    seen.add(item.membershipId);
    return true;
  });
}
