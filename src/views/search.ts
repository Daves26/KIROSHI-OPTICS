import { CLASSES, SKELETON_COUNT_SEARCH, SEARCH_DEBOUNCE_MS } from '../constants.js'
import { tmdb } from '../api.js'
import { searchAnime as searchAnimeFromAnilist } from '../anilist.js'
import { state } from '../state.js'
import { escHtml, debounce, normalizeTitle } from './utils.js'
import { buildSkeletonCard } from './ui.js'
import { dom, onShowView } from './context.js'
import { buildResultCard } from './components.js'
import { createSearchVirtualScroller } from '../virtualScroller.js'
import type { ViewName } from '../types.js'
import { getLastPlayerSrc } from '../router.js'

// ═══════════════════════════════════════
// SEARCH DEDUPLICATION
// ═══════════════════════════════════════

// Track the view that was active before search started
let previousViewBeforeSearch: ViewName | null = null
let previousScrollPosBeforeSearch: number = 0
let searchTrackingActive = false
let viewSavedForCurrentSearch = false

/**
 * Set the view to restore when search is cancelled
 */
export function setPreviousViewBeforeSearch(view: ViewName | null, scrollPos: number = 0): void {
  previousViewBeforeSearch = view
  previousScrollPosBeforeSearch = scrollPos
}

/**
 * Get the current previous view before search
 */
export function getPreviousViewBeforeSearch(): ViewName | null {
  return previousViewBeforeSearch
}

/**
 * Check if search tracking is currently active
 */
export function getIsSearchTrackingActive(): boolean {
  return searchTrackingActive
}

