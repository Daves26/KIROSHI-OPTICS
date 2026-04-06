// ═══════════════════════════════════════
// VIEWS — DOM manipulation & rendering
// ═══════════════════════════════════════

import { IMG_BASE, CLASSES, HOME_ROWS, ROW_OBSERVER_MARGIN, SKELETON_COUNT_HOME, SKELETON_COUNT_SEARCH, SEARCH_DEBOUNCE_MS } from './constants.js'
import { tmdb } from './api.js'
import { getTrendingAnime, getPopularAnime, getTopRatedAnime, getAnimeDetail, searchAnime as searchAnimeFromAnilist } from './anilist.js'
import { state, getFavorites, isFavorite, toggleFavorite, removeFromFavorites, getContinueWatching, removeFromContinueWatching } from './state.js'
import { playMovie, playAnime } from './player.js'
import { showToast } from './toast.js'
import { setDetailTitle, updateJsonLd, setEpisodesTitle } from './router.js'

// DOM references (injected by main)
let dom = {}
let rowObserver
let onShowView
let onGoHome
let onOpenDetail
let onOpenSeason
let onLoadMore
let onOpenAnime
let onOpenAnimeEpisode
let onOpenAnimeEpisodes
let playerFrame
let continueWatchingRow = null // Track the Continue Watching row

export function initViews(domRefs, callbacks) {
  dom = domRefs
  rowObserver = callbacks.rowObserver
  onShowView = callbacks.onShowView
  onGoHome = callbacks.onGoHome
  onOpenDetail = callbacks.onOpenDetail
  onOpenSeason = callbacks.onOpenSeason
  onLoadMore = callbacks.onLoadMore
  onOpenAnime = callbacks.onOpenAnime
  onOpenAnimeEpisode = callbacks.onOpenAnimeEpisode
  onOpenAnimeEpisodes = callbacks.onOpenAnimeEpisodes
  playerFrame = domRefs.playerFrame
}

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════

