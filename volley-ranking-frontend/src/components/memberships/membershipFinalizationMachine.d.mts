export type FinalizationState = "active" | "confirmation" | "finalizing" | "finalized" | "already-finalized" | "reactivation-required" | "not-authorized" | "incompatible" | "recoverable";
export interface MembershipFinalizationMachine {
  openConfirmation(): { state: FinalizationState; inFlight: boolean };
  cancel(): { state: FinalizationState; inFlight: boolean };
  begin(): boolean;
  confirm(outcome: "FINALIZED" | "ALREADY_FINALIZED"): { state: FinalizationState; inFlight: boolean };
  fail(reason: string): { state: FinalizationState; inFlight: boolean };
  restoreActive(): { state: FinalizationState; inFlight: boolean };
  restoreFinalized(): { state: FinalizationState; inFlight: boolean };
  snapshot(): { state: FinalizationState; inFlight: boolean };
}
export function createMembershipFinalizationMachine(): MembershipFinalizationMachine;
