import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { EnsureMyPersonInput, EnsureMyPersonResult, MyPerson } from "@/types/MyPerson";

const ensureMyPersonCallable = httpsCallable<EnsureMyPersonInput, EnsureMyPersonResult>(
  functions,
  "ensureMyPerson"
);
const getMyPersonCallable = httpsCallable<Record<string, never>, { person: MyPerson | null }>(
  functions,
  "getMyPerson"
);

export async function ensureMyPerson(input: EnsureMyPersonInput): Promise<EnsureMyPersonResult> {
  const response = await ensureMyPersonCallable(input);
  return response.data;
}

export async function getMyPerson(): Promise<MyPerson | null> {
  const response = await getMyPersonCallable({});
  return response.data.person;
}

export function getPersonErrorReason(error: unknown): string {
  if (!error || typeof error !== "object" || !("details" in error)) return "";
  const details = error.details;
  if (!details || typeof details !== "object" || !("reason" in details)) return "";
  return String(details.reason);
}

export function getPersonErrorMessage(error: unknown): string {
  switch (getPersonErrorReason(error)) {
    case "INVALID_PERSON_DATA":
      return "Revisá los datos ingresados.";
    case "ACCOUNT_NOT_INITIALIZED":
      return "Tu cuenta todavía no está lista. Intentá nuevamente en unos instantes.";
    case "PERSON_LINK_INCONSISTENT":
      return "Detectamos un problema con la vinculación de tu ficha. Contactá a soporte.";
    case "CONCURRENT_MODIFICATION":
      return "Hubo otra actualización al mismo tiempo. Intentá nuevamente.";
    case "PERSON_SERVICE_UNAVAILABLE":
      return "El servicio no está disponible temporalmente. Intentá nuevamente.";
    case "AUTHENTICATION_REQUIRED":
      return "Tu sesión no es válida. Volvé a ingresar.";
    default:
      return "No pudimos procesar tu ficha. Intentá nuevamente.";
  }
}
