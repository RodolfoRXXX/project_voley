export type GroupSport = "voleibol";
export type GroupState = "activo" | "archivado";

interface OwnGroupBase {
  id: string;
  nombre: string;
  deporte: GroupSport;
  ownerUserId: string;
  createdAt: string;
}

export interface OwnGroupActive extends OwnGroupBase { estado: "activo"; archivedAt?: never }
export interface OwnGroupArchived extends OwnGroupBase { estado: "archivado"; archivedAt: string }
export type OwnGroup = OwnGroupActive | OwnGroupArchived;

export interface DashboardGroup {
  id: string;
  nombre: string;
  deporte: GroupSport;
  estado: "activo";
}

export type GroupErrorReason =
  | "UNAUTHENTICATED"
  | "ACCOUNT_REQUIRED"
  | "GROUP_NOT_ACCESSIBLE"
  | "GROUP_INCOMPATIBLE"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "PROVISIONAL_LIMIT_REACHED"
  | "CONFLICT"
  | "STALE_UPDATE"
  | "STALE_ARCHIVE"
  | "GROUP_ALREADY_ARCHIVED"
  | "ACTIVE_MEMBERSHIPS_EXIST"
  | "OPEN_SEASON_EXISTS"
  | "PENDING_REQUESTS_EXIST"
  | "APPROVAL_IN_PROGRESS"
  | "IDEMPOTENCY_CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_ERROR";
