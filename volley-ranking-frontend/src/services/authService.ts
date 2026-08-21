import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const provider = new GoogleAuthProvider();
let loginInFlight: ReturnType<typeof signInWithPopup> | null = null;

export type AuthFlowErrorCode =
  | "popup-cancelled"
  | "popup-blocked"
  | "network"
  | "unknown";

export class AuthFlowError extends Error {
  constructor(public readonly code: AuthFlowErrorCode, options = {}) {
    super(code, options);
    this.name = "AuthFlowError";
  }
}

function translateAuthError(error: unknown): AuthFlowError {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return new AuthFlowError("popup-cancelled", { cause: error });
  }
  if (code === "auth/popup-blocked") {
    return new AuthFlowError("popup-blocked", { cause: error });
  }
  if (code === "auth/network-request-failed") {
    return new AuthFlowError("network", { cause: error });
  }
  return new AuthFlowError("unknown", { cause: error });
}

export function loginWithGoogle() {
  if (loginInFlight) return loginInFlight;

  const operation = Promise.resolve()
    .then(() => signInWithPopup(auth, provider))
    .catch((error) => {
      throw translateAuthError(error);
    });

  loginInFlight = operation;
  void operation.then(
    () => {
      if (loginInFlight === operation) loginInFlight = null;
    },
    () => {
      if (loginInFlight === operation) loginInFlight = null;
    }
  );

  return operation;
}

export async function logout() {
  await signOut(auth);
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof AuthFlowError)) return "No pudimos iniciar sesión. Intentá nuevamente.";
  if (error.code === "popup-cancelled") return "El ingreso fue cancelado.";
  if (error.code === "popup-blocked") return "El navegador bloqueó la ventana de ingreso.";
  if (error.code === "network") return "No hay conexión para iniciar sesión.";
  return "No pudimos iniciar sesión. Intentá nuevamente.";
}
