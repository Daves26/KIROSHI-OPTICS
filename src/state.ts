// ═══════════════════════════════════════
// STATE MANAGEMENT — App state + localStorage
// ═══════════════════════════════════════

import type {
  AppState,
  MediaItem,
  ContinueWatchingItem,
  ContinueWatchingMap,
  FavoritesMap,
} from './types.js'
import { LS_FAVS_KEY, LS_WATCHING_KEY, DEFAULT_SOURCE } from './constants.js'

// ── App State ─────────────────────────
export const state: AppState = {
  currentSerieId: null,
  currentSerieType: null,
  currentSeason: null,
  currentEpisodes: [],
  currentEpIndex: null,
  searchPage: 1,
  searchQuery: '',
  searchTotal: 0,
  currentPosterPath: null, // Store poster for continue watching
  // Anime specific
  currentAnimeId: null,
  currentAnimeEpisodes: [],
  currentAnimeEpIndex: null,
  // Pending resume (for Continue Watching)
  pendingAnimeResume: null, // { episodeIndex, title }
  pendingTvResume: null, // { season, episode, title }
  // Source preferences (internal, not serialized)
  _lastMovieSource: null,
  _lastAnimeSource: null,
  _activeSource: null,
  _playerSrcBeforeSearch: '',
  _totalSeasons: null,
}

// ── Source Management ─────────────────
export function getActiveSource(): string {
  return state._activeSource ?? DEFAULT_SOURCE
}

export function setActiveSource(key: string): void {
  state._activeSource = key
}

/**
 * Get last used source for a specific content type
 */
export function getLastSourceForType(type: 'movie' | 'anime'): string | null {
  if (type === 'movie') {
    return state._lastMovieSource
  }
  return state._lastAnimeSource
}

/**
 * Save last used source for a specific content type
 */
export function setLastSourceForType(type: 'movie' | 'anime', sourceKey: string): void {
  if (type === 'movie') {
    state._lastMovieSource = sourceKey
  } else {
    state._lastAnimeSource = sourceKey
  }
}

// ── Favorites Management ──────────────
export function getFavorites(): FavoritesMap {
  return JSON.parse(localStorage.getItem(LS_FAVS_KEY) || '{}') as FavoritesMap
}

export function toggleFavorite(item: MediaItem): boolean {
  const favs = getFavorites()
  const wasFav = !!favs[item.id]

  if (wasFav) {
    delete favs[item.id]
  } else {
    favs[item.id] = item
  }

  localStorage.setItem(LS_FAVS_KEY, JSON.stringify(favs))

  // Dispatch custom event for real-time UI updates
  window.dispatchEvent(new Event('storage'))

  return !wasFav
}

export function isFavorite(id: number): boolean {
  return !!getFavorites()[id]
}

export function removeFromFavorites(id: number): boolean {
  const favs = getFavorites()
  if (favs[id]) {
    delete favs[id]
    localStorage.setItem(LS_FAVS_KEY, JSON.stringify(favs))
    window.dispatchEvent(new Event('storage'))
    return true
  }
  return false
}

export function clearFavorites(): void {
  localStorage.removeItem(LS_FAVS_KEY)
  window.dispatchEvent(new Event('storage'))
}

// ── Continue Watching ─────────────────
export function getContinueWatching(): ContinueWatchingItem[] {
  const data = JSON.parse(localStorage.getItem(LS_WATCHING_KEY) || '{}') as ContinueWatchingMap
  // Return sorted by last watched (most recent first), limit 20
  return Object.values(data)
    .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
    .slice(0, 20)
}

export function saveContinueWatching(item: ContinueWatchingItem): void {
  const data = JSON.parse(localStorage.getItem(LS_WATCHING_KEY) || '{}') as ContinueWatchingMap
  data[item.id] = {
    ...item,
    watchedAt: Date.now(),
  }
  localStorage.setItem(LS_WATCHING_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event('storage'))
}

export function removeFromContinueWatching(id: string): boolean {
  const data = JSON.parse(localStorage.getItem(LS_WATCHING_KEY) || '{}') as ContinueWatchingMap
  if (data[id]) {
    delete data[id]
    localStorage.setItem(LS_WATCHING_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('storage'))
    return true
  }
  return false
}

