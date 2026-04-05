// ═══════════════════════════════════════
// STATE MANAGEMENT — App state + localStorage
// ═══════════════════════════════════════

import { LS_SOURCE_KEY, LS_FAVS_KEY, LS_WATCHING_KEY, LS_AUTOPLAY_KEY, DEFAULT_SOURCE } from './constants.js'

// ── App State ─────────────────────────
export const state = {
  currentSerieId: null,
  currentSerieType: null,
  currentSeason: null,
  currentEpisodes: [],
  currentEpIndex: null,
  searchPage: 1,
  searchQuery: '',
  searchTotal: 0,
  currentPosterPath: null, // Store poster for continue watching
}

// ── Source Management ─────────────────
export function getActiveSource() {
  return localStorage.getItem(LS_SOURCE_KEY) || DEFAULT_SOURCE
}

export function setActiveSource(key) {
  localStorage.setItem(LS_SOURCE_KEY, key)
}

// ── Favorites Management ──────────────
export function getFavorites() {
  return JSON.parse(localStorage.getItem(LS_FAVS_KEY) || '{}')
}

export function toggleFavorite(item) {
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

export function isFavorite(id) {
  return !!getFavorites()[id]
}

export function removeFromFavorites(id) {
  const favs = getFavorites()
  if (favs[id]) {
    delete favs[id]
    localStorage.setItem(LS_FAVS_KEY, JSON.stringify(favs))
    window.dispatchEvent(new Event('storage'))
    return true
  }
  return false
}

export function clearFavorites() {
  localStorage.removeItem(LS_FAVS_KEY)
  window.dispatchEvent(new Event('storage'))
}

// ── Continue Watching ─────────────────
export function getContinueWatching() {
  const data = JSON.parse(localStorage.getItem(LS_WATCHING_KEY) || '{}')
  // Return sorted by last watched (most recent first), limit 20
  return Object.values(data)
    .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
    .slice(0, 20)
}

export function saveContinueWatching(item) {
  const data = JSON.parse(localStorage.getItem(LS_WATCHING_KEY) || '{}')
  data[item.id] = {
    ...item,
    watchedAt: Date.now(),
  }
  localStorage.setItem(LS_WATCHING_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event('storage'))
}

export function removeFromContinueWatching(id) {
  const data = JSON.parse(localStorage.getItem(LS_WATCHING_KEY) || '{}')
  if (data[id]) {
    delete data[id]
    localStorage.setItem(LS_WATCHING_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('storage'))
    return true
  }
  return false
}

// ── Auto-play Setting ─────────────────
export function getAutoPlay() {
  return localStorage.getItem(LS_AUTOPLAY_KEY) === 'true'
}

export function setAutoPlay(value) {
  localStorage.setItem(LS_AUTOPLAY_KEY, String(value))
}
