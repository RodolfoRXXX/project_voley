export class StaleDashboardTaskResponseError extends Error {
  constructor() { super("STALE_RESPONSE"); this.name = "StaleDashboardTaskResponseError"; this.reason = "STALE_RESPONSE"; }
}

export function createDashboardTaskRequestGate(getSessionId) {
  let generation = 0;
  return Object.freeze({
    async run(operation) {
      const requestGeneration = ++generation;
      const sessionId = getSessionId();
      if (!sessionId) throw new StaleDashboardTaskResponseError();
      const result = await operation();
      if (generation !== requestGeneration || getSessionId() !== sessionId) throw new StaleDashboardTaskResponseError();
      return result;
    },
    invalidate() { generation += 1; },
  });
}
