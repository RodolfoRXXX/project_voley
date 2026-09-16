import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { ActiveOwnMembership, FinalizedOwnMembership, MembershipErrorReason, OwnMembership } from "@/types/OwnMembership";
import type { LeaveMyGroupMembershipResult, ListMyCurrentGroupMembershipsResult } from "@/types/MyCurrentGroupMembership";
import type { ListActiveGroupMembersResult } from "@/types/ActiveGroupMember";

export interface CreateMyMembershipInput { groupId: string; idempotencyKey: string; }
export interface CreateMyMembershipResult {
  outcome: "CREATED_ACTIVE" | "EXISTING_IDEMPOTENT";
  membership: ActiveOwnMembership;
}
export interface FinalizeMyMembershipResult {
  outcome: "FINALIZED" | "ALREADY_FINALIZED";
  membership: FinalizedOwnMembership;
}
export interface PrepareActiveGroupMemberFinalizationResult {
  person: { firstName: string; lastName: string };
  activationRef: string;
}
export interface FinalizeActiveGroupMemberResult {
  outcome: "MEMBERSHIP_FINALIZATION_CONFIRMED";
  effect: { membershipId: string; finalizedAt: string };
}

const createCallable = httpsCallable<CreateMyMembershipInput, CreateMyMembershipResult>(functions, "createMyMembershipForOwnedGroup");
const getCallable = httpsCallable<{ groupId: string }, { membership: OwnMembership | null }>(functions, "getMyMembershipForOwnedGroup");
const finalizeCallable = httpsCallable<{ groupId: string }, FinalizeMyMembershipResult>(functions, "finalizeMyMembershipForOwnedGroup");
const listMyCurrentGroupsCallable = httpsCallable<{ pageSize?: number; cursor?: string }, ListMyCurrentGroupMembershipsResult>(functions, "listMyCurrentGroupMemberships");
const leaveMyGroupCallable = httpsCallable<{ groupId: string; idempotencyKey: string }, LeaveMyGroupMembershipResult>(functions, "leaveMyGroupMembership");
const listActiveGroupMembersCallable = httpsCallable<{ groupId: string; pageSize?: number; cursor?: string }, ListActiveGroupMembersResult>(functions, "listActiveGroupMembersForOwnedGroup");
const prepareAdministrativeFinalizationCallable = httpsCallable<{ groupId: string; membershipId: string }, PrepareActiveGroupMemberFinalizationResult>(functions, "prepareActiveGroupMemberFinalizationForOwnedGroup");
const finalizeAdministrativeFinalizationCallable = httpsCallable<{ groupId: string; membershipId: string; activationRef: string; idempotencyKey: string }, FinalizeActiveGroupMemberResult>(functions, "finalizeActiveGroupMemberForOwnedGroup");

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

export async function leaveMyGroupMembership(input: { groupId: string; idempotencyKey: string }): Promise<LeaveMyGroupMembershipResult> {
  return (await leaveMyGroupCallable(input)).data;
}

export async function listActiveGroupMembersForOwnedGroup(input: { groupId: string; pageSize?: number; cursor?: string }): Promise<ListActiveGroupMembersResult> {
  return (await listActiveGroupMembersCallable(input)).data;
}

export async function prepareActiveGroupMemberFinalizationForOwnedGroup(input: { groupId: string; membershipId: string }): Promise<PrepareActiveGroupMemberFinalizationResult> {
  return (await prepareAdministrativeFinalizationCallable(input)).data;
}

export async function finalizeActiveGroupMemberForOwnedGroup(input: { groupId: string; membershipId: string; activationRef: string; idempotencyKey: string }): Promise<FinalizeActiveGroupMemberResult> {
  return (await finalizeAdministrativeFinalizationCallable(input)).data;
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
        "MEMBERSHIP_NOT_FOUND", "MEMBERSHIP_NOT_ACTIVE", "MEMBERSHIP_REACTIVATION_REQUIRED",
        "MEMBERSHIP_SEASON_NOT_MODIFIABLE",
        "IDEMPOTENCY_CONFLICT", "INCOMPATIBLE_STATE", "CONFLICT",
        "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR", "GROUP_NOT_ACCESSIBLE", "ROSTER_CONTEXT_CHANGED",
        "TARGET_MEMBERSHIP_NOT_ACCESSIBLE", "TARGET_IS_SELF", "TARGET_MEMBERSHIP_NOT_ACTIVE", "MEMBERSHIP_ACTIVATION_CHANGED",
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
    MEMBERSHIP_NOT_ACTIVE: "Tu Membresía ya no está activa. Actualizá el listado antes de continuar.",
    MEMBERSHIP_REACTIVATION_REQUIRED: "Tu Membresía está finalizada. La reactivación todavía no está disponible.",
    MEMBERSHIP_SEASON_NOT_MODIFIABLE: "La Temporada de esta Membresía ya no está abierta. No se realizó la salida.",
    IDEMPOTENCY_CONFLICT: "La intención ya fue usada con otro contexto. Revisá el estado antes de continuar.",
    INCOMPATIBLE_STATE: "El estado de Membresía no es compatible. No intentes repararlo desde esta pantalla.",
    CONFLICT: "Otra operación se confirmó al mismo tiempo. Reintentá la misma intención.",
    DEPENDENCY_UNAVAILABLE: "No pudimos confirmar el estado. Reintentá la misma intención.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá la misma intención.",
    GROUP_NOT_ACCESSIBLE: "No tenés acceso al roster de este Grupo.",
    ROSTER_CONTEXT_CHANGED: "La Temporada abierta cambió. Reiniciamos el listado.",
    TARGET_MEMBERSHIP_NOT_ACCESSIBLE: "La Membresía seleccionada ya no está disponible en este Grupo.",
    TARGET_IS_SELF: "Para finalizar tu propia Membresía usá la acción de salida personal.",
    TARGET_MEMBERSHIP_NOT_ACTIVE: "La Membresía seleccionada ya no está activa. Actualizamos el roster.",
    MEMBERSHIP_ACTIVATION_CHANGED: "La activación cambió. Volvé a revisar y confirmar la Membresía actual.",
  };
  return messages[reason];
}
