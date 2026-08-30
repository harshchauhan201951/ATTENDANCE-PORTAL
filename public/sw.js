self.addEventListener("push", function (event) {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Push notification data error:", error);
  }

  const title = data.title || "RACER ACADEMY";

  const options = {
    body:
      data.message ||
      "You have a new announcement.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/student",
    },
    actions: [
      {
        action: "open",
        title: "Open",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  function (event) {
    event.notification.close();

    const url =
      event.notification.data?.url ||
      "/student";

    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      }).then(function (clientList) {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
);