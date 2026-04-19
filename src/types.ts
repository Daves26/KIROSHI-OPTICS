// ═══════════════════════════════════════
// TYPE DEFINITIONS — KIROSHI OPTICS
// ═══════════════════════════════════════

// ── TMDB API Types ─────────────────────
export interface TmdbMedia {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv' | 'person';
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  genre_ids?: number[];
  popularity?: number;
  vote_count?: number;
  adult?: boolean;
  video?: boolean;
  original_language?: string;
  original_title?: string;
  original_name?: string;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbMedia[];
  total_pages: number;
  total_results: number;
}

export interface TmdbDetailResponse {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TmdbSeason[];
  genres?: Array<{ id: number; name: string }>;
  status?: string;
  tagline?: string;
  original_language?: string;
  popularity?: number;
  adult?: boolean;
  video?: boolean;
  homepage?: string;
  imdb_id?: string;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path?: string | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path?: string | null;
    }>;
  };
  videos?: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      size: number;
      type: string;
    }>;
  };
  similar?: { results: TmdbMedia[] };
  recommendations?: { results: TmdbMedia[] };
}

export interface TmdbSeason {
  id: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  season_number: number;
  air_date?: string;
  episode_count: number;
  episodes?: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date?: string;
  runtime?: number;
  still_path?: string | null;
  vote_average: number;
  vote_count: number;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
  }>;
  guest_stars: Array<{
    id: number;
    name: string;
    character: string;
    order: number;
    profile_path?: string | null;
  }>;
}

// ── AniList API Types ──────────────────
export interface AniListTitle {
  romaji: string;
  english: string;
  native: string;
  userPreferred?: string;
}

export interface AniListCoverImage {
  large: string;
  medium: string;
  extraLarge?: string;
  color?: string;
}

export interface AniListAiringSchedule {
  episode: number;
  airingAt: number; // Unix timestamp
}

export interface AniListRelation {
  relationType: string;
  id: number;
  title: string;
  poster?: string | null;
  format: string;
}

export interface AniListRecommendation {
  id: number;
  title: string;
  poster?: string | null;
  format: string;
}

export interface AniListMedia {
  id: number;
  title: AniListTitle;
  coverImage: AniListCoverImage;
  bannerImage?: string | null;
  episodes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  format: string;
  status: string;
  averageScore?: number | null;
  genres: string[];
  description?: string | null;
  isAdult?: boolean;
  meanScore?: number;
  popularity?: number;
  trending?: number;
  favourites?: number;
  startDate?: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  endDate?: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  seasonRank?: number;
  duration?: number; // Length of each episode in minutes
  source?: string;
  hashtag?: string;
  synonyms?: string[];
  countryOfOrigin?: string;
}

export interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  perPage: number;
}

