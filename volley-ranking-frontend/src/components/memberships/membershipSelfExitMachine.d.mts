export type MembershipSelfExitTarget = { groupId: string; membershipId: string; groupName: string; viewerIsOwner: boolean };
export type MembershipSelfExitSnapshot = { state: string; target: MembershipSelfExitTarget | null; idempotencyKey: string | null; inFlight: boolean };
export function createMembershipSelfExitMachine(): {
  open(target: MembershipSelfExitTarget, createKey: () => string): MembershipSelfExitSnapshot;
  cancel(): MembershipSelfExitSnapshot;
  begin(): { groupId: string; idempotencyKey: string } | null;
  fail(reason: string): MembershipSelfExitSnapshot;
  confirm(): MembershipSelfExitSnapshot;
  reset(): MembershipSelfExitSnapshot;
  snapshot(): MembershipSelfExitSnapshot;
};
