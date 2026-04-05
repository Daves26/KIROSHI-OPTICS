// ═══════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════

export const TMDB_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN
export const TMDB_BASE = 'https://api.themoviedb.org/3'
export const IMG_BASE = 'https://image.tmdb.org/t/p'

// ═══════════════════════════════════════
// PERFORMANCE CONSTANTS
// ═══════════════════════════════════════
export const CACHE_TTL = 1000 * 60 * 30 // 30 minutes
export const CACHE_KEY = 'kiroshi_api_cache'
export const PARALLAX_THROTTLE_MS = 16 // ~60fps max
export const SEARCH_DEBOUNCE_MS = 700
export const PREFETCH_DELAY_MS = 50
export const ROW_OBSERVER_MARGIN = '200px'
export const SKELETON_COUNT_HOME = 8
export const SKELETON_COUNT_SEARCH = 6

// ═══════════════════════════════════════
// VIDEO SOURCES
// ═══════════════════════════════════════
export const SOURCES = {
  moviesapi: {
    name: 'MoviesAPI (Default)',
    getMovie: (id) => `https://moviesapi.to/movie/${id}`,
    getTv: (id, s, e) => `https://moviesapi.to/tv/${id}-${s}-${e}`
  },
  vidsrc: {
    name: 'VidSrc',
    getMovie: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    getTv: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  },
  vidrock: {
    name: 'VidRock',
    getMovie: (id) => `https://vidrock.net/movie/${id}`,
    getTv: (id, s, e) => `https://vidrock.net/tv/${id}-${s}-${e}`
  },
  '111movies': {
    name: '111Movies',
    getMovie: (id) => `https://111movies.com/movie/${id}`,
    getTv: (id, s, e) => `https://111movies.com/tv/${id}-${s}-${e}`
  },
  vidzee: {
    name: 'VidZee',
    getMovie: (id) => `https://vidzee.net/movie/${id}`,
    getTv: (id, s, e) => `https://vidzee.net/tv/${id}-${s}-${e}`
  },
  videasy: {
    name: 'VidEasy',
    getMovie: (id) => `https://videasy.net/movie/${id}`,
    getTv: (id, s, e) => `https://videasy.net/tv/${id}-${s}-${e}`
  },
  vidnest: {
    name: 'VidNest',
    getMovie: (id) => `https://vidnest.net/movie/${id}`,
    getTv: (id, s, e) => `https://vidnest.net/tv/${id}-${s}-${e}`
  },
  rivestream: {
    name: 'RiveStream',
    getMovie: (id) => `https://rivestream.live/watch?type=movie&id=${id}`,
    getTv: (id, s, e) => `https://rivestream.live/watch?type=tv&id=${id}&season=${s}&episode=${e}`
  },
  vidlink: {
    name: 'VidLink',
    getMovie: (id) => `https://vidlink.pro/movie/${id}?player=primary`,
    getTv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?player=primary`
  },
  'vidsrc.xyz': {
    name: 'VidSrc.xyz',
    getMovie: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    getTv: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
  },
  'vidsrc.icu': {
    name: 'VidSrc.icu',
    getMovie: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    getTv: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`
  }
}

export const DEFAULT_SOURCE = 'moviesapi'

// ═══════════════════════════════════════
// LOCAL STORAGE KEYS
// ═══════════════════════════════════════
export const LS_SOURCE_KEY = 'kiroshi_source'
export const LS_FAVS_KEY = 'kiroshi_favs'
export const LS_WATCHING_KEY = 'kiroshi_watching'
export const LS_AUTOPLAY_KEY = 'kiroshi_autoplay'

// ═══════════════════════════════════════
// PAGE TITLES
// ═══════════════════════════════════════
export const SITE_NAME = 'KIROSHI OPTICS'
export const SITE_TAGLINE = 'See the Unseen'
export const TITLES = {
  home: `${SITE_NAME} — ${SITE_TAGLINE}`,
  favs: `Watchlist — ${SITE_NAME}`,
  detail: (name) => `${name} — ${SITE_NAME}`,
  episodes: (name, season) => `${name} · Season ${season} — ${SITE_NAME}`,
  player: (title) => `${title} — ${SITE_NAME}`,
}

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
}

// ═══════════════════════════════════════
// HOME ROWS CONFIG (order shuffled on load)
// ═══════════════════════════════════════
export const HOME_ROWS = [
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
]
