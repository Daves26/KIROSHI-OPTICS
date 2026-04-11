import { CLASSES } from '../constants.js'
import { throttle } from './utils.js'
import { dom } from './context.js'

// ═══════════════════════════════════════
// LOADER
// ═══════════════════════════════════════

export function setLoading(on: boolean): void {
  dom.loader?.classList.toggle(CLASSES.HIDDEN, !on)
}

// ═══════════════════════════════════════
// SKELETON CARDS
// ═══════════════════════════════════════

export function buildSkeletonCard(height: string = '240px'): HTMLElement {
  const card = document.createElement('div')
  card.className = `${CLASSES.RESULT_CARD} ${CLASSES.SKELETON}`
  card.style.height = height
  return card
}

// ═══════════════════════════════════════
// DETAIL VIEW SKELETON
// ═══════════════════════════════════════

export function buildDetailSkeleton(type: 'movie' | 'tv' | 'anime' = 'movie'): HTMLElement {
  const container = document.createElement('div')
  container.className = 'detail-skeleton'

  const posterHeight = type === 'anime' ? '360px' : '390px'

  container.innerHTML = `
    <div class="movie-detail">
      <div class="movie-poster">
        <div class="skeleton" style="height: ${posterHeight}; border-radius: var(--radius-sm);"></div>
      </div>
      <div class="movie-info">
        <div class="skeleton" style="height: 36px; width: 70%; margin-bottom: 16px;"></div>
        <div class="movie-meta-row">
          <div class="skeleton meta-chip" style="height: 24px; width: 60px;"></div>
          <div class="skeleton meta-chip" style="height: 24px; width: 80px;"></div>
          <div class="skeleton meta-chip" style="height: 24px; width: 100px;"></div>
        </div>
        <div style="margin-top: 24px;">
          <div class="skeleton" style="height: 16px; width: 100%; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 16px; width: 90%; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 16px; width: 75%;"></div>
        </div>
        <div class="flex gap-2" style="margin-top: 24px;">
          <div class="skeleton" style="height: 44px; width: 140px; border-radius: var(--radius-sm);"></div>
          <div class="skeleton" style="height: 44px; width: 140px; border-radius: var(--radius-sm);"></div>
        </div>
      </div>
    </div>
    ${type === 'tv' ? `
    <div class="seasons-section" style="margin-top: 48px;">
      <div class="skeleton" style="height: 24px; width: 120px; margin-bottom: 16px;"></div>
      <div class="seasons-grid-scroll">
        <div class="skeleton" style="height: 200px; width: 140px; display: inline-block; margin-right: 12px;"></div>
        <div class="skeleton" style="height: 200px; width: 140px; display: inline-block; margin-right: 12px;"></div>
        <div class="skeleton" style="height: 200px; width: 140px; display: inline-block; margin-right: 12px;"></div>
      </div>
    </div>
    ` : ''}
  `

  return container
}

// ═══════════════════════════════════════
// EPISODE SKELETON CARDS
// ═══════════════════════════════════════

export function buildEpisodeSkeleton(count: number = 6): DocumentFragment {
  const fragment = document.createDocumentFragment()

  for (let i = 0; i < count; i++) {
    const epCard = document.createElement('div')
    epCard.className = 'episode-item skeleton'
    epCard.style.height = '80px'
    fragment.appendChild(epCard)
  }

  return fragment
}

// ═══════════════════════════════════════
// IMAGE PREFETCHER
// ═══════════════════════════════════════

const prefetchCache = new Set<string>()
const prefetchQueue: string[] = []
let prefetching = false

export function prefetchImage(src: string): void {
  if (!src || prefetchCache.has(src)) return
  prefetchCache.add(src)
  prefetchQueue.push(src)
  if (!prefetching) processPrefetchQueue()
}

function processPrefetchQueue(): void {
  if (prefetchQueue.length === 0) {
    prefetching = false
    return
  }
  prefetching = true
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'image'
  link.href = prefetchQueue.shift()!
  document.head.appendChild(link)
  setTimeout(processPrefetchQueue, 50)
}

// ═══════════════════════════════════════
// PARALLAX
// ═══════════════════════════════════════

export function setupParallax(): void {
  const orbs = document.querySelector('.bg-orbs')
  const handleParallax = throttle((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20
    const y = (e.clientY / window.innerHeight - 0.5) * 20
    requestAnimationFrame(() => {
      if (orbs) (orbs as HTMLElement).style.transform = `translate(${-x}px, ${-y}px)`
    })
  }, 16)

  window.addEventListener('mousemove', handleParallax, { passive: true })
}
