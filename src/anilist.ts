// ═══════════════════════════════════════
// ANILIST API — GraphQL queries for anime
// ═══════════════════════════════════════

import type {
  AniListMedia,
  AniListSearchResponse,
  AniListPageInfo,
  AniListAiringSchedule,
  AniListRelation,
  AniListRecommendation,
  NormalizedAnime,
  AniListDetailResponse,
} from './types.js'

const ANILIST_API: string = 'https://graphql.anilist.co'

// GraphQL queries
const SEARCH_QUERY: string = `
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

const TRENDING_QUERY: string = `
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

const POPULAR_QUERY: string = `
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

const TOP_RATED_QUERY: string = `
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

const MEDIA_DETAIL_QUERY: string = `
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
const CACHE_TTL: number = 1000 * 60 * 30 // 30 minutes
const CACHE_KEY: string = 'kiroshi_anilist_cache'

interface CacheItem<T = unknown> {
  data: T
  expires: number
}

function getCached<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${key}`)
    if (!raw) return null
    const { data, expires }: CacheItem<T> = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(`${CACHE_KEY}_${key}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

function setCache(key: string, data: unknown): void {
  try {
    const item: CacheItem = { data, expires: Date.now() + CACHE_TTL }
    localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(item))
  } catch {
    // quota exceeded
  }
}

// API call helper with retry
const MAX_RETRIES: number = 2
const RETRY_DELAY_MS: number = 1500

interface GraphQLResponse<T = unknown> {
  data: T
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>
}

async function anilistQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  retries: number = 0
): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables })

  const cached = getCached<T>(cacheKey)
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
        return anilistQuery<T>(query, variables, retries + 1)
      }
      throw new Error(`AniList API error: ${res.status}`)
    }

    const json: GraphQLResponse<T> = await res.json()
    if (json.errors) throw new Error(json.errors[0]?.message ?? 'AniList error')

    setCache(cacheKey, json.data)
    return json.data
  } catch (err: any) {
    // Network error - retry
    if (retries < MAX_RETRIES && (err.name === 'TypeError' || err.message?.includes('fetch'))) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (retries + 1)))
      return anilistQuery<T>(query, variables, retries + 1)
    }
    throw err
  }
}

// Public API functions
export async function searchAnime(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<AniListSearchResponse> {
  const data = await anilistQuery<{ Page: { pageInfo: AniListPageInfo; media: AniListMedia[] } }>(
    SEARCH_QUERY,
    {
      search: query,
      page,
      perPage,
      sort: ['TRENDING_DESC'],
    }
  )

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

export async function getTrendingAnime(page: number = 1, perPage: number = 20): Promise<NormalizedAnime[]> {
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(TRENDING_QUERY, { page, perPage })
  return data.Page.media.map(normalizeAnime)
}

export async function getPopularAnime(page: number = 1, perPage: number = 20): Promise<NormalizedAnime[]> {
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(POPULAR_QUERY, { page, perPage })
  return data.Page.media.map(normalizeAnime)
}

export async function getTopRatedAnime(page: number = 1, perPage: number = 20): Promise<NormalizedAnime[]> {
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(TOP_RATED_QUERY, { page, perPage })
  return data.Page.media.map(normalizeAnime)
}

export async function getAnimeDetail(id: number): Promise<AniListDetailResponse> {
  interface MediaDetailResponse {
    Media: AniListMedia & {
      studios?: { nodes: Array<{ name: string }> }
      airingSchedule?: { nodes: Array<{ episode: number; airingAt: number }> }
      relations?: { edges: Array<{
        relationType: string
        node: {
          id: number
          title: { romaji: string; english: string }
          coverImage?: { medium: string }
          format: string
        }
      }> }
      recommendations?: { nodes: Array<{
        mediaRecommendation?: {
          id: number
          title: { romaji: string; english: string }
          coverImage?: { medium: string }
          format: string
        }
      }> }
    }
  }
  
  const data = await anilistQuery<MediaDetailResponse>(MEDIA_DETAIL_QUERY, { id })
  
  return normalizeAnimeDetail(data.Media)
}

// Normalize AniList response to our format
function normalizeAnime(media: AniListMedia): NormalizedAnime {
  const title: string = media.title.english || media.title.romaji || 'Unknown'
  const nativeTitle: string = media.title.native || ''
  const format: string = media.format || 'TV'
  const isMovie: boolean = format === 'MOVIE'
  const episodes: number = media.episodes ?? 0

  return {
    id: media.id,
    title,
    nativeTitle,
    media_type: 'anime',
    format,
    episodes: isMovie ? 1 : episodes,
    season: String(media.seasonYear ?? ''),
    year: String(media.seasonYear ?? ''),
    rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
    score: media.averageScore ?? null,
    genres: media.genres || [],
    poster_path: media.coverImage?.large ?? media.coverImage?.medium ?? null,
    banner_path: media.bannerImage ?? null,
    overview: media.description ? stripHtml(media.description) : '',
    status: media.status,
    // For VidEasy compatibility
    posterUrl: media.coverImage?.large ?? media.coverImage?.medium ?? null,
  }
}

function normalizeAnimeDetail(media: AniListMedia & {
  studios?: { nodes: Array<{ name: string }> }
  airingSchedule?: { nodes: Array<{ episode: number; airingAt: number }> }
  relations?: { edges: Array<{
    relationType: string
    node: {
      id: number
      title: { romaji: string; english: string }
      coverImage?: { medium: string }
      format: string
    }
  }> }
  recommendations?: { nodes: Array<{
    mediaRecommendation?: {
      id: number
      title: { romaji: string; english: string }
      coverImage?: { medium: string }
      format: string
    }
  }> }
}): AniListDetailResponse {
  const normalized: NormalizedAnime = normalizeAnime(media)

  // Add studios
  const studios: string[] = media.studios?.nodes?.map(s => s.name) ?? []

  // Add airing schedule (for filtering unreleased episodes)
  const airingSchedule: AniListAiringSchedule[] = media.airingSchedule?.nodes?.map(node => ({
    episode: node.episode,
    airingAt: node.airingAt, // Unix timestamp
  })) ?? []

  // Add relations (sequels, prequels, etc.)
  const relations: AniListRelation[] = media.relations?.edges?.map(edge => ({
    relationType: edge.relationType,
    id: edge.node.id,
    title: edge.node.title.english || edge.node.title.romaji,
    poster: edge.node.coverImage?.medium,
    format: edge.node.format,
  })) ?? []

  // Add recommendations
  const recommendations: AniListRecommendation[] = media.recommendations?.nodes
    ?.filter(n => n.mediaRecommendation != null)
    ?.map(n => ({
      id: n.mediaRecommendation!.id,
      title: n.mediaRecommendation!.title.english || n.mediaRecommendation!.title.romaji,
      poster: n.mediaRecommendation!.coverImage?.medium,
      format: n.mediaRecommendation!.format,
    })) ?? []

  return {
    ...normalized,
    studios,
    airingSchedule,
    relations,
    recommendations,
  }
}

// Utility: strip HTML tags from AniList descriptions
function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent ?? tmp.innerText ?? ''
}

// Clear AniList cache
export function clearAnilistCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY))
  keys.forEach(k => localStorage.removeItem(k))
}
