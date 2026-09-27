// Bounded persistent cache shared by the TMDB and AniList clients.
const TTL = 30 * 60 * 1000
const MAX_ENTRIES = 100

export function readCache<T>(prefix: string, key: string): T | null {
  try {
    const storageKey = `${prefix}_${key}`
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const item = JSON.parse(raw) as { data: T; expires: number }
    if (!Number.isFinite(item.expires) || Date.now() >= item.expires) {
      localStorage.removeItem(storageKey)
      return null
    }
    return item.data
  } catch {
    return null
  }
}

export function writeCache(prefix: string, key: string, data: unknown): void {
  try {
    const keys: Array<{ key: string; expires: number }> = []
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i)
      if (!name?.startsWith(`${prefix}_`)) continue
      try {
        const expires = JSON.parse(localStorage.getItem(name) || '').expires as number
        if (!Number.isFinite(expires) || expires <= Date.now()) {
          localStorage.removeItem(name)
          i--
        } else {
          keys.push({ key: name, expires })
        }
      } catch {
        localStorage.removeItem(name)
        i--
      }
    }
    const storageKey = `${prefix}_${key}`
    keys.filter(item => item.key !== storageKey)
      .sort((a, b) => a.expires - b.expires)
      .slice(0, Math.max(0, keys.length - MAX_ENTRIES + (keys.some(item => item.key === storageKey) ? 0 : 1)))
      .forEach(item => localStorage.removeItem(item.key))
    localStorage.setItem(storageKey, JSON.stringify({ data, expires: Date.now() + TTL }))
  } catch {
    // Storage may be disabled or full; network responses still work.
  }
}

export function clearCachePrefix(prefix: string): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${prefix}_`)) localStorage.removeItem(key)
  }
}
