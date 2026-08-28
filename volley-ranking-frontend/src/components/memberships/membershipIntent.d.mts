export interface MembershipIntentSnapshot {
  readonly groupId: string;
  readonly key: string | null;
  readonly conflict: boolean;
  readonly confirmedAbsent: boolean;
}

export interface MembershipIntent {
  setGroupId(groupId: string): MembershipIntentSnapshot;
  keyForExplicitAttempt(): string;
  recordFailure(reason: string): MembershipIntentSnapshot;
  confirmMembershipAbsent(): MembershipIntentSnapshot;
  beginNewIntent(): string;
  resolve(): MembershipIntentSnapshot;
  snapshot(): MembershipIntentSnapshot;
}

export function createMembershipIntent(
  initialGroupId: string,
  generateKey: () => string
): MembershipIntent;
