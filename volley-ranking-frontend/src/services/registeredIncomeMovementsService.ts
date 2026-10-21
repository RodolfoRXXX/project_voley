import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { RegisteredIncomeMovementErrorReason, RegisteredIncomeMovementResponse } from "@/types/RegisteredIncomeMovement";

export type RegisteredIncomeMovementQuery = { groupId: string; from?: string; to?: string };

const listCall = httpsCallable<RegisteredIncomeMovementQuery, RegisteredIncomeMovementResponse>(
  functions,
  "listGroupRegisteredIncomeMovements",
);

export const listGroupRegisteredIncomeMovements = async (input: RegisteredIncomeMovementQuery) =>
  (await listCall(input)).data;

export function registeredIncomeMovementErrorReason(error: unknown): RegisteredIncomeMovementErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) {
      return String((details as { reason?: unknown }).reason) as RegisteredIncomeMovementErrorReason;
    }
  }
  return "INTERNAL_ERROR";
}

export function registeredIncomeMovementErrorMessage(reason: RegisteredIncomeMovementErrorReason) {
  const messages: Record<RegisteredIncomeMovementErrorReason, string> = {
    UNAUTHENTICATED: "Tu sesión venció. Iniciá sesión nuevamente.",
    INVALID_DATE_RANGE: "Revisá el rango de fechas.",
    ACCOUNT_REQUIRED: "Tu Cuenta canónica todavía no está disponible.",
    GROUP_NOT_ACCESSIBLE: "Ya no tenés acceso a este Grupo.",
    GROUP_TREASURY_NOT_AUTHORIZED: "Tu acceso de Tesorería ya no está vigente.",
    RANGE_TOO_WIDE: "El rango no puede superar 92 días civiles.",
    MOVEMENT_LIMIT_EXCEEDED: "El rango supera 1.000 movimientos. Reducilo para consultar sin resultados parciales.",
    DATA_INCOMPATIBLE: "Los datos económicos son incompatibles; no se mostró información parcial.",
    DEPENDENCY_UNAVAILABLE: "La consulta no está disponible temporalmente. Reintentá.",
    INTERNAL_ERROR: "No pudimos consultar los movimientos. Reintentá.",
  };
  return messages[reason];
}
