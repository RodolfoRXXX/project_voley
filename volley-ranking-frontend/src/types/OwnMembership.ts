export interface ActiveOwnMembership {
  id: string;
  personId: string;
  groupId: string;
  seasonId: string;
  estado: "activa";
  fechaIngreso: string;
}

export interface FinalizedOwnMembership {
  id: string;
  groupId: string;
  seasonId: string;
  estado: "finalizada";
  fechaIngreso: string;
  fechaEgreso: string;
}

export type OwnMembership = ActiveOwnMembership | FinalizedOwnMembership;

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
  | "MEMBERSHIP_NOT_FOUND"
  | "MEMBERSHIP_NOT_ACTIVE"
  | "MEMBERSHIP_REACTIVATION_REQUIRED"
  | "MEMBERSHIP_SEASON_NOT_MODIFIABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "INCOMPATIBLE_STATE"
  | "CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "GROUP_NOT_ACCESSIBLE"
  | "ROSTER_CONTEXT_CHANGED"
  | "TARGET_MEMBERSHIP_NOT_ACCESSIBLE"
  | "TARGET_IS_SELF"
  | "TARGET_MEMBERSHIP_NOT_ACTIVE"
  | "MEMBERSHIP_ACTIVATION_CHANGED";
