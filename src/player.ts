// ═══════════════════════════════════════
// PLAYER — Episode & movie playback
// ═══════════════════════════════════════

import type { ViewName, ContinueWatchingItem } from './types.js'
import { SOURCES } from './constants.js'
import { state, getActiveSource, setActiveSource, saveContinueWatching, getContinueWatching, setLastSourceForType, getLastSourceForType } from './state.js'
import { showToast } from './toast.js'
import { setPlayerTitle } from './router.js'

// DOM references (injected by main)
let playerFrame: HTMLIFrameElement
let playerTitle: HTMLElement
let prevEpBtn: HTMLButtonElement
let nextEpBtn: HTMLButtonElement
let playerBackText: HTMLElement
let serverSelect: HTMLSelectElement
let onShowView: (name: ViewName, onPlayerExit?: () => void) => void

export interface PlayerDom {
  playerFrame: HTMLIFrameElement
  playerTitle: HTMLElement
  prevEpBtn: HTMLButtonElement
  nextEpBtn: HTMLButtonElement
  playerBackText: HTMLElement
  serverSelect: HTMLSelectElement
  onShowView: (name: ViewName, onPlayerExit?: () => void) => void
}

export function initPlayer(dom: PlayerDom): void {
  playerFrame = dom.playerFrame
  playerTitle = dom.playerTitle
  prevEpBtn = dom.prevEpBtn
  nextEpBtn = dom.nextEpBtn
  playerBackText = dom.playerBackText
  serverSelect = dom.serverSelect
  onShowView = dom.onShowView
}

/**
 * Sync the server select dropdown to reflect the currently active source
 */
function syncServerSelect(): void {
  try {
    const activeSource = getActiveSource()
    if (serverSelect && serverSelect.querySelector(`option[value="${activeSource}"]`)) {
      serverSelect.value = activeSource
    }
  } catch {
    // Ignore if serverSelect is not available
  }
}

// ── Play Episode ──────────────────────
export function playEpisode(idx: number, title: string | null = null): void {
  state.currentEpIndex = idx
  const ep = state.currentEpisodes[idx]
  if (!ep) {
    console.error('Episode not found at index', idx)
    return
  }

  // Restore last used source for movie/tv if available
  const lastSource = getLastSourceForType('movie')
  if (lastSource && SOURCES[lastSource]) {
    setActiveSource(lastSource)
  }

  const sourceKey = getActiveSource()
  const source = SOURCES[sourceKey] ?? SOURCES['videasy']
  if (!source) {
    console.error('No video source available')
    return
  }

  // Save this source preference for movie/tv
  setLastSourceForType('movie', sourceKey)

  const url = source.getTv(state.currentSerieId!, state.currentSeason!, ep.episode_number)

  const epTitle = title ?? state._currentTitle ?? 'Unknown'
  playerTitle.textContent = `T${state.currentSeason} E${ep.episode_number} – ${ep.name}`

  // Clear iframe before loading new source
  playerFrame.src = ''
  setTimeout(() => {
    playerFrame.src = url
    onShowView('player')
  }, 100)

  // Show episode navigation
  prevEpBtn.style.display = ''
  nextEpBtn.style.display = ''
  prevEpBtn.disabled = idx === 0
  nextEpBtn.disabled = idx === state.currentEpisodes.length - 1

  if (playerBackText) playerBackText.textContent = 'Episodes'

  // Update page title
  setPlayerTitle(`${epTitle} - S${state.currentSeason}E${ep.episode_number}`)

  // Save to continue watching
  saveContinueWatching({
    id: `tv-${state.currentSerieId}`,
    tmdbId: state.currentSerieId!,
    media_type: 'tv',
    title: epTitle,
    poster_path: state.currentPosterPath,
    season: state.currentSeason!,
    episode: ep.episode_number,
    progress: Math.round((ep.episode_number / state.currentEpisodes.length) * 100),
    completed: ep.episode_number === state.currentEpisodes.length,
  } as ContinueWatchingItem)

  // Filter source dropdown: show all sources for TV content
  if (window._populateSourceDropdown) window._populateSourceDropdown(false)

  onShowView('player')
}

