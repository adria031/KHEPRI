const CACHE_NAME = 'khepria-v1'

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Install: pre-cache static assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first, fall back to cache, then offline page ───────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return
  // Skip non-http(s) requests
  if (!event.request.url.startsWith('http')) return
  // Skip Supabase/API calls — always network
  const url = new URL(event.request.url)
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis')
  ) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for navigation requests
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Try cache first
        return caches.match(event.request).then(cached => {
          if (cached) return cached
          // For navigation, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline')
          }
          return new Response('', { status: 503 })
        })
      })
  )
})
