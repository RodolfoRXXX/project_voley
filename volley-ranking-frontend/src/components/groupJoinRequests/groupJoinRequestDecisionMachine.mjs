export const uncertainDecisionReasons = new Set(["DEPENDENCY_UNAVAILABLE", "CONFLICT", "INTERNAL_ERROR"]);
export function newDecisionIntent(action, requestId, keyFactory) { return Object.freeze({ action, requestId, idempotencyKey: keyFactory() }); }
export function createDecisionIntentRegistry(keyFactory) {
  const intents = new Map();
  const rotateAfterConfirmation = new Set();
  return Object.freeze({
    getOrCreate(action, requestId) {
      const id = `${requestId}:${action}`;
      if (rotateAfterConfirmation.delete(id)) intents.delete(id);
      if (!intents.has(id)) intents.set(id, newDecisionIntent(action, requestId, keyFactory));
      return intents.get(id);
    },
    confirm(action, requestId) { intents.delete(`${requestId}:${action}`); },
    requireNewConfirmation(action, requestId) { rotateAfterConfirmation.add(`${requestId}:${action}`); },
  });
}
export function createRequestFlights() {
  const active = new Set();
  return Object.freeze({
    start(requestId) { if (active.has(requestId)) return false; active.add(requestId); return true; },
    finish(requestId) { active.delete(requestId); },
    isActive(requestId) { return active.has(requestId); },
  });
}
export function scheduleFocus(target, schedule = queueMicrotask) { schedule(() => target?.focus()); }
export function dismissesDecisionDialog(key) { return key === "Escape"; }
export function applyAuthoritativeDecision(items, result) {
  if (["APPROVED", "REJECTED", "CANCELLED"].includes(result.status)) return items.filter((item) => item.id !== result.request.id);
  return items.map((item) => item.id === result.request.id ? { ...item, decisionStatus: result.status } : item);
}
export function shouldConsultAfterDecisionError(reason) { return uncertainDecisionReasons.has(reason); }
