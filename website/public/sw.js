// EdUsaathiAI Service Worker
// Strategy: Network-first for all app routes, cache-first for static assets.
// Razorpay checkout URLs are NEVER cached — always fetched live.

const CACHE_NAME = 'edusaathiai-v1';

// Static assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/offline',
];

// Never cache these — always go to network
const NETWORK_ONLY = [
  'checkout.razorpay.com',
  'api.razorpay.com',
  'vpmpuxosyrijknbxautx.supabase.co/functions',
  'api.groq.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Always bypass cache for network-only URLs
  if (NETWORK_ONLY.some((pattern) => url.includes(pattern))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!url.startsWith('http')) return;

  // Network-first strategy for navigation (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline') ?? new Response('Offline', { status: 503 })
      )
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.includes('/_next/static/') ||
    url.includes('/fonts/') ||
    url.endsWith('.png') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached ?? fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
