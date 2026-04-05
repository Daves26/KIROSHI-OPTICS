// ═══════════════════════════════════════
// KIROSHI OPTICS — Main Entry Point
// ═══════════════════════════════════════

import { TMDB_TOKEN, SOURCES, ROW_OBSERVER_MARGIN } from './constants.js'
import { validateToken, clearCache } from './api.js'
import { state, getActiveSource, setActiveSource, getAutoPlay, setAutoPlay } from './state.js'
import { initRouter, showView } from './router.js'
import {
  initPlayer,
  playEpisode,
  playMovie,
  tryNextSource,
  changeSource,
  prevEpisode,
  nextEpisode,
  toggleFullscreen,
  checkAutoPlay,
} from './player.js'
import {
  initViews,
  setLoading,
  loadHomeRows,
  setupSearch,
  openFavs,
  goHome,
  openDetail,
  openSeason,
  updateAllFavIcons,
  setupParallax,
  refreshContinueWatchingRow,
} from './views.js'
import { showToast } from './toast.js'

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
const views = {
  home: document.getElementById('homeView'),
  detail: document.getElementById('detailView'),
  episodes: document.getElementById('episodesView'),
  player: document.getElementById('playerView'),
  favs: document.getElementById('favsView'),
}

const domRefs = {
  homeRows: document.getElementById('homeRows'),
  heroText: document.querySelector('.hero-text'),
  searchInput: document.getElementById('searchInput'),
  clearBtn: document.getElementById('clearBtn'),
  searchResults: document.getElementById('searchResults'),
  resultsGrid: document.getElementById('resultsGrid'),
  resultsTitle: document.getElementById('resultsTitle'),
  resultsCount: document.getElementById('resultsCount'),
  loadMore: document.getElementById('loadMore'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  loader: document.getElementById('loader'),
  favsGrid: document.getElementById('favsGrid'),
  detailTitle: document.getElementById('detailTitle'),
  detailType: document.getElementById('detailType'),
  detailContent: document.getElementById('detailContent'),
  episodesTitle: document.getElementById('episodesTitle'),
  episodesContent: document.getElementById('episodesContent'),
  playerTitle: document.getElementById('playerTitle'),
  playerFrame: document.getElementById('playerFrame'),
  prevEpBtn: document.getElementById('prevEp'),
  nextEpBtn: document.getElementById('nextEp'),
  serverSelect: document.getElementById('serverSelect'),
  nextSourceBtn: document.getElementById('nextSourceBtn'),
  playerBackText: document.getElementById('playerBackText'),
  autoPlayToggle: null, // injected below
}

// ── Initialize router ─────────────────
initRouter(views)

// ── IntersectionObserver for lazy rows ─
const rowObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const row = entry.target
      const loadFn = row._loadRowData
      if (loadFn && !row._loaded) {
        row._loaded = true
        loadFn()
      }
      rowObserver.unobserve(row)
    }
  })
}, { rootMargin: ROW_OBSERVER_MARGIN })

// ── Initialize views ──────────────────
initViews(domRefs, {
  rowObserver,
  onShowView: (name) => showView(name, () => { domRefs.playerFrame.src = '' }),
  onGoHome: goHome,
  onOpenDetail: openDetail,
  onOpenSeason: openSeason,
  onLoadMore: (idx, title) => playEpisode(idx, title),
})

// ── Setup source selector ─────────────
const activeSourceKey = getActiveSource()
Object.entries(SOURCES).forEach(([key, src]) => {
  const opt = document.createElement('option')
  opt.value = key
  opt.textContent = src.name
  if (key === activeSourceKey) opt.selected = true
  domRefs.serverSelect.appendChild(opt)
})

domRefs.nextSourceBtn.addEventListener('click', tryNextSource)
domRefs.serverSelect.addEventListener('change', (e) => changeSource(e.target.value))

// ── Build auto-play toggle ────────────
const playerFooter = document.querySelector('.player-footer')
const autoPlayLabel = document.createElement('label')
autoPlayLabel.className = 'autoplay-label'
autoPlayLabel.innerHTML = `
  <span>Auto-play</span>
  <input type="checkbox" id="autoPlayToggle" ${getAutoPlay() ? 'checked' : ''} />
  <span class="toggle-slider"></span>
`
playerFooter.insertBefore(autoPlayLabel, domRefs.nextSourceBtn)
domRefs.autoPlayToggle = document.getElementById('autoPlayToggle')
domRefs.autoPlayToggle.addEventListener('change', (e) => {
  setAutoPlay(e.target.checked)
  showToast(e.target.checked ? 'Auto-play enabled: next episode plays automatically' : 'Auto-play disabled', 'info')
})