// ── Play Movie ────────────────────────
export function playMovie(id: number, title: string): void {
  // Restore last used source for movie/tv if available
  const lastSource = getLastSourceForType('movie')
  if (lastSource && SOURCES[lastSource]) {
    setActiveSource(lastSource)
  }

  const sourceKey = getActiveSource()
  const source = SOURCES[sourceKey] ?? SOURCES['videasy']
  if (!source) {
    console.error('No video source available')
    return
  }

  // Save this source preference for movie
  setLastSourceForType('movie', sourceKey)

  const url = source.getMovie(id)

  playerTitle.textContent = title
  state.currentEpisodes = []
  state.currentEpIndex = null
  
  // Hide episode navigation for movies
  prevEpBtn.style.display = 'none'
  nextEpBtn.style.display = 'none'

  if (playerBackText) playerBackText.textContent = 'Details'

  // Update page title
  setPlayerTitle(title)

  // Save to continue watching
  saveContinueWatching({
    id: String(id),
    tmdbId: id,
    media_type: 'movie',
    title,
    poster_path: state.currentPosterPath,
    progress: 10,
  } as ContinueWatchingItem)

  // Filter source dropdown: show all sources for movies
  if (window._populateSourceDropdown) window._populateSourceDropdown(false)

  // Clear iframe before loading
  playerFrame.src = ''
  setTimeout(() => {
    playerFrame.src = url
    onShowView('player')
  }, 100)
}

// ── Play Anime ────────────────────────
export function playAnime(idx: number, title: string | null = null): void {
  state.currentAnimeEpIndex = idx
  const epNum = idx + 1 // AniList uses 1-based episode numbers
  let sourceKey = getActiveSource()
  let source = SOURCES[sourceKey] ?? SOURCES['videasy']

  // Restore last used anime source if available
  const lastAnimeSource = getLastSourceForType('anime')
  if (lastAnimeSource && SOURCES[lastAnimeSource]?.getAnime) {
    sourceKey = lastAnimeSource
    source = SOURCES[lastAnimeSource]
    setActiveSource(sourceKey)
  }

  // Fallback: if current source doesn't support anime, find one that does
  if (!source?.getAnime) {
    const animeSourceKey = Object.keys(SOURCES).find(k => SOURCES[k]?.getAnime)
    if (animeSourceKey) {
      sourceKey = animeSourceKey
      source = SOURCES[animeSourceKey]!
      setActiveSource(animeSourceKey)
      showToast(`Switched to ${source.name} (anime source)`, 'info')
    }
  }

  if (!source) {
    console.error('No anime source available')
    return
  }

  // Save this source preference for anime
  setLastSourceForType('anime', sourceKey)

  const url = source.getAnime
    ? source.getAnime(state.currentAnimeId!, epNum)
    : `https://player.videasy.net/anime/${state.currentAnimeId}/${epNum}`

  const epTitle = title ?? state._currentAnimeTitle ?? 'Unknown'
  playerTitle.textContent = `Episode ${epNum}`

  // Clear iframe before loading
  playerFrame.src = ''
  setTimeout(() => {
    playerFrame.src = url
    onShowView('player')
  }, 100)

  // Show episode navigation
  prevEpBtn.style.display = ''
  nextEpBtn.style.display = ''
  const totalEps = state.currentAnimeEpisodes.length
  prevEpBtn.disabled = idx === 0
  nextEpBtn.disabled = idx >= totalEps - 1

  if (playerBackText) playerBackText.textContent = 'Episodes'

  setPlayerTitle(`${epTitle} - Episode ${epNum}`)

  // Save to continue watching
  saveContinueWatching({
    id: `anime-${state.currentAnimeId}`,
    tmdbId: state.currentAnimeId!,
    media_type: 'anime',
    title: epTitle,
    poster_path: state.currentPosterPath,
    episode: epNum,
    progress: Math.round((epNum / totalEps) * 100),
    completed: epNum === totalEps,
  } as ContinueWatchingItem)

  // Filter source dropdown: show only anime-compatible sources
  if (window._populateSourceDropdown) window._populateSourceDropdown(true)

  onShowView('player')
}

// ── Source switching ──────────────────

/**
 * Validate that a source key exists in SOURCES
 */
function isValidSource(key: string): boolean {
  return key in SOURCES
}

/**
 * Safely switch video source with iframe cleanup
 * Does NOT call playEpisode/playMovie/playAnime to avoid source override
 */
export function changeSource(newKey: string): void {
  // Validate source exists
  if (!isValidSource(newKey)) {
    console.error(`Invalid source key: ${newKey}`)
    showToast(`Error: Source "${newKey}" not found`, 'error')
    return
  }

  setActiveSource(newKey)
  const source = SOURCES[newKey]!
  
  // Clear iframe immediately to stop audio
  playerFrame.src = ''

  // Build URL directly based on current content type
  let url: string | null = null
  
  if (state.currentAnimeEpIndex !== null && state.currentAnimeEpisodes.length > 0) {
    // Anime
    const epNum = state.currentAnimeEpIndex + 1
    url = source.getAnime 
      ? source.getAnime(state.currentAnimeId!, epNum)
      : `https://player.videasy.net/anime/${state.currentAnimeId}/${epNum}`
  } else if (state.currentEpIndex !== null && state.currentEpisodes.length > 0) {
    // TV Episode
    const ep = state.currentEpisodes[state.currentEpIndex]
    if (ep) {
      url = source.getTv(state.currentSerieId!, state.currentSeason!, ep.episode_number)
    }
  } else if (state.currentSerieId) {
    // Movie
    url = source.getMovie(state.currentSerieId)
  }
  
  if (!url) {
    showToast('No content to reload', 'warning')
    return
  }
  
  // Load new source
  setTimeout(() => {
    playerFrame.src = url!
  }, 100)

  // Sync dropdown to reflect the new source
  syncServerSelect()

  showToast(`Switched to ${source.name}`, 'info')
}

