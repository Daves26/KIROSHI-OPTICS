# KIROSHI OPTICS — See the Unseen

<div align="center">

![KIROSHI OPTICS](https://img.shields.io/badge/Status-Production_Ready-success)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)
![License](https://img.shields.io/badge/License-MIT-green)

**A sleek movie and series streaming catalog powered by TMDB and AniList**

[Live Demo](https://kiroshi-optics.vercel.app) · [Report Bug](https://github.com/Daves26/KIROSHI-OPTICS/issues) · [Request Feature](https://github.com/Daves26/KIROSHI-OPTICS/issues)

</div>

---

## ✨ Features

- 🎬 **TMDB Catalog** — Browse movies and series by genre, trending, top rated, and popular
- 🎌 **Anime Integration** — Full anime support via AniList API with trending and popular rows
- 🔍 **Unified Search** — Search across TMDB and AniList simultaneously with deduplication
- 📺 **Multi-Source Player** — 10+ video sources (VidEasy, VidSrc, VidLink, etc.) with fallback
- ❤️ **Watchlist** — Save your favorite movies, series, and anime to a personal watchlist
- ⏯️ **Continue Watching** — Track your progress and resume where you left off
- 🎨 **Liquid Glass UI** — Beautiful glassmorphic design with smooth animations
- 📱 **Responsive** — Works on desktop, tablet, and mobile with adaptive layouts
- 🔧 **Source Switching** — Switch video sources on the fly if one isn't working
- ⌨️ **Keyboard Shortcuts** — Navigate the app with keyboard shortcuts (`/` search, `Esc` back, `←` `→` episodes)
- 🌙 **Dark by Default** — Sleek dark theme with ambient background orbs
- ♿ **Accessible** — ARIA labels, skip-to-content link, focus management
- 📡 **Offline-Ready** — Service Worker with intelligent caching strategies
- 🚀 **Performance** — Lazy-loaded rows via IntersectionObserver, image prefetching, memoized renders
- 🧪 **Type-Safe** — Full TypeScript with strict mode enabled

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Build Tool** | [Vite 8](https://vitejs.dev/) |
| **Language** | [TypeScript 6](https://www.typescriptlang.org/) |
| **APIs** | [TMDB API](https://www.themoviedb.org/documentation/api), [AniList GraphQL](https://anilist.gitbook.io/anilist/apiv2/) |
| **Video Sources** | VidEasy, MoviesAPI, VidSrc, VidRock, 111Movies, VidNest, VidLink, RiveStream, and more |
| **Caching** | localStorage + Service Worker (Cache API) |
| **Testing** | [Vitest](https://vitest.dev/) + [@testing-library/dom](https://testing-library.com/) + [happy-dom](https://github.com/capricorn86/happy-dom) |
| **Deployment** | [Vercel](https://vercel.com/) |

## 📦 Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
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
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
KIROSHI-OPTICS/
├── src/
│   ├── app.ts              # Main entry point, bootstraps the app
│   ├── api.ts              # TMDB API layer with caching & retry
│   ├── anilist.ts          # AniList GraphQL queries & normalization
│   ├── views.ts            # DOM rendering & view logic
│   ├── player.ts           # Video player & source management
│   ├── router.ts           # View transitions & navigation
│   ├── state.ts            # App state + localStorage persistence
│   ├── constants.ts        # Configuration constants & video sources
│   ├── memo.ts             # LRU memoization for expensive renders
│   ├── toast.ts            # Toast notification system
│   ├── sw.ts               # Service Worker (cache strategies)
│   ├── cacheManager.ts     # Web Worker cache manager
│   ├── cache.worker.ts     # Cache worker for off-thread operations
│   ├── virtualScroller.ts  # Virtual scrolling for large lists
│   └── types.ts            # TypeScript type definitions
├── public/                  # Static assets
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

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the movie and series data API
- [AniList](https://anilist.co/) for the anime data API
- All video source providers for embedding functionality

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/Daves26">Daves26</a>
</div>
