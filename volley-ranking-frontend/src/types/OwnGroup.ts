export type GroupSport = "voleibol";
export type GroupState = "activo";

export interface OwnGroup {
  id: string;
  nombre: string;
  deporte: GroupSport;
  estado: GroupState;
  ownerUserId: string;
  createdAt: string;
}

export interface DashboardGroup {
  id: string;
  nombre: string;
  deporte: GroupSport;
  estado: GroupState;
}

export type GroupErrorReason =
  | "UNAUTHENTICATED"
  | "ACCOUNT_REQUIRED"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "PROVISIONAL_LIMIT_REACHED"
  | "CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";
