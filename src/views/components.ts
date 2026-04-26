import type {
  MediaItem,
  NormalizedAnime,
  TmdbMedia,
  TmdbEpisode,
  ContinueWatchingItem,
  AniListDetailResponse
} from '../types.js'
import { CLASSES, IMG_BASE } from '../constants.js'
import { isFavorite, toggleFavorite, removeFromContinueWatching, state } from '../state.js'
import { showToast } from '../toast.js'
import { posterPlaceholderStyle, setupImageCrossfade } from '../posterPlaceholder.js'
import { escHtml, getPosterSize } from './utils.js'
import { prefetchImage } from './ui.js'
import { onOpenAnime, onOpenDetail, onOpenAnimeEpisode, onLoadMore, dom } from './context.js'

// ═══════════════════════════════════════
// RESULT CARD
// ═══════════════════════════════════════

export function buildResultCard(item: MediaItem | NormalizedAnime | TmdbMedia, enablePrefetch: boolean = false): HTMLElement {
  const isTV = (item as any).media_type === 'tv'
  const isAnime = (item as any).media_type === 'anime'
  const title = (item as any).title || (item as any).name || 'Untitled'

  const rawYear = (item as any).release_date || (item as any).first_air_date || (item as any).year || (item as any).seasonYear || ''
  const year = typeof rawYear === 'string' ? rawYear.slice(0, 4) : String(rawYear || '').slice(0, 4)
  const rating = (item as any).vote_average ? (item as any).vote_average.toFixed(1) : ((item as any).rating || null)

  const isFullUrl = (p: string | null | undefined) => p && p.startsWith('http')
  const posterPath = (item as any).poster_path
  const posterUrl = (item as any).posterUrl
  const backdropPath = (item as any).backdrop_path
  const posterSize = getPosterSize()

  const poster = isFullUrl(posterPath)
    ? posterPath
    : (posterPath
      ? `${IMG_BASE}/${posterSize}${posterPath}`
      : (posterUrl ? posterUrl : (backdropPath ? `${IMG_BASE}/w500${backdropPath}` : null)))

  const card = document.createElement('div')
  card.className = CLASSES.RESULT_CARD
  ;(card as any).dataset.id = (item as any).id
  ;(card as any).dataset.mediaType = (item as any).media_type

  const fav = isFavorite((item as any).id)
  const itemId = (item as any).id

  card.innerHTML = `
    <button class="${CLASSES.FAV_BTN} ${fav ? CLASSES.FAV_ACTIVE : ''}" aria-label="Favorite">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </button>
    <div class="result-poster" ${poster ? '' : `style="${posterPlaceholderStyle(itemId)}"`}>
      ${poster
      ? `<img src="${poster}" alt="${escHtml(title)}" loading="lazy" />`
      : `<div class="no-poster">🎬</div>`}
    </div>
    <div class="result-info">
      <div class="type-pill ${isAnime ? 'anime' : (isTV ? 'series' : 'movie')}">${isAnime ? 'Anime' : (isTV ? 'Series' : 'Movie')}</div>
      <div class="result-title">${escHtml(title)}</div>
      <div class="result-meta">
        ${year ? `<span class="result-year">${year}</span>` : ''}
        ${rating ? `<span class="result-rating">★ ${rating}</span>` : ''}
      </div>
    </div>
  `

  const favBtn = card.querySelector<HTMLButtonElement>(`.${CLASSES.FAV_BTN}`)
  favBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    const isNowFav = toggleFavorite(item as MediaItem)
    card.querySelector(`.${CLASSES.FAV_BTN}`)?.classList.toggle(CLASSES.FAV_ACTIVE, isNowFav)
    showToast(
      isNowFav ? `Added "${title}" to watchlist` : `Removed "${title}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })

  card.addEventListener('click', () => {
    if (isAnime) {
      onOpenAnime((item as any).id)
    } else {
      onOpenDetail((item as any).id, (item as any).media_type)
    }
  })

  if (enablePrefetch) {
    card.addEventListener('mouseenter', () => {
      const img = card.querySelector<HTMLImageElement>('img')
      if (img && img.src) prefetchImage(img.src)
    }, { passive: true })
  }

  if (poster) {
    const posterEl = card.querySelector('.result-poster') as HTMLElement
    const img = card.querySelector<HTMLImageElement>('img')
    if (posterEl && img) {
      setupImageCrossfade(posterEl, img)
    }
  }

  return card
}

// ═══════════════════════════════════════
// CONTINUE WATCHING CARD
// ═══════════════════════════════════════

export function buildContinueWatchingCard(item: ContinueWatchingItem): HTMLElement {
  const isTV = item.media_type === 'tv'
  const isAnime = item.media_type === 'anime'
  const title = item.title || 'Untitled'

  const isFullUrl = (p: string | null | undefined) => p && p.startsWith('http')
  const rawPoster = item.poster_path
  const posterSize = getPosterSize()
  const poster = isFullUrl(rawPoster)
    ? rawPoster
    : (rawPoster ? `${IMG_BASE}/${posterSize}${rawPoster}` : null)

  const card = document.createElement('div')
  card.className = CLASSES.RESULT_CARD
  ;(card as any).dataset.id = item.id
  card.style.position = 'relative'

  card.innerHTML = `
    <button class="remove-watching-btn" aria-label="Remove from continue watching" title="Clear from history">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <div class="result-poster">
      ${poster
      ? `<img src="${poster}" alt="${escHtml(title)}" loading="lazy" />`
      : `<div class="no-poster">🎬</div>`}
    </div>
    <div class="result-info">
      <div class="type-pill ${isAnime ? 'anime' : (isTV ? 'series' : 'movie')}">${isAnime ? `E${item.episode || 1}` : (isTV ? `S${item.season || 1}E${item.episode || 1}` : 'Movie')}</div>
      <div class="result-title">${escHtml(title)}</div>
    </div>
  `

  const removeBtn = card.querySelector<HTMLButtonElement>('.remove-watching-btn')
  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    removeFromContinueWatching(item.id)
    card.style.transform = 'scale(0.8)'
    card.style.opacity = '0'
    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
    setTimeout(() => card.remove(), 300)
  })

  card.addEventListener('click', () => {
    if (isAnime) {
      const epIdx = (item.episode || 1) - 1
      state.pendingAnimeResume = { episodeIndex: epIdx, title }
      onOpenAnime(item.tmdbId || Number(item.id))
    } else if (isTV) {
      state.pendingTvResume = { season: item.season || 1, episode: item.episode || 1, title }
      onOpenDetail(item.tmdbId, 'tv')
    } else {
      onOpenDetail(item.tmdbId, 'movie')
    }
  })

  return card
}

// ═══════════════════════════════════════
// EPISODE ITEMS
// ═══════════════════════════════════════

export function buildEpisodeItem(ep: TmdbEpisode, idx: number): HTMLElement {
  const thumb = ep.still_path ? `${IMG_BASE}/w300${ep.still_path}` : null
  const item = document.createElement('div')
  item.className = CLASSES.EPISODE_ITEM
  item.innerHTML = `
    <div class="ep-thumb">
      ${thumb
      ? `<img src="${thumb}" alt="E${ep.episode_number}" loading="lazy" />`
      : `<div class="ep-no-thumb">▶</div>`}
      <div class="ep-play-overlay">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.15)"/>
          <path d="M12 10l12 6-12 6V10z" fill="white"/>
        </svg>
      </div>
    </div>
    <div class="ep-body">
      <div class="ep-num">E${ep.episode_number}${ep.runtime ? ` · ${ep.runtime} min` : ''}</div>
      <div class="ep-name">${escHtml(ep.name || 'Untitled')}</div>
      <p class="ep-desc">${escHtml(ep.overview || 'No description.')}</p>
    </div>
  `
  item.addEventListener('click', () => onLoadMore(idx, dom.episodesTitle!.textContent?.split(' · ')[0] ?? ''))
  return item
}

export function buildAnimeEpisodeItem(ep: { number: number; name: string }, idx: number, data: AniListDetailResponse): HTMLElement {
  const item = document.createElement('div')
  const isCurrentEp = state.currentAnimeEpIndex === idx
  item.className = `${CLASSES.EPISODE_ITEM}${isCurrentEp ? ' current-episode' : ''}`

  const bgImage = data.posterUrl ?? data.banner_path ?? null

  item.innerHTML = `
    <div class="ep-thumb" style="${bgImage ? `background-image:url('${bgImage}');background-size:cover;background-position:center;` : ''}">
      <div class="ep-thumb-overlay">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="rgba(0,0,0,0.4)"/>
          <path d="M12 10l12 6-12 6V10z" fill="white"/>
        </svg>
      </div>
      <div class="ep-play-overlay">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.15)"/>
          <path d="M12 10l12 6-12 6V10z" fill="white"/>
        </svg>
      </div>
    </div>
    <div class="ep-body">
      <div class="ep-num">Episode ${ep.number}${data.format ? ` · ${data.format}` : ''}</div>
      <div class="ep-name">${escHtml(ep.name)}</div>
      <p class="ep-desc">Click to start watching</p>
    </div>
  `
  item.addEventListener('click', () => onOpenAnimeEpisode(idx, data.title))
  return item
}
