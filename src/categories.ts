import { ANIME_ROWS, HOME_ROWS } from './constants.js'
import { tmdb } from './api.js'
import { getPopularAnimePage, getTrendingAnimePage } from './anilist.js'
import type { NormalizedAnime, TmdbMedia, TmdbSearchResponse } from './types.js'

export type CategoryItem = TmdbMedia | NormalizedAnime
export type Category =
  | { id: string; title: string; provider: 'tmdb'; path: string }
  | { id: string; title: string; provider: 'anilist' }

export const CATEGORIES: ReadonlyArray<Category> = [
  ...HOME_ROWS.map(row => ({ ...row, provider: 'tmdb' as const })),
  ...ANIME_ROWS.map(row => ({ ...row, provider: 'anilist' as const })),
]

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find(category => category.id === id)
}

export function categoryItemKey(item: CategoryItem): string {
  return `${item.media_type === 'anime' ? 'anilist' : 'tmdb'}:${item.media_type}:${item.id}`
}

export async function fetchCategoryPage(category: Category, page: number): Promise<{ items: CategoryItem[]; hasMore: boolean }> {
  if (category.provider === 'anilist') {
    const data = category.id === 'trending-anime'
      ? await getTrendingAnimePage(page)
      : await getPopularAnimePage(page)
    return { items: data.results.filter(item => !!item.poster_path), hasMore: data.hasNextPage }
  }

  const data = await tmdb<TmdbSearchResponse>(category.path, { page })
  const type = category.path.includes('/tv/') ? 'tv' : 'movie'
  const items: TmdbMedia[] = data.results
    .filter(item => (item.media_type === 'movie' || item.media_type === 'tv' || !item.media_type) && !!(item.poster_path || item.backdrop_path))
    .map(item => ({ ...item, media_type: item.media_type || type }))
  // TMDB paginates catalog endpoints to a maximum of 500 accessible pages.
  return { items, hasMore: page < Math.min(data.total_pages, 500) }
}
