const CACHE_NAME = 'pokesim-v1.7.4';   // Increment version
const AUDIO_CACHE_NAME = 'pokesim-audio-v1';
const SPRITE_CACHE_NAME = 'pokesim-sprites-v1';

// ✅ Only cache files that definitely exist
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

// Audio files - cache individually (not with addAll)
const audioAssets = [
  'music1.mp3',
  'music2.mp3',
  'music3.mp3',
  'music4.mp3',
  'music5.mp3',
  'evolution.mp3',
  'mixkit-small-win-2020.wav'
];

// Patterns for external sprite URLs
const SPRITE_PATTERNS = [
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
  'https://play.pokemonshowdown.com/sprites/',
  'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/'
];

// ✅ Install: cache static assets with error handling
self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      // Cache main assets one by one (skip failures)
      const cache = await caches.open(CACHE_NAME);
      for (const asset of assets) {
        try {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response);
            console.log(`✅ Cached: ${asset}`);
          } else {
            console.warn(`⚠️ Failed to cache: ${asset} (${response.status})`);
          }
        } catch (err) {
          console.warn(`⚠️ Error caching ${asset}:`, err);
        }
      }
      
      // Cache audio files separately
      const audioCache = await caches.open(AUDIO_CACHE_NAME);
      for (const audio of audioAssets) {
        try {
          const response = await fetch(audio);
          if (response.ok) {
            await audioCache.put(audio, response);
            console.log(`✅ Cached audio: ${audio}`);
          }
        } catch (err) {
          console.warn(`⚠️ Error caching audio ${audio}:`, err);
        }
      }
    })()
  );
  self.skipWaiting();
});

// ✅ Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => {
          return key !== CACHE_NAME && 
                 key !== AUDIO_CACHE_NAME && 
                 key !== SPRITE_CACHE_NAME;
        }).map(key => {
          console.log(`🗑️ Deleting old cache: ${key}`);
          return caches.delete(key);
        })
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

// ✅ Fetch: smart caching with fallbacks
self.addEventListener('fetch', e => {
  const request = e.request;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    e.respondWith(fetch(request));
    return;
  }

  // 1. AUDIO FILES: Cache First
  if (isAudioRequest(request.url) || (isSameOrigin && audioAssets.some(audio => url.pathname.endsWith(audio)))) {
    e.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // ✅ Return a silent empty response instead of failing
            return new Response(null, { status: 204, statusText: 'No Content' });
          });
        });
      })
    );
    return;
  }

  // 2. SPRITE IMAGES: Cache First with fallback
  if (isSpriteRequest(request.url)) {
    e.respondWith(
      caches.open(SPRITE_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // ✅ Return a placeholder image if sprite fails
            return caches.match('PokeSim_Icon.png');
          });
        });
      })
    );
    return;
  }

  // 3. SAME-ORIGIN STATIC ASSETS: Network First, fallback to cache
  if (isSameOrigin) {
    e.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // ✅ If requesting an HTML page, show offline page
        if (request.headers.get('Accept').includes('text/html')) {
          return caches.match('pokesim_offline.html');
        }
        return new Response('Offline - Content not available', { status: 404 });
      })
    );
    return;
  }

  // 4. API CALLS: Network Only
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
      return caches.match('pokesim_offline.html');
    })
  );
});

// Listen for version requests
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'REFRESH_AUDIO') {
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