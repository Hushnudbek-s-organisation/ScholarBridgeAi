self.addEventListener("push", event => {
  let data;
  try { data = event.data?.json(); } catch { return; }
  if (!data || typeof data.title !== "string" || typeof data.body !== "string") return;
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon-192.png",
    tag: "scholly-daily-mission",
    data: { deliveryId: data.deliveryId },
    actions: typeof data.settingsLabel === "string" ? [{ action: "settings", title: data.settingsLabel }] : [],
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const action = event.action === "settings" ? "settings" : "open";
  const deliveryId = event.notification.data?.deliveryId;
  const page = self.clients.openWindow(action === "settings" ? "/#notifications" : "/#dashboard");
  const report = typeof deliveryId === "string" ? fetch("/api/scholly/push/engagement", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deliveryId, action }),
  }).catch(() => {}) : Promise.resolve();
  event.waitUntil(Promise.all([page, report]));
});
