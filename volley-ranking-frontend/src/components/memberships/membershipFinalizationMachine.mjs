const INITIAL = "active";

export function createMembershipFinalizationMachine() {
  let state = INITIAL;
  let inFlight = false;
  const snapshot = () => Object.freeze({ state, inFlight });
  return Object.freeze({
    openConfirmation() { if (state === "active" && !inFlight) state = "confirmation"; return snapshot(); },
    cancel() { if (state === "confirmation" && !inFlight) state = "active"; return snapshot(); },
    begin() { if (state !== "confirmation" || inFlight) return false; inFlight = true; state = "finalizing"; return true; },
    confirm(outcome) { inFlight = false; state = outcome === "ALREADY_FINALIZED" ? "already-finalized" : "finalized"; return snapshot(); },
    fail(reason) {
      inFlight = false;
      if (reason === "MEMBERSHIP_REACTIVATION_REQUIRED") state = "reactivation-required";
      else if (reason === "NOT_AUTHORIZED") state = "not-authorized";
      else if (reason === "INCOMPATIBLE_STATE") state = "incompatible";
      else state = "recoverable";
      return snapshot();
    },
    restoreActive() { inFlight = false; state = INITIAL; return snapshot(); },
    restoreFinalized() { inFlight = false; state = "finalized"; return snapshot(); },
    snapshot,
  });
}
