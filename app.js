
const TMDB_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN
const TMDB_BASE  = 'https://api.themoviedb.org/3'
const IMG_BASE   = 'https://image.tmdb.org/t/p'
const EMBED_TV   = 'https://moviesapi.to/tv'
const EMBED_MOV  = 'https://moviesapi.to/movie'

// ── State ─────────────────────────────
const state = {
  currentSerieId:   null,
  currentSerieType: null,
  currentSeason:    null,
  currentEpisodes:  [],
  currentEpIndex:   null,
  searchPage:       1,
  searchQuery:      '',
  searchTotal:      0,
}

// ── DOM refs ──────────────────────────
const views = {
  home:     document.getElementById('homeView'),
  detail:   document.getElementById('detailView'),
  episodes: document.getElementById('episodesView'),
  player:   document.getElementById('playerView'),
}
const searchInput    = document.getElementById('searchInput')
const clearBtn       = document.getElementById('clearBtn')
const searchResults  = document.getElementById('searchResults')
const resultsGrid    = document.getElementById('resultsGrid')
const resultsTitle   = document.getElementById('resultsTitle')
const resultsCount   = document.getElementById('resultsCount')
const loadMore       = document.getElementById('loadMore')
const loadMoreBtn    = document.getElementById('loadMoreBtn')
const loader         = document.getElementById('loader')
const logoBtn        = document.getElementById('logoBtn')
const detailTitle    = document.getElementById('detailTitle')
const detailType     = document.getElementById('detailType')
const detailContent  = document.getElementById('detailContent')
const episodesTitle  = document.getElementById('episodesTitle')
const episodesContent= document.getElementById('episodesContent')
const playerTitle    = document.getElementById('playerTitle')
const playerFrame    = document.getElementById('playerFrame')
const prevEpBtn      = document.getElementById('prevEp')
const nextEpBtn      = document.getElementById('nextEp')

