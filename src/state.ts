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
  _lastTvSourceById: {},
  _lastAnimeSourceById: {},
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
 * Get last used source for a specific content type and optionally series ID
 */
export function getLastSourceForType(type: 'movie' | 'anime' | 'tv', seriesId?: number): string | null {
  // If seriesId is provided, check for series-specific preferences first
  if (seriesId !== undefined && seriesId !== null) {
    if (type === 'tv' && state._lastTvSourceById[seriesId]) {
      return state._lastTvSourceById[seriesId];
    }
    if (type === 'anime' && state._lastAnimeSourceById[seriesId]) {
      return state._lastAnimeSourceById[seriesId];
    }
  }
  
  // Fall back to global preferences
  if (type === 'movie') {
    return state._lastMovieSource
  }
  if (type === 'anime') {
    return state._lastAnimeSource
  }
  return null;
}

/**
 * Save last used source for a specific content type and optionally series ID
 */
export function setLastSourceForType(type: 'movie' | 'anime' | 'tv', sourceKey: string, seriesId?: number): void {
  // If seriesId is provided, save series-specific preference
  if (seriesId !== undefined && seriesId !== null) {
    if (type === 'tv') {
      state._lastTvSourceById[seriesId] = sourceKey;
      return;
    }
    if (type === 'anime') {
      state._lastAnimeSourceById[seriesId] = sourceKey;
      return;
    }
  }
  
  // Save global preference
  if (type === 'movie') {
    state._lastMovieSource = sourceKey
  } else if (type === 'anime') {
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
    
    // Also remove the corresponding source preferences if this is a TV series or anime
    if (id.startsWith('tv-')) {
      const seriesId = parseInt(id.replace('tv-', ''), 10);
      if (!isNaN(seriesId) && state._lastTvSourceById[seriesId]) {
        delete state._lastTvSourceById[seriesId];
      }
    } else if (id.startsWith('anime-')) {
      const animeId = parseInt(id.replace('anime-', ''), 10);
      if (!isNaN(animeId) && state._lastAnimeSourceById[animeId]) {
        delete state._lastAnimeSourceById[animeId];
      }
    }
    
    return true
  }
  return false
}

export function clearOrphanedSourcePreferences(): void {
  // Get current continue watching items
  const continueWatchingItems = getContinueWatching();
  const validTvIds = new Set<number>();
  const validAnimeIds = new Set<number>();
  
  // Extract valid series IDs from continue watching items
  continueWatchingItems.forEach(item => {
    if (item.id.startsWith('tv-')) {
      const seriesId = parseInt(item.id.replace('tv-', ''), 10);
      if (!isNaN(seriesId)) {
        validTvIds.add(seriesId);
      }
    } else if (item.id.startsWith('anime-')) {
      const animeId = parseInt(item.id.replace('anime-', ''), 10);
      if (!isNaN(animeId)) {
        validAnimeIds.add(animeId);
      }
    }
  });
  
  // Remove orphaned TV source preferences
  Object.keys(state._lastTvSourceById).forEach(seriesIdStr => {
    const seriesId = parseInt(seriesIdStr, 10);
    if (!validTvIds.has(seriesId)) {
      delete state._lastTvSourceById[seriesId];
    }
  });
  
  // Remove orphaned anime source preferences
  Object.keys(state._lastAnimeSourceById).forEach(animeIdStr => {
    const animeId = parseInt(animeIdStr, 10);
    if (!validAnimeIds.has(animeId)) {
      delete state._lastAnimeSourceById[animeId];
    }
  });
}

