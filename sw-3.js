/**
 * Service Worker — Sri Rejeki (PC Apps)
 * GitHub Pages compatible — path relatif, tanpa hardcode subfolder.
 *
 * STRATEGI:
 * - File HTML lokal → Network First, fallback cache
 * - Aset CDN (Supabase JS, fonts) → Cache First
 * - Request ke Supabase API → Network Only (tidak di-cache)
 */

const CACHE_NAME = 'sri-rejeki-pc-v1';

// CDN yang di-cache (Cache First)
const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Supabase API — jangan di-cache
const SUPABASE_ORIGIN = 'supabase.co';

// ─── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Pre-cache file HTML lokal dengan path relatif terhadap SW
      const base = self.location.pathname.replace('sw.js', '');
      const files = ['index.html', 'kasir.html', 'master.html'].map(f => base + f);
      console.log('[SW] Pre-caching:', files);
      return cache.addAll(files);
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Hapus cache lama:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Supabase API → selalu network
  if (url.hostname.includes(SUPABASE_ORIGIN)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. CDN aset → Cache First
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
          return response;
        }).catch(() => new Response('/* offline */', {
          headers: { 'Content-Type': 'application/javascript' }
        }));
      })
    );
    return;
  }

  // 3. File HTML & aset lokal → Network First, fallback cache
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
