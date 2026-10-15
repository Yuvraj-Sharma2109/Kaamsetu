const CACHE_NAME = 'kaamsetu-shell-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg'];
const PUBLIC_IMAGES = [
  '/figma/account_raw_1.jpeg',
  '/figma/account_raw_2.jpeg',
  '/figma/map_raw_1.png',
  '/figma/map_raw_2.jpeg',
  '/figma/map_raw_3.png',
  '/figma/map_raw_4.jpeg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);

      // Vite gives production bundles content-hashed URLs, so discover the
      // current JS and CSS names from the cached app document at install time.
      const html = await (await cache.match('/')).text();
      const bundleUrls = [...html.matchAll(/(?:src|href)="([^\"]+\/assets\/[^\"]+)"/g)]
        .map((match) => new URL(match[1], self.location.origin).href);
      const resources = [...new Set([...bundleUrls, ...PUBLIC_IMAGES])];
      await Promise.allSettled(resources.map(async (url) => {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/figma/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        });
      }),
    );
  }
});
