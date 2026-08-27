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

const createCallable = httpsCallable<CreateAndOpenSeasonInput, CreateAndOpenSeasonResult>(functions, "createAndOpenSeason");
const contextCallable = httpsCallable<{ groupId: string }, { openSeason: OwnSeason | null }>(functions, "getOpenSeasonContext");
const getCallable = httpsCallable<{ groupId: string; seasonId: string }, { season: OwnSeason }>(functions, "getOwnSeason");

export async function createAndOpenSeason(input: CreateAndOpenSeasonInput): Promise<CreateAndOpenSeasonResult> {
  return (await createCallable(input)).data;
}

export async function getOpenSeasonContext(groupId: string): Promise<{ openSeason: OwnSeason | null }> {
  return (await contextCallable({ groupId })).data;
}

export async function getOwnSeason(groupId: string, seasonId: string): Promise<{ season: OwnSeason }> {
  return (await getCallable({ groupId, seasonId })).data;
}

export function getSeasonErrorReason(error: unknown): SeasonErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) {
      const reason = String((details as { reason?: unknown }).reason);
      const known: SeasonErrorReason[] = [
        "UNAUTHENTICATED", "ACCOUNT_REQUIRED", "GROUP_NOT_FOUND", "GROUP_INCOMPATIBLE",
        "NOT_AUTHORIZED", "SEASON_NOT_FOUND", "VALIDATION_FAILED", "OPEN_SEASON_ALREADY_EXISTS",
        "INCOMPATIBLE_STATE", "IDEMPOTENCY_CONFLICT", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR",
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
    INCOMPATIBLE_STATE: "El estado de la Temporada no es compatible. No intentes repararlo desde esta pantalla.",
    IDEMPOTENCY_CONFLICT: "Esta intención ya fue usada con otros datos. Iniciá una nueva intención funcional.",
    CONFLICT: "Otra operación se confirmó al mismo tiempo. Reintentá conservando los datos.",
    DEPENDENCY_UNAVAILABLE: "No pudimos verificar el estado persistido. Reintentá con los mismos datos.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá con la misma solicitud.",
  };
  return messages[reason];
}
