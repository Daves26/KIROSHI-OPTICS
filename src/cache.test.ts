import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCachePrefix, readCache, writeCache } from './cache.js'

describe('persistent cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('expires responses without removing data in another namespace', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    writeCache('tmdb', '1', { title: 'Movie' })
    writeCache('anilist', '1', { title: 'Anime' })
    clearCachePrefix('anilist')
    expect(readCache('tmdb', '1')).toEqual({ title: 'Movie' })
    vi.advanceTimersByTime(31 * 60 * 1000)
    expect(readCache('tmdb', '1')).toBeNull()
  })

  it('bounds each API cache to 100 responses', () => {
    for (let i = 0; i < 105; i++) writeCache('tmdb', String(i), i)
    const keys = Object.keys(localStorage).filter(key => key.startsWith('tmdb_'))
    expect(keys).toHaveLength(100)
    expect(readCache('tmdb', '104')).toBe(104)
  })
})
