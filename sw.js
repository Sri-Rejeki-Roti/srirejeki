/**
 * Service Worker — Sri Rejeki
 * https://sri-rejeki-roti.github.io/srirejeki/
 */

const CACHE_NAME = 'sri-rejeki-v3';
const SUPABASE_ORIGIN = 'supabase.co';
const CDN_ORIGINS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// ─── INSTALL: pre-cache HTML lokal ───────────────────────────
self.addEventListener('install', event => {
  const base = self.location.pathname.replace('sw.js', '');
  const urls = [base + 'index.html', base + 'kasir.html', base + 'master.html'];
  console.log('[SW] Pre-caching:', urls);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(urls.map(u => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: hapus cache lama ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Hanya handle GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase → bypass, jangan disentuh
  if (url.hostname.includes(SUPABASE_ORIGIN)) return;

  // CDN → Cache First
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Lokal → Network First, fallback cache
  event.respondWith(networkFirst(event.request));
});

// Cache First: cek cache dulu, jika miss → fetch → simpan ke cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('/* offline */', { headers: { 'Content-Type': 'application/javascript' } });
  }
}

// Network First: fetch dulu, jika gagal → cek cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
