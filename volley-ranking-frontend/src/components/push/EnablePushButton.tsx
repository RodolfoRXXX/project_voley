"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { enablePushNotifications } from "@/services/push/pushNotifications";

type EnablePushButtonProps = {
  vapidPublicKey: string;
};

export default function EnablePushButton({ vapidPublicKey }: EnablePushButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleEnable = async () => {
    try {
      setStatus("loading");
      setMessage("");

      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesión");

      const token = await user.getIdToken();
      await enablePushNotifications({ authToken: token, vapidPublicKey });

      setStatus("ok");
      setMessage("Notificaciones activadas correctamente.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo activar push");
    }
  };

  return (
    <div className="rounded-xl border p-4 bg-white space-y-2">
      <p className="text-sm text-gray-700">Activá notificaciones para avisos de grupos y torneos.</p>
      <button
        type="button"
        onClick={handleEnable}
        disabled={status === "loading" || !vapidPublicKey}
        className="rounded-md bg-blue-600 px-3 py-2 text-white text-sm disabled:opacity-60"
      >
        {status === "loading" ? "Activando..." : "Activar notificaciones"}
      </button>
      {message ? <p className="text-xs text-gray-600">{message}</p> : null}
    </div>
  );
}
