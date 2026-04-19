import { tmdb } from '../api.js'
import { state } from '../state.js'
import type { AniListDetailResponse, TmdbEpisode } from '../types.js'
import { escHtml } from './utils.js'
import { buildEpisodeSkeleton } from './ui.js'
import { dom, onShowView } from './context.js'
import { buildEpisodeItem, buildAnimeEpisodeItem } from './components.js'
import { setEpisodesTitle } from '../router.js'

// ═══════════════════════════════════════
// ANIME EPISODES VIEW
// ═══════════════════════════════════════

export async function openAnimeEpisodes(title: string): Promise<void> {
  const data = state._currentAnimeData as AniListDetailResponse | undefined
  if (!data) return

  state.currentEpisodes = []
  state.currentEpIndex = null
  document.getElementById('nextSeasonBtn')!.style.display = 'none'

  dom.episodesTitle!.textContent = `${escHtml(title)} · All Episodes`
  setEpisodesTitle(title, 1)

  // Show skeleton while processing
  const totalEpisodes = data.episodes ?? 0
  dom.episodesContent!.innerHTML = ''
  dom.episodesContent!.appendChild(buildEpisodeSkeleton(Math.min(totalEpisodes, 8)))
  dom.episodesContent!.classList.add('loading')
  onShowView('episodes')

  const airingSchedule = data.airingSchedule || []
  const now = Math.floor(Date.now() / 1000)

  const episodeList: Array<{ number: number; name: string }> = []
  for (let i = 1; i <= totalEpisodes; i++) {
    const schedule = airingSchedule.find(s => s.episode === i)
    if (schedule) {
      if (schedule.airingAt <= now) {
        episodeList.push({ number: i, name: `Episode ${i}` })
      }
    } else {
      episodeList.push({ number: i, name: `Episode ${i}` })
    }
  }
  state.currentAnimeEpisodes = episodeList as any

  // Replace skeleton with real content
  dom.episodesContent!.classList.remove('loading')
  dom.episodesContent!.innerHTML = ''
  if (episodeList.length === 0) {
    dom.episodesContent!.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:48px 0">No episodes available yet. Check back later!</p>'
  } else {
    episodeList.forEach((ep, idx) => {
      dom.episodesContent!.appendChild(buildAnimeEpisodeItem(ep, idx, data))
    })
  }
}

// ═══════════════════════════════════════
// EPISODES VIEW (Series Seasons)
// ═══════════════════════════════════════

export async function openSeason(seasonNum: number, serieName: string): Promise<void> {
  state.currentSeason = seasonNum
  dom.episodesTitle!.textContent = `${escHtml(serieName)} · Season ${seasonNum}`

  state.currentAnimeId = null
  state.currentAnimeEpisodes = []
  state.currentAnimeEpIndex = null

  setEpisodesTitle(serieName, seasonNum)

  // Show skeleton while loading
  dom.episodesContent!.innerHTML = ''
  dom.episodesContent!.appendChild(buildEpisodeSkeleton(6))
  dom.episodesContent!.classList.add('loading')
  onShowView('episodes')

  try {
    const data = await tmdb<any>(`/tv/${state.currentSerieId}/season/${seasonNum}`)
    const episodes = data.episodes || []
    state.currentEpisodes = episodes

    // Replace skeleton with real content
    dom.episodesContent!.classList.remove('loading')
    dom.episodesContent!.innerHTML = ''
    episodes.forEach((ep: TmdbEpisode, idx: number) => {
      dom.episodesContent!.appendChild(buildEpisodeItem(ep, idx))
    })

    const hasNext = state._totalSeasons !== null && seasonNum < state._totalSeasons
    document.getElementById('nextSeasonBtn')!.style.display = hasNext ? 'inline-flex' : 'none'
  } catch (e: any) {
    console.error(e)
    dom.episodesContent!.classList.remove('loading')
    dom.episodesContent!.innerHTML = '<p style="color:var(--accent);padding:24px">Failed to load episodes.</p>'
  }
}
