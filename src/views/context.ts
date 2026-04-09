import type { DomRefs, ViewCallbacks } from '../types.js'

// Shared references across view modules
export let dom: Partial<DomRefs> = {}
export let rowObserver: IntersectionObserver
export let onShowView: ViewCallbacks['onShowView']
export let onOpenDetail: ViewCallbacks['onOpenDetail']
export let onOpenSeason: ViewCallbacks['onOpenSeason']
export let onLoadMore: ViewCallbacks['onLoadMore']
export let onOpenAnime: ViewCallbacks['onOpenAnime']
export let onOpenAnimeEpisode: ViewCallbacks['onOpenAnimeEpisode']
export let onOpenAnimeEpisodes: ViewCallbacks['onOpenAnimeEpisodes']

// Track the Continue Watching row
export let continueWatchingRow: HTMLElement | null = null

export function setContinueWatchingRow(el: HTMLElement | null) {
  continueWatchingRow = el
}

export function initViewContext(domRefs: DomRefs, callbacks: ViewCallbacks): void {
  dom = domRefs
  rowObserver = callbacks.rowObserver
  onShowView = callbacks.onShowView
  onOpenDetail = callbacks.onOpenDetail
  onOpenSeason = callbacks.onOpenSeason
  onLoadMore = callbacks.onLoadMore
  onOpenAnime = callbacks.onOpenAnime
  onOpenAnimeEpisode = callbacks.onOpenAnimeEpisode
  onOpenAnimeEpisodes = callbacks.onOpenAnimeEpisodes
}
