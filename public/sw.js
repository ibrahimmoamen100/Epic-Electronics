const CACHE_NAME = "store-cache-v1";
const IMAGE_CACHE_NAME = "store-image-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/src/index.css",
  "/src/main.tsx",
  "/favicon.ico",
];

// Cache image files
const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
      caches.open(IMAGE_CACHE_NAME),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isImage = imageExtensions.some((ext) => url.pathname.endsWith(ext));

  if (isImage) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(IMAGE_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
