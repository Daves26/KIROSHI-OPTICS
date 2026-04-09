import { CLASSES, HOME_ROWS, SKELETON_COUNT_HOME } from '../constants.js'
import { tmdb } from '../api.js'
import { getTrendingAnime, getPopularAnime } from '../anilist.js'
import { getContinueWatching } from '../state.js'
import type { NormalizedAnime, TmdbMedia, ContinueWatchingItem } from '../types.js'
import { escHtml, throttle, shuffleArray } from './utils.js'
import { buildSkeletonCard, prefetchImage } from './ui.js'
import { dom, rowObserver, continueWatchingRow, setContinueWatchingRow } from './context.js'
import { buildResultCard, buildContinueWatchingCard } from './components.js'

// ═══════════════════════════════════════
// HOME ROWS
// ═══════════════════════════════════════

export async function loadHomeRows(): Promise<void> {
  if (!dom.homeRows) return
  dom.homeRows.innerHTML = ''

  const watching = getContinueWatching()
  if (watching.length > 0) {
    setContinueWatchingRow(buildContinueWatchingRow(watching))
    dom.homeRows.appendChild(continueWatchingRow!)
  } else {
    setContinueWatchingRow(null)
  }

  const shuffledTmdb = shuffleArray([...HOME_ROWS])
  const [animeRow1, animeRow2, ...tmdbRows] = await Promise.all([
    buildAnimeHomeRow('Trending Anime', () => getTrendingAnime(1, 20)),
    buildAnimeHomeRow('Popular Anime', () => getPopularAnime(1, 20)),
    ...shuffledTmdb.map(r => buildHomeRow(r.title, r.path)),
  ])
  const animeRows = [animeRow1, animeRow2]

  const topTwo = tmdbRows.slice(0, 2)
  const remaining = shuffleArray([...tmdbRows.slice(2), ...animeRows])

  topTwo.forEach(r => dom.homeRows!.appendChild(r))
  remaining.forEach(r => dom.homeRows!.appendChild(r))
}

// ═══════════════════════════════════════
// CONTINUE WATCHING ROW
// ═══════════════════════════════════════

export function buildContinueWatchingRow(items: ContinueWatchingItem[]): HTMLElement {
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

  const contentEl = row.querySelector('.row-content') as HTMLElement
  const prevBtn = row.querySelector('.prev') as HTMLButtonElement
  const nextBtn = row.querySelector('.next') as HTMLButtonElement

  items.forEach(item => {
    const card = buildContinueWatchingCard(item)
    contentEl.appendChild(card)
  })

  setupRowNavigation(contentEl, prevBtn, nextBtn)

  return row
}

export function refreshContinueWatchingRow(): void {
  const watching = getContinueWatching()

  if (watching.length === 0) {
    if (continueWatchingRow && continueWatchingRow.parentNode) {
      continueWatchingRow.remove()
    }
    setContinueWatchingRow(null)
  } else if (continueWatchingRow) {
    // Row exists, handled by card animations
  } else {
    const firstHomeRow = dom.homeRows?.querySelector(`.${CLASSES.HOME_ROW}`)
    setContinueWatchingRow(buildContinueWatchingRow(watching))
    if (firstHomeRow) {
      dom.homeRows?.insertBefore(continueWatchingRow!, firstHomeRow)
    } else {
      dom.homeRows?.appendChild(continueWatchingRow!)
    }
  }
}

