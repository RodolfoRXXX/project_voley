

import { FirebaseError } from "firebase/app";

export function handleAuthPopupError(
  err: unknown,
  showToast?: (opts: { type: "error"; message: string }) => void
) {
  if (!(err instanceof FirebaseError)) {
    console.error("Auth error desconocido:", err);
    return;
  }

  switch (err.code) {
    // 🚫 Cancelaciones normales → no hacer nada
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return;

    // ⚠️ Problemas reales pero esperables
    case "auth/popup-blocked":
      showToast?.({
        type: "error",
        message:
          "El navegador bloqueó la ventana de login. Permití los popups e intentá de nuevo.",
      });
      return;

    case "auth/network-request-failed":
      showToast?.({
        type: "error",
        message:
          "No hay conexión a internet. Revisá tu red e intentá nuevamente.",
      });
      return;

    case "auth/too-many-requests":
      showToast?.({
        type: "error",
        message:
          "Demasiados intentos seguidos. Esperá un momento e intentá de nuevo.",
      });
      return;

    // 🔥 Errores inesperados
    default:
      console.error("Auth popup error:", err);
      showToast?.({
        type: "error",
        message: "No se pudo iniciar sesión. Intentá nuevamente.",
      });
  }
}
