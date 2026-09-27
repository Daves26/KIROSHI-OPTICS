// ═══════════════════════════════════════
// ROUTER — View transitions & navigation
// ═══════════════════════════════════════

import type { ViewName, ViewRefs, TmdbDetailResponse, NormalizedAnime, MediaType, AppState } from './types.js'
import { CLASSES, TITLES } from './constants.js'
import { getCategory } from './categories.js'

// View references (injected by main)
let views: ViewRefs = {} as ViewRefs

// Track last dynamic title for restoration when navigating back from player
let lastDetailTitle: string | null = null
let lastEpisodesTitle: string | null = null
let lastCategoryTitle: string | null = null

// Track last player src to restore after watchlist/other overlays
let lastPlayerSrc: string = ''

export type Route =
  | { kind: 'home' | 'watchlist' | 'invalid' }
  | { kind: 'anime'; id: number }
  | { kind: 'category'; id: string }
  | { kind: 'detail'; type: 'movie' | 'tv'; id: number; season?: number }

export function parseRoute(hash: string): Route {
  if (!hash || hash === '#/') return { kind: 'home' }
  if (hash === '#/watchlist') return { kind: 'watchlist' }
  const category = /^#\/category\/([a-z0-9-]+)$/.exec(hash)
  if (category?.[1] && getCategory(category[1])) return { kind: 'category', id: category[1] }
  const anime = /^#\/anime\/([1-9]\d*)$/.exec(hash)
  if (anime) return { kind: 'anime', id: Number(anime[1]) }
  const detail = /^#\/(movie|tv)\/([1-9]\d*)(?:\/season\/([1-9]\d*))?$/.exec(hash)
  if (detail && (detail[1] === 'tv' || !detail[3])) {
    return { kind: 'detail', type: detail[1] as 'movie' | 'tv', id: Number(detail[2]), ...(detail[3] ? { season: Number(detail[3]) } : {}) }
  }
  return { kind: 'invalid' }
}

export function routeForView(view: ViewName, state: AppState): string | null {
  if (view === 'home') return '#/'
  if (view === 'category') return state.currentCategoryId ? `#/category/${state.currentCategoryId}` : null
  if (view === 'favs') return '#/watchlist'
  if (view === 'detail' || view === 'episodes' || view === 'player') {
    if (state.currentAnimeId) return `#/anime/${state.currentAnimeId}`
    if (!state.currentSerieId || !state.currentSerieType) return null
    const base = `#/${state.currentSerieType}/${state.currentSerieId}`
    return (view === 'episodes' || view === 'player' && state.currentSerieType === 'tv') && state.currentSerieType === 'tv' && state.currentSeason
      ? `${base}/season/${state.currentSeason}` : base
  }
  return null
}

export function savePlayerSrc(src: string): void {
  lastPlayerSrc = src
}

export function getLastPlayerSrc(): string {
  return lastPlayerSrc
}

export function initRouter(viewRefs: ViewRefs): void {
  views = viewRefs
}

// Focus targets for each view
const FOCUS_TARGETS: Record<ViewName, string> = {
  home: '#logoBtn',
  category: '#backToHomeCategory',
  detail: '#backToHome',
  episodes: '#backToSeasons',
  player: '#backToEpisodes',
  favs: '#backToHomeFavs',
}

export function showView(name: ViewName, onPlayerExit?: () => void): void {
  // If leaving player, clear src to stop audio/video
  if (name !== 'player' && onPlayerExit) {
    onPlayerExit()
  }

  // Use View Transitions API if available
  if (document.startViewTransition) {
    try {
      document.startViewTransition(() => {
        updateViewClasses(name)
      })
    } catch {
      // AbortError during rapid view changes — fallback applied silently
    }
  } else {
    updateViewClasses(name)
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })

  // Update page title for views with static titles (home, favs)
  // Dynamic titles (detail, episodes, player) are set by their own functions
  if (name === 'home' || name === 'favs') {
    updatePageTitle(TITLES[name])
    // Clear dynamic title cache when going home or to favs
    lastDetailTitle = null
    lastEpisodesTitle = null
  } else if (name === 'category' && lastCategoryTitle) {
    updatePageTitle(lastCategoryTitle)
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
    const focusTarget = document.querySelector<HTMLElement>(FOCUS_TARGETS[name])
    if (focusTarget && isFocusable(focusTarget)) {
      focusTarget.focus({ preventScroll: true })
    }
  })
}

