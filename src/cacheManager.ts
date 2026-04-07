// ═══════════════════════════════════════
// CACHE MANAGER — Async cache with Web Worker
// ═══════════════════════════════════════

interface CacheMessage {
  id: number
  type: 'GET' | 'SET' | 'DELETE' | 'CLEAR' | 'GET_ALL'
  key?: string
  value?: any
}

interface CacheResponse {
  id: number
  type: 'SUCCESS' | 'ERROR'
  data?: any
  error?: string
}

class CacheManager {
  private worker: Worker | null = null
  private messageId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void
    reject: (reason: any) => void
  }>()
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initWorker()
  }

  private async initWorker(): Promise<void> {
    if (typeof Worker === 'undefined') {
      console.warn('[CacheManager] Web Workers not supported, using fallback')
      return
    }

    try {
      // Create worker from source file
      const workerUrl = new URL('./cache.worker.ts', import.meta.url)
      this.worker = new Worker(workerUrl, { type: 'module' })

      this.worker.onmessage = (e: MessageEvent<CacheResponse>) => {
        const { id, type, data, error } = e.data
        
        const pending = this.pendingRequests.get(id)
        if (pending) {
          this.pendingRequests.delete(id)
          
          if (type === 'SUCCESS') {
            pending.resolve(data)
          } else {
            pending.reject(new Error(error))
          }
        }
      }

      this.worker.onerror = (error: ErrorEvent) => {
        console.error('[CacheManager] Worker error:', error)
        // Reject all pending requests
        this.pendingRequests.forEach((pending) => {
          pending.reject(error)
        })
        this.pendingRequests.clear()
      }

      console.log('[CacheManager] Worker initialized')
    } catch (error) {
      console.error('[CacheManager] Failed to initialize worker, using fallback:', error)
      this.worker = null
    }
  }

  /**
   * Wait for worker to be ready
   */
  async ready(): Promise<void> {
    await this.initPromise
  }

  /**
   * Send message to worker and wait for response
   */
  private sendMessage(message: CacheMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to direct localStorage if worker not available
        try {
          const result = this.fallbackOperation(message)
          resolve(result)
        } catch (error) {
          reject(error)
        }
        return
      }

      this.pendingRequests.set(message.id, { resolve, reject })
      this.worker.postMessage(message)
    })
  }

  /**
   * Fallback for when worker is not available
   */
  private fallbackOperation(message: CacheMessage): any {
    const CACHE_KEY = 'kiroshi_api_cache'
    const CACHE_TTL = 1000 * 60 * 30

    switch (message.type) {
      case 'GET': {
        const raw = localStorage.getItem(`${CACHE_KEY}_${message.key}`)
        if (!raw) return null
        const { data, expires } = JSON.parse(raw)
        if (Date.now() > expires) {
          localStorage.removeItem(`${CACHE_KEY}_${message.key}`)
          return null
        }
        return data
      }
      case 'SET': {
        const item = { data: message.value, expires: Date.now() + CACHE_TTL }
        localStorage.setItem(`${CACHE_KEY}_${message.key}`, JSON.stringify(item))
        return undefined
      }
      case 'DELETE': {
        localStorage.removeItem(`${CACHE_KEY}_${message.key}`)
        return undefined
      }
      case 'CLEAR': {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
        keys.forEach(k => localStorage.removeItem(k))
        return undefined
      }
      default:
        throw new Error('Unknown operation')
    }
  }

  /**
   * Get cached value
   */
  async get<T = any>(key: string): Promise<T | null> {
    await this.ready()
    return this.sendMessage({
      id: ++this.messageId,
      type: 'GET',
      key
    })
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any): Promise<void> {
    await this.ready()
    return this.sendMessage({
      id: ++this.messageId,
      type: 'SET',
      key,
      value
    })
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    await this.ready()
    return this.sendMessage({
      id: ++this.messageId,
      type: 'DELETE',
      key
    })
  }

  /**
   * Clear all cached values
   */
  async clear(): Promise<void> {
    await this.ready()
    return this.sendMessage({
      id: ++this.messageId,
      type: 'CLEAR'
    })
  }

  /**
   * Destroy worker and cleanup
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager()
