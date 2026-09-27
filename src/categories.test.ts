import { beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryItemKey, fetchCategoryPage, getCategory } from './categories.js'

const mocks = vi.hoisted(() => ({ tmdb: vi.fn(), trending: vi.fn(), popular: vi.fn() }))
vi.mock('./api.js', () => ({ tmdb: mocks.tmdb }))
vi.mock('./anilist.js', () => ({ getTrendingAnimePage: mocks.trending, getPopularAnimePage: mocks.popular }))

describe('category data', () => {
  beforeEach(() => Object.values(mocks).forEach(fn => fn.mockReset()))

  it('requests the selected TMDB page, excluding people and filling in movie type', async () => {
    mocks.tmdb.mockResolvedValue({
      results: [
        { id: 1, poster_path: '/poster.jpg' },
        { id: 2, media_type: 'person', poster_path: '/person.jpg' },
        { id: 3, media_type: 'movie', poster_path: null },
      ], total_pages: 3,
    })
    const category = getCategory('drama')!
    const result = await fetchCategoryPage(category, 2)
    expect(mocks.tmdb).toHaveBeenCalledWith('/discover/movie?with_genres=18', { page: 2 })
    expect(result).toEqual({ items: [{ id: 1, media_type: 'movie', poster_path: '/poster.jpg' }], hasMore: true })
    expect(categoryItemKey(result.items[0]!)).toBe('tmdb:movie:1')
  })

  it('uses AniList hasNextPage rather than guessing from item count', async () => {
    mocks.popular.mockResolvedValue({ results: [{ id: 1, media_type: 'anime', poster_path: 'https://example.com/1.jpg' }], hasNextPage: false })
    const result = await fetchCategoryPage(getCategory('popular-anime')!, 3)
    expect(mocks.popular).toHaveBeenCalledWith(3)
    expect(result.hasMore).toBe(false)
    expect(categoryItemKey(result.items[0]!)).toBe('anilist:anime:1')
  })
})
