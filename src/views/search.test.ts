import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initViewContext } from './context.js'
import { doSearch, resetSearchSession } from './search.js'

const mocks = vi.hoisted(() => ({ tmdb: vi.fn(), anime: vi.fn() }))
vi.mock('../api.js', () => ({ tmdb: mocks.tmdb }))
vi.mock('../anilist.js', () => ({ searchAnime: mocks.anime }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

const result = (id: number, page: number, totalPages: number) => ({
  results: [{ id, title: `Movie ${id}`, media_type: 'movie', poster_path: '/poster.jpg' }],
  page, total_pages: totalPages, total_results: totalPages,
})

describe('search concurrency and pagination', () => {
  beforeEach(() => {
    mocks.tmdb.mockReset()
    mocks.anime.mockReset()
    document.body.innerHTML = '<input id="input"><div id="grid"></div><div id="results"></div><div id="rows"></div><div id="hero"></div><div id="more"></div><button id="moreBtn"></button><div id="title"></div><div id="count"></div>'
    window.scrollTo = vi.fn()
    const el = (id: string) => document.getElementById(id)!
    initViewContext({
      searchInput: el('input') as HTMLInputElement, resultsGrid: el('grid'), searchResults: el('results'),
      homeRows: el('rows'), heroText: el('hero'), loadMore: el('more'),
      loadMoreBtn: el('moreBtn') as HTMLButtonElement, resultsTitle: el('title'), resultsCount: el('count'),
    } as never, { onShowView: vi.fn() } as never)
    resetSearchSession()
  })

  it('ignores a slow response from an earlier query', async () => {
    const slow = deferred<ReturnType<typeof result>>()
    mocks.tmdb.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(result(2, 1, 1))
    mocks.anime.mockResolvedValue({ results: [], hasNextPage: false, total: 0 })
    const input = document.getElementById('input') as HTMLInputElement
    input.value = 'old'
    const first = doSearch('old')
    input.value = 'new'
    await doSearch('new')
    slow.resolve(result(1, 1, 1))
    await first
    expect(document.getElementById('grid')?.textContent).toContain('Movie 2')
    expect(document.getElementById('grid')?.textContent).not.toContain('Movie 1')
  })

  it('continues only the provider that has more pages', async () => {
    mocks.tmdb.mockResolvedValueOnce(result(1, 1, 1))
    mocks.anime.mockResolvedValueOnce({ results: [], hasNextPage: true, total: 2 })
      .mockResolvedValueOnce({ results: [], hasNextPage: false, total: 2 })
    const input = document.getElementById('input') as HTMLInputElement
    input.value = 'test'
    await doSearch('test')
    await doSearch('test', 2, true)
    expect(mocks.tmdb).toHaveBeenCalledTimes(1)
    expect(mocks.anime).toHaveBeenCalledTimes(2)
    expect(mocks.anime.mock.calls[1]?.[1]).toBe(2)
  })
})
