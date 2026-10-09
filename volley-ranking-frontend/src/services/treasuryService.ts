import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TreasuryErrorReason, TreasuryGrant, TreasuryPage } from "@/types/Treasury";

const grantCall = httpsCallable<{ groupId: string; membershipId: string; idempotencyKey: string }, { outcome: "GRANTED" | "EXISTING"; grant: TreasuryGrant }>(functions, "grantGroupTreasuryCapability");
const revokeCall = httpsCallable<{ groupId: string; grantId: string; idempotencyKey: string }, { outcome: "REVOKED" | "EXISTING"; grantId: string; revokedAt: string }>(functions, "revokeGroupTreasuryCapability");
const listCall = httpsCallable<{ groupId: string; pageSize?: number; cursor?: string }, TreasuryPage>(functions, "listGroupTreasuryGrantsForOwner");
const contextCall = httpsCallable<{ groupId: string }, { groupId: string; capabilityId: "GROUP_TREASURY"; canViewEconomy: true }>(functions, "getMyGroupTreasuryContext");
export const grantGroupTreasury = async (input: { groupId: string; membershipId: string; idempotencyKey: string }) => (await grantCall(input)).data;
export const revokeGroupTreasury = async (input: { groupId: string; grantId: string; idempotencyKey: string }) => (await revokeCall(input)).data;
export const listGroupTreasuryGrants = async (input: { groupId: string; pageSize?: number; cursor?: string }) => (await listCall(input)).data;
export const getMyGroupTreasuryContext = async (groupId: string) => (await contextCall({ groupId })).data;
export const newTreasuryKey = () => `treasury-${crypto.randomUUID()}`;

export function getTreasuryErrorReason(error: unknown): TreasuryErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) { const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) return String((details as { reason?: unknown }).reason) as TreasuryErrorReason; }
  return "INTERNAL_ERROR";
}
export function getTreasuryErrorMessage(reason: TreasuryErrorReason): string {
  const messages: Record<TreasuryErrorReason, string> = {
    UNAUTHENTICATED: "Tu sesión venció. Iniciá sesión nuevamente.", VALIDATION_FAILED: "La solicitud no es válida.",
    ACCOUNT_CONTEXT_REQUIRED: "Tu Cuenta y Persona deben estar vinculadas para usar Tesorería.",
    GROUP_NOT_ACCESSIBLE: "Ya no tenés acceso a este Grupo.", GROUP_NOT_OPERATIONAL: "El Grupo archivado no admite acceso delegado.",
    MEMBERSHIP_NOT_ELIGIBLE: "La Membresía ya no está activa o su vigencia no puede acreditarse.",
    TARGET_ACCOUNT_LINK_REQUIRED: "La Persona necesita exactamente una Cuenta vinculada.", OPEN_SEASON_REQUIRED: "La Temporada exacta ya no está abierta.",
    TREASURY_GRANT_ALREADY_ACTIVE: "Esa Persona ya tiene acceso vigente a Tesorería.", TREASURY_GRANT_NOT_ACCESSIBLE: "La concesión ya no está disponible.",
    GROUP_TREASURY_NOT_AUTHORIZED: "Tu acceso de consulta a Tesorería ya no está vigente.", IDEMPOTENCY_CONFLICT: "La intención fue usada con otros datos. Volvé a iniciar la acción.",
    DATA_INCOMPATIBLE: "El contexto no es compatible; no se mostró información parcial.", PENDING_RECOVERY: "No pudimos confirmar el resultado. Reintentá la misma intención.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá la misma intención.",
  }; return messages[reason] ?? messages.INTERNAL_ERROR;
}
