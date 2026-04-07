// EdUsaathiAI Service Worker
// Strategy: Network-first for all app routes, cache-first for static assets.
// Razorpay checkout URLs are NEVER cached — always fetched live.

const CACHE_NAME = 'edusaathiai-v2';

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

// Routes that must NEVER be intercepted — auth flows, onboarding, API
// SW interference here causes "Failed to convert value to Response" crashes
const BYPASS_PATHS = [
  '/onboard',
  '/login',
  '/auth',
  '/api/',
  '/_next/data/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return; // malformed URL — let browser handle
  }

  // ── Hard bypass: auth + onboarding + API routes ──────────────────────────
  // Never intercept these. Returning without calling event.respondWith()
  // lets the browser handle the request natively — no Response needed.
  if (BYPASS_PATHS.some((p) => pathname.startsWith(p))) {
    return;
  }

  // ── Hard bypass: network-only external services ───────────────────────────
  if (NETWORK_ONLY.some((pattern) => url.includes(pattern))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ── Skip non-GET and non-http requests ────────────────────────────────────
  if (event.request.method !== 'GET') return;
  if (!url.startsWith('http')) return;

  // ── Navigation requests (HTML pages) — network-first ─────────────────────
  // FIX: caches.match() returns Promise<Response|undefined>.
  // Must await and fall back to new Response() when undefined.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline').then(
          (cached) => cached ?? new Response('Offline', { status: 503 })
        )
      )
    );
    return;
  }

  // ── Cache-first: static assets ────────────────────────────────────────────
  if (
    url.includes('/_next/static/') ||
    url.includes('/fonts/') ||
    url.endsWith('.png') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          // Only cache successful responses
          if (!res || res.status !== 200 || res.type === 'error') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // ── Default: network-first ────────────────────────────────────────────────
  // FIX: caches.match() resolves to undefined on a cache miss.
  // event.respondWith(undefined) throws "Failed to convert value to Response".
  // Must always resolve to a valid Response object.
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(
        (cached) => cached ?? new Response('Network error', { status: 503 })
      )
    )
  );
});
