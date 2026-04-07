// ═══════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════

/// <reference types="vite/client" />

import type { HomeRowConfig, SourcesMap, SourceKey } from './types.js'

export const TMDB_TOKEN: string = import.meta.env.VITE_TMDB_ACCESS_TOKEN
export const TMDB_BASE: string = 'https://api.themoviedb.org/3'
export const IMG_BASE: string = 'https://image.tmdb.org/t/p'

// ═══════════════════════════════════════
// PERFORMANCE CONSTANTS
// ═══════════════════════════════════════
export const CACHE_TTL: number = 1000 * 60 * 30 // 30 minutes
export const CACHE_KEY: string = 'kiroshi_api_cache'
export const PARALLAX_THROTTLE_MS: number = 16 // ~60fps max
export const SEARCH_DEBOUNCE_MS: number = 700
export const PREFETCH_DELAY_MS: number = 50
export const ROW_OBSERVER_MARGIN: string = '200px'
export const SKELETON_COUNT_HOME: number = 8
export const SKELETON_COUNT_SEARCH: number = 6

// ═══════════════════════════════════════
// VIDEO SOURCES
// ═══════════════════════════════════════
export const SOURCES: SourcesMap = {
  videasy: {
    name: 'VidEasy',
    getMovie: (id: number | string): string => `https://player.videasy.net/movie/${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    getAnime: (id: number | string, episode: number = 1): string => `https://player.videasy.net/anime/${id}/${episode}`
  },
  moviesapi: {
    name: 'MoviesAPI',
    getMovie: (id: number | string): string => `https://moviesapi.to/movie/${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://moviesapi.to/tv/${id}-${s}-${e}`
  },
  vidsrc: {
    name: 'VidSrc',
    getMovie: (id: number | string): string => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  },
  vidrock: {
    name: 'VidRock',
    getMovie: (id: number | string): string => `https://vidrock.net/movie/${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://vidrock.net/tv/${id}-${s}-${e}`
  },
  '111movies': {
    name: '111Movies',
    getMovie: (id: number | string): string => `https://111movies.com/movie/${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://111movies.com/tv/${id}-${s}-${e}`
  },
  vidnest: {
    name: 'VidNest',
    getMovie: (id: number | string): string => `https://vidnest.fun/movie/${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://vidnest.fun/tv/${id}/${s}/${e}`,
    getAnime: (id: number | string, episode: number = 1): string => `https://vidnest.fun/anime/${id}/${episode}/sub`
  },
  vidlink: {
    name: 'VidLink',
    getMovie: (id: number | string): string => `https://vidlink.pro/movie/${id}?player=primary`,
    getTv: (id: number | string, s: number, e: number): string => `https://vidlink.pro/tv/${id}/${s}/${e}?player=primary`
  },
  'vidsrc.xyz': {
    name: 'VidSrc.xyz',
    getMovie: (id: number | string): string => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  },
  'vidsrc.icu': {
    name: 'VidSrc.icu',
    getMovie: (id: number | string): string => `https://vidsrc.icu/embed/movie/${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`
  },
  rivestream: {
    name: 'RiveStream',
    getMovie: (id: number | string): string => `https://rivestream.org/embed?type=movie&id=${id}`,
    getTv: (id: number | string, s: number, e: number): string => `https://rivestream.org/embed?type=tv&id=${id}&season=${s}&episode=${e}`
  }
} as const

export const DEFAULT_SOURCE: SourceKey = 'videasy'

// ═══════════════════════════════════════
// LOCAL STORAGE KEYS
// ═══════════════════════════════════════
export const LS_SOURCE_KEY: string = 'kiroshi_source'
export const LS_FAVS_KEY: string = 'kiroshi_favs'
export const LS_WATCHING_KEY: string = 'kiroshi_watching'

// ═══════════════════════════════════════
// PAGE TITLES
// ═══════════════════════════════════════
export const SITE_NAME: string = 'KIROSHI OPTICS'
export const SITE_TAGLINE: string = 'See the Unseen'

export const TITLES = {
  home: `${SITE_NAME} — ${SITE_TAGLINE}`,
  favs: `Watchlist — ${SITE_NAME}`,
  detail: (name: string): string => `${name} — ${SITE_NAME}`,
  episodes: (name: string, season: number): string => `${name} · Season ${season} — ${SITE_NAME}`,
  player: (title: string): string => `${title} — ${SITE_NAME}`,
} as const

// ═══════════════════════════════════════
// CSS CLASS NAMES (single source of truth)
// ═══════════════════════════════════════
export const CLASSES = {
  VIEW_ACTIVE: 'active',
  HIDDEN: 'hidden',
  RESULT_CARD: 'result-card',
  SKELETON: 'skeleton',
  FAV_BTN: 'fav-btn',
  FAV_ACTIVE: 'active',
  HOME_ROW: 'home-row',
  SEASON_CARD: 'season-card',
  EPISODE_ITEM: 'episode-item',
} as const

// ═══════════════════════════════════════
// HOME ROWS CONFIG (order shuffled on load)
// ═══════════════════════════════════════
export const HOME_ROWS: ReadonlyArray<HomeRowConfig> = [
  { title: 'Top Rated Series', path: '/tv/top_rated' },
  { title: 'Top Rated Movies', path: '/movie/top_rated' },
  { title: 'Sci-Fi & Fantasy', path: '/discover/movie?with_genres=878,14' },
  { title: 'Drama', path: '/discover/movie?with_genres=18' },
  { title: 'Comedy', path: '/discover/movie?with_genres=35' },
  { title: 'Thriller & Mystery', path: '/discover/movie?with_genres=53,9648' },
  { title: 'Documentaries', path: '/discover/movie?with_genres=99' },
  { title: 'Animation', path: '/discover/movie?with_genres=16' },
  { title: 'Action & Adventure', path: '/discover/movie?with_genres=28,12' },
  { title: 'Horror', path: '/discover/movie?with_genres=27' },
  { title: 'Trending Now', path: '/trending/all/day' },
  { title: 'Popular Movies', path: '/movie/popular' },
] as const
