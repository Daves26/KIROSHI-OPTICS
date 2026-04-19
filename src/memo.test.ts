/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  memoize,
  invalidateCardCache,
  clearCardCache,
  getCacheStats,
  memoizedCardBuilder,
  cardMemoCache,
  htmlMemoCache,
} from './memo'

describe('memo.ts', () => {
  beforeEach(() => {
    cardMemoCache.clear()
    htmlMemoCache.clear()
    clearCardCache()
  })

  describe('memoize', () => {
    it('caches function results', () => {
      let callCount = 0
      const fn = memoize((x: number) => {
        callCount++
        return x * 2
      })

      expect(fn(5)).toBe(10)
      expect(fn(5)).toBe(10)
      expect(callCount).toBe(1) // Only called once due to memoization
    })

    it('handles different arguments separately', () => {
      let callCount = 0
      const fn = memoize((a: string, b: string) => {
        callCount++
        return `${a}-${b}`
      })

      expect(fn('hello', 'world')).toBe('hello-world')
      expect(fn('foo', 'bar')).toBe('foo-bar')
      expect(fn('hello', 'world')).toBe('hello-world')
      expect(callCount).toBe(2)
    })

    it('evicts LRU entries when cache is full', () => {
      let callCount = 0
      const fn = memoize((id: number) => {
        callCount++
        return { id }
      }, 3) // maxSize = 3

      fn(1)
      fn(2)
      fn(3)
      expect(callCount).toBe(3)

      // Access 1 to make it MRU
      fn(1)
      expect(callCount).toBe(3)

      // Add 4, should evict 2 (LRU)
      fn(4)
      expect(callCount).toBe(4)

      // 1 and 3 should still be cached
      fn(1)
      fn(3)
      expect(callCount).toBe(4)

      // 2 should have been evicted
      fn(2)
      expect(callCount).toBe(5)
    })
  })

  describe('invalidateCardCache', () => {
    it('removes entries for specific item ID', () => {
      const builder = vi.fn((item: any, _enablePrefetch: boolean) => {
        const el = { tagName: 'DIV', dataset: { id: item.id } } as any
        return el
      })
      const memoized = memoizedCardBuilder(builder)

      memoized({ id: 100, media_type: 'movie' }, false)
      memoized({ id: 100, media_type: 'tv' }, false)
      memoized({ id: 200, media_type: 'movie' }, false)

      expect(getCacheStats().cards).toBe(3)

      invalidateCardCache(100)
      expect(getCacheStats().cards).toBe(1) // Only 200 remains
    })
  })

  describe('clearCardCache', () => {
    it('clears all card cache', () => {
      const builder = vi.fn((_item: any, _enablePrefetch: boolean) => ({ tag: 'DIV' } as any))
      const memoized = memoizedCardBuilder(builder)

      memoized({ id: 1 }, false)
      memoized({ id: 2 }, false)

      expect(getCacheStats().cards).toBe(2)

      clearCardCache()
      expect(getCacheStats().cards).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('returns card and memo cache sizes', () => {
      const stats = getCacheStats()
      expect(typeof stats.cards).toBe('number')
      expect(typeof stats.memo).toBe('number')
    })
  })

  describe('memoizedCardBuilder', () => {
    it('caches built cards by ID', () => {
      const buildFn = vi.fn((item: any, _enablePrefetch: boolean) => {
        const el: any = { id: item.id, built: true }
        el.cloneNode = () => ({ ...el })
        return el
      })
      const memoized = memoizedCardBuilder(buildFn)

      const item = { id: 42, media_type: 'movie' }
      memoized(item, false)
      memoized(item, false)

      expect(buildFn).toHaveBeenCalledTimes(1)
    })

    it('clones cached results to prevent mutation', () => {
      const buildFn = vi.fn((item: any, _enablePrefetch: boolean) => {
        const el: any = { id: item.id, count: 0 }
        el.cloneNode = () => ({ ...el })
        return el
      })
      const memoized = memoizedCardBuilder(buildFn)

      const item = { id: 10, media_type: 'tv' }
      // First call: builds and caches original
      memoized(item, false)
      // Second call: returns a clone from cache
      const card2 = memoized(item, false) as any

      // Mutate the clone from second call
      card2.count = 999

      // Third call should return another clone with original value
      const card3 = memoized(item, false) as any
      expect(card3.count).toBe(0) // Original cached value not mutated
      expect(buildFn).toHaveBeenCalledTimes(1)
    })

    it('limits cache size to 200 entries', () => {
      const buildFn = vi.fn((item: any, _enablePrefetch: boolean) => {
        const el: any = { id: item.id }
        el.cloneNode = () => ({ ...el })
        return el
      })
      const memoized = memoizedCardBuilder(buildFn)

      for (let i = 0; i < 250; i++) {
        memoized({ id: i, media_type: 'movie' }, false)
      }

      expect(getCacheStats().cards).toBeLessThanOrEqual(200)
    })
  })
})
