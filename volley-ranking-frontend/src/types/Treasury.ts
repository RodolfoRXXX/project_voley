import type { PersonPresentation } from "./Payment";

export type TreasuryGrant = {
  grantId: string;
  capabilityId: "GROUP_TREASURY";
  membershipId: string;
  person: PersonPresentation;
  state: "ACTIVE" | "REVOKED" | "LAPSED";
  grantedAt: string;
  revokedAt?: string;
  lapseReason?: "MEMBERSHIP" | "SEASON" | "OWNERSHIP" | "GROUP";
};
export type TreasuryPage = { items: TreasuryGrant[]; nextCursor?: string };
export type TreasuryErrorReason = "UNAUTHENTICATED" | "VALIDATION_FAILED" | "ACCOUNT_CONTEXT_REQUIRED"
  | "GROUP_NOT_ACCESSIBLE" | "GROUP_NOT_OPERATIONAL" | "MEMBERSHIP_NOT_ELIGIBLE"
  | "TARGET_ACCOUNT_LINK_REQUIRED" | "OPEN_SEASON_REQUIRED" | "TREASURY_GRANT_ALREADY_ACTIVE"
  | "TREASURY_GRANT_NOT_ACCESSIBLE" | "GROUP_TREASURY_NOT_AUTHORIZED" | "IDEMPOTENCY_CONFLICT"
  | "DATA_INCOMPATIBLE" | "PENDING_RECOVERY" | "INTERNAL_ERROR";
