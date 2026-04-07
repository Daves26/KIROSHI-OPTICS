// ═══════════════════════════════════════
// MEMOIZATION — Cache for expensive renders
// ═══════════════════════════════════════

// LRU Cache for memoized results
class MemoCache<T extends (...args: any[]) => any> {
  private cache = new Map<string, ReturnType<T>>()
  private accessOrder: string[] = []
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  private generateKey(args: any[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          if (arg.id && arg.updatedAt) {
            return `${arg.id}@${arg.updatedAt}`
          }
          if (arg.id) {
            return String(arg.id)
          }
          return JSON.stringify(arg).slice(0, 100)
        }
        return String(arg)
      })
      .join('::')
  }

  get(...args: Parameters<T>): ReturnType<T> | undefined {
    const key = this.generateKey(args)
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!
      
      // Move to end (most recently used)
      const idx = this.accessOrder.indexOf(key)
      if (idx > -1) {
        this.accessOrder.splice(idx, 1)
        this.accessOrder.push(key)
      }
      
      // Clone DOM elements to prevent mutations
      if (typeof HTMLElement !== 'undefined' && (cached as any) instanceof HTMLElement) {
        return (cached as HTMLElement).cloneNode(true) as ReturnType<T>
      }
      
      return cached
    }
    
    return undefined
  }

  set(args: Parameters<T>, result: ReturnType<T>): void {
    const key = this.generateKey(args)
    
    // Evict LRU if full
    if (this.cache.size >= this.maxSize) {
      const oldest = this.accessOrder.shift()
      if (oldest) {
        this.cache.delete(oldest)
      }
    }
    
    this.cache.set(key, result)
    this.accessOrder.push(key)
  }

  has(...args: Parameters<T>): boolean {
    const key = this.generateKey(args)
    return this.cache.has(key)
  }

  delete(...args: Parameters<T>): void {
    const key = this.generateKey(args)
    this.cache.delete(key)
    const idx = this.accessOrder.indexOf(key)
    if (idx > -1) {
      this.accessOrder.splice(idx, 1)
    }
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  get size(): number {
    return this.cache.size
  }
}

// Global memoization caches
export const cardMemoCache = new MemoCache<any>(150)
export const htmlMemoCache = new MemoCache<any>(50)

/**
 * Memoize a function with LRU cache
 * @param fn Function to memoize
 * @param maxSize Maximum cache size (default: 100)
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxSize: number = 100
): T {
  const cache = new MemoCache<T>(maxSize)

  return function(...args: Parameters<T>): ReturnType<T> {
    const cached = cache.get(...args)
    if (cached !== undefined) {
      return cached
    }
    
    const result = fn(...args)
    cache.set(args, result)
    
    return result
  } as T
}

/**
 * Create a memoized version of buildResultCard
 * Uses card ID as cache key
 */
const cardCache = new Map<string, HTMLElement>()

export function memoizedCardBuilder(
  buildFn: (item: any, enablePrefetch: boolean) => HTMLElement
): (item: any, enablePrefetch: boolean) => HTMLElement {
  return (item: any, enablePrefetch: boolean): HTMLElement => {
    const cacheKey = `${item.id}_${item.media_type || 'movie'}`
    
    if (cardCache.has(cacheKey)) {
      return cardCache.get(cacheKey)!.cloneNode(true) as HTMLElement
    }
    
    const card = buildFn(item, enablePrefetch)
    cardCache.set(cacheKey, card)
    
    // Limit cache size
    if (cardCache.size > 200) {
      const oldestKey = cardCache.keys().next().value
      if (oldestKey !== undefined) {
        cardCache.delete(oldestKey)
      }
    }
    
    return card
  }
}

/**
 * Invalidate card cache when data changes
 */
export function invalidateCardCache(itemId: number | string): void {
  // Delete all variants of this item
  for (const key of cardCache.keys()) {
    if (key.startsWith(`${itemId}_`)) {
      cardCache.delete(key)
    }
  }
}

/**
 * Clear all card cache
 */
export function clearCardCache(): void {
  cardCache.clear()
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats(): { cards: number; memo: number } {
  return {
    cards: cardCache.size,
    memo: cardMemoCache.size + htmlMemoCache.size,
  }
}
