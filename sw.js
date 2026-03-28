const CACHE_NAME = 'pokesim-v1.4';   // ← change this version number on every deploy
const assets = [
  'index.html',
  'manifest.json',
  'favicon.ico',
  'PokeSim_Pokemon.png',
  'PokeSim Word.png',
  'PokeSim_Icon.png',
  'music1.mp3',
  'music2.mp3'
];

// Install: cache assets and force activation
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
  // Force the new service worker to take over immediately
  self.skipWaiting();
});

// Activate: clean up old caches and claim all clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  // Take control of all pages without needing a refresh
  e.waitUntil(clients.claim());
});

// Fetch: try network first, fallback to cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // If network request succeeds, store a copy in the cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Network failed – serve from cache
        return caches.match(e.request);
      })
  );
});

// Listen for messages from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    // Send back the cache version
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
