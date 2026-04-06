"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { enablePushNotifications } from "@/services/push/pushNotifications";

export default function EnablePushButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [vapidPublicKey, setVapidPublicKey] = useState("");
  const [isCheckingVapidKey, setIsCheckingVapidKey] = useState(true);

  useEffect(() => {
    let mounted = true;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // noop: el registro se vuelve a intentar al activar notificaciones
      });
    }

    fetch("/api/push/vapid-public-key", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo obtener la VAPID pública");
        }
        return response.json();
      })
      .then((payload) => {
        if (mounted) {
          setVapidPublicKey(String(payload?.vapidPublicKey || ""));
          setIsCheckingVapidKey(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setVapidPublicKey("");
          setIsCheckingVapidKey(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkExistingSubscription = async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (mounted && Notification.permission === "granted" && existingSubscription) {
          setStatus("ok");
          setMessage("Notificaciones activadas correctamente.");
        }
      } catch {
        // noop: si falla el chequeo inicial, el usuario igual puede intentar activar manualmente
      }
    };

    checkExistingSubscription();

    return () => {
      mounted = false;
    };
  }, []);

  const handleEnable = async () => {
    try {
      setStatus("loading");
      setMessage("");

      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesión");
      if (!vapidPublicKey) throw new Error("No se pudo cargar la clave VAPID pública desde la API");

      const token = await user.getIdToken();
      await enablePushNotifications({ authToken: token, vapidPublicKey });

      setStatus("ok");
      setMessage("Notificaciones activadas correctamente.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo activar push");
    }
  };

  const hasVapidConfigurationError = !isCheckingVapidKey && !vapidPublicKey;
  const notificationsAreActive = status === "ok";
  const isButtonDisabled = status === "loading" || notificationsAreActive || hasVapidConfigurationError;

  return (
    <div className="rounded-md border border-neutral-200 p-6 bg-white space-y-3">
      <p className="text-sm text-gray-700">Activá notificaciones para avisos de grupos y torneos.</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={isButtonDisabled}
          className="rounded-md bg-blue-600 px-3 py-2 text-white text-sm disabled:opacity-60"
        >
          {status === "loading"
            ? "Activando..."
            : notificationsAreActive
              ? "Notificaciones activas"
              : "Activar notificaciones"}
        </button>
      </div>
      {hasVapidConfigurationError ? (
        <p className="text-xs text-amber-700">
          No se pudo obtener la VAPID pública desde la API. Verificá Functions y la ruta <code>/api/push/vapid-public-key</code>.
        </p>
      ) : null}
      {message ? <p className="text-xs text-gray-600">{message}</p> : null}
    </div>
  );
}