export function deduplicateSearchResults(
  tmdbItems: any[],
  animeItems: any[]
): any[] {
  const seen = new Map<string, any>()

  function shouldKeep(existing: any, candidate: any): boolean {
    const hasPoster = (item: any) => item.poster_path || item.backdrop_path || item.posterUrl
    if (!hasPoster(existing) && hasPoster(candidate)) return true
    if (hasPoster(existing) && !hasPoster(candidate)) return false

    if (candidate.media_type === 'anime' && existing.media_type !== 'anime') return false
    if (candidate.media_type !== 'anime' && existing.media_type === 'anime') return true

    return false
  }

  for (const item of tmdbItems) {
    const key = normalizeTitle(item.title || item.name || '')
    if (key) seen.set(key, item)
  }

  for (const item of animeItems) {
    const key = normalizeTitle(item.title || '')
    if (!key) continue

    const existing = seen.get(key)
    if (!existing || shouldKeep(existing, item)) {
      seen.set(key, item)
    }
  }

  return Array.from(seen.values())
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

/**
 * Get the current active view name
 */
function getCurrentView(): ViewName {
  // Check which view is currently active
  const views = ['home', 'detail', 'episodes', 'player', 'favs'] as ViewName[]
  for (const view of views) {
    const el = document.getElementById(view === 'home' ? 'homeView' : view === 'detail' ? 'detailView' : view === 'episodes' ? 'episodesView' : view === 'player' ? 'playerView' : 'favsView')
    if (el && el.classList.contains('active')) {
      return view
    }
  }
  return 'home'
}

export function setupSearch(): void {
  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  const handleInput = debounce((q: string) => {
    if (!q) {
      dom.searchResults?.classList.add(CLASSES.HIDDEN)
      dom.resultsGrid!.innerHTML = ''
      restorePreviousView()
      return
    }
    // Save view before first doSearch call for this search session
    if (!viewSavedForCurrentSearch) {
      searchTrackingActive = true
      previousViewBeforeSearch = getCurrentView()
      previousScrollPosBeforeSearch = window.scrollY
      if (previousViewBeforeSearch === 'player') {
        state._playerSrcBeforeSearch = dom.playerFrame?.src || ''
      }
      viewSavedForCurrentSearch = true
    }
    doSearch(q, 1)
  }, SEARCH_DEBOUNCE_MS)

  dom.searchInput?.addEventListener('input', () => {
    const q = dom.searchInput!.value.trim()
    ;(dom.clearBtn as HTMLElement)?.classList.toggle('visible', q.length > 0)
    clearTimeout(searchTimeout!)
    searchTimeout = setTimeout(() => handleInput(q), 50)
  })

  dom.clearBtn?.addEventListener('click', () => {
    cancelSearch()
  })

  dom.loadMoreBtn?.addEventListener('click', () => {
    doSearch(state.searchQuery, state.searchPage + 1, true)
  })
}

/**
 * Restore the previously saved view after search is cancelled/cleared
 */
function restorePreviousView(): void {
  const viewToRestore = previousViewBeforeSearch
  const scrollToRestore = previousScrollPosBeforeSearch

  // Reset tracking state
  searchTrackingActive = false
  viewSavedForCurrentSearch = false
  previousViewBeforeSearch = null
  previousScrollPosBeforeSearch = 0

  if (viewToRestore === 'home') {
    dom.homeRows?.classList.remove(CLASSES.HIDDEN)
    dom.heroText?.classList.remove(CLASSES.HIDDEN)
    window.scrollTo({ top: scrollToRestore, behavior: 'instant' as ScrollBehavior })
  } else if (viewToRestore === 'detail' || viewToRestore === 'episodes') {
    onShowView(viewToRestore)
    dom.homeRows?.classList.remove(CLASSES.HIDDEN)
    dom.heroText?.classList.remove(CLASSES.HIDDEN)
  } else if (viewToRestore === 'favs') {
    onShowView('favs')
    dom.homeRows?.classList.remove(CLASSES.HIDDEN)
    dom.heroText?.classList.remove(CLASSES.HIDDEN)
  } else if (viewToRestore === 'player') {
    onShowView('player')
    dom.homeRows?.classList.remove(CLASSES.HIDDEN)
    dom.heroText?.classList.remove(CLASSES.HIDDEN)
    const playerSrc = state._playerSrcBeforeSearch || getLastPlayerSrc()
    if (playerSrc && dom.playerFrame) {
      dom.playerFrame.src = playerSrc
    }
  } else {
    // No previous view saved — just show home content
    dom.homeRows?.classList.remove(CLASSES.HIDDEN)
    dom.heroText?.classList.remove(CLASSES.HIDDEN)
  }
}

/**
 * Cancel search and restore previous view
 */
export function cancelSearch(): void {
  dom.searchInput!.value = ''
  ;(dom.clearBtn as HTMLElement).classList.remove('visible')
  dom.searchResults?.classList.add(CLASSES.HIDDEN)
  dom.resultsGrid!.innerHTML = ''
  restorePreviousView()
}

/**
 * Check if search is currently active (has results showing)
 */
export function isSearchActive(): boolean {
  return !dom.searchResults?.classList.contains(CLASSES.HIDDEN)
}

export async function doSearch(query: string, page: number = 1, append: boolean = false): Promise<void> {
  if (!append) {
    const focusedEl = document.activeElement
    onShowView('home')
    if (focusedEl === dom.searchInput) {
      requestAnimationFrame(() => dom.searchInput?.focus({ preventScroll: true }))
    }
    dom.resultsGrid!.innerHTML = ''
    for (let i = 0; i < SKELETON_COUNT_SEARCH; i++) {
      dom.resultsGrid!.appendChild(buildSkeletonCard())
    }
    dom.searchResults?.classList.remove(CLASSES.HIDDEN)
    dom.homeRows?.classList.add(CLASSES.HIDDEN)
    dom.heroText?.classList.add(CLASSES.HIDDEN)
  }
  state.searchQuery = query
  state.searchPage = page

  try {
    const [tmdbResult, animeResult] = await Promise.allSettled([
      tmdb<any>('/search/multi', { query, page, include_adult: false }),
      searchAnimeFromAnilist(query, page),
    ])

    let tmdbItems: any[] = []
    let animeItems: any[] = []
    let totalResults = 0

    if (tmdbResult.status === 'fulfilled') {
      const data = tmdbResult.value
      tmdbItems = data.results.filter((r: any) => r.media_type !== 'person' && (r.poster_path || r.backdrop_path))
      totalResults += data.total_results
    }

    if (animeResult.status === 'fulfilled') {
      animeItems = animeResult.value.results
      totalResults += animeResult.value.total
    }

    if (!append) {
      dom.resultsGrid!.innerHTML = ''
      dom.resultsTitle!.textContent = `"${escHtml(query)}"`
      dom.resultsCount!.textContent = `${totalResults.toLocaleString()} results`
    }

    const allItems = deduplicateSearchResults(tmdbItems, animeItems)

    if (allItems.length > 60) {
      createSearchVirtualScroller(dom.resultsGrid!, allItems, buildResultCard)
    } else {
      allItems.forEach(item => {
        dom.resultsGrid!.appendChild(buildResultCard(item, true))
      })
    }

    const tmdbHasMore = tmdbResult.status === 'fulfilled' && tmdbResult.value.total_pages > page
    const animeHasMore = animeResult.status === 'fulfilled' && animeResult.value.hasNextPage
    dom.loadMore?.classList.toggle(CLASSES.HIDDEN, !tmdbHasMore && !animeHasMore && allItems.length === 0)

  } catch (e) {
    console.error(e)
    showSearchError()
  }
}

export function showSearchError(): void {
  dom.resultsGrid!.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:32px">Failed to load results. Please try again.</p>'
}

export async function searchAnime(query: string, page: number = 1, append: boolean = false): Promise<void> {
  if (!append) {
    const focusedEl = document.activeElement
    onShowView('home')
    if (focusedEl === dom.searchInput) {
      requestAnimationFrame(() => dom.searchInput?.focus({ preventScroll: true }))
    }
    dom.resultsGrid!.innerHTML = ''
    for (let i = 0; i < SKELETON_COUNT_SEARCH; i++) {
      dom.resultsGrid!.appendChild(buildSkeletonCard())
    }
    dom.searchResults?.classList.remove(CLASSES.HIDDEN)
    dom.homeRows?.classList.add(CLASSES.HIDDEN)
    dom.heroText?.classList.add(CLASSES.HIDDEN)
  }

  state.searchQuery = query
  state.searchPage = page

  try {
    const result = await searchAnimeFromAnilist(query, page)
    state.searchTotal = result.total

    if (!append) {
      dom.resultsGrid!.innerHTML = ''
      dom.resultsTitle!.textContent = `"${escHtml(query)}"`
      dom.resultsCount!.textContent = `${result.total.toLocaleString()} anime results`
    }

    result.results.forEach(item => {
      dom.resultsGrid!.appendChild(buildResultCard(item, true))
    })

    dom.loadMore?.classList.toggle(CLASSES.HIDDEN, !result.hasNextPage || result.results.length === 0)

  } catch (e) {
    console.error(e)
    showSearchError()
  }
}
