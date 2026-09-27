// ═══════════════════════════════════════
// KIROSHI OPTICS — Main Entry Point
// ═══════════════════════════════════════

/// <reference types="vite/client" />

import type { ViewName, ViewRefs, DomRefs } from './types.js'
import { SOURCES, ROW_OBSERVER_MARGIN } from './constants.js'
import { validateToken, clearCache } from './api.js'
import { state, getActiveSource, setActiveSource } from './state.js'
import { initRouter, showView as displayView, savePlayerSrc, getLastPlayerSrc, parseRoute, routeForView } from './router.js'
import {
  initPlayer,
  playEpisode,
  playAnime,
  changeSource,
  prevEpisode,
  nextEpisode,
  cancelPendingPlayback,
} from './player.js'
import {
  initViews,
  loadHomeRows,
  initCategoryView,
  openCategory,
  suspendCategory,
  getCurrentCategoryId,
  setupSearch,
  openFavs,
  goHome,
  openDetail,
  cancelDetailRequest,
  openAnime,
  openAnimeEpisodes,
  openSeason,
  updateAllFavIcons,
  setupParallax,
  refreshContinueWatchingRow,
  cancelSearch,
  getIsSearchTrackingActive,
} from './views.js'
import { showToast } from './toast.js'
import { getCacheStats } from './memo.js'
import { initErrorHandlers } from './errorHandler.js'
import { initCleanup, registerObserver } from './cleanup.js'

// ═══════════════════════════════════════
// RATE LIMIT COUNTDOWN UI
// ═══════════════════════════════════════
window.addEventListener('ratelimit', ((e: Event) => {
  const detail = (e as CustomEvent).detail as { waitMs: number; retries: number; source: string }
  const seconds = Math.ceil(detail.waitMs / 1000)
  const sourceName = detail.source === 'anilist' ? 'AniList' : 'TMDB'
  showToast(
    `⏳ ${sourceName} rate limited. Retrying in ${seconds}s… (attempt ${detail.retries + 1})`,
    'warning',
    Math.max(seconds * 1000 + 500, 5000) // show long enough to cover the wait
  )
}) as EventListener)

// Suppress View Transitions AbortError (harmless, occurs during rapid navigation)
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.name === 'AbortError' && e.reason?.message?.includes('Transition was skipped')) {
    e.preventDefault()
  }
})

