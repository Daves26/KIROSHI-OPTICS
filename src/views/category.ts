import { categoryItemKey, fetchCategoryPage, getCategory, type CategoryItem } from '../categories.js'
import { createSearchVirtualScroller, type VirtualScroller } from '../virtualScroller.js'
import { state } from '../state.js'
import { buildResultCard } from './components.js'
import { buildSkeletonCard } from './ui.js'
import { dom, onShowView } from './context.js'
import { setCategoryTitle } from '../router.js'

const items: CategoryItem[] = []
const seen = new Set<string>()
let page = 0
let hasMore = true
let loading = false
let opening = false
let failed = false
let requestVersion = 0
let savedScroll = 0
let observer: IntersectionObserver | null = null
let scroller: VirtualScroller<CategoryItem> | null = null

function isActive(): boolean {
  return dom.categoryGrid?.closest('.view')?.classList.contains('active') ?? false
}

function disconnect(): void {
  observer?.disconnect()
  observer = null
}

function renderItems(): void {
  const grid = dom.categoryGrid!
  if (items.length > 60) {
    if (scroller) scroller.updateItems(items)
    else scroller = createSearchVirtualScroller(grid, items, buildResultCard)
  } else {
    scroller?.destroy()
    scroller = null
    grid.replaceChildren(...items.map(item => buildResultCard(item, true)))
  }
}

function updateControls(): void {
  const status = dom.categoryStatus!
  const more = dom.categoryMore!
  status.textContent = failed ? 'Could not load this page. Try again.'
    : loading ? 'Loading more titles…'
    : !items.length && !hasMore ? 'No titles found.'
    : !hasMore ? 'You have reached the end.' : ''
  more.hidden = !hasMore && !failed
  more.disabled = loading
  more.textContent = failed ? 'Try again' : 'Load more'
}

function observeEnd(): void {
  disconnect()
  if (!hasMore || failed || !isActive()) return
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) void loadNextCategoryPage()
  }, { rootMargin: '400px 0px' })
  observer.observe(dom.categorySentinel!)
}

export function initCategoryView(): void {
  dom.categoryMore!.addEventListener('click', () => { void loadNextCategoryPage() })
}

export function getCurrentCategoryId(): string | null {
  return state.currentCategoryId
}

export function isCategoryOpening(): boolean {
  return opening
}

export function suspendCategory(): void {
  if (isActive()) savedScroll = window.scrollY
  requestVersion++
  loading = false
  opening = false
  disconnect()
  scroller?.destroy()
  scroller = null
}

export async function openCategory(id: string): Promise<void> {
  const category = getCategory(id)
  if (!category) return
  const isNew = state.currentCategoryId !== id
  if (isNew) {
    suspendCategory()
    state.currentCategoryId = id
    items.length = 0
    seen.clear()
    page = 0
    hasMore = true
    failed = false
    savedScroll = 0
  }

  dom.categoryTitle!.textContent = category.title
  const version = requestVersion
  opening = true
  const viewReady = onShowView('category')
  setCategoryTitle(category.title)
  try {
    await viewReady
  } finally {
    if (version === requestVersion) opening = false
  }
  if (version !== requestVersion || state.currentCategoryId !== id || !isActive()) return
  renderItems()
  updateControls()
  if (isNew || !items.length && hasMore && !loading) {
    void loadNextCategoryPage()
  } else {
    if (!failed) observeEnd()
    requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' }))
  }
}

export async function loadNextCategoryPage(): Promise<void> {
  const category = state.currentCategoryId && getCategory(state.currentCategoryId)
  if (!category || !isActive() || loading || !hasMore) return
  loading = true
  failed = false
  disconnect()
  if (!items.length) dom.categoryGrid!.replaceChildren(...Array.from({ length: 8 }, () => buildSkeletonCard()))
  updateControls()
  const version = requestVersion
  const nextPage = page + 1
  try {
    const result = await fetchCategoryPage(category, nextPage)
    if (version !== requestVersion || state.currentCategoryId !== category.id || !isActive()) return
    page = nextPage
    hasMore = result.hasMore
    for (const item of result.items) {
      const key = categoryItemKey(item)
      if (!seen.has(key)) {
        seen.add(key)
        items.push(item)
      }
    }
    renderItems()
  } catch {
    if (version !== requestVersion || !isActive()) return
    failed = true
    if (!items.length) dom.categoryGrid!.replaceChildren()
  } finally {
    if (version === requestVersion) {
      loading = false
      updateControls()
      observeEnd()
    }
  }
}
