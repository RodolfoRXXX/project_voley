import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { CancelledOwnGroupJoinRequest, GroupJoinRequestErrorReason, KnownGroupJoinPreview, OwnGroupJoinRequest, PendingGroupJoinRequestForOwner } from "@/types/GroupJoinRequest";

const previewCallable = httpsCallable<{ groupId: string }, { group: KnownGroupJoinPreview }>(functions, "getKnownGroupJoinPreview");
const createCallable = httpsCallable<{ groupId: string; idempotencyKey: string }, { outcome: "CREATED_PENDING" | "EXISTING_PENDING" | "EXISTING_CANCELLED"; request: OwnGroupJoinRequest }>(functions, "createMyGroupJoinRequest");
const currentCallable = httpsCallable<{ groupId: string }, { request: OwnGroupJoinRequest | null }>(functions, "getMyCurrentGroupJoinRequest");
const cancelCallable = httpsCallable<{ groupId: string; requestId: string }, { outcome: "CANCELLED" | "ALREADY_CANCELLED"; request: CancelledOwnGroupJoinRequest }>(functions, "cancelMyGroupJoinRequest");
const listCallable = httpsCallable<{ groupId: string; pageSize?: number; cursor?: string }, { items: PendingGroupJoinRequestForOwner[]; nextCursor: string | null }>(functions, "listPendingGroupJoinRequestsForOwnedGroup");

export async function getKnownGroupJoinPreview(groupId: string) { return (await previewCallable({ groupId })).data; }
export async function createMyGroupJoinRequest(input: { groupId: string; idempotencyKey: string }) { return (await createCallable(input)).data; }
export async function getMyCurrentGroupJoinRequest(groupId: string) { return (await currentCallable({ groupId })).data; }
export async function cancelMyGroupJoinRequest(groupId: string, requestId: string) { return (await cancelCallable({ groupId, requestId })).data; }
export async function listPendingGroupJoinRequestsForOwnedGroup(input: { groupId: string; pageSize?: number; cursor?: string }) { return (await listCallable(input)).data; }

export function getGroupJoinRequestErrorReason(error: unknown): GroupJoinRequestErrorReason {
  const reason = typeof error === "object" && error !== null && "details" in error && typeof (error as { details?: unknown }).details === "object" && (error as { details?: { reason?: unknown } }).details !== null ? String((error as { details: { reason?: unknown } }).details.reason) : "INTERNAL_ERROR";
  const known: GroupJoinRequestErrorReason[] = ["UNAUTHENTICATED", "ACCOUNT_REQUIRED", "PERSON_REQUIRED", "PERSON_INCOMPATIBLE", "GROUP_NOT_AVAILABLE", "GROUP_INCOMPATIBLE", "OWNER_CANNOT_REQUEST", "ACTIVE_MEMBERSHIP_EXISTS", "REQUEST_ALREADY_PENDING", "REQUEST_NOT_FOUND", "REQUEST_NOT_PENDING", "NOT_AUTHORIZED", "VALIDATION_FAILED", "IDEMPOTENCY_CONFLICT", "INCOMPATIBLE_STATE", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"];
  return known.includes(reason as GroupJoinRequestErrorReason) ? reason as GroupJoinRequestErrorReason : "INTERNAL_ERROR";
}
export function getGroupJoinRequestErrorMessage(reason: GroupJoinRequestErrorReason) {
  const messages: Record<GroupJoinRequestErrorReason, string> = {
    UNAUTHENTICATED: "Necesitás iniciar sesión.", ACCOUNT_REQUIRED: "Necesitás una cuenta disponible.", PERSON_REQUIRED: "Creá tu Persona antes de solicitar ingreso.", PERSON_INCOMPATIBLE: "Tu Persona no es compatible.", GROUP_NOT_AVAILABLE: "El Grupo no está disponible.", GROUP_INCOMPATIBLE: "El Grupo propio no es compatible.", OWNER_CANNOT_REQUEST: "No podés solicitar ingreso a tu propio Grupo.", ACTIVE_MEMBERSHIP_EXISTS: "Ya integrás este Grupo.", REQUEST_ALREADY_PENDING: "Ya existe una solicitud pendiente.", REQUEST_NOT_FOUND: "No encontramos una solicitud propia.", REQUEST_NOT_PENDING: "La solicitud ya no admite cancelación.", NOT_AUTHORIZED: "No tenés autorización para ver estas solicitudes.", VALIDATION_FAILED: "La solicitud no es válida.", IDEMPOTENCY_CONFLICT: "Esta intención fue usada con otro contexto.", INCOMPATIBLE_STATE: "El estado no es compatible. No intentes repararlo desde esta pantalla.", CONFLICT: "Otra operación ocurrió al mismo tiempo. Reintentá.", DEPENDENCY_UNAVAILABLE: "No pudimos confirmar el estado. Reintentá.", INTERNAL_ERROR: "No pudimos completar la operación. Reintentá.",
  };
  return messages[reason];
}
