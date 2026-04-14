self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload?.title || "Notificación";
  const body = payload?.body || "";
  const url = payload?.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      icon: "/next.svg",
      badge: "/next.svg",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
