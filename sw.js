const CACHE_NAME = "cloud-kitchen-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./menu.html",
  "./order.html",
  "./login.html",
  "./signup.html",
  "./admin/dashboard.html",
  "./admin/menu-management.html",
  "./admin/reports.html",
  "./admin/messaging.html",
  "./css/common.css",
  "./css/index.css",
  "./css/menu.css",
  "./css/order.css",
  "./css/login.css",
  "./css/signup.css",
  "./css/admin.css",
  "./js/app.js",
  "./js/firebase-config.js",
  "./js/messaging.js",
  "./assets/images/logo.png",
  "./assets/icons/icon-512x512.png"
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