// ── Build fullscreen button ───────────
const fsBtn = document.createElement('button')
fsBtn.className = 'btn-glass fullscreen-btn'
fsBtn.setAttribute('aria-label', 'Toggle fullscreen')
fsBtn.innerHTML = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`
fsBtn.addEventListener('click', () => {
  toggleFullscreen()
  showToast(document.fullscreenElement ? 'Fullscreen mode' : 'Exited fullscreen', 'info')
})
playerFooter.appendChild(fsBtn)

// ── Initialize player ─────────────────
initPlayer({
  ...domRefs,
  onShowView: (name) => showView(name, () => { domRefs.playerFrame.src = '' }),
})

// ── Navigation buttons ────────────────
document.getElementById('logoBtn').addEventListener('click', () => { goHome(); showView('home') })
document.getElementById('favsBtn').addEventListener('click', openFavs)
document.getElementById('backToHomeFavs').addEventListener('click', () => { goHome(); showView('home') })
document.getElementById('backToHome').addEventListener('click', () => showView('home'))
document.getElementById('backToSeasons').addEventListener('click', () => showView('detail'))
document.getElementById('backToEpisodes').addEventListener('click', () => {
  if (state.currentSerieType === 'movie') {
    showView('detail')
  } else {
    showView('episodes')
  }
  domRefs.playerFrame.src = ''
})

domRefs.prevEpBtn.addEventListener('click', prevEpisode)
domRefs.nextEpBtn.addEventListener('click', () => {
  nextEpisode()
  // Check auto-play if at end
  setTimeout(() => checkAutoPlay(), 500)
})

// ── Mobile navigation ─────────────────
const mobileNavHome = document.getElementById('mobileNavHome')
const mobileNavSearch = document.getElementById('mobileNavSearch')
const mobileNavFavs = document.getElementById('mobileNavFavs')

function updateMobileNavActive(activeBtn) {
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'))
  if (activeBtn) activeBtn.classList.add('active')
}

mobileNavHome.addEventListener('click', () => {
  updateMobileNavActive(mobileNavHome)
  goHome()
  showView('home')
})

mobileNavSearch.addEventListener('click', () => {
  updateMobileNavActive(mobileNavSearch)
  domRefs.searchInput.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

mobileNavFavs.addEventListener('click', () => {
  updateMobileNavActive(mobileNavFavs)
  openFavs()
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

document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in search
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
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
        document.getElementById('backToEpisodes').click()
      } else if (views.episodes.classList.contains('active')) {
        showView('detail')
      } else if (views.detail.classList.contains('active')) {
        showView('home')
      } else if (views.favs.classList.contains('active')) {
        goHome()
        showView('home')
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
        setTimeout(() => checkAutoPlay(), 500)
      }
      break

    case 'f':
    case 'F':
      if (views.player.classList.contains('active')) {
        e.preventDefault()
        toggleFullscreen()
      }
      break

    case 'm':
    case 'M':
      // Toggle source (quick switch)
      if (views.player.classList.contains('active')) {
        e.preventDefault()
        tryNextSource()
      }
      break

    case ' ':
      // Space doesn't control embed (cross-origin), but we could toggle auto-play
      if (views.player.classList.contains('active')) {
        e.preventDefault()
        domRefs.autoPlayToggle.checked = !domRefs.autoPlayToggle.checked
        setAutoPlay(domRefs.autoPlayToggle.checked)
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
        showView('home')
      }
      break
  }
})

// ═══════════════════════════════════════
// DEEP LINKING (Hash-based routing)
// ═══════════════════════════════════════

function handleRoute() {
  const hash = window.location.hash.slice(1)
  if (!hash) return

  // Patterns: #/movie/123, #/tv/456, #/tv/456/season/2
  const movieMatch = hash.match(/^\/movie\/(\d+)/)
  const tvMatch = hash.match(/^\/tv\/(\d+)/)
  const seasonMatch = hash.match(/^\/tv\/(\d+)\/season\/(\d+)/)

  if (seasonMatch) {
    const [, id, season] = seasonMatch
    openDetail(Number(id), 'tv')
    // Store pending season to open after detail loads
    const interval = setInterval(() => {
      if (state.currentSerieId === Number(id) && state.currentSerieType === 'tv') {
        clearInterval(interval)
        openSeason(Number(season), 'Loading...')
      }
    }, 200)
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

// Setup search
setupSearch()

// Load home rows (lazy via observer)
loadHomeRows()

// Setup parallax
setupParallax()

// ── Expose for dev/debug ──────────────
if (import.meta.env.DEV) {
  window.KIROSHI = { state, clearCache, showView }
}