export function escHtml(str = '') {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function debounce(fn, delay) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function throttle(fn, limit) {
  let inThrottle = false
  return (...args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

// ═══════════════════════════════════════
// LOADER
// ═══════════════════════════════════════

export function setLoading(on) {
  dom.loader.classList.toggle(CLASSES.HIDDEN, !on)
}

// ═══════════════════════════════════════
// SKELETON CARDS
// ═══════════════════════════════════════

export function buildSkeletonCard(height = '240px') {
  const card = document.createElement('div')
  card.className = `${CLASSES.RESULT_CARD} ${CLASSES.SKELETON}`
  card.style.height = height
  return card
}

// ═══════════════════════════════════════
// IMAGE PREFETCHER
// ═══════════════════════════════════════

const prefetchCache = new Set()
const prefetchQueue = []
let prefetching = false

export function prefetchImage(src) {
  if (!src || prefetchCache.has(src)) return
  prefetchCache.add(src)
  prefetchQueue.push(src)
  if (!prefetching) processPrefetchQueue()
}

function processPrefetchQueue() {
  if (prefetchQueue.length === 0) { prefetching = false; return }
  prefetching = true
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'image'
  link.href = prefetchQueue.shift()
  document.head.appendChild(link)
  setTimeout(processPrefetchQueue, 50)
}

// ═══════════════════════════════════════
// RESULT CARD
// ═══════════════════════════════════════

export function buildResultCard(item, enablePrefetch = false) {
  const isTV = item.media_type === 'tv'
  const isAnime = item.media_type === 'anime'
  const title = item.title || item.name || 'Untitled'
  
  // Handle year safely - AniList returns number, TMDB returns string
  const rawYear = item.release_date || item.first_air_date || item.year || item.seasonYear || ''
  const year = typeof rawYear === 'string' ? rawYear.slice(0, 4) : String(rawYear || '').slice(0, 4)
  
  const rating = item.vote_average ? item.vote_average.toFixed(1) : (item.rating || null)
  
  // Handle poster: AniList returns full URLs, TMDB returns relative paths
  const isFullUrl = (p) => p && p.startsWith('http')
  const poster = isFullUrl(item.poster_path)
    ? item.poster_path
    : (item.poster_path
      ? `${IMG_BASE}/w342${item.poster_path}`
      : (item.posterUrl ? item.posterUrl : (item.backdrop_path ? `${IMG_BASE}/w500${item.backdrop_path}` : null)))

  const card = document.createElement('div')
  card.className = CLASSES.RESULT_CARD
  card.dataset.id = item.id
  card.dataset.mediaType = item.media_type

  const fav = isFavorite(item.id)

  card.innerHTML = `
    <button class="${CLASSES.FAV_BTN} ${fav ? CLASSES.FAV_ACTIVE : ''}" aria-label="Favorite">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </button>
    <div class="result-poster">
      ${poster
      ? `<img src="${poster}" alt="${escHtml(title)}" loading="lazy" />`
      : `<div class="no-poster">🎬</div>`}
    </div>
    <div class="result-info">
      <div class="type-pill">${isAnime ? 'Anime' : (isTV ? 'Series' : 'Movie')}</div>
      <div class="result-title">${escHtml(title)}</div>
      <div class="result-meta">
        ${year ? `<span class="result-year">${year}</span>` : ''}
        ${rating ? `<span class="result-rating">★ ${rating}</span>` : ''}
      </div>
    </div>
  `

  card.querySelector(`.${CLASSES.FAV_BTN}`).addEventListener('click', (e) => {
    e.stopPropagation()
    const isNowFav = toggleFavorite(item)
    card.querySelector(`.${CLASSES.FAV_BTN}`).classList.toggle(CLASSES.FAV_ACTIVE, isNowFav)
    showToast(
      isNowFav ? `Added "${title}" to watchlist` : `Removed "${title}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })

  card.addEventListener('click', () => {
    if (isAnime) {
      onOpenAnime(item.id)
    } else {
      onOpenDetail(item.id, item.media_type)
    }
  })

  // PERFORMANCE: Prefetch images on hover
  if (enablePrefetch) {
    card.addEventListener('mouseenter', () => {
      const img = card.querySelector('img')
      if (img && img.src) prefetchImage(img.src)
    }, { passive: true })
  }

  return card
}

// ═══════════════════════════════════════
// HOME ROWS
// ═══════════════════════════════════════

export async function loadHomeRows() {
  dom.homeRows.innerHTML = ''

  // Continue Watching row (if any) — always first, never shuffled
  const watching = getContinueWatching()
  if (watching.length > 0) {
    continueWatchingRow = buildContinueWatchingRow(watching)
    dom.homeRows.appendChild(continueWatchingRow)
  } else {
    continueWatchingRow = null
  }

  // Build anime rows (do NOT append yet)
  const animeRow1 = await buildAnimeHomeRow('Trending Anime', () => getTrendingAnime(1, 20))
  const animeRow2 = await buildAnimeHomeRow('Popular Anime', () => getPopularAnime(1, 20))
  const animeRows = [animeRow1, animeRow2]

  // Build TMDB rows and shuffle
  const shuffledTmdb = shuffleArray([...HOME_ROWS])
  const tmdbRows = []
  for (const rowConfig of shuffledTmdb) {
    const row = await buildHomeRow(rowConfig.title, rowConfig.path)
    tmdbRows.push(row)
  }

  // Combine: first 2 = TMDB rows, rest = mixed TMDB + anime
  // Strategy: pick 2 TMDB rows for top, then shuffle remaining TMDB + anime for bottom
  const topTwo = tmdbRows.slice(0, 2)
  const remaining = shuffleArray([...tmdbRows.slice(2), ...animeRows])

  // Append in order
  topTwo.forEach(r => dom.homeRows.appendChild(r))
  remaining.forEach(r => dom.homeRows.appendChild(r))
}

// Fisher-Yates shuffle
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ═══════════════════════════════════════
// CONTINUE WATCHING ROW
// ═══════════════════════════════════════

function buildContinueWatchingRow(items) {
  const row = document.createElement('div')
  row.className = CLASSES.HOME_ROW

  row.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">Continue Watching</h2>
      <div class="row-nav-btns">
        <button class="nav-btn prev" aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="nav-btn next" aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="row-content"></div>
  `

  const contentEl = row.querySelector('.row-content')
  const prevBtn = row.querySelector('.prev')
  const nextBtn = row.querySelector('.next')

  items.forEach(item => {
    const card = buildContinueWatchingCard(item)
    contentEl.appendChild(card)
  })

  setupRowNavigation(contentEl, prevBtn, nextBtn)

  return row
}

function buildContinueWatchingCard(item) {
  const isTV = item.media_type === 'tv'
  const isAnime = item.media_type === 'anime'
  const title = item.title || item.name || 'Untitled'

  // Handle poster: AniList returns full URLs, TMDB returns relative paths
  const isFullUrl = (p) => p && p.startsWith('http')
  const rawPoster = item.poster_path
  const poster = isFullUrl(rawPoster)
    ? rawPoster
    : (rawPoster ? `${IMG_BASE}/w342${rawPoster}` : null)

  const progress = item.progress || 0

  const card = document.createElement('div')
  card.className = CLASSES.RESULT_CARD
  card.dataset.id = item.id
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
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
    </div>
    <div class="result-info">
      <div class="type-pill">${isAnime ? `E${item.episode || 1}` : (isTV ? `S${item.season}E${item.episode}` : 'Movie')}</div>
      <div class="result-title">${escHtml(title)}</div>
    </div>
  `

  // Remove button
  card.querySelector('.remove-watching-btn').addEventListener('click', (e) => {
    e.stopPropagation()
    removeFromContinueWatching(item.id)
    card.style.transform = 'scale(0.8)'
    card.style.opacity = '0'
    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
    setTimeout(() => card.remove(), 300)
  })

  // Click to resume
  card.addEventListener('click', () => {
    if (isAnime) {
      // For anime, set pending resume and open detail
      const epIdx = (item.episode || 1) - 1 // Convert 1-based to 0-based
      state.pendingAnimeResume = { episodeIndex: epIdx, title }
      onOpenAnime(item.tmdbId || item.id)
    } else if (isTV && item.season && item.episode) {
      // Navigate to detail then season — always use raw tmdbId
      onOpenDetail(item.tmdbId, 'tv')
    } else {
      // For movies — always use raw tmdbId
      onOpenDetail(item.tmdbId, 'movie')
    }
  })

  return card
}

// ═══════════════════════════════════════
// REFRESH CONTINUE WATCHING ROW
// ═══════════════════════════════════════

export function refreshContinueWatchingRow() {
  const watching = getContinueWatching()

  if (watching.length === 0) {
    // Remove the row if it exists
    if (continueWatchingRow && continueWatchingRow.parentNode) {
      continueWatchingRow.remove()
    }
    continueWatchingRow = null
  } else if (continueWatchingRow) {
    // Row exists and has items — just update in place
    // (individual item removal is handled by the card's own animation)
  } else {
    // Row doesn't exist but we have items — rebuild it
    // Insert before the first home row
    const firstHomeRow = dom.homeRows.querySelector(`.${CLASSES.HOME_ROW}`)
    continueWatchingRow = buildContinueWatchingRow(watching)
    if (firstHomeRow) {
      dom.homeRows.insertBefore(continueWatchingRow, firstHomeRow)
    } else {
      dom.homeRows.appendChild(continueWatchingRow)
    }
  }
}

async function buildHomeRow(title, path) {
  const row = document.createElement('div')
  row.className = CLASSES.HOME_ROW

  row.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${escHtml(title)}</h2>
      <div class="row-nav-btns">
        <button class="nav-btn prev" aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="nav-btn next" aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="row-content"></div>
  `

  const contentEl = row.querySelector('.row-content')
  const prevBtn = row.querySelector('.prev')
  const nextBtn = row.querySelector('.next')

  // PERFORMANCE: Lazy load row data with IntersectionObserver
  row._loadRowData = async () => {
    // Show skeleton placeholders
    for (let i = 0; i < SKELETON_COUNT_HOME; i++) {
      contentEl.appendChild(buildSkeletonCard())
    }

    try {
      const data = await tmdb(path)
      const items = data.results.filter(r => r.poster_path || r.backdrop_path)

      contentEl.innerHTML = '' // Clear skeletons

      if (items.length > 0) {
        items.forEach(item => {
          if (!item.media_type) {
            if (path.includes('/movie')) item.media_type = 'movie'
            else if (path.includes('/tv')) item.media_type = 'tv'
          }
          contentEl.appendChild(buildResultCard(item, true))
        })

        setupRowPrefetching(contentEl)
      } else {
        contentEl.innerHTML = '<span style="color:var(--text-3);padding:0 12px">No results</span>'
        row.querySelector('.row-nav-btns').style.display = 'none'
      }

      setupRowNavigation(contentEl, prevBtn, nextBtn)

    } catch (e) {
      console.error(`Error loading row ${title}`, e)
      contentEl.innerHTML = '<span style="color:var(--text-3);padding:0 12px">Failed to load</span>'
    }
  }

  // Observe for lazy loading
  rowObserver.observe(row)

  return row
}

function setupRowPrefetching(contentEl) {
  const cards = contentEl.querySelectorAll(`.${CLASSES.RESULT_CARD}`)
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const img = card.querySelector('img')
      if (img && img.src) {
        const allImages = Array.from(contentEl.querySelectorAll(`.${CLASSES.RESULT_CARD} img`))
        const idx = allImages.indexOf(img)
        for (let i = idx; i < Math.min(idx + 3, allImages.length); i++) {
          prefetchImage(allImages[i].src)
        }
      }
    }, { passive: true })
  })
}

// ═══════════════════════════════════════
// ANIME HOME ROWS
// ═══════════════════════════════════════

async function buildAnimeHomeRow(title, fetchFn) {
  const row = document.createElement('div')
  row.className = CLASSES.HOME_ROW

  row.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${escHtml(title)}</h2>
      <div class="row-nav-btns">
        <button class="nav-btn prev" aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="nav-btn next" aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="row-content"></div>
  `

  const contentEl = row.querySelector('.row-content')
  const prevBtn = row.querySelector('.prev')
  const nextBtn = row.querySelector('.next')

  row._loadRowData = async () => {
    for (let i = 0; i < SKELETON_COUNT_HOME; i++) {
      contentEl.appendChild(buildSkeletonCard())
    }

    try {
      const items = await fetchFn()

      contentEl.innerHTML = ''

      if (items.length > 0) {
        items.forEach(item => {
          contentEl.appendChild(buildResultCard(item, true))
        })
        setupRowPrefetching(contentEl)
      } else {
        contentEl.innerHTML = '<span style="color:var(--text-3);padding:0 12px">No results</span>'
        row.querySelector('.row-nav-btns').style.display = 'none'
      }

      setupRowNavigation(contentEl, prevBtn, nextBtn)
    } catch (e) {
      console.error(`Error loading anime row ${title}`, e)
      const isRateLimit = e.message && e.message.includes('429')
      const msg = isRateLimit
        ? 'Rate limited. Refresh the page to try again.'
        : 'Failed to load anime data. Check your connection and refresh.'
      contentEl.innerHTML = `<span style="color:var(--text-3);padding:0 12px">${msg}</span>`
      row.querySelector('.row-nav-btns').style.display = 'none'
    }
  }

  rowObserver.observe(row)
  return row
}

function setupRowNavigation(contentEl, prevBtn, nextBtn) {
  const scrollAmount = () => contentEl.clientWidth * 0.8
  prevBtn.addEventListener('click', () => {
    contentEl.scrollBy({ left: -scrollAmount(), behavior: 'smooth' })
  })
  nextBtn.addEventListener('click', () => {
    contentEl.scrollBy({ left: scrollAmount(), behavior: 'smooth' })
  })

  const checkScroll = () => {
    prevBtn.style.opacity = contentEl.scrollLeft <= 10 ? '0.3' : '1'
    nextBtn.style.opacity = (contentEl.scrollLeft + contentEl.clientWidth >= contentEl.scrollWidth - 10) ? '0.3' : '1'
  }
  contentEl.addEventListener('scroll', checkScroll)
  window.addEventListener('resize', checkScroll)
  setTimeout(checkScroll, 500)
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

export function setupSearch() {
  let searchTimeout = null

  const handleInput = debounce((q) => {
    if (!q) {
      dom.searchResults.classList.add(CLASSES.HIDDEN)
      dom.homeRows.classList.remove(CLASSES.HIDDEN)
      dom.heroText.classList.remove(CLASSES.HIDDEN)
      return
    }
    doSearch(q, 1)
  }, SEARCH_DEBOUNCE_MS)

  dom.searchInput.addEventListener('input', () => {
    const q = dom.searchInput.value.trim()
    dom.clearBtn.classList.toggle('visible', q.length > 0)
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => handleInput(q), 50)
  })

  dom.clearBtn.addEventListener('click', () => {
    dom.searchInput.value = ''
    dom.clearBtn.classList.remove('visible')
    dom.searchResults.classList.add(CLASSES.HIDDEN)
    dom.homeRows.classList.remove(CLASSES.HIDDEN)
    dom.heroText.classList.remove(CLASSES.HIDDEN)
    dom.resultsGrid.innerHTML = ''
    dom.searchInput.focus()
  })

  dom.loadMoreBtn.addEventListener('click', () => {
    doSearch(state.searchQuery, state.searchPage + 1, true)
  })
}

async function doSearch(query, page = 1, append = false) {
  if (!append) {
    // Save focus to restore after view transition
    const focusedEl = document.activeElement
    onShowView('home')
    // Restore focus to search input if it had focus before
    if (focusedEl === dom.searchInput) {
      requestAnimationFrame(() => dom.searchInput.focus({ preventScroll: true }))
    }
    dom.resultsGrid.innerHTML = ''
    for (let i = 0; i < SKELETON_COUNT_SEARCH; i++) {
      dom.resultsGrid.appendChild(buildSkeletonCard())
    }
    dom.searchResults.classList.remove(CLASSES.HIDDEN)
    dom.homeRows.classList.add(CLASSES.HIDDEN)
    dom.heroText.classList.add(CLASSES.HIDDEN)
  }
  state.searchQuery = query
  state.searchPage = page

  try {
    // Search both TMDB and AniList in parallel
    const [tmdbResult, animeResult] = await Promise.allSettled([
      tmdb('/search/multi', { query, page, include_adult: false }),
      searchAnimeFromAnilist(query, page),
    ])

    let tmdbItems = []
    let animeItems = []
    let totalResults = 0

    // Process TMDB results
    if (tmdbResult.status === 'fulfilled') {
      const data = tmdbResult.value
      tmdbItems = data.results.filter(r => r.media_type !== 'person' && (r.poster_path || r.backdrop_path))
      totalResults += data.total_results
    }

    // Process AniList results
    if (animeResult.status === 'fulfilled') {
      animeItems = animeResult.value.results
      totalResults += animeResult.value.total
    }

    if (!append) {
      dom.resultsGrid.innerHTML = ''
      dom.resultsTitle.textContent = `"${escHtml(query)}"`
      dom.resultsCount.textContent = `${totalResults.toLocaleString()} results`
    }

    // Combine and render results (TMDB first, then anime)
    const allItems = [...tmdbItems, ...animeItems]
    allItems.forEach(item => {
      dom.resultsGrid.appendChild(buildResultCard(item, true))
    })

    // Show load more if either source has more
    const tmdbHasMore = tmdbResult.status === 'fulfilled' && tmdbResult.value.total_pages > page
    const animeHasMore = animeResult.status === 'fulfilled' && animeResult.value.hasNextPage
    dom.loadMore.classList.toggle(CLASSES.HIDDEN, !tmdbHasMore && !animeHasMore && allItems.length === 0)

  } catch (e) {
    console.error(e)
    showSearchError()
  }
}

function showSearchError() {
  dom.resultsGrid.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:32px">Failed to load results. Please try again.</p>'
}

// ═══════════════════════════════════════
// ANIME SEARCH
// ═══════════════════════════════════════

export async function searchAnime(query, page = 1, append = false) {
  if (!append) {
    const focusedEl = document.activeElement
    onShowView('home')
    if (focusedEl === dom.searchInput) {
      requestAnimationFrame(() => dom.searchInput.focus({ preventScroll: true }))
    }
    dom.resultsGrid.innerHTML = ''
    for (let i = 0; i < SKELETON_COUNT_SEARCH; i++) {
      dom.resultsGrid.appendChild(buildSkeletonCard())
    }
    dom.searchResults.classList.remove(CLASSES.HIDDEN)
    dom.homeRows.classList.add(CLASSES.HIDDEN)
    dom.heroText.classList.add(CLASSES.HIDDEN)
  }

  state.searchQuery = query
  state.searchPage = page

  try {
    const result = await searchAnimeFromAnilist(query, page)
    state.searchTotal = result.total

    if (!append) {
      dom.resultsGrid.innerHTML = ''
      dom.resultsTitle.textContent = `"${escHtml(query)}"`
      dom.resultsCount.textContent = `${result.total.toLocaleString()} anime results`
    }

    result.results.forEach(item => {
      dom.resultsGrid.appendChild(buildResultCard(item, true))
    })

    dom.loadMore.classList.toggle(CLASSES.HIDDEN, !result.hasNextPage || result.results.length === 0)

  } catch (e) {
    console.error(e)
    showSearchError()
  }
}

// ═══════════════════════════════════════
// FAVORITES VIEW
// ═══════════════════════════════════════

export function openFavs() {
  dom.favsGrid.innerHTML = ''
  const favs = Object.values(getFavorites())

  if (favs.length === 0) {
    dom.favsGrid.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:64px 0">Your watchlist is empty.<br>Add movies and series to keep track.</p>'
    onShowView('favs')
    return
  }

  favs.forEach(item => {
    const card = buildResultCard(item)
    // Hide the heart button in watchlist view (X button is enough)
    const heartBtn = card.querySelector(`.${CLASSES.FAV_BTN}`)
    if (heartBtn) heartBtn.style.display = 'none'

    // Add remove button for watchlist view
    const removeBtn = document.createElement('button')
    removeBtn.className = 'remove-btn'
    removeBtn.setAttribute('aria-label', 'Remove from watchlist')
    removeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      removeFromFavorites(item.id)
      card.style.transform = 'scale(0.8) opacity(0)'
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      setTimeout(() => card.remove(), 300)
    })
    card.style.position = 'relative'
    card.appendChild(removeBtn)
    dom.favsGrid.appendChild(card)
  })
  onShowView('favs')
}

export function goHome() {
  if (document.startViewTransition) {
    try {
      document.startViewTransition(() => {
        clearSearchState()
      })
    } catch {
      // Suppress AbortError during rapid navigation
    }
  } else {
    clearSearchState()
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function clearSearchState() {
  dom.searchInput.value = ''
  dom.clearBtn.classList.remove('visible')
  dom.searchResults.classList.add(CLASSES.HIDDEN)
  dom.homeRows.classList.remove(CLASSES.HIDDEN)
  dom.heroText.classList.remove(CLASSES.HIDDEN)
  dom.resultsGrid.innerHTML = ''
  state.searchQuery = ''
}

// ═══════════════════════════════════════
// ANIME DETAIL VIEW
// ═══════════════════════════════════════

export async function openAnime(id) {
  setLoading(true)
  state.currentAnimeId = id

  // Clear TV/movie state to prevent cross-contamination
  state.currentSerieId = null
  state.currentSerieType = null
  state.currentEpisodes = []
  state.currentEpIndex = null

  try {
    const data = await getAnimeDetail(id)
    showAnimeDetail(data)
    onShowView('detail')

    // Check if there's a pending anime resume (from Continue Watching)
    if (state.pendingAnimeResume) {
      const { episodeIndex, title } = state.pendingAnimeResume
      state.pendingAnimeResume = null
      // Small delay to let the DOM render
      requestAnimationFrame(() => {
        onOpenAnimeEpisodes(title)
        requestAnimationFrame(() => {
          onOpenAnimeEpisode(episodeIndex, title)
        })
      })
    }
  } catch (e) {
    console.error(e)
    showDetailError(e)
  } finally {
    setLoading(false)
  }
}

function showAnimeDetail(data) {
  dom.detailTitle.textContent = data.title
  dom.detailType.textContent = 'Anime'
  dom.detailType.classList.remove(CLASSES.HIDDEN)
  state.currentPosterPath = data.posterUrl

  setDetailTitle(data.title)

  const poster = data.posterUrl || null
  const year = data.year || ''
  const rating = data.rating ? `★ ${data.rating}` : ''
  const genres = (data.genres || []).join(' · ')
  const episodes = data.episodes || 0
  const format = data.format || 'TV'
  const studios = (data.studios || []).join(', ')

  // Store anime data for episodes view
  state._currentAnimeData = data

  dom.detailContent.innerHTML = `
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

  // Browse episodes button
  const watchBtn = document.getElementById('watchAnimeBtn')
  if (watchBtn) {
    watchBtn.addEventListener('click', () => {
      onOpenAnimeEpisodes(data.title)
    })
  }

  // Favorite button
  document.getElementById('favAnimeBtn').addEventListener('click', (e) => {
    const isNowFav = toggleFavorite({
      id: data.id,
      title: data.title,
      poster_path: data.posterUrl,
      posterUrl: data.posterUrl,
      media_type: 'anime'
    })
    e.target.textContent = isNowFav ? '♥ Favorited' : '♥ Add to Watchlist'
    showToast(
      isNowFav ? `Added "${data.title}" to watchlist` : `Removed "${data.title}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })
}

// ═══════════════════════════════════════
// ANIME EPISODES VIEW
// ═══════════════════════════════════════

export async function openAnimeEpisodes(title) {
  const data = state._currentAnimeData
  if (!data) return

  // Clear TV episodes to prevent cross-contamination
  state.currentEpisodes = []
  state.currentEpIndex = null

  dom.episodesTitle.textContent = `${escHtml(title)} · All Episodes`
  setEpisodesTitle(title, 1)

  const totalEpisodes = data.episodes || 0
  const airingSchedule = data.airingSchedule || []
  const now = Math.floor(Date.now() / 1000) // Current time in Unix seconds

  // Build episode list, only include episodes that have aired
  const episodeList = []
  for (let i = 1; i <= totalEpisodes; i++) {
    // Check if this episode has aired: find its airingAt time
    const schedule = airingSchedule.find(s => s.episode === i)
    if (schedule) {
      // Has airing info - only include if already aired
      if (schedule.airingAt <= now) {
        episodeList.push({ number: i, name: `Episode ${i}` })
      }
    } else {
      // No airing info - assume already aired (finished anime)
      episodeList.push({ number: i, name: `Episode ${i}` })
    }
  }
  state.currentAnimeEpisodes = episodeList

  dom.episodesContent.innerHTML = ''
  if (episodeList.length === 0) {
    dom.episodesContent.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:48px 0">No episodes available yet. Check back later!</p>'
  } else {
    episodeList.forEach((ep, idx) => {
      dom.episodesContent.appendChild(buildAnimeEpisodeItem(ep, idx, data))
    })
  }

  onShowView('episodes')
}

function buildAnimeEpisodeItem(ep, idx, data) {
  const item = document.createElement('div')
  const isCurrentEp = state.currentAnimeEpIndex === idx
  item.className = `${CLASSES.EPISODE_ITEM}${isCurrentEp ? ' current-episode' : ''}`

  // Use anime poster or banner as thumbnail background
  const bgImage = data.posterUrl || data.banner_path || null

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

// ═══════════════════════════════════════
// DETAIL VIEW (Series / Movies)
// ═══════════════════════════════════════

export async function openDetail(id, type) {
  setLoading(true)
  state.currentSerieId = id
  state.currentSerieType = type

  // Clear anime state to prevent cross-contamination
  state.currentAnimeId = null
  state.currentAnimeEpisodes = []
  state.currentAnimeEpIndex = null
  state._currentAnimeData = null

  try {
    // Fetch main data + cast + similar in parallel
    const [mainData, castData, similarData] = await Promise.all([
      tmdb(`/${type}/${id}`),
      tmdb(`/${type}/${id}/credits`),
      tmdb(`/${type}/${id}/similar`),
    ])

    // Store for later use
    state._castData = castData.cast?.slice(0, 12) || []
    state._similarData = similarData.results || []

    if (type === 'tv') {
      showSeriesDetail(mainData)
    } else {
      showMovieDetail(mainData)
    }
    onShowView('detail')
  } catch (e) {
    console.error(e)
    showDetailError(e)
  } finally {
    setLoading(false)
  }
}

function showSeriesDetail(data) {
  dom.detailTitle.textContent = data.name
  dom.detailType.textContent = 'Series'
  dom.detailType.classList.remove(CLASSES.HIDDEN)
  state.currentPosterPath = data.poster_path

  // SEO
  setDetailTitle(data.name)
  updateJsonLd('tv', data)

  const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null
  const year = (data.first_air_date || '').slice(0, 4)
  const rating = data.vote_average ? `★ ${data.vote_average.toFixed(1)}` : ''
  const genres = (data.genres || []).map(g => g.name).join(' · ')
  const seasons = (data.seasons || []).filter(s => s.season_number > 0)
  const totalEpisodes = data.number_of_episodes || seasons.reduce((sum, s) => sum + s.episode_count, 0)
  const cast = state._castData
  const similar = state._similarData

  dom.detailContent.innerHTML = `
    <div class="movie-detail">
      <div class="movie-poster">
        ${poster ? `<img src="${poster}" alt="${escHtml(data.name)}" />` : '<div class="no-poster" style="height:360px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--glass-bg)">🎬</div>'}
      </div>
      <div class="movie-info">
        <h1 class="movie-title">${escHtml(data.name)}</h1>
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
            Browse seasons
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
          ${cast.slice(0, 8).map(c => `
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

  document.getElementById('watchSeriesBtn').addEventListener('click', () => {
    if (seasons.length > 0) {
      onOpenSeason(seasons[0].season_number, data.name)
    }
  })

  document.getElementById('favSeriesBtn').addEventListener('click', (e) => {
    const isNowFav = toggleFavorite({ id: data.id, title: data.name, poster_path: data.poster_path, media_type: 'tv' })
    e.target.textContent = isNowFav ? '♥ Favorited' : '♥ Add to Watchlist'
    showToast(
      isNowFav ? `Added "${data.name}" to watchlist` : `Removed "${data.name}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })

  const grid = document.getElementById('seasonsGrid')
  seasons.forEach(s => {
    const poster = s.poster_path ? `${IMG_BASE}/w342${s.poster_path}` : null
    const card = document.createElement('div')
    card.className = CLASSES.SEASON_CARD
    card.innerHTML = `
      ${poster ? `<img src="${poster}" alt="T${s.season_number}" loading="lazy" />` : ''}
      <div class="season-label">Season ${s.season_number}</div>
    `
    card.addEventListener('click', () => onOpenSeason(s.season_number, data.name))
    grid.appendChild(card)
  })

  // Similar titles
  if (similar.length > 0) {
    appendSimilarRow(similar, 'More Like This')
  }
}

function showMovieDetail(data) {
  dom.detailTitle.textContent = data.title
  dom.detailType.textContent = 'Movie'
  state.currentPosterPath = data.poster_path

  // SEO
  setDetailTitle(data.title)
  updateJsonLd('movie', data)

  const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null
  const year = (data.release_date || '').slice(0, 4)
  const runtime = data.runtime ? `${data.runtime} min` : ''
  const rating = data.vote_average ? `★ ${data.vote_average.toFixed(1)}` : ''
  const genres = (data.genres || []).map(g => g.name).join(' · ')
  const cast = state._castData
  const similar = state._similarData

  dom.detailContent.innerHTML = `
    <div class="movie-detail">
      <div class="movie-poster">
        ${poster ? `<img src="${poster}" alt="${escHtml(data.title)}" />` : '<div class="no-poster" style="height:360px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--glass-bg)">🎬</div>'}
      </div>
      <div class="movie-info">
        <h1 class="movie-title">${escHtml(data.title)}</h1>
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
          ${cast.slice(0, 8).map(c => `
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

  document.getElementById('watchMovieBtn').addEventListener('click', () => {
    playMovie(data.id, data.title)
  })

  document.getElementById('favMovieBtn').addEventListener('click', (e) => {
    const isNowFav = toggleFavorite({ id: data.id, title: data.title, poster_path: data.poster_path, media_type: 'movie' })
    e.target.textContent = isNowFav ? '♥ Favorited' : '♥ Add to Watchlist'
    showToast(
      isNowFav ? `Added "${data.title}" to watchlist` : `Removed "${data.title}" from watchlist`,
      isNowFav ? 'success' : 'info'
    )
  })

  // Similar titles
  if (similar.length > 0) {
    appendSimilarRow(similar, 'More Like This')
  }
}

function showDetailError(e) {
  dom.detailContent.innerHTML = `<p style="color:var(--accent);padding:24px">Error loading content: ${escHtml(e.message)}. Check your connection or TMDB token.</p>`
}

// ═══════════════════════════════════════
// HELPERS — Similar
// ═══════════════════════════════════════

function appendSimilarRow(items, title) {
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
  dom.detailContent.appendChild(section)
}

// ═══════════════════════════════════════
// EPISODES VIEW
// ═══════════════════════════════════════

export async function openSeason(seasonNum, serieName) {
  setLoading(true)
  state.currentSeason = seasonNum
  dom.episodesTitle.textContent = `${escHtml(serieName)} · Season ${seasonNum}`

  // Clear anime state to prevent cross-contamination
  state.currentAnimeId = null
  state.currentAnimeEpisodes = []
  state.currentAnimeEpIndex = null

  // Update page title
  setEpisodesTitle(serieName, seasonNum)

  try {
    const data = await tmdb(`/tv/${state.currentSerieId}/season/${seasonNum}`)
    const episodes = data.episodes || []
    state.currentEpisodes = episodes

    dom.episodesContent.innerHTML = ''
    episodes.forEach((ep, idx) => {
      dom.episodesContent.appendChild(buildEpisodeItem(ep, idx))
    })

    onShowView('episodes')
  } catch (e) {
    console.error(e)
    dom.episodesContent.innerHTML = '<p style="color:var(--accent);padding:24px">Failed to load episodes.</p>'
  } finally {
    setLoading(false)
  }
}

function buildEpisodeItem(ep, idx) {
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
  item.addEventListener('click', () => onLoadMore(idx, dom.episodesTitle.textContent.split(' · ')[0]))
  return item
}

// ═══════════════════════════════════════
// FAV ICON UPDATER
// ═══════════════════════════════════════

export function updateAllFavIcons() {
  document.querySelectorAll(`.${CLASSES.RESULT_CARD}`).forEach(card => {
    const id = card.dataset.id
    if (id) {
      const isFav = isFavorite(id)
      const btn = card.querySelector(`.${CLASSES.FAV_BTN}`)
      if (btn) btn.classList.toggle(CLASSES.FAV_ACTIVE, isFav)
    }
  })
}

// ═══════════════════════════════════════
// PARALLAX
// ═══════════════════════════════════════

export function setupParallax() {
  const orbs = document.querySelector('.bg-orbs')
  const handleParallax = throttle((e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20
    const y = (e.clientY / window.innerHeight - 0.5) * 20
    requestAnimationFrame(() => {
      orbs.style.transform = `translate(${-x}px, ${-y}px)`
    })
  }, 16)

  window.addEventListener('mousemove', handleParallax, { passive: true })
}
