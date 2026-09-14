const RECOVERABLE = new Set(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);

export function createMembershipSelfExitMachine() {
  let state = "idle";
  let target = null;
  let idempotencyKey = null;
  let inFlight = false;
  const snapshot = () => Object.freeze({ state, target, idempotencyKey, inFlight });
  return Object.freeze({
    open(nextTarget, createKey) {
      if (inFlight || state === "confirmation" || state === "recoverable") return snapshot();
      target = Object.freeze({ ...nextTarget });
      idempotencyKey = createKey();
      state = "confirmation";
      return snapshot();
    },
    cancel() {
      if (state === "confirmation" && !inFlight) {
        state = "idle"; target = null; idempotencyKey = null;
      }
      return snapshot();
    },
    begin() {
      if (!target || !idempotencyKey || inFlight || !["confirmation", "recoverable"].includes(state)) return null;
      inFlight = true; state = "submitting";
      return Object.freeze({ groupId: target.groupId, idempotencyKey });
    },
    fail(reason) {
      inFlight = false;
      if (RECOVERABLE.has(reason)) state = "recoverable";
      else { state = reason === "MEMBERSHIP_SEASON_NOT_MODIFIABLE" ? "season-closed" : "blocked"; idempotencyKey = null; }
      return snapshot();
    },
    confirm() {
      inFlight = false; state = "confirmed"; idempotencyKey = null;
      return snapshot();
    },
    reset() {
      inFlight = false; state = "idle"; target = null; idempotencyKey = null;
      return snapshot();
    },
    snapshot,
  });
}
