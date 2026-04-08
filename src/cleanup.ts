// ═══════════════════════════════════════
// CLEANUP — Lifecycle management for observers and resources
// ═══════════════════════════════════════

/**
 * Registry of all observers and resources that need cleanup.
 * Call `registerCleanup` to add resources, `cleanupAll` to destroy them.
 */
interface CleanupRegistry {
  observers: IntersectionObserver[]
  performanceObservers: PerformanceObserver[]
  timeouts: Set<ReturnType<typeof setTimeout>>
  intervals: Set<ReturnType<typeof setInterval>>
  rafIds: Set<number>
}

const registry: CleanupRegistry = {
  observers: [],
  performanceObservers: [],
  timeouts: new Set(),
  intervals: new Set(),
  rafIds: new Set(),
}

/**
 * Register an IntersectionObserver for cleanup
 */
export function registerObserver(observer: IntersectionObserver): void {
  registry.observers.push(observer)
}

/**
 * Register a PerformanceObserver for cleanup
 */
export function registerPerformanceObserver(observer: PerformanceObserver): void {
  registry.performanceObservers.push(observer)
}

/**
 * Register a timeout for cleanup
 */
export function registerTimeout(id: ReturnType<typeof setTimeout>): void {
  registry.timeouts.add(id)
}

/**
 * Register an interval for cleanup
 */
export function registerInterval(id: ReturnType<typeof setInterval>): void {
  registry.intervals.add(id)
}

/**
 * Register a requestAnimationFrame for cleanup
 */
export function registerRaf(id: number): void {
  registry.rafIds.add(id)
}

/**
 * Disconnect all observers and clean up resources.
 * Call this before page unload or when tearing down the app.
 */
export function cleanupAll(): void {
  // Disconnect IntersectionObservers
  registry.observers.forEach(observer => {
    try {
      observer.disconnect()
    } catch {
      // Observer may already be disconnected
    }
  })
  registry.observers = []

  // Disconnect PerformanceObservers
  registry.performanceObservers.forEach(observer => {
    try {
      observer.disconnect()
    } catch {
      // Observer may already be disconnected
    }
  })
  registry.performanceObservers = []

  // Clear timeouts
  registry.timeouts.forEach(id => clearTimeout(id))
  registry.timeouts.clear()

  // Clear intervals
  registry.intervals.forEach(id => clearInterval(id))
  registry.intervals.clear()

  // Cancel animation frames
  registry.rafIds.forEach(id => cancelAnimationFrame(id))
  registry.rafIds.clear()

  console.log('[Cleanup] All resources cleaned up')
}

/**
 * Initialize cleanup listeners.
 * Call once during app boot.
 */
export function initCleanup(): void {
  window.addEventListener('beforeunload', () => {
    cleanupAll()
  })

  // Also cleanup on pagehide (more reliable on mobile)
  window.addEventListener('pagehide', () => {
    cleanupAll()
  })
}
