import { describe, expect, it, vi } from 'vitest'
import { initRouter, parseRoute, routeForView, showView } from './router.js'
import { state } from './state.js'
import type { ViewName, ViewRefs } from './types.js'

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

  it('signals readiness only after a view transition updates the DOM', async () => {
    const views = Object.fromEntries(
      (['home', 'category', 'detail', 'episodes', 'player', 'favs'] as ViewName[])
        .map(name => [name, document.createElement('section')])
    ) as ViewRefs
    initRouter(views)
    views.home.classList.add('active')
    let complete!: () => void
    const updateCallbackDone = new Promise<void>(resolve => { complete = resolve })
    const previous = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (update: () => void) => {
        update()
        return { updateCallbackDone }
      },
    })
    window.scrollTo = vi.fn()

    try {
      const ready = showView('category')
      expect(views.category.classList.contains('active')).toBe(true)
      let finished = false
      void ready.then(() => { finished = true })
      await Promise.resolve()
      expect(finished).toBe(false)
      complete()
      await ready
      expect(finished).toBe(true)
    } finally {
      if (previous) Object.defineProperty(document, 'startViewTransition', previous)
      else Reflect.deleteProperty(document, 'startViewTransition')
    }
  })
})
