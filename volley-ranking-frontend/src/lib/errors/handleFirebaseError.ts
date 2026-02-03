// src/lib/errors/handleFirebaseError.ts

import { ToastContextType } from "@/components/ui/toast/ToastProvider";

type FirebaseErrorLike = {
  code?: string;
  message?: string;
  details?: any;
};

export function handleFirebaseError(
  err: unknown,
  showToast: ToastContextType["showToast"],
  fallbackMessage = "Ocurrió un error inesperado"
) {
  let message = fallbackMessage;

  if (typeof err === "object" && err !== null) {
    const e = err as FirebaseErrorLike;

    switch (e.code) {
      case "functions/unauthenticated":
        message = "Tenés que iniciar sesión para continuar";
        break;

      case "functions/permission-denied":
        message = "No tenés permisos para realizar esta acción";
        break;

      case "functions/invalid-argument":
        message = "Los datos enviados no son válidos";
        break;

      case "functions/not-found":
        message = "No se puede acceder al recurso solicitado";
        break;

      case "functions/failed-precondition":
        message = e.message || "La acción no está permitida";
        break;

      default:
        if (typeof e.message === "string") {
          message = e.message;
        }
    }
  }

  showToast({
    type: "error",
    message,
  });
}
