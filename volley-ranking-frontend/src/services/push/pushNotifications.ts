"use client";

import { urlBase64ToUint8Array } from "@/lib/push/urlBase64ToUint8Array";

type EnablePushOptions = {
  authToken: string;
  vapidPublicKey: string;
};

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker no soportado");
  }

  return navigator.serviceWorker.register("/sw.js");
}

export async function enablePushNotifications({ authToken, vapidPublicKey }: EnablePushOptions) {
  if (!("Notification" in window)) {
    throw new Error("Notificaciones no soportadas");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso de notificaciones denegado");
  }

  const registration = await registerServiceWorker();
  const existingSubscription = await registration.pushManager.getSubscription();

  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ subscription }),
  });

  if (!response.ok) {
    throw new Error("No se pudo guardar la suscripción push");
  }

  return true;
}
