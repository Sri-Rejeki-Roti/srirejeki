/**
 * Service Worker — Sri Rejeki
 * https://sri-rejeki-roti.github.io/srirejeki/
 * v4 — gabungan index + kasir + master + owner + payroll
 */

const CACHE_NAME = 'sri-rejeki-v4';
const SUPABASE_ORIGIN = 'supabase.co';
const CDN_ORIGINS = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// ─── INSTALL: pre-cache semua HTML lokal ─────────────────────
self.addEventListener('install', event => {
  const base = self.location.pathname.replace('sw.js', '');
  const urls = [
    base + 'index.html',
    base + 'kasir.html',
    base + 'master.html',
    base + 'owner.html',
    base + 'payroll.html',
    base + 'manifest.json',
    base + 'icon-192.png',
    base + 'icon-512.png',
  ];
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Hapus cache lama:', k);
        return caches.delete(k);
      })))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase → bypass, selalu dari network
  if (url.hostname.includes(SUPABASE_ORIGIN)) return;

  // CDN (JS libs, fonts) → Cache First
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // File lokal → Network First, fallback cache
  event.respondWith(networkFirst(event.request));
});

// Cache First: cek cache dulu → jika miss, fetch & simpan
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

// Network First: fetch dulu → jika gagal, cek cache
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
    return cached || new Response('Offline — koneksi tidak tersedia', { status: 503 });
  }
}
