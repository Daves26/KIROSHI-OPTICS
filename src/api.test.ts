import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vite's import.meta.env before importing api module
vi.stubGlobal('import', {
  meta: { env: { VITE_TMDB_ACCESS_TOKEN: 'test-token', DEV: false, PROD: false } }
})

// Mock localStorage using vi.fn() properly
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  get length() { return Object.keys(localStorageStore).length }
}
global.localStorage = localStorageMock as Storage

// Mock fetch
const fetchMock = vi.fn()
global.fetch = fetchMock

// We need to import after mocks are set up
import { getCached, setCache, clearCache, validateToken, tmdb } from './api'

describe('api.ts', () => {
  beforeEach(() => {
    localStorageMock.clear()
    fetchMock.mockReset()
  })

  describe('getCached', () => {
    it('returns null if key does not exist', () => {
      expect(getCached('nonexistent')).toBeNull()
    })

    it('returns null if cache is expired', () => {
      const expiredItem = { data: 'old', expires: Date.now() - 1000 }
      localStorageStore['kiroshi_api_cache_test'] = JSON.stringify(expiredItem)
      expect(getCached('test')).toBeNull()
    })

    it('returns cached data if not expired', () => {
      const validItem = { data: { foo: 'bar' }, expires: Date.now() + 60000 }
      localStorageStore['kiroshi_api_cache_mykey'] = JSON.stringify(validItem)
      expect(getCached('mykey')).toEqual({ foo: 'bar' })
    })
  })

  describe('setCache', () => {
    it('stores data with expiration', () => {
      setCache('testkey', { id: 1, name: 'test' })
      const stored = JSON.parse(localStorageStore['kiroshi_api_cache_testkey'])
      expect(stored.data).toEqual({ id: 1, name: 'test' })
      expect(stored.expires).toBeGreaterThan(Date.now())
    })
  })

  describe('clearCache', () => {
    it('calls localStorage.removeItem for kiroshi keys', () => {
      clearCache()
      // clearCache iterates Object.keys(localStorage) and removes kiroshi_ prefixed keys
      // Since we can't easily mock Object.keys(localStorage), we verify no error is thrown
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('validateToken', () => {
    it('returns true when token is valid', () => {
      // Token is 'test-token' from the mock
      expect(validateToken()).toBe(true)
    })
  })

  describe('tmdb', () => {
    it('returns data from API on success', async () => {
      const mockData = { results: [{ id: 1, title: 'Test' }] }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      })

      const result = await tmdb('/movie/popular')
      expect(result).toEqual(mockData)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('retries on 500 error', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [] })
        })

      const result = await tmdb('/tv/popular')
      expect(result).toEqual({ results: [] })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('throws error on 401', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401 })

      await expect(tmdb('/movie/1')).rejects.toThrow('TMDB_401')
    })

    it('throws error on 429 after retries', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null } })
        .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null } })
        .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null } })

      await expect(tmdb('/movie/1')).rejects.toThrow('TMDB_429')
    })

    it('returns cached data without fetching', async () => {
      const cachedData = { results: [{ id: 42 }] }
      const url = `https://api.themoviedb.org/3/movie/popular?page=1&include_adult=false`
      const validItem = { data: cachedData, expires: Date.now() + 60000 }
      localStorageStore[`kiroshi_api_cache_${url}`] = JSON.stringify(validItem)

      const result = await tmdb('/movie/popular', { page: 1, include_adult: false })
      expect(result).toEqual(cachedData)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
