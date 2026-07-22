const CACHE_NAME = 'agroai-static-v2'
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k) }))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // API requests: try network first then fallback to cache
  if (request.url.includes('/api/v1/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // For navigation requests, serve index.html for SPA routing
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Otherwise, cache-first
  event.respondWith(
    caches.match(request).then(resp => resp || fetch(request).then(r => {
      // cache fetched GET requests
      if (request.method === 'GET' && r && r.status === 200) {
        const copy = r.clone()
        caches.open(CACHE_NAME).then(c => c.put(request, copy))
      }
      return r
    }).catch(() => caches.match('/index.html')))
  )
})
