// ═══════════════════════════════════════
// KIROSHI OPTICS — Main Entry Point
// ═══════════════════════════════════════

/// <reference types="vite/client" />

import type { ViewName, ViewRefs, DomRefs } from './types.js'
import { SOURCES, ROW_OBSERVER_MARGIN } from './constants.js'
import { validateToken, clearCache } from './api.js'
import { state, getActiveSource, setActiveSource } from './state.js'
import { initRouter, showView } from './router.js'
import {
  initPlayer,
  playEpisode,
  playAnime,
  changeSource,
  prevEpisode,
  nextEpisode,
} from './player.js'
import {
  initViews,
  loadHomeRows,
  setupSearch,
  openFavs,
  goHome,
  openDetail,
  openAnime,
  openAnimeEpisodes,
  openSeason,
  updateAllFavIcons,
  setupParallax,
  refreshContinueWatchingRow,
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

// ═══════════════════════════════════════
// SERVICE WORKER REGISTRATION
// ═══════════════════════════════════════
function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { type: 'module' })
        .then((registration) => {
          console.log('[App] SW registered:', registration.scope)
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('New version available! Refresh to update.', 'info')
              }
            })
          })
        })
        .catch((error) => {
          console.log('[App] SW registration failed:', error)
        })
    })
  }
}

// Suppress View Transitions AbortError (harmless, occurs during rapid navigation)
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.name === 'AbortError' && e.reason?.message?.includes('Transition was skipped')) {
    e.preventDefault()
  }
})

// ── Validate token on startup ─────────
if (!validateToken()) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:#CF6679;font-family:system-ui;text-align:center;padding:32px">
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
  detail: document.getElementById('detailView')!,
  episodes: document.getElementById('episodesView')!,
  player: document.getElementById('playerView')!,
  favs: document.getElementById('favsView')!,
}

const domRefs: DomRefs = {
  homeRows: document.getElementById('homeRows')!,
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
  onOpenSeason: openSeason,
  onOpenAnime: openAnime,
  onOpenAnimeEpisode: (idx: number, title: string) => playAnime(idx, title),
  onOpenAnimeEpisodes: (title: string) => openAnimeEpisodes(title),
  onLoadMore: (idx: number, title: string) => playEpisode(idx, title),
})

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
// ── Watchlist toggle ──────────────────
let previousViewBeforeFavs: ViewName | null = null
let previousScrollPos: number = 0

document.getElementById('favsBtn')!.addEventListener('click', () => {
  if (views.favs.classList.contains('active')) {
    // Close watchlist — return to previous view
    if (previousViewBeforeFavs === 'home') {
      showView('home')
      window.scrollTo({ top: previousScrollPos, behavior: 'instant' as ScrollBehavior })
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
    openFavs()
  }
})

document.getElementById('backToHomeFavs')!.addEventListener('click', () => { goHome() })
document.getElementById('backToHome')!.addEventListener('click', () => {
  domRefs.playerFrame.src = ''  // Stop video when going home
  showView('home')
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
  // Don't trigger shortcuts when typing in search
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
    if (e.key === 'Escape') {
      e.target.blur()
    }
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

function handleRoute(): void {
  const hash = window.location.hash.slice(1)
  if (!hash) return

  // Patterns: #/movie/123, #/tv/456, #/tv/456/season/2, #/anime/789
  const movieMatch = hash.match(/^\/movie\/(\d+)/)
  const tvMatch = hash.match(/^\/tv\/(\d+)/)
  const seasonMatch = hash.match(/^\/tv\/(\d+)\/season\/(\d+)/)
  const animeMatch = hash.match(/^\/anime\/(\d+)/)

  if (animeMatch) {
    openAnime(Number(animeMatch[1]))
  } else if (seasonMatch) {
    const [, id, season] = seasonMatch
    // Use Promise-based approach: wait for detail view to be ready
    const detailReady = new Promise<void>((resolve) => {
      const checkState = () => {
        if (state.currentSerieId === Number(id) && state.currentSerieType === 'tv') {
          resolve()
        }
      }
      // Listen for the custom event emitted when detail loads
      window.addEventListener('detailloaded', checkState, { once: true })
      // Fallback: also check immediately in case it's already loaded
      setTimeout(() => {
        checkState()
        // If still not resolved after a short delay, resolve anyway
        setTimeout(resolve, 500)
      }, 100)
    })

    openDetail(Number(id), 'tv')
    detailReady.then(() => openSeason(Number(season), 'Loading...'))
  } else if (tvMatch) {
    openDetail(Number(tvMatch[1]), 'tv')
  } else if (movieMatch) {
    openDetail(Number(movieMatch[1]), 'movie')
  }
}

window.addEventListener('hashchange', handleRoute)
// Handle initial hash on load
if (window.location.hash) {
  setTimeout(handleRoute, 100)
}

// ═══════════════════════════════════════
// BOOT
// ═══════════════════════════════════════

// Initialize global error handlers
initErrorHandlers()

// Initialize cleanup listeners
initCleanup()

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

// Register service worker for production
registerServiceWorker()

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
