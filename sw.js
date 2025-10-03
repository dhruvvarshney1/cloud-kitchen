const CACHE_NAME = "cloud-kitchen-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./menu.html",
  "./order.html",
  "./login.html",
  "./customer/account.html",
  "./admin/dashboard.html",
  "./admin/menu-management.html",
  "./admin/reports.html",
  "./admin/messaging.html",
  "./css/design-system.css",
  "./css/components.css",
  "./css/layouts.css",
  "./css/themes.css",
  "./js/utils.js",
  "./js/components/header.js",
  "./js/components/admin-nav.js",
  "./js/pages/landing.js",
  "./js/pages/menu.js",
  "./js/pages/order.js",
  "./js/pages/login.js",
  "./js/pages/account.js",
  "./js/pages/admin-dashboard.js",
  "./js/pages/admin-menu.js",
  "./js/pages/admin-reports.js",
  "./js/pages/admin-messaging.js",
  "./logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
