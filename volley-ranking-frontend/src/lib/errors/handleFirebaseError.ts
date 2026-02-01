// src/lib/errors/handleFirebaseError.ts

import { ToastContextType } from "@/components/ui/toast/ToastProvider";

type FirebaseErrorLike = {
  code?: string;
  message?: string;
  details?: any;
};

export function handleFirebaseError(
  err: FirebaseErrorLike,
  showToast: ToastContextType["showToast"],
  fallbackMessage = "Ocurrió un error inesperado"
) {
  let message = fallbackMessage;

  switch (err?.code) {
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
      message = "El recurso solicitado no existe";
      break;
    
    case "functions/failed-precondition":
      message = err.message || "La acción no está permitida";
      break;

    default:
      if (typeof err?.message === "string") {
        message = err.message;
      }
  }

  showToast({
    type: "error",
    message,
  });
}