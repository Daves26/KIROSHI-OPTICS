// ═══════════════════════════════════════
// SERVICE WORKER — Cache static assets
// ═══════════════════════════════════════

/// <reference lib="webworker" />

const STATIC_CACHE = 'kiroshi-static-v1'
const DYNAMIC_CACHE = 'kiroshi-dynamic-v1'

// Assets to cache on install (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
]

// Static asset patterns to cache-first
const STATIC_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.woff2?$/,
  /\.ttf$/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
]

// API patterns that should always be network-first
const API_PATTERNS = [
  /api\.themoviedb\.org/,
  /graphql\.anilist\.co/,
]

// Install event — cache app shell
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching app shell')
      return cache.addAll(APP_SHELL)
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// Activate event — clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event — serve from cache or network
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Determine strategy based on request
  if (isStaticAsset(request)) {
    // Static assets: Cache First
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  } else if (isApiRequest(request)) {
    // API requests: Network First (always fresh)
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
  } else {
    // Everything else: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
  }
})

function isStaticAsset(request: Request): boolean {
  const url = request.url
  return STATIC_PATTERNS.some(pattern => pattern.test(url))
}

function isApiRequest(request: Request): boolean {
  const url = request.url
  return API_PATTERNS.some(pattern => pattern.test(url))
}

/**
 * Cache First — for static assets
 * Fastest for things that don't change often
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request)
  
  if (cached) {
    console.log('[SW] Cache hit:', request.url)
    return cached
  }
  
  try {
    console.log('[SW] Fetching and caching:', request.url)
    const response = await fetch(request)
    
    if (response.ok) {
      const cache = await caches.open(cacheName)
      await cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.error('[SW] Fetch failed:', error)
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

/**
 * Network First — for API requests
 * Always tries network, falls back to cache
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    console.log('[SW] Network first:', request.url)
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName)
      await cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    const cached = await caches.match(request)
    
    if (cached) {
      return cached
    }
    
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Stale While Revalidate — for HTML and other resources
 * Serve from cache while updating in background
 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(cacheName).then((cache) => {
        cache.put(request, response.clone())
      })
    }
    return response
  }).catch(() => {
    // Network failed, return cached response if available
    return cached || new Response('Offline', { status: 503 })
  })
  
  // Return cached response immediately, or fetch if no cache
  return cached || fetchPromise
}

// Message event — handle commands from client
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        )
      })
    )
  }
})
