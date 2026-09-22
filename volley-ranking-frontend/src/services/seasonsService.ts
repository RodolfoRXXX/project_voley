import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { OwnSeason, SeasonErrorReason } from "@/types/OwnSeason";

export interface CreateAndOpenSeasonInput {
  groupId: string;
  nombre: string;
  fechaInicio: string;
  idempotencyKey: string;
}

export interface CreateAndOpenSeasonResult {
  outcome: "CREATED_OPEN" | "EXISTING_IDEMPOTENT";
  season: OwnSeason;
}

export interface CloseSeasonInput { groupId: string; seasonId: string; idempotencyKey: string }
export interface ClosedSeason extends Omit<OwnSeason, "estado" | "createdAt"> { estado: "cerrada"; closedAt: string }
export interface CloseSeasonResult { outcome: "CLOSED" | "EXISTING_IDEMPOTENT"; season: ClosedSeason }

const createCallable = httpsCallable<CreateAndOpenSeasonInput, CreateAndOpenSeasonResult>(functions, "createAndOpenSeason");
const contextCallable = httpsCallable<{ groupId: string }, { openSeason: OwnSeason | null }>(functions, "getOpenSeasonContext");
const getCallable = httpsCallable<{ groupId: string; seasonId: string }, { season: OwnSeason }>(functions, "getOwnSeason");
const closeCallable = httpsCallable<CloseSeasonInput, CloseSeasonResult>(functions, "closeSeason");

export async function createAndOpenSeason(input: CreateAndOpenSeasonInput): Promise<CreateAndOpenSeasonResult> {
  return (await createCallable(input)).data;
}

export async function getOpenSeasonContext(groupId: string): Promise<{ openSeason: OwnSeason | null }> {
  return (await contextCallable({ groupId })).data;
}

export async function getOwnSeason(groupId: string, seasonId: string): Promise<{ season: OwnSeason }> {
  return (await getCallable({ groupId, seasonId })).data;
}

export async function closeSeason(input: CloseSeasonInput): Promise<CloseSeasonResult> { return (await closeCallable(input)).data; }

export function getSeasonErrorReason(error: unknown): SeasonErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) {
      const reason = String((details as { reason?: unknown }).reason);
      const known: SeasonErrorReason[] = [
        "UNAUTHENTICATED", "ACCOUNT_REQUIRED", "GROUP_NOT_FOUND", "GROUP_INCOMPATIBLE",
        "NOT_AUTHORIZED", "SEASON_NOT_FOUND", "VALIDATION_FAILED", "OPEN_SEASON_ALREADY_EXISTS",
        "SEASON_NOT_OPEN", "SEASON_ALREADY_CLOSED", "SEASON_GUARD_MISSING", "SEASON_GUARD_INCOMPATIBLE",
        "ACTIVE_MEMBERSHIPS_EXIST", "MEMBERSHIP_SEASON_INCOMPATIBLE", "MEMBERSHIP_PERIOD_INCOMPATIBLE",
        "MEMBERSHIP_ACTIVE_GUARD_INCOMPATIBLE", "APPROVAL_IN_PROGRESS", "OWNERSHIP_CHANGED",
        "INCOMPATIBLE_STATE", "IDEMPOTENCY_CONFLICT", "CONFLICT", "DEPENDENCY_NOT_CONFIGURED", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR",
      ];
      if (known.includes(reason as SeasonErrorReason)) return reason as SeasonErrorReason;
    }
  }
  return "INTERNAL_ERROR";
}

export function getSeasonErrorMessage(reason: SeasonErrorReason): string {
  const messages: Record<SeasonErrorReason, string> = {
    UNAUTHENTICATED: "Tu sesión venció. Iniciá sesión nuevamente.",
    ACCOUNT_REQUIRED: "Tu cuenta todavía no está disponible. Reintentá su inicialización.",
    GROUP_NOT_FOUND: "No encontramos el Grupo solicitado.",
    GROUP_INCOMPATIBLE: "El Grupo no tiene un formato compatible con esta operación.",
    NOT_AUTHORIZED: "No tenés autorización para administrar la Temporada de este Grupo.",
    SEASON_NOT_FOUND: "No encontramos la Temporada solicitada.",
    VALIDATION_FAILED: "Revisá el nombre y la fecha de inicio.",
    OPEN_SEASON_ALREADY_EXISTS: "El Grupo ya tiene una Temporada abierta.",
    SEASON_NOT_OPEN: "La Temporada ya no está abierta.",
    SEASON_ALREADY_CLOSED: "La Temporada ya fue cerrada por otra intención.",
    SEASON_GUARD_MISSING: "No se puede cerrar por una inconsistencia; contactá soporte.",
    SEASON_GUARD_INCOMPATIBLE: "No se puede cerrar por una inconsistencia; contactá soporte.",
    ACTIVE_MEMBERSHIPS_EXIST: "Todavía hay integrantes activos. Cada Membresía debe finalizarse explícitamente antes del cierre.",
    MEMBERSHIP_SEASON_INCOMPATIBLE: "No se puede cerrar por una inconsistencia de Membresías; contactá soporte.",
    MEMBERSHIP_PERIOD_INCOMPATIBLE: "No se puede cerrar por una inconsistencia de vigencia; contactá soporte.",
    MEMBERSHIP_ACTIVE_GUARD_INCOMPATIBLE: "No se puede cerrar por una inconsistencia de Membresías; contactá soporte.",
    APPROVAL_IN_PROGRESS: "Hay una aprobación en curso. Completala desde Solicitudes pendientes antes de cerrar.",
    OWNERSHIP_CHANGED: "El ownership del Grupo cambió antes de confirmar.",
    INCOMPATIBLE_STATE: "El estado de la Temporada no es compatible. No intentes repararlo desde esta pantalla.",
    IDEMPOTENCY_CONFLICT: "Esta intención ya fue usada con otros datos. Iniciá una nueva intención funcional.",
    CONFLICT: "Otra operación se confirmó al mismo tiempo. Reintentá conservando los datos.",
    DEPENDENCY_NOT_CONFIGURED: "El cierre todavía no está configurado en este ambiente. Contactá soporte.",
    DEPENDENCY_UNAVAILABLE: "No pudimos verificar el estado persistido. Reintentá con los mismos datos.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá con la misma solicitud.",
  };
  return messages[reason];
}
