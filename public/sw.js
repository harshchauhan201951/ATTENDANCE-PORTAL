"use strict";

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Push notification data error:", error);
  }

  const title = data.title || "RACER ACADEMY";
  const message = data.message || data.body || "You have a new notification.";
  const category = data.category || "general";
  const url = data.url || "/student/dashboard";
  const options = {
    body: message,
    icon: "/notification-icon.png",
    badge: "/notification-icon.png",
    silent: false,
    vibrate: [300, 150, 300],
    renotify: true,
    tag: data.tag || `racer-academy-${category}`,
    requireInteraction: false,
    data: { url, category, notificationId: data.notificationId || null },
    actions: [{ action: "open", title: "Open" }],
  };

  event.waitUntil(
    Promise.all([
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "RACER_NOTIFICATION" }));
        }),
      self.registration.showNotification(title, options),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/student/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            await client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
