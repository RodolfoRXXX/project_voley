import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ApproveGroupJoinRequestResult, CancelledOwnGroupJoinRequest, GroupJoinRequestDecisionResult, GroupJoinRequestErrorReason, KnownGroupJoinPreview, OwnGroupJoinRequest, PendingGroupJoinRequestForOwner, RejectGroupJoinRequestResult } from "@/types/GroupJoinRequest";

const previewCallable = httpsCallable<{ groupId: string }, { group: KnownGroupJoinPreview }>(functions, "getKnownGroupJoinPreview");
const createCallable = httpsCallable<{ groupId: string; idempotencyKey: string }, { outcome: "CREATED_PENDING" | "EXISTING_PENDING" | "EXISTING_CANCELLED" | "EXISTING_APPROVED" | "EXISTING_REJECTED"; request: OwnGroupJoinRequest }>(functions, "createMyGroupJoinRequest");
const currentCallable = httpsCallable<{ groupId: string }, { request: OwnGroupJoinRequest | null }>(functions, "getMyCurrentGroupJoinRequest");
const cancelCallable = httpsCallable<{ groupId: string; requestId: string }, { outcome: "CANCELLED" | "ALREADY_CANCELLED"; request: CancelledOwnGroupJoinRequest }>(functions, "cancelMyGroupJoinRequest");
const listCallable = httpsCallable<{ groupId: string; pageSize?: number; cursor?: string }, { items: PendingGroupJoinRequestForOwner[]; nextCursor: string | null }>(functions, "listPendingGroupJoinRequestsForOwnedGroup");
const approveCallable = httpsCallable<{ groupId: string; requestId: string; idempotencyKey: string }, ApproveGroupJoinRequestResult>(functions, "approveGroupJoinRequest");
const rejectCallable = httpsCallable<{ groupId: string; requestId: string; idempotencyKey: string }, RejectGroupJoinRequestResult>(functions, "rejectGroupJoinRequest");
const resultCallable = httpsCallable<{ groupId: string; requestId: string }, GroupJoinRequestDecisionResult>(functions, "getGroupJoinRequestDecisionResult");

export async function getKnownGroupJoinPreview(groupId: string) { return (await previewCallable({ groupId })).data; }
export async function createMyGroupJoinRequest(input: { groupId: string; idempotencyKey: string }) { return (await createCallable(input)).data; }
export async function getMyCurrentGroupJoinRequest(groupId: string) { return (await currentCallable({ groupId })).data; }
export async function cancelMyGroupJoinRequest(groupId: string, requestId: string) { return (await cancelCallable({ groupId, requestId })).data; }
export async function listPendingGroupJoinRequestsForOwnedGroup(input: { groupId: string; pageSize?: number; cursor?: string }) { return (await listCallable(input)).data; }
export async function approveGroupJoinRequest(input: { groupId: string; requestId: string; idempotencyKey: string }) { return (await approveCallable(input)).data; }
export async function rejectGroupJoinRequest(input: { groupId: string; requestId: string; idempotencyKey: string }) { return (await rejectCallable(input)).data; }
export async function getGroupJoinRequestDecisionResult(groupId: string, requestId: string) { return (await resultCallable({ groupId, requestId })).data; }

export function getGroupJoinRequestErrorReason(error: unknown): GroupJoinRequestErrorReason {
  const reason = typeof error === "object" && error !== null && "details" in error && typeof (error as { details?: unknown }).details === "object" && (error as { details?: { reason?: unknown } }).details !== null ? String((error as { details: { reason?: unknown } }).details.reason) : "INTERNAL_ERROR";
  const known: GroupJoinRequestErrorReason[] = ["UNAUTHENTICATED", "ACCOUNT_REQUIRED", "PERSON_REQUIRED", "PERSON_INCOMPATIBLE", "GROUP_NOT_AVAILABLE", "GROUP_INCOMPATIBLE", "OWNER_CANNOT_REQUEST", "ACTIVE_MEMBERSHIP_EXISTS", "REQUEST_ALREADY_PENDING", "REQUEST_NOT_FOUND", "REQUEST_NOT_PENDING", "REQUEST_CANCELLED", "DECISION_ALREADY_APPROVED", "DECISION_ALREADY_REJECTED", "APPROVAL_IN_PROGRESS", "OPEN_SEASON_REQUIRED", "SEASON_INCOMPATIBLE", "MEMBERSHIP_REACTIVATION_REQUIRED", "NOT_AUTHORIZED", "VALIDATION_FAILED", "IDEMPOTENCY_CONFLICT", "INCOMPATIBLE_STATE", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"];
  return known.includes(reason as GroupJoinRequestErrorReason) ? reason as GroupJoinRequestErrorReason : "INTERNAL_ERROR";
}
export function getGroupJoinRequestErrorMessage(reason: GroupJoinRequestErrorReason) {
  const messages: Record<GroupJoinRequestErrorReason, string> = {
    UNAUTHENTICATED: "Necesitás iniciar sesión.", ACCOUNT_REQUIRED: "Necesitás una cuenta disponible.", PERSON_REQUIRED: "Creá tu Persona antes de solicitar ingreso.", PERSON_INCOMPATIBLE: "Tu Persona no es compatible.", GROUP_NOT_AVAILABLE: "El Grupo no está disponible.", GROUP_INCOMPATIBLE: "El Grupo propio no es compatible.", OWNER_CANNOT_REQUEST: "No podés solicitar ingreso a tu propio Grupo.", ACTIVE_MEMBERSHIP_EXISTS: "Existe una Membresía activa ajena a esta aprobación.", REQUEST_ALREADY_PENDING: "Ya existe una solicitud pendiente.", REQUEST_NOT_FOUND: "No encontramos la solicitud.", REQUEST_NOT_PENDING: "La solicitud ya no admite cancelación.", REQUEST_CANCELLED: "La solicitud fue cancelada.", DECISION_ALREADY_APPROVED: "La solicitud ya fue aprobada.", DECISION_ALREADY_REJECTED: "La solicitud ya fue rechazada.", APPROVAL_IN_PROGRESS: "La aprobación está en proceso.", OPEN_SEASON_REQUIRED: "Abrí una Temporada antes de aprobar.", SEASON_INCOMPATIBLE: "La Temporada cambió o no es compatible.", MEMBERSHIP_REACTIVATION_REQUIRED: "Esta Persona requiere reactivación de Membresía.", NOT_AUTHORIZED: "Ya no sos Owner vigente de este Grupo.", VALIDATION_FAILED: "La solicitud no es válida.", IDEMPOTENCY_CONFLICT: "Esta intención fue usada con otro contexto.", INCOMPATIBLE_STATE: "El estado no es compatible. No intentes repararlo desde esta pantalla.", CONFLICT: "Otra operación ocurrió al mismo tiempo. Consultá el resultado.", DEPENDENCY_UNAVAILABLE: "No pudimos confirmar el resultado.", INTERNAL_ERROR: "No pudimos confirmar el resultado.",
  };
  return messages[reason];
}
