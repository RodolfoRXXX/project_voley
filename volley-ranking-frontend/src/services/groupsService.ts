import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { DashboardGroup, GroupErrorReason, GroupSport, OwnGroup } from "@/types/OwnGroup";

export interface CreateOwnGroupInput {
  nombre: string;
  deporte: GroupSport;
  idempotencyKey: string;
}

export interface CreateOwnGroupResult {
  outcome: "created" | "existing";
  group: OwnGroup;
}

const createCallable = httpsCallable<CreateOwnGroupInput, CreateOwnGroupResult>(functions, "createOwnGroup");
const listCallable = httpsCallable<Record<string, never>, { items: OwnGroup[] }>(functions, "listOwnGroups");
const getCallable = httpsCallable<{ groupId: string }, { group: OwnGroup }>(functions, "getOwnGroup");
const dashboardCallable = httpsCallable<Record<string, never>, { items: DashboardGroup[] }>(functions, "getOwnGroupsDashboard");

export async function createOwnGroup(input: CreateOwnGroupInput): Promise<CreateOwnGroupResult> {
  return (await createCallable(input)).data;
}

export async function listOwnGroups(): Promise<{ items: OwnGroup[] }> {
  return (await listCallable({})).data;
}

export async function getOwnGroup(groupId: string): Promise<{ group: OwnGroup }> {
  return (await getCallable({ groupId })).data;
}

export async function getOwnGroupsDashboard(): Promise<{ items: DashboardGroup[] }> {
  return (await dashboardCallable({})).data;
}

export function getGroupErrorReason(error: unknown): GroupErrorReason {
  if (typeof error === "object" && error !== null && "details" in error) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null && "reason" in details) {
      const reason = String((details as { reason?: unknown }).reason);
      const known: GroupErrorReason[] = ["UNAUTHENTICATED", "ACCOUNT_REQUIRED", "NOT_AUTHORIZED", "NOT_FOUND", "VALIDATION_FAILED", "PROVISIONAL_LIMIT_REACHED", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"];
      if (known.includes(reason as GroupErrorReason)) return reason as GroupErrorReason;
    }
  }
  return "INTERNAL_ERROR";
}

export function getGroupErrorMessage(reason: GroupErrorReason): string {
  const messages: Record<GroupErrorReason, string> = {
    UNAUTHENTICATED: "Tu sesión venció. Iniciá sesión nuevamente.",
    ACCOUNT_REQUIRED: "Tu cuenta todavía no está disponible. Reintentá su inicialización.",
    NOT_AUTHORIZED: "No tenés acceso a este Grupo.",
    NOT_FOUND: "No encontramos el Grupo solicitado.",
    VALIDATION_FAILED: "Revisá los datos ingresados.",
    PROVISIONAL_LIMIT_REACHED: "Por el momento podés administrar un único Grupo propio.",
    CONFLICT: "La intención de creación entró en conflicto. Revisá los datos antes de reintentar.",
    DEPENDENCY_UNAVAILABLE: "No pudimos verificar el estado del Grupo. Reintentá en unos instantes.",
    INTERNAL_ERROR: "No pudimos completar la operación. Reintentá con la misma solicitud.",
  };
  return messages[reason];
}