// ── API helper ────────────────────────
async function tmdb(path, params = {}) {
  const url = new URL(TMDB_BASE + path)
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_TOKEN}`
    }
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

// ── View router ───────────────────────
function showView(name) {
  // Si salimos del player, vaciamos el src para cortar audio/video
  if (name !== 'player') playerFrame.src = ''
  Object.values(views).forEach(v => v.classList.remove('active'))
  views[name].classList.add('active')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}


// ── Loader ────────────────────────────
function setLoading(on) {
  loader.classList.toggle('hidden', !on)
}

// ── Home ──────────────────────────────
logoBtn.addEventListener('click', goHome)

function goHome() {
  searchInput.value = ''
  clearBtn.classList.remove('visible')
  searchResults.classList.add('hidden')
  resultsGrid.innerHTML = ''
  state.searchQuery = ''
  showView('home')
}

// Featured cards
document.querySelectorAll('.featured-card').forEach(card => {
  card.addEventListener('click', () => {
    const id   = +card.dataset.id
    const type = card.dataset.type
    openDetail(id, type)
  })
})

// ── Search ────────────────────────────
let searchTimeout = null

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim()
  clearBtn.classList.toggle('visible', q.length > 0)
  clearTimeout(searchTimeout)
  if (!q) {
    searchResults.classList.add('hidden')
    return
  }
  searchTimeout = setTimeout(() => doSearch(q, 1), 380)
})

clearBtn.addEventListener('click', () => {
  searchInput.value = ''
  clearBtn.classList.remove('visible')
  searchResults.classList.add('hidden')
  resultsGrid.innerHTML = ''
  searchInput.focus()
})

loadMoreBtn.addEventListener('click', () => {
  doSearch(state.searchQuery, state.searchPage + 1, true)
})

async function doSearch(query, page = 1, append = false) {
  if (!append) {
    setLoading(true)
    showView('home')
  }
  state.searchQuery = query
  state.searchPage  = page

  try {
    const data = await tmdb('/search/multi', { query, page, include_adult: false })
    state.searchTotal = data.total_results

    const items = data.results.filter(r => r.media_type !== 'person' && (r.poster_path || r.backdrop_path))

    if (!append) {
      resultsGrid.innerHTML = ''
      resultsTitle.textContent = `"${query}"`
      resultsCount.textContent = `${data.total_results.toLocaleString()} results`
      searchResults.classList.remove('hidden')
    }

    items.forEach(item => {
      resultsGrid.appendChild(buildResultCard(item))
    })

    const shown = page * data.results.length
    loadMore.classList.toggle('hidden', data.total_pages <= page || items.length === 0)

  } catch(e) {
    console.error(e)
  } finally {
    setLoading(false)
  }
}

function buildResultCard(item) {
  const isTV = item.media_type === 'tv'
  const title = item.title || item.name || 'Untitled'
  const year  = (item.release_date || item.first_air_date || '').slice(0,4)
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const poster = item.poster_path
    ? `${IMG_BASE}/w342${item.poster_path}`
    : (item.backdrop_path ? `${IMG_BASE}/w500${item.backdrop_path}` : null)

  const card = document.createElement('div')
  card.className = 'result-card'
  card.innerHTML = `
    <div class="result-poster">
      ${poster
        ? `<img src="${poster}" alt="${escHtml(title)}" loading="lazy" />`
        : `<div class="no-poster">🎬</div>`}
    </div>
    <div class="result-info">
      <div class="type-pill">${isTV ? 'Series' : 'Movie'}</div>
      <div class="result-title">${escHtml(title)}</div>
      <div class="result-meta">
        ${year ? `<span class="result-year">${year}</span>` : ''}
        ${rating ? `<span class="result-rating">★ ${rating}</span>` : ''}
      </div>
    </div>
  `
  card.addEventListener('click', () => openDetail(item.id, item.media_type))
  return card
}

// ── Detail: Series / Movies ───────────
async function openDetail(id, type) {
  setLoading(true)
  state.currentSerieId   = id
  state.currentSerieType = type

  try {
    if (type === 'tv') {
      const data = await tmdb(`/tv/${id}`)
      showSeriesDetail(data)
    } else {
      const data = await tmdb(`/movie/${id}`)
      showMovieDetail(data)
    }
    showView('detail')
  } catch(e) {
    console.error(e)
    alert('Error loading content. Check your TMDB token.')
  } finally {
    setLoading(false)
  }
}

function showSeriesDetail(data) {
  detailTitle.textContent = data.name
  detailType.textContent  = 'Series'
  detailType.classList.remove('hidden')

  const seasons = (data.seasons || []).filter(s => s.season_number > 0)

  detailContent.innerHTML = `
    <div class="seasons-grid" id="seasonsGrid"></div>
  `

  const grid = document.getElementById('seasonsGrid')
  seasons.forEach(s => {
    const poster = s.poster_path ? `${IMG_BASE}/w342${s.poster_path}` : null
    const card = document.createElement('div')
    card.className = 'season-card'
    card.innerHTML = `
      ${poster ? `<img src="${poster}" alt="T${s.season_number}" loading="lazy" />` : ''}
      <div class="season-label">Season ${s.season_number}</div>
    `
    card.addEventListener('click', () => openSeason(s.season_number, data.name))
    grid.appendChild(card)
  })
}

function showMovieDetail(data) {
  detailTitle.textContent = data.title
  detailType.textContent  = 'Movie'

  const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : null
  const year   = (data.release_date || '').slice(0,4)
  const runtime = data.runtime ? `${data.runtime} min` : ''
  const rating  = data.vote_average ? `★ ${data.vote_average.toFixed(1)}` : ''
  const genres  = (data.genres || []).map(g => g.name).join(' · ')

  detailContent.innerHTML = `
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
        <button class="watch-btn" id="watchMovieBtn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3l8 5-8 5V3z" fill="white"/>
          </svg>
          Watch now
        </button>
      </div>
    </div>
  `

  document.getElementById('watchMovieBtn').addEventListener('click', () => {
    playMovie(data.id, data.title)
  })
}

// ── Season / Episodes ─────────────────
document.getElementById('backToHome').addEventListener('click', goHome)
document.getElementById('backToSeasons').addEventListener('click', () => {
  showView('detail')
})
document.getElementById('backToEpisodes').addEventListener('click', () => {
  showView('episodes')
  playerFrame.src = ''
})

async function openSeason(seasonNum, serieName) {
  setLoading(true)
  state.currentSeason = seasonNum
  episodesTitle.textContent = `${serieName} · Season ${seasonNum}`

  try {
    const data = await tmdb(`/tv/${state.currentSerieId}/season/${seasonNum}`)
    const episodes = data.episodes || []
    state.currentEpisodes = episodes

    episodesContent.innerHTML = ''
    episodes.forEach((ep, idx) => {
      episodesContent.appendChild(buildEpisodeItem(ep, idx))
    })

    showView('episodes')
  } catch(e) {
    console.error(e)
  } finally {
    setLoading(false)
  }
}

function buildEpisodeItem(ep, idx) {
  const thumb = ep.still_path ? `${IMG_BASE}/w300${ep.still_path}` : null
  const item = document.createElement('div')
  item.className = 'episode-item'
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
  item.addEventListener('click', () => playEpisode(idx))
  return item
}

// ── Player ────────────────────────────
function playEpisode(idx) {
  state.currentEpIndex = idx
  const ep = state.currentEpisodes[idx]
  const url = `${EMBED_TV}/${state.currentSerieId}-${state.currentSeason}-${ep.episode_number}`

  playerTitle.textContent = `T${state.currentSeason} E${ep.episode_number} – ${ep.name}`
  playerFrame.src = url

  prevEpBtn.disabled = idx === 0
  nextEpBtn.disabled = idx === state.currentEpisodes.length - 1

  showView('player')
}

function playMovie(id, title) {
  const url = `${EMBED_MOV}/${id}`
  playerTitle.textContent = title
  playerFrame.src = url
  state.currentEpisodes = []
  state.currentEpIndex  = null
  prevEpBtn.disabled = true
  nextEpBtn.disabled = true
  showView('player')
}

prevEpBtn.addEventListener('click', () => {
  if (state.currentEpIndex > 0) playEpisode(state.currentEpIndex - 1)
})
nextEpBtn.addEventListener('click', () => {
  if (state.currentEpIndex < state.currentEpisodes.length - 1)
    playEpisode(state.currentEpIndex + 1)
})

// ── Utils ─────────────────────────────
function escHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
