const CACHE_NAME = 'pokesim-v1.7.3';   // Increment version
const AUDIO_CACHE_NAME = 'pokesim-audio-v1'; // Separate cache for audio
const SPRITE_CACHE_NAME = 'pokesim-sprites-v1'; // Separate cache for sprites

const assets = [
  'index.html',
  'map.html',
  'pokesim_offline.html',
  'registration.html',
  'battle.html',
  'admin.html',
  'market.html',
  'ranking.html',
  'guide.html',
  'updates.html',
  'support.html',
  'manifest.json',
  'favicon.ico',
  'PokeSim_Pokemon.png',
  'PokeSim Word.png',
  'PokeSim_Icon.png',
  'download.png',
  'Byahe.png',
  'Map_0.jpg'
];

// Audio files - will be cached separately with longer TTL
const audioAssets = [
  'music1.mp3',
  'music2.mp3',
  'music3.mp3',
  'music4.mp3',
  'music5.mp3',
  'evolution.mp3',
  'mixkit-small-win-2020.wav'
];

// Patterns for external sprite URLs that should be cached
const SPRITE_PATTERNS = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
  'https://play.pokemonshowdown.com/sprites/',
  'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/'
];

// Install: cache static assets AND audio files separately
self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      // Cache main assets
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(assets);
      }),
      // Cache audio files separately
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.addAll(audioAssets);
      })
    ])
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => {
          // Keep our current caches, delete old versions
          return key !== CACHE_NAME && 
                 key !== AUDIO_CACHE_NAME && 
                 key !== SPRITE_CACHE_NAME;
        }).map(key => caches.delete(key))
      );
    })
  );
  e.waitUntil(clients.claim());
});

// Helper: Check if request is for audio file
function isAudioRequest(url) {
  return url.match(/\.(mp3|wav|ogg)$/i);
}

// Helper: Check if request is for sprite/image
function isSpriteRequest(url) {
  return SPRITE_PATTERNS.some(pattern => url.startsWith(pattern));
}

// Helper: Check if request is for same origin static asset
function isStaticAsset(url) {
  const staticExtensions = /\.(html|css|js|png|jpg|jpeg|gif|ico|json|txt)$/i;
  return staticExtensions.test(url);
}

// Fetch: intelligent caching strategy
self.addEventListener('fetch', e => {
  const request = e.request;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    e.respondWith(fetch(request));
    return;
  }

  // 1. AUDIO FILES: Cache First (always serve from cache after first download)
  if (isAudioRequest(request.url) || (isSameOrigin && audioAssets.some(audio => url.pathname.endsWith(audio)))) {
    e.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // ✅ Serve from cache - NO DOWNLOAD!
            return cachedResponse;
          }
          // First time - fetch and cache permanently
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              cache.put(request, clone);
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. SPRITE IMAGES: Cache First (sprites change rarely)
  if (isSpriteRequest(request.url)) {
    e.respondWith(
      caches.open(SPRITE_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              cache.put(request, clone);
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. SAME-ORIGIN STATIC ASSETS: Network First, fallback to cache
  if (isSameOrigin && isStaticAsset(url.pathname)) {
    e.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed – serve from cache
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // If requesting an HTML page and no cache, show offline page
          if (request.headers.get('Accept').includes('text/html')) {
            return caches.match('pokesim_offline.html');
          }
          return new Response('Offline - Content not available', { status: 404 });
        })
    );
    return;
  }

  // 4. API CALLS (PokeAPI, Firebase): Network Only, no caching (data changes often)
  if (request.url.includes('pokeapi.co') || request.url.includes('firebase')) {
    e.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 5. EVERYTHING ELSE: Cache with network fallback
  e.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Ultimate fallback
      return caches.match('pokesim_offline.html');
    })
  );
});

// Listen for version requests from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  // Optional: Force refresh of audio cache
  if (event.data && event.data.type === 'REFRESH_AUDIO') {
    event.waitUntil(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return Promise.all(
          audioAssets.map(audio => {
            return fetch(audio).then(response => {
              if (response.ok) {
                cache.put(audio, response);
              }
            });
          })
        );
      })
    );
  }
});

// Background sync for when offline (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-audio') {
    event.waitUntil(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return Promise.all(
          audioAssets.map(audio => {
            return fetch(audio).then(response => {
              if (response.ok) {
                cache.put(audio, response);
              }
            }).catch(() => {});
          })
        );
      })
    );
  }
});