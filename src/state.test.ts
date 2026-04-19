/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  get length() { return Object.keys(localStorageStore).length },
}
global.localStorage = localStorageMock as unknown as Storage

// Mock window.dispatchEvent
global.window = {
  dispatchEvent: vi.fn(() => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any

import {
  getFavorites,
  toggleFavorite,
  isFavorite,
  removeFromFavorites,
  clearFavorites,
  getContinueWatching,
  saveContinueWatching,
  removeFromContinueWatching,
  getActiveSource,
  setActiveSource,
} from './state'

describe('state.ts', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
    vi.clearAllMocks()
  })

  describe('Favorites', () => {
    it('returns empty object when no favorites exist', () => {
      expect(getFavorites()).toEqual({})
    })

    it('adds and removes a favorite item', () => {
      const item = { id: 123, title: 'Test Movie', media_type: 'movie' as const }

      // Add
      const added = toggleFavorite(item)
      expect(added).toBe(true)
      expect(isFavorite(123)).toBe(true)

      // Remove
      const removed = toggleFavorite(item)
      expect(removed).toBe(false)
      expect(isFavorite(123)).toBe(false)
    })

    it('dispatches storage event on toggle', () => {
      const item = { id: 456, title: 'Test', media_type: 'tv' as const }
      toggleFavorite(item)
      expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event))
    })

    it('removeFromFavorites returns true when item exists', () => {
      const item = { id: 789, title: 'Test', media_type: 'movie' as const }
      toggleFavorite(item)

      expect(removeFromFavorites(789)).toBe(true)
      expect(isFavorite(789)).toBe(false)
    })

    it('removeFromFavorites returns false when item does not exist', () => {
      expect(removeFromFavorites(999)).toBe(false)
    })

    it('clearFavorites removes all favorites', () => {
      toggleFavorite({ id: 1, title: 'A', media_type: 'movie' as const })
      toggleFavorite({ id: 2, title: 'B', media_type: 'tv' as const })

      clearFavorites()
      expect(getFavorites()).toEqual({})
    })
  })

  describe('Continue Watching', () => {
    it('returns empty array when no items exist', () => {
      expect(getContinueWatching()).toEqual([])
    })

    it('saves and retrieves continue watching item', () => {
      const item = {
        id: 'tv-123',
        tmdbId: 123,
        media_type: 'tv' as const,
        title: 'Test Show',
        season: 1,
        episode: 3,
        progress: 50,
        watchedAt: Date.now(),
      }

      saveContinueWatching(item)
      const items = getContinueWatching()

      expect(items).toHaveLength(1)
      expect(items[0]?.title).toBe('Test Show')
      expect(items[0]?.episode).toBe(3)
    })

    it('updates watchedAt when saving same item again', async () => {
      const baseTime = Date.now() - 100000
      const item = {
        id: 'movie-456',
        tmdbId: 456,
        media_type: 'movie' as const,
        title: 'Test Movie',
        progress: 0,
        watchedAt: baseTime,
      }

      saveContinueWatching(item)
      const before = getContinueWatching()[0]?.watchedAt

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10))

      saveContinueWatching({ ...item, progress: 30 })
      const after = getContinueWatching()[0]?.watchedAt

      expect(after).toBeGreaterThan(before!)
    })

    it('returns items sorted by watchedAt (most recent first)', async () => {
      const oldTime = Date.now() - 50000
      const newTime = Date.now()

      saveContinueWatching({
        id: 'a', tmdbId: 1, media_type: 'movie' as const,
        title: 'Old', progress: 0, watchedAt: oldTime,
      })

      // Ensure different timestamp
      await new Promise(r => setTimeout(r, 5))

      saveContinueWatching({
        id: 'b', tmdbId: 2, media_type: 'movie' as const,
        title: 'New', progress: 0, watchedAt: newTime,
      })

      const items = getContinueWatching()
      expect(items[0]?.title).toBe('New')
      expect(items[1]?.title).toBe('Old')
    })

    it('removes item from continue watching', () => {
      saveContinueWatching({
        id: 'tv-99', tmdbId: 99, media_type: 'tv' as const,
        title: 'Remove Me', season: 1, episode: 1, progress: 25, watchedAt: Date.now(),
      })

      expect(removeFromContinueWatching('tv-99')).toBe(true)
      expect(getContinueWatching()).toHaveLength(0)
    })

    it('returns false when removing non-existent item', () => {
      expect(removeFromContinueWatching('nonexistent')).toBe(false)
    })
  })

  describe('Source Management', () => {
    it('returns default source initially', () => {
      expect(getActiveSource()).toBe('111movies')
    })

    it('sets and gets active source', () => {
      setActiveSource('vidsrc')
      expect(getActiveSource()).toBe('vidsrc')
    })
  })
})
