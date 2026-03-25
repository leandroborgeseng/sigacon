/* SIGACON — service worker mínimo; não intercepta /api/* (evita falhas em chamadas à API). */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  try {
    const url = new URL(event.request.url);
    if (url.pathname.startsWith("/api/")) {
      return;
    }
  } catch {
    /* ignore */
  }
  event.respondWith(fetch(event.request));
});