// ── Validate token on startup ─────────
if (!validateToken()) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#0D9488;font-family:system-ui;text-align:center;padding:32px">
      <div>
        <h1 style="font-size:2rem;margin-bottom:16px">Configuration Error</h1>
        <p style="opacity:0.7">Missing TMDB token. Create a <code>.env</code> file with:<br>
        <code style="display:block;margin:16px 0;background:rgba(255,255,255,0.1);padding:12px;border-radius:8px">VITE_TMDB_ACCESS_TOKEN=your_token_here</code></p>
      </div>
    </div>
  `
  throw new Error('Missing TMDB token')
}

// ── DOM refs ──────────────────────────
const views: ViewRefs = {
  home: document.getElementById('homeView')!,
  category: document.getElementById('categoryView')!,
  detail: document.getElementById('detailView')!,
  episodes: document.getElementById('episodesView')!,
  player: document.getElementById('playerView')!,
  favs: document.getElementById('favsView')!,
}

const domRefs: DomRefs = {
  homeRows: document.getElementById('homeRows')!,
  categoryTitle: document.getElementById('categoryTitle')!,
  categoryGrid: document.getElementById('categoryGrid')!,
  categoryStatus: document.getElementById('categoryStatus')!,
  categoryMore: document.getElementById('categoryMore')! as HTMLButtonElement,
  categorySentinel: document.getElementById('categorySentinel')!,
  heroText: document.querySelector('.hero-text'),
  searchInput: document.getElementById('searchInput')! as HTMLInputElement,
  clearBtn: document.getElementById('clearBtn')!,
  searchResults: document.getElementById('searchResults')!,
  resultsGrid: document.getElementById('resultsGrid')!,
  resultsTitle: document.getElementById('resultsTitle')!,
  resultsCount: document.getElementById('resultsCount')!,
  loadMore: document.getElementById('loadMore')!,
  loadMoreBtn: document.getElementById('loadMoreBtn')!,
  loader: document.getElementById('loader')!,
  favsGrid: document.getElementById('favsGrid')!,
  detailTitle: document.getElementById('detailTitle')!,
  detailType: document.getElementById('detailType')!,
  detailContent: document.getElementById('detailContent')!,
  episodesTitle: document.getElementById('episodesTitle')!,
  episodesContent: document.getElementById('episodesContent')!,
  playerTitle: document.getElementById('playerTitle')!,
  playerFrame: document.getElementById('playerFrame')! as HTMLIFrameElement,
  prevEpBtn: document.getElementById('prevEp')! as HTMLButtonElement,
  nextEpBtn: document.getElementById('nextEp')! as HTMLButtonElement,
  serverSelect: document.getElementById('serverSelect')! as HTMLSelectElement,
  nextSourceBtn: null, // Removed
  playerBackText: document.getElementById('playerBackText')!,
}

// ── Initialize router ─────────────────
initRouter(views)
let handlingRoute = false
let categoryOriginId: string | null = null
function showView(name: ViewName, onPlayerExit?: () => void): void {
  const current = Object.entries(views).find(([, el]) => el.classList.contains('active'))?.[0]
  if (current === 'detail' && name !== 'detail') cancelDetailRequest()
  if (current === 'category' && name !== 'category') {
    if (name === 'detail') categoryOriginId = getCurrentCategoryId()
    suspendCategory()
  } else if (name === 'detail' && current !== 'detail' && current !== 'player' && current !== 'episodes') {
    categoryOriginId = null
  }
  if (name === 'home') categoryOriginId = null
  if (name !== 'player') cancelPendingPlayback()
  displayView(name, onPlayerExit)
  if (handlingRoute || (name === 'home' && getIsSearchTrackingActive())) return
  const route = routeForView(name, state)
  if (route && window.location.hash !== route) history.pushState(null, '', route)
}

// ── IntersectionObserver for lazy rows ─
const rowObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const row = entry.target as HTMLElement & { _loadRowData?: () => Promise<void>; _loaded?: boolean }
      const loadFn = row._loadRowData
      if (loadFn && !row._loaded) {
        row._loaded = true
        loadFn()
      }
      rowObserver.unobserve(row)
    }
  })
}, { rootMargin: ROW_OBSERVER_MARGIN })

// Register for cleanup
registerObserver(rowObserver)

// ── Initialize views ──────────────────
initViews(domRefs, {
  rowObserver,
  onShowView: (name: ViewName) => showView(name, () => { domRefs.playerFrame.src = '' }),
  onGoHome: goHome,
  onOpenDetail: openDetail,
  onOpenCategory: openCategory,
  onOpenSeason: openSeason,
  onOpenAnime: openAnime,
  onOpenAnimeEpisode: (idx: number, title: string) => playAnime(idx, title),
  onOpenAnimeEpisodes: (title: string) => openAnimeEpisodes(title),
  onLoadMore: (idx: number, title: string) => playEpisode(idx, title),
})
initCategoryView()

// ── Setup source selector ─────────────
function populateSourceDropdown(showAnimeOnly: boolean = false): void {
  domRefs.serverSelect.innerHTML = ''
  const activeSourceKey = getActiveSource()
  
  Object.entries(SOURCES).forEach(([key, src]) => {
    // Filter: if showAnimeOnly, only show sources with getAnime
    if (showAnimeOnly && !src.getAnime) return
    
    const opt = document.createElement('option')
    opt.value = key
    opt.textContent = src.name
    
    // Select the active source
    if (key === activeSourceKey) {
      opt.selected = true
    }
    
    domRefs.serverSelect.appendChild(opt)
  })
  
  // If no option is selected (source was filtered out), select first available
  if (!domRefs.serverSelect.value) {
    const firstOption = domRefs.serverSelect.querySelector('option')
    if (firstOption) {
      firstOption.selected = true
      setActiveSource(firstOption.value)
    }
  }
}

// Initial population (show all sources)
populateSourceDropdown(false)

// Export for use when content type changes
declare global {
  interface Window {
    _populateSourceDropdown: (showAnimeOnly: boolean) => void
    KIROSHI: {
      state: typeof state
      clearCache: typeof clearCache
      showView: typeof showView
    }
  }
}

window._populateSourceDropdown = populateSourceDropdown

domRefs.serverSelect.addEventListener('change', (e: Event) => changeSource((e.target as HTMLSelectElement).value))

// ── Initialize player ─────────────────
initPlayer({
  ...domRefs,
  onShowView: (name: ViewName) => showView(name, () => { domRefs.playerFrame.src = '' }),
})

// ── Navigation buttons ────────────────
document.getElementById('logoBtn')!.addEventListener('click', () => { 
  domRefs.playerFrame.src = ''  // Stop video when going home
  goHome()
})
// ── Next Season button ────────────────
document.getElementById('nextSeasonBtn')?.addEventListener('click', () => {
  if (state.currentSerieId && state.currentSeason !== null && state._totalSeasons !== null) {
    const nextSeason = state.currentSeason + 1
    if (nextSeason <= state._totalSeasons) {
      const title = domRefs.episodesTitle!.textContent?.split(' · ')[0] ?? ''
      openSeason(nextSeason, title)
    }
  }
})
// ── Prev Season button ────────────────
document.getElementById('prevSeasonBtn')?.addEventListener('click', () => {
  if (state.currentSerieId && state.currentSeason !== null) {
    const prevSeason = state.currentSeason - 1
    if (prevSeason >= 1) {
      const title = domRefs.episodesTitle!.textContent?.split(' · ')[0] ?? ''
      openSeason(prevSeason, title)
    }
  }
})

// ── Watchlist toggle ──────────────────
let previousViewBeforeFavs: ViewName | null = null
let previousScrollPos: number = 0

document.getElementById('favsBtn')!.addEventListener('click', () => {
  if (views.favs.classList.contains('active')) {
    // Close watchlist — return to previous view
    if (previousViewBeforeFavs === 'home') {
      showView('home')
      window.scrollTo({ top: previousScrollPos, behavior: 'instant' as ScrollBehavior })
    } else if (previousViewBeforeFavs === 'player') {
      showView('player')
      domRefs.playerFrame.src = getLastPlayerSrc() || domRefs.playerFrame.src
    } else if (previousViewBeforeFavs === 'category' && getCurrentCategoryId()) {
      openCategory(getCurrentCategoryId()!)
    } else if (previousViewBeforeFavs) {
      showView(previousViewBeforeFavs)
    } else {
      showView('home')
    }
    previousViewBeforeFavs = null
  } else {
    // Open watchlist — save current state
    previousScrollPos = window.scrollY
    const currentView = Object.entries(views).find(([, el]) =>
      el.classList.contains('active')
    )?.[0] as ViewName | undefined
    previousViewBeforeFavs = currentView === 'favs' ? 'home' : (currentView ?? 'home')
    if (currentView === 'player') {
      savePlayerSrc(domRefs.playerFrame.src)
    }
    openFavs()
  }
})

document.getElementById('backToHomeFavs')!.addEventListener('click', () => { goHome() })
document.getElementById('backToHomeCategory')!.addEventListener('click', () => { goHome() })
function backFromDetail(): void {
  if (categoryOriginId) openCategory(categoryOriginId)
  else goHome()
}
document.getElementById('backToHome')!.addEventListener('click', () => {
  domRefs.playerFrame.src = ''  // Stop video when going home
  backFromDetail()
})
document.getElementById('backToSeasons')!.addEventListener('click', () => showView('detail'))
document.getElementById('backToEpisodes')!.addEventListener('click', () => {
  // Anime: go back to detail (episodes are in detail view)
  if (state.currentAnimeId) {
    showView('detail')
  } else if (state.currentSerieType === 'movie') {
    showView('detail')
  } else {
    showView('episodes')
  }
  domRefs.playerFrame.src = ''
})

domRefs.prevEpBtn.addEventListener('click', prevEpisode)
domRefs.nextEpBtn.addEventListener('click', () => {
  nextEpisode()
})

// ── Mobile navigation ─────────────────
const mobileNavHome = document.getElementById('mobileNavHome')!
const mobileNavSearch = document.getElementById('mobileNavSearch')!
const mobileNavFavs = document.getElementById('mobileNavFavs')!

function updateMobileNavActive(activeBtn: HTMLElement | null): void {
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'))
  if (activeBtn) activeBtn.classList.add('active')
}

// ═══════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════
const THEME_KEY = 'kiroshi_theme'

function getPreferredTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: 'dark' | 'light'): void {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem(THEME_KEY, theme)
}

// Apply theme on boot
applyTheme(getPreferredTheme())

// Theme toggle button
document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  const next = current === 'light' ? 'dark' : 'light'
  applyTheme(next)
})

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
  if (!localStorage.getItem(THEME_KEY)) {
    applyTheme(e.matches ? 'light' : 'dark')
  }
})

mobileNavHome.addEventListener('click', () => {
  updateMobileNavActive(mobileNavHome)
  domRefs.playerFrame.src = ''
  goHome()
})

mobileNavSearch.addEventListener('click', () => {
  updateMobileNavActive(mobileNavSearch)
  domRefs.searchInput.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

mobileNavFavs.addEventListener('click', () => {
  updateMobileNavActive(mobileNavFavs)
  // Trigger the same toggle as the main favsBtn
  document.getElementById('favsBtn')!.click()
})

// ── Storage listener for fav sync ─────
window.addEventListener('storage', () => {
  if (views.favs.classList.contains('active')) {
    openFavs()
  }
  updateAllFavIcons()
  refreshContinueWatchingRow()
})

// ═══════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════

document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Handle Escape key in search input
  if (e.key === 'Escape' && e.target === domRefs.searchInput) {
    if (getIsSearchTrackingActive()) {
      e.preventDefault()
      cancelSearch()
      return
    }
    // If search is not active, just blur the input
    ;(e.target as HTMLElement).blur()
    return
  }

  // Don't trigger shortcuts when typing in other inputs
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      if (views.player.classList.contains('active')) {
        // Back to episodes/detail
        document.getElementById('backToEpisodes')!.click()
      } else if (views.episodes.classList.contains('active')) {
        showView('detail')
      } else if (views.detail.classList.contains('active')) {
        backFromDetail()
      } else if (views.category.classList.contains('active')) {
        goHome()
      } else if (views.favs.classList.contains('active')) {
        goHome()
      }
      break

    case 'ArrowLeft':
      if (views.player.classList.contains('active')) {
        e.preventDefault()
        prevEpisode()
      }
      break

    case 'ArrowRight':
      if (views.player.classList.contains('active')) {
        e.preventDefault()
        nextEpisode()
      }
      break

    case ' ':
      // Toggle mute on iframe (not possible cross-origin)
      if (views.player.classList.contains('active')) {
        e.preventDefault()
      }
      break

    case '/':
      // Focus search
      e.preventDefault()
      domRefs.searchInput.focus()
      break

    case 'g':
    case 'G':
      // Go home
      if (!views.home.classList.contains('active')) {
        e.preventDefault()
        goHome()
      }
      break
  }
})

// ═══════════════════════════════════════
// DEEP LINKING (Hash-based routing)
// ═══════════════════════════════════════

let routeVersion = 0
async function handleRoute(): Promise<void> {
  // The skip-to-content anchor is an in-page accessibility link, not a view route.
  if (window.location.hash === '#mainContent') return
  const route = parseRoute(window.location.hash)
  const version = ++routeVersion
  handlingRoute = true
  try {
    if (route.kind === 'home') {
      goHome()
    } else if (route.kind === 'watchlist') {
      openFavs()
    } else if (route.kind === 'category') {
      openCategory(route.id)
    } else if (route.kind === 'anime') {
      await openAnime(route.id)
    } else if (route.kind === 'detail') {
      await openDetail(route.id, route.type)
      if (route.season && version === routeVersion && state.currentSerieId === route.id && state.currentSerieType === 'tv') {
        await openSeason(route.season, state._currentTitle ?? domRefs.detailTitle.textContent ?? '')
      }
    } else {
      history.replaceState(null, '', '#/')
      goHome()
    }
  } finally {
    if (version === routeVersion) handlingRoute = false
  }
}

window.addEventListener('hashchange', () => { void handleRoute() })
// Handle initial hash on load
if (window.location.hash) {
  void handleRoute()
}

// ═══════════════════════════════════════
// BOOT
// ═══════════════════════════════════════

// Initialize global error handlers
initErrorHandlers()

// Initialize cleanup listeners
initCleanup()

// Periodically clean up orphaned source preferences
import { clearOrphanedSourcePreferences } from './state.js'
setInterval(() => {
  clearOrphanedSourcePreferences();
}, 5 * 60 * 1000); // Run every 5 minutes

// Apple-style header scroll shadow
const headerEl = document.querySelector('.header')!
const handleHeaderScroll = () => {
  if (window.scrollY > 64) {
    headerEl.classList.add('scrolled')
  } else {
    headerEl.classList.remove('scrolled')
  }
}
window.addEventListener('scroll', handleHeaderScroll, { passive: true })
handleHeaderScroll() // Check initial state

// Setup search
setupSearch()

// Load home rows (lazy via observer)
loadHomeRows()

// Setup parallax
setupParallax()

// ── Performance Monitoring (DEV only) ─
if (import.meta.env.DEV) {
  window.KIROSHI = {
    state,
    clearCache,
    showView,
    getCacheStats,
  } as any

  // Log cache stats periodically with cleanup
  const statsInterval = setInterval(() => {
    const stats = getCacheStats()
    console.log('[Performance] Cache stats:', stats)
  }, 30000) // Every 30 seconds

  window.addEventListener('beforeunload', () => clearInterval(statsInterval))
  
  // Report Core Web Vitals
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint
      const lcp = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (last) {
          console.log('[Web Vitals] LCP:', last.startTime.toFixed(0), 'ms')
        }
      })
      lcp.observe({ entryTypes: ['largest-contentful-paint'] })
      
      // First Input Delay
      const fid = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any
          console.log('[Web Vitals] FID:', fidEntry.processingStart.toFixed(0), 'ms')
        }
      })
      fid.observe({ entryTypes: ['first-input'] })
      
      // Cumulative Layout Shift
      let clsValue = 0
      const cls = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as any
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value
            console.log('[Web Vitals] CLS:', clsValue.toFixed(3))
          }
        }
      })
      cls.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      console.log('[Performance] PerformanceObserver not fully supported')
    }
  }
}
