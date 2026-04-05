// ═══════════════════════════════════════
// API LAYER — TMDB calls with caching
// ═══════════════════════════════════════

import { TMDB_BASE, TMDB_TOKEN, CACHE_TTL, CACHE_KEY } from './constants.js'

// ── Cache helpers ─────────────────────
export function getCached(key) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${key}`)
    if (!raw) return null
    const { data, expires } = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(`${CACHE_KEY}_${key}`)
      return null
    }
    return data
  } catch { return null }
}

export function setCache(key, data) {
  try {
    const item = { data, expires: Date.now() + CACHE_TTL }
    localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(item))
  } catch { /* quota exceeded - silently fail */ }
}

export function clearCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
  keys.forEach(k => localStorage.removeItem(k))
}

// ── Token validation ──────────────────
export function validateToken() {
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
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

async function tmdbWithRetry(path, params, retries = 0) {
  const url = new URL(TMDB_BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const cacheKey = url.toString()

  // Check cache first
  const cached = getCached(cacheKey)
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
      throw new Error('TMDB_429: Rate limit exceeded. Try again later.')
    }
    if (retries < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (retries + 1)))
      return tmdbWithRetry(path, params, retries + 1)
    }
    throw new Error(`TMDB ${res.status}: Failed after ${MAX_RETRIES + 1} attempts`)
  }

  const data = await res.json()

  // Store in cache
  setCache(cacheKey, data)
  return data
}

export async function tmdb(path, params = {}) {
  return tmdbWithRetry(path, params)
}
