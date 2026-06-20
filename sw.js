/**
 * Service Worker — Sri Rejeki (PC Apps)
 * GitHub Pages: https://sri-rejeki-roti.github.io/srirejeki/
 */

const CACHE_NAME = 'sri-rejeki-pc-v2';

const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

const SUPABASE_ORIGIN = 'supabase.co';

// ─── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const base = self.location.pathname.replace('sw.js', '');
      const files = ['index.html', 'kasir.html', 'master.html'].map(f => base + f);
      console.log('[SW] Pre-caching:', files);
      // addAll bisa gagal jika salah satu 404, pakai Promise.allSettled
      return Promise.allSettled(files.map(f => cache.add(f)));
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Supabase API → selalu network, tidak di-cache
  if (url.hostname.includes(SUPABASE_ORIGIN)) {
    return; // biarkan browser handle langsung
  }

  // 2. CDN aset → Cache First
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone(); // clone SEBELUM dipakai
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('/* offline */', {
          headers: { 'Content-Type': 'application/javascript' }
        }));
      })
    );
    return;
  }

  // 3. File lokal → Network First, fallback cache
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone(); // clone SEBELUM dipakai
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
