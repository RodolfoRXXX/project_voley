import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
import type { MyAccount } from "@/types/MyAccount";

const ensureMyAccountCallable = httpsCallable<Record<string, never>, MyAccount>(
  functions,
  "ensureMyAccount"
);
const getMyAccountCallable = httpsCallable<Record<string, never>, MyAccount>(
  functions,
  "getMyAccount"
);

export async function ensureMyAccount(): Promise<MyAccount> {
  const response = await ensureMyAccountCallable({});
  return response.data;
}

export async function getMyAccount(): Promise<MyAccount> {
  const response = await getMyAccountCallable({});
  return response.data;
}

export function getAccountErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";

  if (code.includes("unauthenticated")) return "Tu sesión no es válida. Volvé a ingresar.";
  if (code.includes("failed-precondition")) return "No pudimos completar los datos de acceso.";
  if (code.includes("not-found")) return "Tu cuenta todavía no fue inicializada.";
  return "No pudimos preparar tu cuenta. Intentá nuevamente.";
}
