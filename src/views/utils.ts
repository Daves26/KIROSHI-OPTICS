/**
 * Escape HTML characters to prevent XSS.
 */
export function escHtml(str: string = ''): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Get responsive poster size based on viewport width.
 */
export function getPosterSize(): string {
  if (typeof window === 'undefined') return 'w342'
  return window.innerWidth < 640 ? 'w185' : 'w342'
}

/**
 * Debounce function calls.
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    clearTimeout(timer!)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle function calls.
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

/**
 * Normalize a title for comparison.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fisher-Yates shuffle.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tempI = arr[i]
    const tempJ = arr[j]
    if (tempI !== undefined && tempJ !== undefined) {
      arr[i] = tempJ
      arr[j] = tempI
    }
  }
  return arr
}
