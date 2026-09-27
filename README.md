# KIROSHI OPTICS — See the Unseen

<div align="center">

![KIROSHI OPTICS](https://img.shields.io/badge/Status-Production_Ready-success)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)

**A sleek movie and series streaming catalog powered by TMDB and AniList**

[Live Demo](https://kiroshi.vercel.app) · [Report Bug](https://github.com/Daves26/KIROSHI-OPTICS/issues) · [Request Feature](https://github.com/Daves26/KIROSHI-OPTICS/issues)

</div>

---

## ✨ Features

- 🎬 **TMDB Catalog** — Browse movies and series by genre, trending, top rated, and popular
- 🎌 **Anime Integration** — Full anime support via AniList API with trending and popular rows
- 📚 **Explore Categories** — Open any catalog row in its own shareable view and keep browsing with infinite scroll
- 🔍 **Unified Search** — Search across TMDB and AniList simultaneously with deduplication
- 📺 **Multi-Source Player** — selectable third-party embed sources
- ❤️ **Watchlist** — Save your favorite movies, series, and anime to a personal watchlist
- ⏯️ **Continue Watching** — Reopen the last selected title or episode (embedded players do not expose playback position)
- 🎨 **Liquid Glass UI** — Beautiful glassmorphic design with smooth animations
- 🌓 **Theme Toggle** — Switch between dark and light themes
- 📱 **Responsive** — Works on desktop, tablet, and mobile with adaptive layouts
- 🔧 **Source Switching** — Switch video sources on the fly if one isn't working
- ⌨️ **Keyboard Shortcuts** — Navigate the app with keyboard shortcuts (`/` search, `Esc` back, `←` `→` episodes)
- 🌙 **Dark by Default** — Sleek dark theme with ambient background orbs
- ♿ **Accessible** — ARIA labels, skip-to-content link, focus management
- 📡 **Offline-Ready** — Service Worker with intelligent caching strategies
- 🚀 **Performance** — Lazy-loaded rows via IntersectionObserver, image prefetching, virtualized search results, code splitting
- 🧪 **Type-Safe** — Full TypeScript with strict mode enabled
- 🧪 **Tested** — Automated tests for API, state, memoization, search and routes
- ⚡ **Error Handling** — Comprehensive error handling and reporting system
- 🔄 **Code Splitting** — Lazy-loaded chunks for optimal performance

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Build Tool** | [Vite 8](https://vitejs.dev/) |
| **Language** | [TypeScript 6](https://www.typescriptlang.org/) |
| **Testing** | [Vitest](https://vitest.dev/) + [@testing-library/dom](https://testing-library.com/) + [happy-dom](https://github.com/capricorn86/happy-dom) |
| **APIs** | [TMDB API](https://www.themoviedb.org/documentation/api), [AniList GraphQL](https://anilist.gitbook.io/anilist/apiv2/) |
| **Video Sources** | VidEasy, MoviesAPI, VidSrc, VidRock, 111Movies, VidNest, VidLink, RiveStream, and more |
| **Caching** | Bounded localStorage cache + PWA Service Worker |
| **Deployment** | [Vercel](https://vercel.com/) |

## 📦 Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ or 22.12+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Daves26/KIROSHI-OPTICS.git
cd KIROSHI-OPTICS

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Get a TMDB API Token

1. Create a free account at [TMDB](https://www.themoviedb.org/signup)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api)
3. Generate an API key (v3 auth)
4. Copy the **Access Token** (Bearer token)
5. Paste it into your `.env` file

### Run the App

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test:run

# Check types
npm run typecheck

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
KIROSHI-OPTICS/
├── src/
│   ├── app.ts              # Main entry point, bootstraps the app
│   ├── api.ts              # TMDB API layer with caching & retry
│   ├── categories.ts       # Category registry and paginated TMDB/AniList requests
│   ├── api.test.ts         # Tests for API layer
│   ├── anilist.ts          # AniList GraphQL queries & normalization
│   ├── views/              # Modular view components
│   │   ├── index.ts        # View exports aggregator
│   │   ├── home.ts         # Home view with lazy-loaded rows
│   │   ├── category.ts     # Category grid, infinite scroll and retry controls
│   │   ├── search.ts       # Search view with debounced queries
│   │   ├── detail.ts       # Movie/Series/Anime detail view
│   │   ├── episodes.ts     # Episode list view
│   │   ├── favorites.ts    # Watchlist view
│   │   ├── components.ts   # Reusable UI components
│   │   ├── context.ts      # View context and state
│   │   ├── ui.ts           # UI utilities and helpers
│   │   └── utils.ts        # Utility functions
│   ├── views.ts            # Legacy view system (backward compatibility)
│   ├── player.ts           # Video player & source management
│   ├── router.ts           # View transitions & navigation
│   ├── state.ts            # App state + localStorage persistence
│   ├── state.test.ts       # Tests for state management
│   ├── router.test.ts      # Tests for hash routes
│   ├── constants.ts        # Configuration constants & video sources
│   ├── memo.ts             # LRU memoization for expensive renders
│   ├── memo.test.ts        # Tests for memoization
│   ├── toast.ts            # Toast notification system
│   ├── cache.ts            # Bounded shared API cache
│   ├── virtualScroller.ts  # Virtual scrolling for large lists
│   ├── cleanup.ts          # Resource cleanup utilities
│   ├── errorHandler.ts     # Error handling & reporting
│   ├── posterPlaceholder.ts # Poster placeholder generation
│   └── types.ts            # TypeScript type definitions
├── public/                  # Static assets and icons
├── .github/workflows/ci.yml # Typecheck, tests and build
├── index.html               # Main HTML with SEO & structured data
├── style.css                # Liquid Glass UI styles
├── vitest.config.ts         # Vitest configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search input |
| `Esc` | Go back / Close views |
| `←` | Previous episode (in player) |
| `→` | Next episode (in player) |
| `G` | Go to home |

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Guidelines

- Follow the existing code style (TypeScript strict mode)
- Add tests for new functionality
- Update documentation if needed
- Keep PRs focused and concise

### Local data and navigation

Watchlist entries are stored in your browser and are keyed by catalog, media type and ID. Older watchlists are migrated automatically. Shared links support `#/category/{id}`, `#/movie/{id}`, `#/tv/{id}`, `#/tv/{id}/season/{number}`, `#/anime/{id}` and `#/watchlist`. Each catalog row (except Continue Watching) has a View more link that opens a paginated grid. Scroll to load more automatically or use the Load more button; returning from a title restores the category position. Continue Watching saves the selected episode, not playback time inside third-party players.

## 📄 License

See the repository for licensing information.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the movie and series data API
- [AniList](https://anilist.co/) for the anime data API
- All video source providers for embedding functionality

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/Daves26">Daves26</a>
</div>
