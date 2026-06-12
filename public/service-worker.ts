const CACHE_NAME = 'klaivo-v1'
const OFFLINE_URL = '/offline.html'
const SHELL_ASSETS = ['/', '/offline.html', '/fonts/Inter-Variable.woff2', '/fonts/Manrope-Variable.woff2', '/icons/icon-192.png']

self.addEventListener('install', (e: any) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('fetch', (e: any) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }
  // Network first, cache fallback for assets
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
