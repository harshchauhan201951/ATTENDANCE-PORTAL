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
      data.body ||
      "You have a new announcement.",

    icon: "/notification-icon.png",
    badge: "/notification-icon.png",

    silent: false,

    vibrate: [300, 150, 300],

    renotify: true,

    tag: "racer-academy-announcement",

    requireInteraction: false,

    data: {
      url: data.url || "/student/dashboard",
    },

    actions: [
      {
        action: "open",
        title: "Open",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener(
  "notificationclick",
  function (event) {
    event.notification.close();

    const url =
      event.notification.data?.url ||
      "/student/dashboard";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(function (clientList) {
          for (const client of clientList) {
            if ("focus" in client) {
              client.navigate(url);
              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(url);
          }

          return undefined;
        })
    );
  }
);