/**
 * Try next source - useful if current source is not working
 * Cycles through all sources, skipping incompatible ones for anime
 */
export function tryNextSource(): void {
  const keys = Object.keys(SOURCES)
  const currentKey = getActiveSource()
  const currentIndex = keys.indexOf(currentKey)
  
  if (currentIndex === -1) {
    console.error('Current source not found in SOURCES')
    return
  }

  let nextKey: string | undefined
  let attempts = 0
  const maxAttempts = keys.length

  // Skip sources that don't support anime when watching anime
  const isWatchingAnime = state.currentAnimeEpIndex !== null && state.currentAnimeEpisodes.length > 0

  do {
    const nextIndex = (currentIndex + attempts + 1) % keys.length
    nextKey = keys[nextIndex]
    attempts++

    // If watching anime, skip sources without getAnime
    if (isWatchingAnime && nextKey && !SOURCES[nextKey]?.getAnime) {
      continue
    }

    // Found valid source
    if (nextKey && isValidSource(nextKey)) {
      setActiveSource(nextKey)
      const source = SOURCES[nextKey]!
      
      // Build URL directly
      let url: string | null = null
      
      if (isWatchingAnime) {
        const epNum = state.currentAnimeEpIndex! + 1
        url = source.getAnime 
          ? source.getAnime(state.currentAnimeId!, epNum)
          : `https://player.videasy.net/anime/${state.currentAnimeId}/${epNum}`
      } else if (state.currentEpIndex !== null && state.currentEpisodes.length > 0) {
        const ep = state.currentEpisodes[state.currentEpIndex]
        if (ep) {
          url = source.getTv(state.currentSerieId!, state.currentSeason!, ep.episode_number)
        }
      } else if (state.currentSerieId) {
        url = source.getMovie(state.currentSerieId)
      }
      
      if (!url) {
        showToast('No compatible source found', 'warning')
        return
      }
      
      // Clear iframe and reload
      playerFrame.src = ''
      setTimeout(() => {
        playerFrame.src = url!
      }, 100)

      // Sync dropdown to reflect the new source
      syncServerSelect()

      showToast(`Switched to ${source.name}`, 'info')
      return
    }
  } while (attempts < maxAttempts && nextKey)

  showToast('No compatible source found', 'warning')
}

// ── Navigation helpers ────────────────
export function prevEpisode(): void {
  if (state.currentEpIndex !== null && state.currentEpIndex > 0) {
    playEpisode(state.currentEpIndex - 1)
  } else if (state.currentAnimeEpIndex !== null && state.currentAnimeEpIndex > 0) {
    playAnime(state.currentAnimeEpIndex - 1)
  }
}

export function nextEpisode(): void {
  if (state.currentEpIndex !== null && state.currentEpIndex < state.currentEpisodes.length - 1) {
    markCurrentAsCompleted()
    playEpisode(state.currentEpIndex + 1)
  } else if (state.currentAnimeEpIndex !== null && state.currentAnimeEpIndex < state.currentAnimeEpisodes.length - 1) {
    markCurrentAnimeAsCompleted()
    playAnime(state.currentAnimeEpIndex + 1)
  }
}

function markCurrentAsCompleted(): void {
  if (state.currentEpIndex === null || !state.currentEpisodes[state.currentEpIndex]) return

  const ep = state.currentEpisodes[state.currentEpIndex]
  const existing = getContinueWatching()[0]

  if (existing && existing.id === `tv-${state.currentSerieId}` && !existing.completed) {
    saveContinueWatching({
      ...existing,
      episode: ep.episode_number,
      progress: 100,
      completed: true,
    })
  }
}

function markCurrentAnimeAsCompleted(): void {
  if (state.currentAnimeEpIndex === null) return

  const epNum = state.currentAnimeEpIndex + 1
  const existing = getContinueWatching()[0]

  if (existing && existing.id === `anime-${state.currentAnimeId}` && !existing.completed) {
    saveContinueWatching({
      ...existing,
      episode: epNum,
      progress: 100,
      completed: true,
    })
  }
}
