export type GroupJoinRequestState = "pendiente" | "cancelada" | "rechazada" | "aprobada";
export type GroupJoinRequestDecisionStatus = "PENDING" | "APPROVAL_IN_PROGRESS";
export interface KnownGroupJoinPreview { id: string; nombre: string; deporte: string; }
export interface PendingOwnGroupJoinRequest { id: string; groupId: string; estado: "pendiente"; decisionStatus: GroupJoinRequestDecisionStatus; createdAt: string; }
export interface CancelledOwnGroupJoinRequest { id: string; groupId: string; estado: "cancelada"; createdAt: string; cancelledAt: string; }
export interface DecidedOwnGroupJoinRequest { id: string; groupId: string; estado: "aprobada" | "rechazada"; createdAt: string; decidedAt: string; }
export type OwnGroupJoinRequest = PendingOwnGroupJoinRequest | CancelledOwnGroupJoinRequest | DecidedOwnGroupJoinRequest;
export interface PendingGroupJoinRequestForOwner { id: string; estado: "pendiente"; decisionStatus: GroupJoinRequestDecisionStatus; createdAt: string; person: { firstName: string; lastName: string }; }
export type ApproveGroupJoinRequestResult = { outcome: "APPROVED" | "ALREADY_APPROVED"; decision: { requestId: string; estado: "aprobada"; decidedAt: string; membership: { id: string; seasonId: string } } };
export type RejectGroupJoinRequestResult = { outcome: "REJECTED" | "ALREADY_REJECTED"; decision: { requestId: string; estado: "rechazada"; decidedAt: string } };
export type GroupJoinRequestDecisionResult =
  | { status: "PENDING"; request: { id: string; estado: "pendiente"; createdAt: string } }
  | { status: "APPROVAL_IN_PROGRESS"; request: { id: string; estado: "pendiente"; createdAt: string }; startedAt: string }
  | { status: "CANCELLED"; request: { id: string; estado: "cancelada"; createdAt: string; cancelledAt: string } }
  | { status: "REJECTED"; request: { id: string; estado: "rechazada"; createdAt: string; decidedAt: string } }
  | { status: "APPROVED"; request: { id: string; estado: "aprobada"; createdAt: string; decidedAt: string }; membership: { id: string; seasonId: string } };
export type GroupJoinRequestErrorReason = "UNAUTHENTICATED" | "ACCOUNT_REQUIRED" | "PERSON_REQUIRED" | "PERSON_INCOMPATIBLE" | "GROUP_NOT_AVAILABLE" | "GROUP_INCOMPATIBLE" | "OWNER_CANNOT_REQUEST" | "ACTIVE_MEMBERSHIP_EXISTS" | "REQUEST_ALREADY_PENDING" | "REQUEST_NOT_FOUND" | "REQUEST_NOT_PENDING" | "REQUEST_CANCELLED" | "DECISION_ALREADY_APPROVED" | "DECISION_ALREADY_REJECTED" | "APPROVAL_IN_PROGRESS" | "OPEN_SEASON_REQUIRED" | "SEASON_INCOMPATIBLE" | "MEMBERSHIP_REACTIVATION_REQUIRED" | "NOT_AUTHORIZED" | "VALIDATION_FAILED" | "IDEMPOTENCY_CONFLICT" | "INCOMPATIBLE_STATE" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR";
