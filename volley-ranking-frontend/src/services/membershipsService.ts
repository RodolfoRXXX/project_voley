import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { ActiveOwnMembership, FinalizedOwnMembership, MembershipErrorReason, OwnMembership } from "@/types/OwnMembership";
import type { ListMyCurrentGroupMembershipsResult } from "@/types/MyCurrentGroupMembership";

export interface CreateMyMembershipInput { groupId: string; idempotencyKey: string; }
export interface CreateMyMembershipResult {
  outcome: "CREATED_ACTIVE" | "EXISTING_IDEMPOTENT";
  membership: ActiveOwnMembership;
}
export interface FinalizeMyMembershipResult {
  outcome: "FINALIZED" | "ALREADY_FINALIZED";
  membership: FinalizedOwnMembership;
}

const createCallable = httpsCallable<CreateMyMembershipInput, CreateMyMembershipResult>(functions, "createMyMembershipForOwnedGroup");
const getCallable = httpsCallable<{ groupId: string }, { membership: OwnMembership | null }>(functions, "getMyMembershipForOwnedGroup");
const finalizeCallable = httpsCallable<{ groupId: string }, FinalizeMyMembershipResult>(functions, "finalizeMyMembershipForOwnedGroup");
const listMyCurrentGroupsCallable = httpsCallable<{ pageSize?: number; cursor?: string }, ListMyCurrentGroupMembershipsResult>(functions, "listMyCurrentGroupMemberships");

export async function createMyMembershipForOwnedGroup(input: CreateMyMembershipInput): Promise<CreateMyMembershipResult> {
  return (await createCallable(input)).data;
}

export async function getMyMembershipForOwnedGroup(groupId: string): Promise<{ membership: OwnMembership | null }> {
  return (await getCallable({ groupId })).data;
}

export async function finalizeMyMembershipForOwnedGroup(groupId: string): Promise<FinalizeMyMembershipResult> {
  return (await finalizeCallable({ groupId })).data;
}

export async function listMyCurrentGroupMemberships(input: { pageSize?: number; cursor?: string } = {}): Promise<ListMyCurrentGroupMembershipsResult> {
  return (await listMyCurrentGroupsCallable(input)).data;
}

export function getMembershipErrorReason(error: unknown): MembershipErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) {
      const reason = String((details as { reason?: unknown }).reason) as MembershipErrorReason;
      const known: MembershipErrorReason[] = [
        "UNAUTHENTICATED", "ACCOUNT_REQUIRED", "PERSON_REQUIRED", "PERSON_INCOMPATIBLE",
        "GROUP_NOT_FOUND", "GROUP_INCOMPATIBLE", "NOT_AUTHORIZED", "OPEN_SEASON_REQUIRED",
        "SEASON_INCOMPATIBLE", "VALIDATION_FAILED", "MEMBERSHIP_ALREADY_EXISTS",
        "MEMBERSHIP_NOT_FOUND", "MEMBERSHIP_REACTIVATION_REQUIRED",
        "IDEMPOTENCY_CONFLICT", "INCOMPATIBLE_STATE", "CONFLICT",
        "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR",
      ];
      if (known.includes(reason)) return reason;
    }
  }
  return "INTERNAL_ERROR";
}

export function getMembershipErrorMessage(reason: MembershipErrorReason): string {
  const messages: Record<MembershipErrorReason, string> = {
    UNAUTHENTICATED: "Tu sesión venció. Iniciá sesión nuevamente.",
    ACCOUNT_REQUIRED: "Tu cuenta todavía no está disponible.",
    PERSON_REQUIRED: "Necesitás crear tu Persona antes de incorporarte.",
    PERSON_INCOMPATIBLE: "La vinculación de tu Persona no es compatible. Contactá a soporte.",
    GROUP_NOT_FOUND: "No encontramos el Grupo solicitado.",
    GROUP_INCOMPATIBLE: "El Grupo no es compatible con esta operación.",
    NOT_AUTHORIZED: "No tenés autorización para gestionar esta Membresía.",
    OPEN_SEASON_REQUIRED: "El Grupo necesita una Temporada abierta.",
    SEASON_INCOMPATIBLE: "El contexto de Temporada no es compatible.",
    VALIDATION_FAILED: "La solicitud no es válida.",
    MEMBERSHIP_ALREADY_EXISTS: "Ya existe una Membresía activa para tu Persona en este Grupo.",
    MEMBERSHIP_NOT_FOUND: "No encontramos una Membresía propia para finalizar.",
    MEMBERSHIP_REACTIVATION_REQUIRED: "Tu Membresía está finalizada. La reactivación todavía no está disponible.",
    IDEMPOTENCY_CONFLICT: "La intención ya fue usada con otro contexto. Revisá el estado antes de continuar.",
    INCOMPATIBLE_STATE: "El estado de Membresía no es compatible. No intentes repararlo desde esta pantalla.",
    CONFLICT: "Otra operación se confirmó al mismo tiempo. Reintentá la misma intención.",
    DEPENDENCY_UNAVAILABLE: "No pudimos confirmar el estado. Reintentá la misma intención.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá la misma intención.",
  };
  return messages[reason];
}