function isFocusable(el: HTMLElement): boolean {
  const isButton = el instanceof HTMLButtonElement
  const isDisabled = isButton && (el as HTMLButtonElement).disabled
  return el && !isDisabled && el.offsetParent !== null
}

function updateViewClasses(name: ViewName): void {
  Object.values(views).forEach(v => v.classList.remove(CLASSES.VIEW_ACTIVE))
  views[name]?.classList.add(CLASSES.VIEW_ACTIVE)
}

export function updatePageTitle(titleOrView: string): void {
  const title = (TITLES as any)[titleOrView] ?? titleOrView

  const el = document.getElementById('pageTitle')
  if (el) {
    el.textContent = title
  } else {
    document.title = title
  }
}

export function setDetailTitle(name: string): void {
  lastDetailTitle = TITLES.detail(name)
  updatePageTitle(lastDetailTitle)
}

export function setCategoryTitle(name: string): void {
  lastCategoryTitle = `${name} — KIROSHI OPTICS`
  updatePageTitle(lastCategoryTitle)
}

export function setEpisodesTitle(name: string, season: number): void {
  lastEpisodesTitle = TITLES.episodes(name, season)
  updatePageTitle(lastEpisodesTitle)
}

export function setPlayerTitle(title: string): void {
  updatePageTitle(TITLES.player(title))
}

// Default JSON-LD schema for non-detail views
const DEFAULT_JSONLD: string = JSON.stringify({
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

export function updateJsonLd(
  type: MediaType,
  data: TmdbDetailResponse | (NormalizedAnime & { genres?: Array<{ name: string }> })
): void {
  const el = document.getElementById('jsonLd')
  if (!el || !data) return

  const schema = type === 'movie' ? {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": (data as TmdbDetailResponse).title ?? '',
    "description": (data as TmdbDetailResponse).overview ?? '',
    "image": (data as TmdbDetailResponse).poster_path ? `https://image.tmdb.org/t/p/w500${(data as TmdbDetailResponse).poster_path}` : undefined,
    "datePublished": (data as TmdbDetailResponse).release_date?.slice(0, 4),
    "genre": (data as TmdbDetailResponse).genres?.map(g => g.name).join(', '),
    "aggregateRating": (data as TmdbDetailResponse).vote_average ? {
      "@type": "AggregateRating",
      "ratingValue": (data as TmdbDetailResponse).vote_average!.toFixed(1),
      "bestRating": "10"
    } : undefined,
  } : {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": (data as TmdbDetailResponse).name ?? (data as NormalizedAnime).title ?? '',
    "description": (data as TmdbDetailResponse).overview ?? (data as NormalizedAnime).overview ?? '',
    "image": (data as TmdbDetailResponse).poster_path ? `https://image.tmdb.org/t/p/w500${(data as TmdbDetailResponse).poster_path}` : undefined,
    "datePublished": (data as TmdbDetailResponse).first_air_date?.slice(0, 4),
    "genre": (data as TmdbDetailResponse).genres?.map((g: any) => typeof g === 'string' ? g : g.name).join(', ') ?? (data as NormalizedAnime).genres?.join(', '),
    "numberOfSeasons": (data as TmdbDetailResponse).number_of_seasons,
    "aggregateRating": (data as TmdbDetailResponse).vote_average ? {
      "@type": "AggregateRating",
      "ratingValue": (data as TmdbDetailResponse).vote_average!.toFixed(1),
      "bestRating": "10"
    } : undefined,
  }

  el.textContent = JSON.stringify(schema)
}

function resetJsonLd(): void {
  const el = document.getElementById('jsonLd')
  if (el) {
    el.textContent = DEFAULT_JSONLD
  }
}
