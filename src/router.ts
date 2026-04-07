// ═══════════════════════════════════════
// ROUTER — View transitions & navigation
// ═══════════════════════════════════════

import type { ViewName, ViewRefs, TmdbDetailResponse, NormalizedAnime, MediaType } from './types.js'
import { CLASSES, TITLES } from './constants.js'

// View references (injected by main)
let views: ViewRefs = {} as ViewRefs

// Track last dynamic title for restoration when navigating back from player
let lastDetailTitle: string | null = null
let lastEpisodesTitle: string | null = null

export function initRouter(viewRefs: ViewRefs): void {
  views = viewRefs
}

// Focus targets for each view
const FOCUS_TARGETS: Record<ViewName, string> = {
  home: '#logoBtn',
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
  if (TITLES[name] && typeof TITLES[name] === 'string') {
    updatePageTitle(TITLES[name] as string)
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
