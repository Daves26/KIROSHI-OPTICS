import { describe, expect, it } from 'vitest'
import { parseRoute, routeForView } from './router.js'
import { state } from './state.js'

describe('hash routing', () => {
  it('accepts complete known routes and rejects suffixes', () => {
    expect(parseRoute('#/tv/42/season/2')).toEqual({ kind: 'detail', type: 'tv', id: 42, season: 2 })
    expect(parseRoute('#/anime/10')).toEqual({ kind: 'anime', id: 10 })
    expect(parseRoute('#/category/trending-anime')).toEqual({ kind: 'category', id: 'trending-anime' })
    expect(parseRoute('#/category/unknown')).toEqual({ kind: 'invalid' })
    expect(parseRoute('#/movie/42/extra')).toEqual({ kind: 'invalid' })
    expect(parseRoute('#/movie/42/season/2')).toEqual({ kind: 'invalid' })
  })

  it('generates a shareable route for a selected season', () => {
    state.currentSerieType = 'tv'
    state.currentSerieId = 42
    state.currentSeason = 2
    state.currentAnimeId = null
    expect(routeForView('episodes', state)).toBe('#/tv/42/season/2')
    expect(routeForView('detail', state)).toBe('#/tv/42')
  })

  it('generates a stable category route independently of row order', () => {
    state.currentCategoryId = 'sci-fi-fantasy'
    expect(routeForView('category', state)).toBe('#/category/sci-fi-fantasy')
  })
})
