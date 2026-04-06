// ═══════════════════════════════════════
// PLAYER — Episode & movie playback
// ═══════════════════════════════════════

import { SOURCES } from './constants.js'
import { state, getActiveSource, setActiveSource, saveContinueWatching, getAutoPlay } from './state.js'
import { showToast } from './toast.js'
import { setPlayerTitle } from './router.js'

// DOM references (injected by main)
let playerFrame
let playerTitle
let prevEpBtn
let nextEpBtn
let playerBackText
let onShowView
let autoPlayToggleEl
let setAutoPlayVisible

export function initPlayer(dom) {
  playerFrame = dom.playerFrame
  playerTitle = dom.playerTitle
  prevEpBtn = dom.prevEpBtn
  nextEpBtn = dom.nextEpBtn
  playerBackText = dom.playerBackText
  onShowView = dom.onShowView
  autoPlayToggleEl = dom.autoPlayToggle
  setAutoPlayVisible = dom.setAutoPlayVisible
}

// ── Play Episode ──────────────────────
export function playEpisode(idx, title = null) {
  state.currentEpIndex = idx
  const ep = state.currentEpisodes[idx]
  const sourceKey = getActiveSource()
  const source = SOURCES[sourceKey] || SOURCES['videasy']
  const url = source.getTv(state.currentSerieId, state.currentSeason, ep.episode_number)

  const epTitle = title || state._currentTitle || 'Unknown'
  playerTitle.textContent = `T${state.currentSeason} E${ep.episode_number} – ${ep.name}`
  playerFrame.src = url

  prevEpBtn.disabled = idx === 0
  nextEpBtn.disabled = idx === state.currentEpisodes.length - 1

  if (playerBackText) playerBackText.textContent = 'Episodes'

  // Update page title
  setPlayerTitle(`${epTitle} - S${state.currentSeason}E${ep.episode_number}`)

  // Save to continue watching
  saveContinueWatching({
    id: `tv-${state.currentSerieId}`,
    tmdbId: state.currentSerieId,
    media_type: 'tv',
    title: epTitle,
    poster_path: state.currentPosterPath,
    season: state.currentSeason,
    episode: ep.episode_number,
    progress: Math.round(((idx + 1) / state.currentEpisodes.length) * 100),
  })

  setAutoPlayVisible(true)

  // Filter source dropdown: show all sources for TV content
  if (window._populateSourceDropdown) window._populateSourceDropdown(false)

  onShowView('player')
}

// ── Play Movie ────────────────────────
export function playMovie(id, title) {
  const sourceKey = getActiveSource()
  const source = SOURCES[sourceKey] || SOURCES['videasy']
  const url = source.getMovie(id)

  playerTitle.textContent = title
  playerFrame.src = url
  state.currentEpisodes = []
  state.currentEpIndex = null
  prevEpBtn.disabled = true
  nextEpBtn.disabled = true

  if (playerBackText) playerBackText.textContent = 'Details'

  // Update page title
  setPlayerTitle(title)

  // Save to continue watching
  saveContinueWatching({
    id,
    tmdbId: id,
    media_type: 'movie',
    title,
    poster_path: state.currentPosterPath,
    progress: 0,
  })

  setAutoPlayVisible(false)

  // Filter source dropdown: show all sources for movies
  if (window._populateSourceDropdown) window._populateSourceDropdown(false)

  onShowView('player')
}

