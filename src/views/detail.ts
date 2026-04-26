import { CLASSES, IMG_BASE } from '../constants.js'
import { tmdb } from '../api.js'
import { getAnimeDetail } from '../anilist.js'
import { state, isFavorite, toggleFavorite } from '../state.js'
import type { MediaType, TmdbDetailResponse, AniListDetailResponse, MediaItem, TmdbMedia } from '../types.js'
import { escHtml } from './utils.js'
import { buildDetailSkeleton } from './ui.js'
import { dom, onShowView, onOpenAnimeEpisodes, onOpenAnimeEpisode, onOpenSeason } from './context.js'
import { buildResultCard } from './components.js'
import { playMovie } from '../player.js'
import { showToast } from '../toast.js'
import { setDetailTitle, updateJsonLd } from '../router.js'

// ═══════════════════════════════════════
// ANIME DETAIL VIEW
// ═══════════════════════════════════════

export async function openAnime(id: number): Promise<void> {
  state.currentAnimeId = id
  state.currentSerieId = null
  state.currentSerieType = null
  state.currentEpisodes = []
  state.currentEpIndex = null

  // Show skeleton while loading
  dom.detailContent!.innerHTML = ''
  dom.detailContent!.appendChild(buildDetailSkeleton('anime'))
  dom.detailContent!.classList.add('loading')
  onShowView('detail')

  try {
    const data = await getAnimeDetail(id)

    // Fade out skeleton, then show real content
    await new Promise(resolve => setTimeout(resolve, 150))
    dom.detailContent!.classList.remove('loading')
    showAnimeDetail(data)

    if (state.pendingAnimeResume) {
      const { episodeIndex, title } = state.pendingAnimeResume
      state.pendingAnimeResume = null
      requestAnimationFrame(() => {
        onOpenAnimeEpisodes(title)
        requestAnimationFrame(() => {
          onOpenAnimeEpisode(episodeIndex, title)
        })
      })
    }
  } catch (e: any) {
    console.error(e)
    dom.detailContent!.classList.remove('loading')
    showDetailError(e)
  }
}

