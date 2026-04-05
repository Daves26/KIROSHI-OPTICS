// ═══════════════════════════════════════
// PLAYER — Episode & movie playback
// ═══════════════════════════════════════

import { SOURCES } from './constants.js'
import { state, getActiveSource, setActiveSource, saveContinueWatching, getAutoPlay } from './state.js'
import { showToast } from './toast.js'

// DOM references (injected by main)
let playerFrame
let playerTitle
let prevEpBtn
let nextEpBtn
let playerBackText
let onShowView
let autoPlayToggleEl

export function initPlayer(dom) {
  playerFrame = dom.playerFrame
  playerTitle = dom.playerTitle
  prevEpBtn = dom.prevEpBtn
  nextEpBtn = dom.nextEpBtn
  playerBackText = dom.playerBackText
  onShowView = dom.onShowView
  autoPlayToggleEl = dom.autoPlayToggle
}

// ── Play Episode ──────────────────────
export function playEpisode(idx, title = null) {
  state.currentEpIndex = idx
  const ep = state.currentEpisodes[idx]
  const sourceKey = getActiveSource()
  const source = SOURCES[sourceKey] || SOURCES['moviesapi']
  const url = source.getTv(state.currentSerieId, state.currentSeason, ep.episode_number)

  const epTitle = title || state._currentTitle || 'Unknown'
  playerTitle.textContent = `T${state.currentSeason} E${ep.episode_number} – ${ep.name}`
  playerFrame.src = url

  prevEpBtn.disabled = idx === 0
  nextEpBtn.disabled = idx === state.currentEpisodes.length - 1

  if (playerBackText) playerBackText.textContent = 'Episodes'

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

  onShowView('player')
}

// ── Play Movie ────────────────────────
export function playMovie(id, title) {
  const sourceKey = getActiveSource()
  const source = SOURCES[sourceKey] || SOURCES['moviesapi']
  const url = source.getMovie(id)

  playerTitle.textContent = title
  playerFrame.src = url
  state.currentEpisodes = []
  state.currentEpIndex = null
  prevEpBtn.disabled = true
  nextEpBtn.disabled = true

  if (playerBackText) playerBackText.textContent = 'Details'

  // Save to continue watching
  saveContinueWatching({
    id,
    tmdbId: id,
    media_type: 'movie',
    title,
    poster_path: state.currentPosterPath,
    progress: 0,
  })

  onShowView('player')
}

// ── Auto-play next episode ────────────
export function checkAutoPlay() {
  if (!getAutoPlay()) return false
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
  const nextKey = keys[nextIndex]

  setActiveSource(nextKey)
  showToast(`Switched to ${SOURCES[nextKey].name}`, 'info')

  // Reload current
  if (state.currentEpIndex !== null && state.currentEpisodes.length > 0) {
    playEpisode(state.currentEpIndex)
  } else if (state.currentSerieId) {
    playMovie(state.currentSerieId, playerTitle.textContent)
  }
}

export function changeSource(newKey) {
  setActiveSource(newKey)
  // Reload current video if player is active
  if (state.currentEpIndex !== null && state.currentEpisodes.length > 0) {
    playEpisode(state.currentEpIndex)
  } else if (state.currentSerieId) {
    playMovie(state.currentSerieId, playerTitle.textContent)
  }
}

// ── Navigation helpers ────────────────
export function prevEpisode() {
  if (state.currentEpIndex > 0) playEpisode(state.currentEpIndex - 1)
}

export function nextEpisode() {
  if (state.currentEpIndex < state.currentEpisodes.length - 1)
    playEpisode(state.currentEpIndex + 1)
  else if (getAutoPlay())
    checkAutoPlay()
}

// ── Fullscreen ────────────────────────
export function toggleFullscreen() {
  const playerWrap = document.querySelector('.player-wrap')
  if (!playerWrap) return

  if (!document.fullscreenElement) {
    playerWrap.requestFullscreen?.()
      .catch(() => {/* user gesture required */})
  } else {
    document.exitFullscreen?.()
  }
}
