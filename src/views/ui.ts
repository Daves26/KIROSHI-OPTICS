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