export function showAnimeDetail(data: AniListDetailResponse): void {
  dom.detailTitle!.textContent = data.title
  dom.detailType!.textContent = 'Anime'
  dom.detailType!.className = 'card-badge anime'
  dom.detailType!.classList.remove(CLASSES.HIDDEN)
  state.currentPosterPath = data.poster_path ?? data.posterUrl ?? null

  setDetailTitle(data.title)

  const poster = data.posterUrl ?? null
  const year = data.year ?? ''
  const rating = data.rating ? `★ ${data.rating}` : ''
  const genres = (data.genres || []).join(' · ')
  const episodes = data.episodes ?? 0
  const format = data.format ?? 'TV'
  const studios = (data.studios || []).join(', ')

  state._currentAnimeData = data as any

  dom.detailContent!.innerHTML = `
    <div class="movie-detail">
      <div class="movie-poster">
        ${poster ? `<img src="${poster}" alt="${escHtml(data.title)}" />` : '<div class="no-poster" style="height:360px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--glass-bg)">🎬</div>'}
      </div>
      <div class="movie-info">
        <h1 class="movie-title">${escHtml(data.title)}</h1>
        <div class="movie-meta-row">
          ${year ? `<span class="meta-chip">${year}</span>` : ''}
          ${format ? `<span class="meta-chip">${format}</span>` : ''}
          ${episodes ? `<span class="meta-chip">${episodes} episodes</span>` : ''}
          ${rating ? `<span class="meta-chip">${rating}</span>` : ''}
          ${genres ? `<span class="meta-chip">${escHtml(genres)}</span>` : ''}
          ${studios ? `<span class="meta-chip">${escHtml(studios)}</span>` : ''}
        </div>
        ${data.overview ? `<p class="movie-overview">${escHtml(data.overview)}</p>` : ''}
        <div class="flex gap-2">
          ${episodes > 0 ? `
          <button class="btn-action watch-btn" id="watchAnimeBtn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3l8 5-8 5V3z" fill="white"/>
            </svg>
            Browse episodes
          </button>
          ` : ''}
          <button class="btn-action fav-add-btn" id="favAnimeBtn">
            ${isFavorite(data.id) ? '♥ Favorited' : '♥ Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  `

  document.getElementById('watchAnimeBtn')?.addEventListener('click', () => {
    onOpenAnimeEpisodes(data.title)
  })

  const favBtn = document.getElementById('favAnimeBtn')
  favBtn?.addEventListener('click', (e) => {
    const isNowFav = toggleFavorite({
      id: data.id,
      title: data.title,
      poster_path: data.posterUrl,
      posterUrl: data.posterUrl,
      media_type: 'anime'
    } as MediaItem)
    ;(e.target as HTMLElement).textContent = isNowFav ? '♥ Favorited' : '♥ Add to Watchlist'
    showToast(
      isNowFav ? `Added "${data.title}" to watchlist` : `Removed "${data.title}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })
}

// ═══════════════════════════════════════
// DETAIL VIEW (Series / Movies)
// ═══════════════════════════════════════

export async function openDetail(id: number, type: MediaType): Promise<void> {
  state.currentSerieId = id
  state.currentSerieType = type === 'anime' ? null : type
  state.currentAnimeId = null
  state.currentAnimeEpisodes = []
  state.currentAnimeEpIndex = null
  state._currentAnimeData = undefined
  state._totalSeasons = null

  // Show skeleton while loading
  const skeletonType = type === 'tv' ? 'tv' as const : 'movie' as const
  dom.detailContent!.innerHTML = ''
  dom.detailContent!.appendChild(buildDetailSkeleton(skeletonType))
  dom.detailContent!.classList.add('loading')
  onShowView('detail')

  try {
    const [mainData, castData, similarData] = await Promise.all([
      tmdb<TmdbDetailResponse>(`/${type}/${id}`),
      tmdb<any>(`/${type}/${id}/credits`),
      tmdb<any>(`/${type}/${id}/similar`),
    ])

    state._castData = castData.cast?.slice(0, 12) || []
    state._similarData = similarData.results || []

    if (type === 'tv') {
      state._totalSeasons = (mainData as any).number_of_seasons ?? null
      showSeriesDetail(mainData)

      if (state.pendingTvResume) {
        const { season, episode, title } = state.pendingTvResume
        state.pendingTvResume = null
        requestAnimationFrame(() => {
          onOpenSeason(season, title, episode)
        })
      }
    } else {
      showMovieDetail(mainData)
    }

    dom.detailContent!.classList.remove('loading')

    window.dispatchEvent(new CustomEvent('detailloaded', { detail: { id, type } }))
  } catch (e: any) {
    console.error(e)
    dom.detailContent!.classList.remove('loading')
    showDetailError(e)
  }
}

export function showSeriesDetail(data: TmdbDetailResponse): void {
  dom.detailTitle!.textContent = data.name ?? ''
  dom.detailType!.textContent = 'Series'
  dom.detailType!.className = 'card-badge series'
  dom.detailType!.classList.remove(CLASSES.HIDDEN)
  state.currentPosterPath = data.poster_path ?? null

  setDetailTitle(data.name ?? '')
  updateJsonLd('tv', data)

  const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null
  const year = (data.first_air_date ?? '').slice(0, 4)
  const rating = data.vote_average ? `★ ${data.vote_average.toFixed(1)}` : ''
  const genres = (data.genres || []).map(g => g.name).join(' · ')
  const seasons = (data.seasons || []).filter(s => s.season_number > 0)
  const totalEpisodes = data.number_of_episodes ?? seasons.reduce((sum, s) => sum + s.episode_count, 0)
  const cast = (state as any)._castData ?? []
  const similar = (state as any)._similarData ?? []

  dom.detailContent!.innerHTML = `
    <div class="movie-detail">
      <div class="movie-poster">
        ${poster ? `<img src="${poster}" alt="${escHtml(data.name ?? '')}" />` : '<div class="no-poster" style="height:360px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--glass-bg)">🎬</div>'}
      </div>
      <div class="movie-info">
        <h1 class="movie-title">${escHtml(data.name ?? '')}</h1>
        <div class="movie-meta-row">
          ${year ? `<span class="meta-chip">${year}</span>` : ''}
          ${totalEpisodes ? `<span class="meta-chip">${totalEpisodes} episodes</span>` : ''}
          ${rating ? `<span class="meta-chip">${rating}</span>` : ''}
          ${genres ? `<span class="meta-chip">${escHtml(genres)}</span>` : ''}
        </div>
        ${data.overview ? `<p class="movie-overview">${escHtml(data.overview)}</p>` : ''}
        <div class="flex gap-2">
          <button class="btn-action watch-btn" id="watchSeriesBtn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3l8 5-8 5V3z" fill="white"/>
            </svg>
            Browse episodes
          </button>
          <button class="btn-action fav-add-btn" id="favSeriesBtn">
            ${isFavorite(data.id) ? '♥ Favorited' : '♥ Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
    <div class="seasons-section">
      <h3 class="section-subtitle">Seasons</h3>
      <div class="seasons-grid-scroll" id="seasonsGrid"></div>
    </div>
    ${cast.length > 0 ? `
      <div class="cast-section">
        <h3 class="section-subtitle">Cast</h3>
        <div class="cast-grid">
          ${cast.slice(0, 8).map((c: any) => `
            <div class="cast-card">
              ${c.profile_path ? `<img src="${IMG_BASE}/w185${c.profile_path}" alt="${escHtml(c.name)}" loading="lazy" />` : '<div class="cast-no-img">👤</div>'}
              <div class="cast-name">${escHtml(c.name)}</div>
              <div class="cast-role">${escHtml(c.character || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `

  document.getElementById('watchSeriesBtn')?.addEventListener('click', () => {
    if (seasons.length > 0) {
      onOpenSeason(seasons[0]!.season_number, data.name ?? '')
    }
  })

  document.getElementById('favSeriesBtn')?.addEventListener('click', (e) => {
    const isNowFav = toggleFavorite({ id: data.id, title: data.name, poster_path: data.poster_path, media_type: 'tv' } as MediaItem)
    ;(e!.target as HTMLElement).textContent = isNowFav ? '♥ Favorited' : '♥ Add to Watchlist'
    showToast(
      isNowFav ? `Added "${data.name}" to watchlist` : `Removed "${data.name}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })

  const grid = document.getElementById('seasonsGrid')!
  seasons.forEach(s => {
    const poster = s.poster_path ? `${IMG_BASE}/w342${s.poster_path}` : null
    const card = document.createElement('div')
    card.className = CLASSES.SEASON_CARD
    card.innerHTML = `
      ${poster ? `<img src="${poster}" alt="T${s.season_number}" loading="lazy" />` : ''}
      <div class="season-label">Season ${s.season_number}</div>
    `
    card.addEventListener('click', () => onOpenSeason(s.season_number, data.name ?? ''))
    grid.appendChild(card)
  })

  if (similar.length > 0) {
    appendSimilarRow(similar, 'More Like This')
  }
}

export function showMovieDetail(data: TmdbDetailResponse): void {
  dom.detailTitle!.textContent = data.title ?? ''
  dom.detailType!.textContent = 'Movie'
  dom.detailType!.className = 'card-badge movie'
  dom.detailType!.classList.remove(CLASSES.HIDDEN)
  state.currentPosterPath = data.poster_path ?? null

  setDetailTitle(data.title ?? '')
  updateJsonLd('movie', data)

  const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null
  const year = (data.release_date ?? '').slice(0, 4)
  const runtime = data.runtime ? `${data.runtime} min` : ''
  const rating = data.vote_average ? `★ ${data.vote_average.toFixed(1)}` : ''
  const genres = (data.genres || []).map(g => g.name).join(' · ')
  const cast = (state as any)._castData ?? []
  const similar = (state as any)._similarData ?? []

  dom.detailContent!.innerHTML = `
    <div class="movie-detail">
      <div class="movie-poster">
        ${poster ? `<img src="${poster}" alt="${escHtml(data.title ?? '')}" />` : '<div class="no-poster" style="height:360px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--glass-bg)">🎬</div>'}
      </div>
      <div class="movie-info">
        <h1 class="movie-title">${escHtml(data.title ?? '')}</h1>
        <div class="movie-meta-row">
          ${year ? `<span class="meta-chip">${year}</span>` : ''}
          ${runtime ? `<span class="meta-chip">${runtime}</span>` : ''}
          ${rating ? `<span class="meta-chip">${rating}</span>` : ''}
          ${genres ? `<span class="meta-chip">${escHtml(genres)}</span>` : ''}
        </div>
        ${data.overview ? `<p class="movie-overview">${escHtml(data.overview)}</p>` : ''}
        <div class="flex gap-2">
          <button class="btn-action watch-btn" id="watchMovieBtn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3l8 5-8 5V3z" fill="white"/>
            </svg>
            Watch now
          </button>
          <button class="btn-action fav-add-btn" id="favMovieBtn">
            ${isFavorite(data.id) ? '♥ Favorited' : '♥ Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
    ${cast.length > 0 ? `
      <div class="cast-section">
        <h3 class="section-subtitle">Cast</h3>
        <div class="cast-grid">
          ${cast.slice(0, 8).map((c: any) => `
            <div class="cast-card">
              ${c.profile_path ? `<img src="${IMG_BASE}/w185${c.profile_path}" alt="${escHtml(c.name)}" loading="lazy" />` : '<div class="cast-no-img">👤</div>'}
              <div class="cast-name">${escHtml(c.name)}</div>
              <div class="cast-role">${escHtml(c.character || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `

  document.getElementById('watchMovieBtn')?.addEventListener('click', () => {
    playMovie(data.id, data.title ?? '')
  })

  document.getElementById('favMovieBtn')?.addEventListener('click', (e) => {
    const isNowFav = toggleFavorite({ id: data.id, title: data.title, poster_path: data.poster_path, media_type: 'movie' } as MediaItem)
    ;(e!.target as HTMLElement).textContent = isNowFav ? '♥ Favorited' : '♥ Add to Watchlist'
    showToast(
      isNowFav ? `Added "${data.title}" to watchlist` : `Removed "${data.title}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })

  if (similar.length > 0) {
    appendSimilarRow(similar, 'More Like This')
  }
}

export function showDetailError(e: Error): void {
  dom.detailContent!.innerHTML = `<p style="color:var(--accent);padding:24px">Error loading content: ${escHtml(e.message)}. Check your connection or TMDB token.</p>`
}

export function appendSimilarRow(items: TmdbMedia[], title: string): void {
  const section = document.createElement('div')
  section.className = 'similar-section'
  section.innerHTML = `<h3 class="section-subtitle">${escHtml(title)}</h3>`

  const row = document.createElement('div')
  row.className = 'similar-row'

  items.slice(0, 12).forEach(item => {
    if (!item.poster_path && !item.backdrop_path) return
    const mediaType = item.media_type || (state.currentSerieType === 'tv' ? 'tv' : 'movie')
    if (!item.media_type) item.media_type = mediaType
    row.appendChild(buildResultCard(item, true))
  })

  section.appendChild(row)
  dom.detailContent!.appendChild(section)
}
