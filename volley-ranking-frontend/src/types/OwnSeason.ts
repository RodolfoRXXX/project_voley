export type SeasonState = "abierta";

export interface OwnSeason {
  id: string;
  groupId: string;
  nombre: string;
  estado: SeasonState;
  fechaInicio: string;
  createdAt: string;
}

export type SeasonErrorReason =
  | "UNAUTHENTICATED"
  | "ACCOUNT_REQUIRED"
  | "GROUP_NOT_FOUND"
  | "GROUP_INCOMPATIBLE"
  | "NOT_AUTHORIZED"
  | "SEASON_NOT_FOUND"
  | "VALIDATION_FAILED"
  | "OPEN_SEASON_ALREADY_EXISTS"
  | "INCOMPATIBLE_STATE"
  | "IDEMPOTENCY_CONFLICT"
  | "CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";
