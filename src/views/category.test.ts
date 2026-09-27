import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initViewContext } from './context.js'
import { initCategoryView, loadNextCategoryPage, openCategory, suspendCategory } from './category.js'
import { state } from '../state.js'

const mocks = vi.hoisted(() => ({ fetchPage: vi.fn() }))
vi.mock('../categories.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../categories.js')>()
  return { ...actual, fetchCategoryPage: mocks.fetchPage }
})

function deferred<T>() {
  let resolve!: (data: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

const movie = (id: number) => ({ id, title: `Movie ${id}`, media_type: 'movie' as const, poster_path: '/poster.jpg' })

class FakeObserver {
  static instances: FakeObserver[] = []
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this)
  }
  intersect(): void {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

describe('expanded category', () => {
  afterEach(() => {
    suspendCategory()
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  beforeEach(() => {
    suspendCategory()
    state.currentCategoryId = null
    mocks.fetchPage.mockReset()
    FakeObserver.instances = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    window.scrollTo = vi.fn()
    document.body.innerHTML = `
      <section id="categoryView" class="view active">
        <h1 id="categoryTitle"></h1><div id="categoryGrid"></div>
        <div id="categoryStatus"></div><button id="categoryMore"></button><div id="categorySentinel"></div>
      </section>`
    const el = (id: string) => document.getElementById(id)!
    initViewContext({
      categoryTitle: el('categoryTitle'), categoryGrid: el('categoryGrid'), categoryStatus: el('categoryStatus'),
      categoryMore: el('categoryMore') as HTMLButtonElement, categorySentinel: el('categorySentinel'),
    } as never, { onShowView: vi.fn() } as never)
    initCategoryView()
  })

  it('loads subsequent pages once, deduplicates items and stops at the end', async () => {
    mocks.fetchPage.mockResolvedValueOnce({ items: [movie(1)], hasMore: true })
      .mockResolvedValueOnce({ items: [movie(1), movie(2)], hasMore: false })
    openCategory('drama')
    await vi.waitFor(() => expect(document.querySelectorAll('#categoryGrid .result-card')).toHaveLength(1))
    FakeObserver.instances[FakeObserver.instances.length - 1]?.intersect()
    FakeObserver.instances[FakeObserver.instances.length - 1]?.intersect()
    await vi.waitFor(() => expect(document.querySelectorAll('#categoryGrid .result-card')).toHaveLength(2))
    expect(mocks.fetchPage.mock.calls.map(call => call[1])).toEqual([1, 2])
    expect((document.getElementById('categoryMore') as HTMLButtonElement).hidden).toBe(true)
    await loadNextCategoryPage()
    expect(mocks.fetchPage).toHaveBeenCalledTimes(2)
  })

  it('ignores an old page when switching categories', async () => {
    const first = deferred<{ items: ReturnType<typeof movie>[]; hasMore: boolean }>()
    mocks.fetchPage.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ items: [movie(2)], hasMore: false })
    openCategory('drama')
    openCategory('comedy')
    await vi.waitFor(() => expect(document.getElementById('categoryGrid')?.textContent).toContain('Movie 2'))
    first.resolve({ items: [movie(1)], hasMore: false })
    await first.promise
    await Promise.resolve()
    expect(document.getElementById('categoryGrid')?.textContent).not.toContain('Movie 1')
  })

  it('preserves loaded items and scroll position when returning from a detail', async () => {
    mocks.fetchPage.mockResolvedValueOnce({ items: [movie(1)], hasMore: true })
    openCategory('drama')
    await vi.waitFor(() => expect(document.querySelectorAll('#categoryGrid .result-card')).toHaveLength(1))
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 620 })
    suspendCategory()
    openCategory('drama')
    expect(mocks.fetchPage).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 620, behavior: 'instant' }))
  })

  it('keeps the page number when retrying a failed request', async () => {
    mocks.fetchPage.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [movie(1)], hasMore: false })
    openCategory('drama')
    await vi.waitFor(() => expect(document.getElementById('categoryStatus')?.textContent).toContain('Try again'))
    document.getElementById('categoryMore')!.click()
    await vi.waitFor(() => expect(document.querySelectorAll('#categoryGrid .result-card')).toHaveLength(1))
    expect(mocks.fetchPage.mock.calls.map(call => call[1])).toEqual([1, 1])
  })
})
