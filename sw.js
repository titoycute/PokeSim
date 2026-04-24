const CACHE_NAME = 'pokesim-v1.7.1';   // increment version
const assets = [
  'index.html',
  'map.html',
  'pokesim_offline.html',
  'manifest.json',
  'favicon.ico',
  'PokeSim_Pokemon.png',
  'PokeSim Word.png',
  'PokeSim_Icon.png',
  'music1.mp3',
  'music2.mp3',
  'music3.mp3',
  'music4.mp3'
];

const urlsToCache = [
  './',
  'poke.html',
  'PokeSim Word.png',
  'your-css.css',
  'your-js.js'
];

// Patterns for external sprite URLs that should be cached
const SPRITE_PATTERNS = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
  'https://play.pokemonshowdown.com/sprites/',
  'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/'
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  e.waitUntil(clients.claim());
});

// Fetch: cache static assets and sprite images (only status 200)
self.addEventListener('fetch', e => {
  const request = e.request;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    e.respondWith(fetch(request));
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 1. Cache external sprite images (Pokémon sprites)
  if (SPRITE_PATTERNS.some(pattern => request.url.startsWith(pattern))) {
    e.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // serve from cache
        }
        // Fetch from network and cache for future
        return fetch(request).then(networkResponse => {
          // ✅ Only cache complete responses (status 200)
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
  return caches.match(request).then(response => {
    // If file exists in cache → use it
    if (response) return response;

    // If not → show fallback page
    return caches.match('pokesim_offline.html');
  });
});
      })
    );
    return;
  }

  // 2. For same-origin requests (your own files): network first, fallback to cache
  if (isSameOrigin) {
    e.respondWith(
      fetch(request)
        .then(response => {
          // ✅ Only cache complete responses (status 200)
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed – serve from cache
          return caches.match(request);
        })
    );
    return;
  }

  // 3. For all other external requests (PokeAPI JSON, Firebase, etc.) – just fetch, no caching
  e.respondWith(
  caches.match(request).then(cached => {
    return cached || fetch(request).then(res => {
      if (res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return res;
    }).catch(() => cached);
  })
);
});

// Listen for version requests from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});