// ── Play Anime ────────────────────────
export function playAnime(idx, title = null) {
  state.currentAnimeEpIndex = idx
  const epNum = idx + 1 // AniList uses 1-based episode numbers
  let sourceKey = getActiveSource()
  let source = SOURCES[sourceKey] || SOURCES['videasy']

  // Fallback: if current source doesn't support anime, find one that does
  if (!source.getAnime) {
    const animeSourceKey = Object.keys(SOURCES).find(k => SOURCES[k].getAnime)
    if (animeSourceKey) {
      sourceKey = animeSourceKey
      source = SOURCES[animeSourceKey]
      setActiveSource(animeSourceKey)
      showToast(`Switched to ${source.name} (anime source)`, 'info')
    }
  }

  const url = source.getAnime
    ? source.getAnime(state.currentAnimeId, epNum)
    : `https://player.videasy.net/anime/${state.currentAnimeId}/${epNum}`

  const epTitle = title || state._currentAnimeTitle || 'Unknown'
  playerTitle.textContent = `Episode ${epNum}`
  playerFrame.src = url

  const totalEps = state.currentAnimeEpisodes.length
  prevEpBtn.disabled = idx === 0
  nextEpBtn.disabled = idx >= totalEps - 1

  if (playerBackText) playerBackText.textContent = 'Episodes'

  setPlayerTitle(`${epTitle} - Episode ${epNum}`)

  // Save to continue watching
  saveContinueWatching({
    id: `anime-${state.currentAnimeId}`,
    tmdbId: state.currentAnimeId,
    media_type: 'anime',
    title: epTitle,
    poster_path: state.currentPosterPath,
    episode: epNum,
    progress: Math.round(((idx + 1) / totalEps) * 100),
  })

  setAutoPlayVisible(true)

  // Filter source dropdown: show only anime-compatible sources
  if (window._populateSourceDropdown) window._populateSourceDropdown(true)

  onShowView('player')
}

// ── Auto-play next episode ────────────
export function checkAutoPlay() {
  if (!getAutoPlay()) return false

  // Check anime episodes
  if (state.currentAnimeEpIndex !== null && state.currentAnimeEpisodes.length > 0) {
    if (state.currentAnimeEpIndex < state.currentAnimeEpisodes.length - 1) {
      playAnime(state.currentAnimeEpIndex + 1)
      return true
    }
    return false
  }

  // Check TV episodes
  if (state.currentEpIndex === null) return false
  if (state.currentEpIndex < state.currentEpisodes.length - 1) {
    playEpisode(state.currentEpIndex + 1)
    return true
  }
  return false
}

// ── Source switching ──────────────────
export function tryNextSource() {
  const keys = Object.keys(SOURCES)
  const currentKey = getActiveSource()
  let currentIndex = keys.indexOf(currentKey)
  let nextIndex = (currentIndex + 1) % keys.length
  let nextKey = keys[nextIndex]

  // Skip sources that don't support anime when watching anime
  if (state.currentAnimeEpIndex !== null && state.currentAnimeEpisodes.length > 0) {
    let attempts = 0
    while (!SOURCES[nextKey].getAnime && attempts < keys.length) {
      nextIndex = (nextIndex + 1) % keys.length
      nextKey = keys[nextIndex]
      attempts++
    }
  }

  setActiveSource(nextKey)
  showToast(`Switched to ${SOURCES[nextKey].name}`, 'info')

  // Reload current content based on type
  if (state.currentAnimeEpIndex !== null && state.currentAnimeEpisodes.length > 0) {
    playAnime(state.currentAnimeEpIndex)
  } else if (state.currentEpIndex !== null && state.currentEpisodes.length > 0) {
    playEpisode(state.currentEpIndex)
  } else if (state.currentSerieId) {
    playMovie(state.currentSerieId, playerTitle.textContent)
  }
}

export function changeSource(newKey) {
  setActiveSource(newKey)
  // Reload current video if player is active
  if (state.currentAnimeEpIndex !== null && state.currentAnimeEpisodes.length > 0) {
    playAnime(state.currentAnimeEpIndex)
  } else if (state.currentEpIndex !== null && state.currentEpisodes.length > 0) {
    playEpisode(state.currentEpIndex)
  } else if (state.currentSerieId) {
    playMovie(state.currentSerieId, playerTitle.textContent)
  }
}

// ── Navigation helpers ────────────────
export function prevEpisode() {
  if (state.currentEpIndex > 0) playEpisode(state.currentEpIndex - 1)
  else if (state.currentAnimeEpIndex > 0) playAnime(state.currentAnimeEpIndex - 1)
}

export function nextEpisode() {
  if (state.currentEpIndex !== null && state.currentEpIndex < state.currentEpisodes.length - 1) {
    playEpisode(state.currentEpIndex + 1)
  } else if (state.currentAnimeEpIndex !== null && state.currentAnimeEpIndex < state.currentAnimeEpisodes.length - 1) {
    playAnime(state.currentAnimeEpIndex + 1)
  } else if (getAutoPlay()) {
    checkAutoPlay()
  }
}
