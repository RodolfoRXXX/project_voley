export type MembershipState = "activa";

export interface OwnMembership {
  id: string;
  personId: string;
  groupId: string;
  seasonId: string;
  estado: MembershipState;
  fechaIngreso: string;
}

export type MembershipErrorReason =
  | "UNAUTHENTICATED"
  | "ACCOUNT_REQUIRED"
  | "PERSON_REQUIRED"
  | "PERSON_INCOMPATIBLE"
  | "GROUP_NOT_FOUND"
  | "GROUP_INCOMPATIBLE"
  | "NOT_AUTHORIZED"
  | "OPEN_SEASON_REQUIRED"
  | "SEASON_INCOMPATIBLE"
  | "VALIDATION_FAILED"
  | "MEMBERSHIP_ALREADY_EXISTS"
  | "IDEMPOTENCY_CONFLICT"
  | "INCOMPATIBLE_STATE"
  | "CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";
