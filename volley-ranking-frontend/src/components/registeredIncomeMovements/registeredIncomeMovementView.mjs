export function createLatestRequestGate() {
  let generation = 0;
  let contextKey = "";
  return Object.freeze({
    begin(nextContextKey) {
      contextKey = nextContextKey;
      generation += 1;
      return Object.freeze({ generation, contextKey });
    },
    isCurrent(token) {
      return token?.generation === generation && token?.contextKey === contextKey;
    },
    invalidate(nextContextKey = "") {
      contextKey = nextContextKey;
      generation += 1;
    },
  });
}

export function visibleMovementRows(items, page, pageSize) {
  const safePageSize = pageSize === 50 ? 50 : 20;
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * safePageSize;
  return Object.freeze({ page: safePage, pageCount,
    rows: items.slice(start, start + safePageSize) });
}