export interface AniListSearchResponse {
  results: NormalizedAnime[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface AniListDetailResponse extends NormalizedAnime {
  studios: string[];
  airingSchedule: AniListAiringSchedule[];
  relations: AniListRelation[];
  recommendations: AniListRecommendation[];
}

// ── Normalized App Types ───────────────
export type MediaType = 'movie' | 'tv' | 'anime';

export interface MediaItem {
  id: number;
  title: string;
  media_type: MediaType;
  poster_path?: string | null;
  posterUrl?: string; // For AniList compatibility
  banner_path?: string | null;
  backdrop_path?: string | null;
  year?: string;
  rating?: string | null;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  // Anime specific
  nativeTitle?: string;
  format?: string;
  episodes?: number;
  season?: string;
  genres?: string[];
  status?: string;
  score?: number;
}

export interface NormalizedAnime {
  id: number;
  title: string;
  nativeTitle: string;
  media_type: 'anime';
  format: string;
  episodes: number;
  season: string;
  year: string;
  rating: string | null;
  score: number | null;
  genres: string[];
  poster_path: string | null;
  posterUrl: string | null;
  banner_path: string | null;
  overview: string;
  status: string;
}

// ── State Types ────────────────────────
export interface PendingResume {
  episodeIndex: number;
  title: string;
}

export interface AppState {
  currentSerieId: number | null;
  currentSerieType: 'movie' | 'tv' | null;
  currentSeason: number | null;
  currentEpisodes: TmdbEpisode[];
  currentEpIndex: number | null;
  searchPage: number;
  searchQuery: string;
  searchTotal: number;
  currentPosterPath: string | null;
  // Anime specific
  currentAnimeId: number | null;
  currentAnimeEpisodes: NormalizedAnime[];
  currentAnimeEpIndex: number | null;
  // Pending resume (for Continue Watching)
  pendingAnimeResume: PendingResume | null;
  // Internal state (not serialized)
  _currentTitle?: string;
  _currentAnimeTitle?: string;
  _currentAnimeData?: NormalizedAnime & {
    studios?: string[];
    airingSchedule?: Array<{ episode: number; airingAt: number }>;
    relations?: Array<{ relationType: string; id: number; title: string; poster?: string; format: string }>;
    recommendations?: Array<{ id: number; title: string; poster?: string; format: string }>;
  };
  _castData?: any[];
  _similarData?: TmdbMedia[];
  // Source preferences by type
  _lastMovieSource: string | null;
  _lastAnimeSource: string | null;
  // Currently active source
  _activeSource: string | null;
  // Player src saved before search (to restore after cancel)
  _playerSrcBeforeSearch: string;
  _totalSeasons: number | null;
}

// ── Video Source Types ─────────────────
export interface VideoSource {
  name: string;
  getMovie: (id: number | string) => string;
  getTv: (id: number | string, season: number, episode: number) => string;
  getAnime?: (id: number | string, episode?: number) => string;
}

export type SourceKey = string;

export interface SourcesMap {
  [key: SourceKey]: VideoSource;
}

// ── Continue Watching Types ────────────
export interface ContinueWatchingItem {
  id: string;
  tmdbId: number;
  media_type: MediaType;
  title: string;
  poster_path?: string | null;
  posterUrl?: string;
  season?: number;
  episode?: number;
  progress: number;
  watchedAt: number;
}

export interface ContinueWatchingMap {
  [id: string]: ContinueWatchingItem;
}

// ── Favorites Types ────────────────────
export interface FavoritesMap {
  [id: number]: MediaItem;
}

// ── DOM Refs Types ─────────────────────
export interface DomRefs {
  homeRows: HTMLElement;
  heroText: HTMLElement | null;
  searchInput: HTMLInputElement;
  clearBtn: HTMLButtonElement | HTMLElement;
  searchResults: HTMLElement;
  resultsGrid: HTMLElement;
  resultsTitle: HTMLElement;
  resultsCount: HTMLElement;
  loadMore: HTMLElement;
  loadMoreBtn: HTMLButtonElement | HTMLElement;
  loader: HTMLElement;
  favsGrid: HTMLElement;
  detailTitle: HTMLElement;
  detailType: HTMLElement;
  detailContent: HTMLElement;
  episodesTitle: HTMLElement;
  episodesContent: HTMLElement;
  playerTitle: HTMLElement;
  playerFrame: HTMLIFrameElement;
  prevEpBtn: HTMLButtonElement;
  nextEpBtn: HTMLButtonElement;
  serverSelect: HTMLSelectElement;
  nextSourceBtn: HTMLElement | null;
  playerBackText: HTMLElement;
}

export type ViewName = 'home' | 'detail' | 'episodes' | 'player' | 'favs';

export interface ViewRefs {
  [key: string]: HTMLElement;
  home: HTMLElement;
  detail: HTMLElement;
  episodes: HTMLElement;
  player: HTMLElement;
  favs: HTMLElement;
}

// ── Callback Types ─────────────────────
export type ShowViewCallback = (name: ViewName, onPlayerExit?: () => void) => void;
export type OpenDetailCallback = (id: number, type: MediaType) => void;
export type OpenSeasonCallback = (season: number, title: string) => void;
export type OpenAnimeCallback = (id: number) => void;
export type OpenAnimeEpisodeCallback = (index: number, title: string) => void;
export type OpenAnimeEpisodesCallback = (title: string) => void;
export type LoadMoreCallback = (index: number, title: string) => void;
export type GoHomeCallback = () => void;

export interface ViewCallbacks {
  rowObserver: IntersectionObserver;
  onShowView: ShowViewCallback;
  onGoHome: GoHomeCallback;
  onOpenDetail: OpenDetailCallback;
  onOpenSeason: OpenSeasonCallback;
  onOpenAnime: OpenAnimeCallback;
  onOpenAnimeEpisode: OpenAnimeEpisodeCallback;
  onOpenAnimeEpisodes: OpenAnimeEpisodesCallback;
  onLoadMore: LoadMoreCallback;
}

// ── Home Row Types ─────────────────────
export interface HomeRowConfig {
  title: string;
  path: string;
}

export interface HomeRowElement extends HTMLElement {
  _loadRowData?: () => Promise<void>;
  _loaded?: boolean;
}

// ── Cache Types ────────────────────────
export interface CacheItem<T = unknown> {
  data: T;
  expires: number;
}

export interface CacheMap {
  [key: string]: CacheItem;
}

// ── Toast Types ────────────────────────
export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastConfig {
  icon: string;
  accent: string;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

// ── Player Types ───────────────────────
export interface PlayerState {
  isPlaying: boolean;
  currentSource: SourceKey;
}

// ── Performance Types ──────────────────
export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  tti?: number; // Time to Interactive
}

// ── Parallax Types ─────────────────────
export interface ParallaxOptions {
  throttleMs: number;
  maxOffset: number;
}

// ── Search Types ───────────────────────
export interface SearchState {
  query: string;
  page: number;
  total: number;
  isLoading: boolean;
  error: string | null;
}

// ── Utility Types ──────────────────────
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<T | null>;
export type Callback<T = void> = (...args: any[]) => T;