async function buildHomeRow(title: string, path: string): Promise<HTMLElement> {
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

  const contentEl = row.querySelector('.row-content') as HTMLElement
  const prevBtn = row.querySelector('.prev') as HTMLButtonElement
  const nextBtn = row.querySelector('.next') as HTMLButtonElement

  ;(row as any)._loadRowData = async () => {
    for (let i = 0; i < SKELETON_COUNT_HOME; i++) {
      contentEl.appendChild(buildSkeletonCard())
    }

    try {
      const data = await tmdb<any>(path)
      const items = data.results.filter((r: TmdbMedia) => r.poster_path || r.backdrop_path)

      contentEl.innerHTML = ''

      if (items.length > 0) {
        items.forEach((item: TmdbMedia) => {
          if (!item.media_type) {
            if (path.includes('/movie')) item.media_type = 'movie'
            else if (path.includes('/tv')) item.media_type = 'tv'
          }
          contentEl.appendChild(buildResultCard(item, true))
        })

        setupRowPrefetching(contentEl)
      } else {
        contentEl.innerHTML = '<span style="color:var(--text-3);padding:0 12px">No results</span>'
        const navBtns = row.querySelector('.row-nav-btns')
        if (navBtns) (navBtns as HTMLElement).style.display = 'none'
      }

      setupRowNavigation(contentEl, prevBtn, nextBtn)

    } catch (e) {
      console.error(`Error loading row ${title}`, e)
      contentEl.innerHTML = '<span style="color:var(--text-3);padding:0 12px">Failed to load</span>'
    }
  }

  rowObserver.observe(row)
  return row
}

async function buildAnimeHomeRow(
  title: string,
  fetchFn: () => Promise<NormalizedAnime[]>
): Promise<HTMLElement> {
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

  const contentEl = row.querySelector('.row-content') as HTMLElement
  const prevBtn = row.querySelector('.prev') as HTMLButtonElement
  const nextBtn = row.querySelector('.next') as HTMLButtonElement

  ;(row as any)._loadRowData = async () => {
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
        const navBtns = row.querySelector('.row-nav-btns')
        if (navBtns) (navBtns as HTMLElement).style.display = 'none'
      }

      setupRowNavigation(contentEl, prevBtn, nextBtn)
    } catch (e: any) {
      console.error(`Error loading anime row ${title}`, e)
      const msg = e.message?.includes('429')
        ? 'Rate limited. Refresh the page to try again.'
        : 'Failed to load anime data. Check your connection and refresh.'
      contentEl.innerHTML = `<span style="color:var(--text-3);padding:0 12px">${msg}</span>`
      const navBtns = row.querySelector('.row-nav-btns')
      if (navBtns) (navBtns as HTMLElement).style.display = 'none'
    }
  }

  rowObserver.observe(row)
  return row
}

function setupRowPrefetching(contentEl: HTMLElement): void {
  const cards = contentEl.querySelectorAll(`.${CLASSES.RESULT_CARD}`)
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const img = (card as HTMLElement).querySelector('img')
      if (img && img.src) {
        const allImages = Array.from(contentEl.querySelectorAll(`.${CLASSES.RESULT_CARD} img`))
        const idx = allImages.indexOf(img)
        for (let i = idx; i < Math.min(idx + 3, allImages.length); i++) {
          const imgEl = allImages[i] as HTMLImageElement
          if (imgEl?.src) prefetchImage(imgEl.src)
        }
      }
    }, { passive: true })
  })
}

function setupRowNavigation(
  contentEl: HTMLElement,
  prevBtn: HTMLButtonElement,
  nextBtn: HTMLButtonElement
): void {
  const scrollAmount = () => contentEl.clientWidth * 0.8
  prevBtn.addEventListener('click', () => {
    contentEl.scrollBy({ left: -scrollAmount(), behavior: 'smooth' })
  })
  nextBtn.addEventListener('click', () => {
    contentEl.scrollBy({ left: scrollAmount(), behavior: 'smooth' })
  })

  const controller = new AbortController()
  const checkScroll = throttle(() => {
    prevBtn.style.opacity = contentEl.scrollLeft <= 10 ? '0.3' : '1'
    nextBtn.style.opacity = (contentEl.scrollLeft + contentEl.clientWidth >= contentEl.scrollWidth - 10) ? '0.3' : '1'
  }, 100)
  contentEl.addEventListener('scroll', checkScroll, { passive: true, signal: controller.signal })
  window.addEventListener('resize', checkScroll, { passive: true, signal: controller.signal })
  setTimeout(checkScroll, 500)

  ;(contentEl as any)._navController = controller
}
