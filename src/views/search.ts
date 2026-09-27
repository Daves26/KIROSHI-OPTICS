import { CLASSES, SKELETON_COUNT_SEARCH, SEARCH_DEBOUNCE_MS } from '../constants.js'
import { tmdb } from '../api.js'
import { searchAnime as searchAnimeFromAnilist } from '../anilist.js'
import { state } from '../state.js'
import { debounce, normalizeTitle } from './utils.js'
import { buildSkeletonCard } from './ui.js'
import { dom, onShowView } from './context.js'
import { buildResultCard } from './components.js'
import { createSearchVirtualScroller, type VirtualScroller } from '../virtualScroller.js'
import type { ViewName } from '../types.js'
import { getLastPlayerSrc } from '../router.js'
import { openCategory } from './category.js'
import type { TmdbMedia, TmdbSearchResponse, NormalizedAnime } from '../types.js'

type SearchItem = TmdbMedia | NormalizedAnime
let searchVersion = 0
let searchItems: SearchItem[] = []
let tmdbPage = 0
let animePage = 0
let tmdbHasMore = true
let animeHasMore = true
let searchBusy = false
let searchScroller: VirtualScroller<SearchItem> | null = null

function invalidateSearch(): void {
  searchVersion++
  searchScroller?.destroy()
  searchScroller = null
  searchItems = []
  tmdbPage = 0
  animePage = 0
  tmdbHasMore = true
  animeHasMore = true
  searchBusy = false
  dom.loadMore?.classList.add(CLASSES.HIDDEN)
}

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
  const seenTitles = new Set<string>()

  // 1. Process TMDB items: allow multiple IDs for the same title
  for (const item of tmdbItems) {
    const titleKey = normalizeTitle(item.title || item.name || '')
    if (!titleKey) continue

    // Key includes ID to allow different versions (remakes, etc.)
    const uniqueKey = `tmdb_${item.id}`
    seen.set(uniqueKey, item)
    seenTitles.add(titleKey)
  }

  // 2. Process Anime items: deduplicate against existing titles
  for (const item of animeItems) {
    const titleKey = normalizeTitle(item.title || '')
    if (!titleKey) continue

    // If we haven't seen this title in TMDB, add it
    // We also use a unique key for anime to allow different versions if they appear alone
    if (!seenTitles.has(titleKey)) {
      const uniqueKey = `anime_${item.id}`
      seen.set(uniqueKey, item)
      seenTitles.add(titleKey)
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
  const views = ['home', 'category', 'detail', 'episodes', 'player', 'favs'] as ViewName[]
  for (const view of views) {
    const el = document.getElementById(`${view === 'favs' ? 'favs' : view}View`)
    if (el && el.classList.contains('active')) {
      return view
    }
  }
  return 'home'
}

export function setupSearch(): void {
  const handleInput = debounce((q: string) => {
    if (q !== dom.searchInput?.value.trim()) return
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
    invalidateSearch()
    handleInput(q)
  })

  dom.clearBtn?.addEventListener('click', () => {
    cancelSearch()
  })

  dom.loadMoreBtn?.addEventListener('click', () => {
    if (!searchBusy) void doSearch(state.searchQuery, state.searchPage + 1, true)
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
  } else if (viewToRestore === 'category' && state.currentCategoryId) {
    openCategory(state.currentCategoryId)
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
  invalidateSearch()
  dom.searchInput!.value = ''
  ;(dom.clearBtn as HTMLElement).classList.remove('visible')
  dom.searchResults?.classList.add(CLASSES.HIDDEN)
  dom.resultsGrid!.innerHTML = ''
  restorePreviousView()
}

export function resetSearchSession(): void {
  invalidateSearch()
  searchTrackingActive = false
  viewSavedForCurrentSearch = false
  previousViewBeforeSearch = null
  previousScrollPosBeforeSearch = 0
  state.searchQuery = ''
}

/**
 * Check if search is currently active (has results showing)
 */
export function isSearchActive(): boolean {
  return !dom.searchResults?.classList.contains(CLASSES.HIDDEN)
}

export async function doSearch(query: string, page: number = 1, append: boolean = false): Promise<void> {
  if (append && (searchBusy || query !== state.searchQuery)) return
  if (!append) invalidateSearch()
  const version = searchVersion
  searchBusy = true
  if (dom.loadMoreBtn) (dom.loadMoreBtn as HTMLButtonElement).disabled = true
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

  try {
    const [tmdbResult, animeResult] = await Promise.allSettled([
      tmdbHasMore ? tmdb<TmdbSearchResponse>('/search/multi', { query, page: tmdbPage + 1, include_adult: false }) : Promise.resolve(null),
      animeHasMore ? searchAnimeFromAnilist(query, animePage + 1) : Promise.resolve(null),
    ])
    if (version !== searchVersion || query !== dom.searchInput?.value.trim()) return

    let tmdbItems: TmdbMedia[] = []
    let animeItems: NormalizedAnime[] = []

    if (tmdbResult.status === 'fulfilled' && tmdbResult.value) {
      const data = tmdbResult.value
      tmdbItems = data.results.filter((r): r is TmdbMedia => r.media_type !== 'person' && !!(r.poster_path || r.backdrop_path))
      tmdbPage++
      tmdbHasMore = tmdbPage < data.total_pages
    }

    if (animeResult.status === 'fulfilled' && animeResult.value) {
      animeItems = animeResult.value.results
      animePage++
      animeHasMore = animeResult.value.hasNextPage
    }

    const failed = tmdbResult.status === 'rejected' || animeResult.status === 'rejected'
    const succeeded = tmdbResult.status === 'fulfilled' && !!tmdbResult.value || animeResult.status === 'fulfilled' && !!animeResult.value
    if (failed && !succeeded && searchItems.length === 0) {
      showSearchError()
      dom.loadMore?.classList.remove(CLASSES.HIDDEN)
      return
    }

    if (!append) {
      dom.resultsTitle!.textContent = `"${query}"`
    }

    searchItems = deduplicateSearchResults([...searchItems.filter(i => i.media_type !== 'anime'), ...tmdbItems], [...searchItems.filter(i => i.media_type === 'anime') as NormalizedAnime[], ...animeItems])
    state.searchPage = page
    dom.resultsCount!.textContent = `${searchItems.length.toLocaleString()} results${failed ? ' · Some sources are unavailable' : ''}`
    searchScroller?.destroy()
    searchScroller = null
    if (searchItems.length > 60) {
      searchScroller = createSearchVirtualScroller(dom.resultsGrid!, searchItems, buildResultCard)
    } else {
      dom.resultsGrid!.replaceChildren(...searchItems.map(item => buildResultCard(item, true)))
    }
    if (!searchItems.length) dom.resultsGrid!.textContent = 'No results found.'
    dom.loadMore?.classList.toggle(CLASSES.HIDDEN, !tmdbHasMore && !animeHasMore)

  } catch (e) {
    if (version === searchVersion) showSearchError()
  } finally {
    if (version === searchVersion) {
      searchBusy = false
      if (dom.loadMoreBtn) (dom.loadMoreBtn as HTMLButtonElement).disabled = false
    }
  }
}

export function showSearchError(): void {
  dom.resultsGrid!.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:32px">Failed to load results. Please try again.</p>'
}
