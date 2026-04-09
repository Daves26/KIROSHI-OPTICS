import type { DomRefs, ViewCallbacks } from '../types.js'
import { initViewContext } from './context.js'

export * from './context.js'
export * from './utils.js'
export * from './ui.js'
export * from './components.js'
export * from './home.js'
export * from './detail.js'
export * from './search.js'
export * from './episodes.js'
export * from './favorites.js'

/**
 * Main initialization for all views.
 */
export function initViews(domRefs: DomRefs, callbacks: ViewCallbacks): void {
  initViewContext(domRefs, callbacks)
}
