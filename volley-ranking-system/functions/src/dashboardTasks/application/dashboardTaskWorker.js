"use strict";

function createDashboardTaskWorker({ store }) {
  if (!store) throw new TypeError("store is required");
  async function processOne(eventId) {
    const claimed = await store.claim(eventId); if (!claimed) return { processed: false };
    try {
      let applied; let batches = 0;
      while (batches < 40) {
        applied = await store.apply(claimed); batches += 1;
        if (applied.completed !== false) {
          await store.advanceUntilStable(claimed.groupId);
          return { processed: true, applied: { ...applied, batches } };
        }
      }
      await store.release(claimed);
      return { processed: true, applied: { eventId, groupId: claimed.groupId, completed: false, yielded: true, batches } };
    }
    catch (error) { await store.fail(claimed, error); return { processed: true, error: error?.code || "PROJECTOR_FAILED" }; }
  }
  return Object.freeze({
    processOne,
    async run({ limit = 20 } = {}) {
      const ids = await store.pending(limit); const results = [];
      for (const eventId of ids) {
        const result = await processOne(eventId); if (result.processed) results.push(result.applied || { eventId, error: result.error });
      }
      return { inspected: ids.length, processed: results.length, results };
    },
  });
}

module.exports = { createDashboardTaskWorker };
