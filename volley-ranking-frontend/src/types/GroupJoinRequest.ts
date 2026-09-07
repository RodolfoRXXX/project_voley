export type GroupJoinRequestState = "pendiente" | "cancelada";
export interface KnownGroupJoinPreview { id: string; nombre: string; deporte: string; }
export interface PendingOwnGroupJoinRequest { id: string; groupId: string; estado: "pendiente"; createdAt: string; }
export interface CancelledOwnGroupJoinRequest { id: string; groupId: string; estado: "cancelada"; createdAt: string; cancelledAt: string; }
export type OwnGroupJoinRequest = PendingOwnGroupJoinRequest | CancelledOwnGroupJoinRequest;
export interface PendingGroupJoinRequestForOwner { id: string; estado: "pendiente"; createdAt: string; person: { firstName: string; lastName: string }; }
export type GroupJoinRequestErrorReason = "UNAUTHENTICATED" | "ACCOUNT_REQUIRED" | "PERSON_REQUIRED" | "PERSON_INCOMPATIBLE" | "GROUP_NOT_AVAILABLE" | "GROUP_INCOMPATIBLE" | "OWNER_CANNOT_REQUEST" | "ACTIVE_MEMBERSHIP_EXISTS" | "REQUEST_ALREADY_PENDING" | "REQUEST_NOT_FOUND" | "REQUEST_NOT_PENDING" | "NOT_AUTHORIZED" | "VALIDATION_FAILED" | "IDEMPOTENCY_CONFLICT" | "INCOMPATIBLE_STATE" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR";
