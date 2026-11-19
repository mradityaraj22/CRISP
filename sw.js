// LectureLens service worker: cache-first app shell, so the whole tool runs offline
// (thick-walled lecture halls, dropped campus Wi-Fi, flights).
//
// Strategy: serve from the cache first (instant, works offline), then quietly refresh the
// cached copy from the network in the background. A new version therefore shows up on the
// NEXT load, not the current one.
//
// VERSION is a hash of every cached file: run `npm run stamp` after changing any of them.
// scripts/test-pwa.js fails if the stamp is stale or a file the page needs is missing.

const VERSION = 'lecturelens-7cedc24d4d';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/tokens.css',
  './styles/main.css',
  './js/app.js',
  './js/analyzer.js',
  './js/simulator.js',
  './js/restructurer.js',
  './data/benchmarks.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // addAll is all-or-nothing: one missing file and nothing is cached, so the app would
  // silently NOT work offline. That is why the asset list is tested.
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('lecturelens-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle our own GET requests. Never cache anything cross-origin.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    // ignoreSearch: "/?utm=x" and "/" are the same page.
    let cached = await cache.match(request, { ignoreSearch: true });
    // Any page navigation while offline falls back to the app shell.
    if (!cached && request.mode === 'navigate') cached = await cache.match('./index.html');

    const refresh = fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') cache.put(request, response.clone());
        return response;
      })
      .catch(() => undefined);

    if (cached) {
      event.waitUntil(refresh); // keep the cache fresh for next time
      return cached;
    }
    const fresh = await refresh;
    if (fresh) return fresh;
    // Clear error state instead of the browser's generic offline page.
    return new Response('LectureLens is offline and this file was not cached yet. Reconnect once, then it will work offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  })());
});
