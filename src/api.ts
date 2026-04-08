// ═══════════════════════════════════════
// API LAYER — TMDB calls with caching
// ═══════════════════════════════════════

import type { CacheItem } from './types.js'
import { TMDB_BASE, TMDB_TOKEN, CACHE_TTL, CACHE_KEY } from './constants.js'

// ── Cache helpers ─────────────────────
export function getCached<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${key}`)
    if (!raw) return null
    const { data, expires }: CacheItem<T> = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(`${CACHE_KEY}_${key}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function setCache(key: string, data: unknown): void {
  try {
    const item: CacheItem = { data, expires: Date.now() + CACHE_TTL }
    localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(item))
  } catch {
    // quota exceeded - silently fail
  }
}

export function clearCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
  keys.forEach(k => localStorage.removeItem(k))
}

// ── Token validation ──────────────────
export function validateToken(): boolean {
  if (!TMDB_TOKEN) {
    console.error('[KIROSHI] TMDB token is missing. Set VITE_TMDB_ACCESS_TOKEN in .env')
    return false
  }
  if (TMDB_TOKEN === 'undefined' || TMDB_TOKEN === '') {
    console.error('[KIROSHI] TMDB token is invalid')
    return false
  }
  return true
}

// ── TMDB API call with retry ──────────
const MAX_RETRIES: number = 2
const RETRY_DELAY_MS: number = 1000

async function tmdbWithRetry<T = any>(
  path: string,
  params: Record<string, string | number | boolean> = {},
  retries: number = 0
): Promise<T> {
  const url = new URL(TMDB_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const cacheKey = url.toString()

  // Check cache first
  const cached = getCached<T>(cacheKey)
  if (cached) return cached

  // Fetch from API
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_TOKEN}`
    }
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('TMDB_401: Invalid or expired token')
    }
    if (res.status === 429) {
      // Parse Retry-After header
      const retryAfter = res.headers.get('Retry-After')
      let waitMs = RETRY_DELAY_MS * (retries + 1)

      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          waitMs = seconds * 1000
        }
      }

      // Emit rate-limit event for UI
      window.dispatchEvent(new CustomEvent('ratelimit', {
        detail: { waitMs, retries, source: 'tmdb' }
      }))

      if (retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, waitMs))
        return tmdbWithRetry<T>(path, params, retries + 1)
      }
      throw new Error('TMDB_429: Rate limit exceeded. Try again later.')
    }
    if (retries < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (retries + 1)))
      return tmdbWithRetry<T>(path, params, retries + 1)
    }
    throw new Error(`TMDB ${res.status}: Failed after ${MAX_RETRIES + 1} attempts`)
  }

  const data: T = await res.json()

  // Store in cache
  setCache(cacheKey, data)
  return data
}

export async function tmdb<T = any>(
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  return tmdbWithRetry<T>(path, params)
}
