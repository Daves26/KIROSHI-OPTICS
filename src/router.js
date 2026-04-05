// ═══════════════════════════════════════
// ROUTER — View transitions & navigation
// ═══════════════════════════════════════

import { CLASSES, TITLES } from './constants.js'

// View references (injected by main)
let views = {}

// Track last dynamic title for restoration when navigating back from player
let lastDetailTitle = null
let lastEpisodesTitle = null

export function initRouter(viewRefs) {
  views = viewRefs
}

// Focus targets for each view
const FOCUS_TARGETS = {
  home: '#logoBtn',
  detail: '#backToHome',
  episodes: '#backToSeasons',
  player: '#backToEpisodes',
  favs: '#backToHomeFavs',
}

export function showView(name, onPlayerExit) {
  // Si salimos del player, vaciamos el src para cortar audio/video
  if (name !== 'player' && onPlayerExit) {
    onPlayerExit()
  }

  // Use View Transitions API if available
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      updateViewClasses(name)
    })
  } else {
    updateViewClasses(name)
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })

  // Update page title for views with static titles (home, favs)
  // Dynamic titles (detail, episodes, player) are set by their own functions
  if (TITLES[name] && typeof TITLES[name] === 'string') {
    updatePageTitle(TITLES[name])
    // Clear dynamic title cache when going home or to favs
    if (name === 'home' || name === 'favs') {
      lastDetailTitle = null
      lastEpisodesTitle = null
    }
  } else if (name === 'detail' && lastDetailTitle) {
    // Restore last detail title when navigating back from player
    updatePageTitle(lastDetailTitle)
  } else if (name === 'episodes' && lastEpisodesTitle) {
    // Restore last episodes title when navigating back from player
    updatePageTitle(lastEpisodesTitle)
  }

  // Reset JSON-LD when leaving detail view
  if (name !== 'detail') {
    resetJsonLd()
  }

  // ACCESSIBILITY: Focus management after view change
  requestAnimationFrame(() => {
    const focusTarget = document.querySelector(FOCUS_TARGETS[name])
    if (focusTarget && focusTabable(focusTarget)) {
      focusTarget.focus({ preventScroll: true })
    }
  })
}

function focusTabable(el) {
  return el && !el.disabled && el.offsetParent !== null
}

function updateViewClasses(name) {
  Object.values(views).forEach(v => v.classList.remove(CLASSES.VIEW_ACTIVE))
  views[name].classList.add(CLASSES.VIEW_ACTIVE)
}

export function updatePageTitle(titleOrView) {
  // Check if it's a view name (home, favs, etc.) or a custom title
  const title = TITLES[titleOrView] || titleOrView
  
  const el = document.getElementById('pageTitle')
  if (el) {
    el.textContent = title
  } else {
    document.title = title
  }
}

export function setDetailTitle(name) {
  lastDetailTitle = TITLES.detail(name)
  updatePageTitle(lastDetailTitle)
}

export function setEpisodesTitle(name, season) {
  lastEpisodesTitle = TITLES.episodes(name, season)
  updatePageTitle(lastEpisodesTitle)
}

export function setPlayerTitle(title) {
  updatePageTitle(TITLES.player(title))
}

// Default JSON-LD schema for non-detail views
const DEFAULT_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "KIROSHI OPTICS",
  "url": "https://kiroshi-optics.vercel.app",
  "description": "A sleek movie and series streaming catalog powered by TMDB.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://kiroshi-optics.vercel.app/#/search/{query}",
    "query-input": "required name=query"
  }
})

export function updateJsonLd(type, data) {
  const el = document.getElementById('jsonLd')
  if (!el || !data) return

  const schema = type === 'movie' ? {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": data.title,
    "description": data.overview || '',
    "image": data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    "datePublished": data.release_date?.slice(0, 4),
    "genre": data.genres?.map(g => g.name).join(', '),
    "aggregateRating": data.vote_average ? {
      "@type": "AggregateRating",
      "ratingValue": data.vote_average.toFixed(1),
      "bestRating": "10"
    } : undefined,
  } : {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": data.name,
    "description": data.overview || '',
    "image": data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    "datePublished": data.first_air_date?.slice(0, 4),
    "genre": data.genres?.map(g => g.name).join(', '),
    "numberOfSeasons": data.number_of_seasons,
    "aggregateRating": data.vote_average ? {
      "@type": "AggregateRating",
      "ratingValue": data.vote_average.toFixed(1),
      "bestRating": "10"
    } : undefined,
  }

  el.textContent = JSON.stringify(schema)
}

function resetJsonLd() {
  const el = document.getElementById('jsonLd')
  if (el) {
    el.textContent = DEFAULT_JSONLD
  }
}
