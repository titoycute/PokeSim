const CACHE_NAME = 'pokesim-v1.2';
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

// Install Service Worker
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Fetch logic
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});