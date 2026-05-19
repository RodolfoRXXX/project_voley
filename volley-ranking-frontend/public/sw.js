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

  let normalizedTargetUrl = "/";
  try {
    const parsedUrl = new URL(String(targetUrl), self.location.origin);
    normalizedTargetUrl = parsedUrl.origin === self.location.origin
      ? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      : "/";
  } catch (_error) {
    normalizedTargetUrl = "/";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(normalizedTargetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(normalizedTargetUrl);
      }

      return undefined;
    })
  );
});
