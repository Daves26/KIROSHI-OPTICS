// ═══════════════════════════════════════
// ANILIST API — GraphQL queries for anime
// ═══════════════════════════════════════

const ANILIST_API = 'https://graphql.anilist.co'

// GraphQL queries
const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media(search: $search, type: ANIME, sort: $sort, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      bannerImage
      episodes
      season
      seasonYear
      format
      status
      averageScore
      genres
      description
      isAdult
    }
  }
}`

const TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
    }
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      bannerImage
      episodes
      season
      seasonYear
      format
      status
      averageScore
      genres
      description
    }
  }
}`

const POPULAR_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
    }
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      bannerImage
      episodes
      season
      seasonYear
      format
      status
      averageScore
      genres
      description
    }
  }
}`

const TOP_RATED_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
    }
    media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      bannerImage
      episodes
      season
      seasonYear
      format
      status
      averageScore
      genres
      description
    }
  }
}`

const MEDIA_DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      large
      medium
    }
    bannerImage
    episodes
    season
    seasonYear
    format
    status
    averageScore
    genres
    description(asHtml: false)
    airingSchedule(notYetAired: false) {
      nodes {
        episode
        airingAt
      }
    }
    studios(isMain: true) {
      nodes {
        name
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
          format
        }
      }
    }
    recommendations {
      nodes {
        mediaRecommendation {
          id
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
          format
        }
      }
    }
  }
}`

// Cache
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes
const CACHE_KEY = 'kiroshi_anilist_cache'

function getCached(key) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${key}`)
    if (!raw) return null
    const { data, expires } = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(`${CACHE_KEY}_${key}`)
      return null
    }
    return data
  } catch { return null }
}

function setCache(key, data) {
  try {
    const item = { data, expires: Date.now() + CACHE_TTL }
    localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(item))
  } catch { /* quota exceeded */ }
}

// API call helper with retry
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500

async function anilistQuery(query, variables = {}, retries = 0) {
  const cacheKey = JSON.stringify({ query, variables })

  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!res.ok) {
      if (res.status === 429 && retries < MAX_RETRIES) {
        // Rate limited - retry with delay
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (retries + 1)))
        return anilistQuery(query, variables, retries + 1)
      }
      throw new Error(`AniList API error: ${res.status}`)
    }

    const json = await res.json()
    if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error')

    setCache(cacheKey, json.data)
    return json.data
  } catch (err) {
    // Network error - retry
    if (retries < MAX_RETRIES && (err.name === 'TypeError' || err.message.includes('fetch'))) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (retries + 1)))
      return anilistQuery(query, variables, retries + 1)
    }
    throw err
  }
}

// Public API functions
export async function searchAnime(query, page = 1, perPage = 20) {
  const data = await anilistQuery(SEARCH_QUERY, {
    search: query,
    page,
    perPage,
    sort: ['TRENDING_DESC'],
  })

  const pageInfo = data.Page.pageInfo
  const items = data.Page.media.map(normalizeAnime)

  return {
    results: items,
    total: pageInfo.total,
    page: pageInfo.currentPage,
    totalPages: pageInfo.lastPage,
    hasNextPage: pageInfo.hasNextPage,
  }
}

export async function getTrendingAnime(page = 1, perPage = 20) {
  const data = await anilistQuery(TRENDING_QUERY, { page, perPage })
  return data.Page.media.map(normalizeAnime)
}

export async function getPopularAnime(page = 1, perPage = 20) {
  const data = await anilistQuery(POPULAR_QUERY, { page, perPage })
  return data.Page.media.map(normalizeAnime)
}

export async function getTopRatedAnime(page = 1, perPage = 20) {
  const data = await anilistQuery(TOP_RATED_QUERY, { page, perPage })
  return data.Page.media.map(normalizeAnime)
}

export async function getAnimeDetail(id) {
  const data = await anilistQuery(MEDIA_DETAIL_QUERY, { id })
  return normalizeAnimeDetail(data.Media)
}

// Normalize AniList response to our format
function normalizeAnime(media) {
  const title = media.title.english || media.title.romaji || 'Unknown'
  const nativeTitle = media.title.native || ''
  const format = media.format || 'TV'
  const isMovie = format === 'MOVIE'
  const episodes = media.episodes || 0

  return {
    id: media.id,
    title,
    nativeTitle,
    media_type: 'anime',
    format,
    episodes: isMovie ? 1 : episodes,
    season: media.seasonYear || '',
    year: media.seasonYear || '',
    rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
    score: media.averageScore,
    genres: media.genres || [],
    poster_path: media.coverImage?.large || media.coverImage?.medium || null,
    banner_path: media.bannerImage || null,
    overview: media.description ? stripHtml(media.description) : '',
    status: media.status,
    // For VidEasy compatibility
    posterUrl: media.coverImage?.large || media.coverImage?.medium || null,
  }
}

function normalizeAnimeDetail(media) {
  const normalized = normalizeAnime(media)
  
  // Add studios
  normalized.studios = media.studios?.nodes?.map(s => s.name) || []
  
  // Add airing schedule (for filtering unreleased episodes)
  normalized.airingSchedule = media.airingSchedule?.nodes?.map(node => ({
    episode: node.episode,
    airingAt: node.airingAt, // Unix timestamp
  })) || []
  
  // Add relations (sequels, prequels, etc.)
  normalized.relations = media.relations?.edges?.map(edge => ({
    relationType: edge.relationType,
    id: edge.node.id,
    title: edge.node.title.english || edge.node.title.romaji,
    poster: edge.node.coverImage?.medium,
    format: edge.node.format,
  })) || []
  
  // Add recommendations
  normalized.recommendations = media.recommendations?.nodes
    ?.filter(n => n.mediaRecommendation)
    ?.map(n => ({
      id: n.mediaRecommendation.id,
      title: n.mediaRecommendation.title.english || n.mediaRecommendation.title.romaji,
      poster: n.mediaRecommendation.coverImage?.medium,
      format: n.mediaRecommendation.format,
    })) || []
  
  return normalized
}

// Utility: strip HTML tags from AniList descriptions
function stripHtml(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

// Clear AniList cache
export function clearAnilistCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
  keys.forEach(k => localStorage.removeItem(k))
}
