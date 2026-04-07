// ═══════════════════════════════════════
// CACHE WORKER — Offload localStorage to Web Worker
// ═══════════════════════════════════════

const CACHE_KEY = 'kiroshi_api_cache'
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

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

// Handle messages from main thread
self.onmessage = (e: MessageEvent<CacheMessage>) => {
  const { id, type, key, value } = e.data
  
  try {
    let response: CacheResponse

    switch (type) {
      case 'GET':
        response = { id, ...handleGet(key!) }
        break
      case 'SET':
        response = { id, ...handleSet(key!, value) }
        break
      case 'DELETE':
        response = { id, ...handleDelete(key!) }
        break
      case 'CLEAR':
        response = { id, ...handleClear() }
        break
      case 'GET_ALL':
        response = { id, ...handleGetAll() }
        break
      default:
        response = { id, type: 'ERROR', error: 'Unknown operation' }
    }

    self.postMessage(response)
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function handleGet(key: string): { type: 'SUCCESS'; data: any | null } {
  const raw = localStorage.getItem(`${CACHE_KEY}_${key}`)
  if (!raw) return { type: 'SUCCESS', data: null }
  
  try {
    const { data, expires } = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(`${CACHE_KEY}_${key}`)
      return { type: 'SUCCESS', data: null }
    }
    return { type: 'SUCCESS', data }
  } catch {
    return { type: 'SUCCESS', data: null }
  }
}

function handleSet(key: string, value: any): { type: 'SUCCESS'; data: undefined } {
  const item = { 
    data: value, 
    expires: Date.now() + CACHE_TTL 
  }
  localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(item))
  return { type: 'SUCCESS', data: undefined }
}

function handleDelete(key: string): { type: 'SUCCESS'; data: undefined } {
  localStorage.removeItem(`${CACHE_KEY}_${key}`)
  return { type: 'SUCCESS', data: undefined }
}

function handleClear(): { type: 'SUCCESS'; data: undefined } {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
  keys.forEach(k => localStorage.removeItem(k))
  return { type: 'SUCCESS', data: undefined }
}

function handleGetAll(): { type: 'SUCCESS'; data: Record<string, any> } {
  const result: Record<string, any> = {}
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
  
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const { data, expires } = JSON.parse(raw)
        if (Date.now() <= expires) {
          result[key] = data
        } else {
          localStorage.removeItem(key)
        }
      } catch {
        // Ignore invalid entries
      }
    }
  }
  
  return { type: 'SUCCESS', data: result }
}

// Export for TypeScript (workers don't actually export)
export {}
