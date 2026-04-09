import { tmdb } from '../api.js'
import { state } from '../state.js'
import type { AniListDetailResponse, TmdbEpisode } from '../types.js'
import { escHtml } from './utils.js'
import { setLoading } from './ui.js'
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

  dom.episodesTitle!.textContent = `${escHtml(title)} · All Episodes`
  setEpisodesTitle(title, 1)

  const totalEpisodes = data.episodes ?? 0
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

  dom.episodesContent!.innerHTML = ''
  if (episodeList.length === 0) {
    dom.episodesContent!.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:48px 0">No episodes available yet. Check back later!</p>'
  } else {
    episodeList.forEach((ep, idx) => {
      dom.episodesContent!.appendChild(buildAnimeEpisodeItem(ep, idx, data))
    })
  }

  onShowView('episodes')
}

// ═══════════════════════════════════════
// EPISODES VIEW (Series Seasons)
// ═══════════════════════════════════════

export async function openSeason(seasonNum: number, serieName: string): Promise<void> {
  setLoading(true)
  state.currentSeason = seasonNum
  dom.episodesTitle!.textContent = `${escHtml(serieName)} · Season ${seasonNum}`

  state.currentAnimeId = null
  state.currentAnimeEpisodes = []
  state.currentAnimeEpIndex = null

  setEpisodesTitle(serieName, seasonNum)

  try {
    const data = await tmdb<any>(`/tv/${state.currentSerieId}/season/${seasonNum}`)
    const episodes = data.episodes || []
    state.currentEpisodes = episodes

    dom.episodesContent!.innerHTML = ''
    episodes.forEach((ep: TmdbEpisode, idx: number) => {
      dom.episodesContent!.appendChild(buildEpisodeItem(ep, idx))
    })

    onShowView('episodes')
  } catch (e: any) {
    console.error(e)
    dom.episodesContent!.innerHTML = '<p style="color:var(--accent);padding:24px">Failed to load episodes.</p>'
  } finally {
    setLoading(false)
  }
}
