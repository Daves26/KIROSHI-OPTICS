// ═══════════════════════════════════════
// VIRTUAL SCROLLER — Render only visible items
// ═══════════════════════════════════════

export interface VirtualScrollerOptions {
  itemHeight: number;          // Height of each item (px)
  containerHeight: number;     // Height of the container
  bufferSize?: number;         // Extra items as buffer (default: 5)
  gap?: number;                // Gap between items (px) (default: 0)
}

export class VirtualScroller<T> {
  private items: T[]
  private options: Required<VirtualScrollerOptions>
  private scrollTop: number = 0
  private container: HTMLElement
  private renderFn: (item: T, index: number) => HTMLElement
  private isScrolling = false
  private rafId: number | null = null

  constructor(
    container: HTMLElement,
    items: T[],
    options: VirtualScrollerOptions,
    renderFn: (item: T, index: number) => HTMLElement
  ) {
    this.container = container
    this.items = items
    this.options = {
      bufferSize: 5,
      gap: 0,
      ...options
    }
    this.renderFn = renderFn
    
    this.setupScrollHandler()
  }

  private setupScrollHandler(): void {
    // Use passive listener for better performance
    this.container.addEventListener('scroll', () => {
      if (!this.isScrolling) {
        this.isScrolling = true
        this.rafId = requestAnimationFrame(() => {
          this.onScroll()
          this.isScrolling = false
        })
      }
    }, { passive: true })
  }

  private onScroll(): void {
    this.scrollTop = this.container.scrollTop
    this.render()
  }

  getVisibleRange(): { start: number; end: number; offsetY: number } {
    const { itemHeight, containerHeight, bufferSize, gap } = this.options
    const itemWithGap = itemHeight + gap
    
    const start = Math.floor(this.scrollTop / itemWithGap)
    const visibleCount = Math.ceil(containerHeight / itemWithGap)
    
    return {
      start: Math.max(0, start - bufferSize),
      end: Math.min(this.items.length, start + visibleCount + bufferSize),
      offsetY: Math.max(0, start - bufferSize) * itemWithGap
    }
  }

  getTotalHeight(): number {
    const { itemHeight, gap } = this.options
    return this.items.length * (itemHeight + gap) - gap
  }

  render(): void {
    const { start, end, offsetY } = this.getVisibleRange()
    
    // Use DocumentFragment for batch DOM updates
    const fragment = document.createDocumentFragment()
    
    // Create top spacer
    const topSpacer = document.createElement('div')
    topSpacer.style.height = `${offsetY}px`
    topSpacer.style.flexShrink = '0'
    fragment.appendChild(topSpacer)
    
    // Render only visible items
    for (let i = start; i < end; i++) {
      const item = this.items[i]
      if (item !== undefined) {
        const element = this.renderFn(item, i)
        fragment.appendChild(element)
      }
    }
    
    // Create bottom spacer
    const renderedHeight = (end - start) * (this.options.itemHeight + this.options.gap)
    const remainingHeight = this.getTotalHeight() - offsetY - renderedHeight
    if (remainingHeight > 0) {
      const bottomSpacer = document.createElement('div')
      bottomSpacer.style.height = `${remainingHeight}px`
      bottomSpacer.style.flexShrink = '0'
      fragment.appendChild(bottomSpacer)
    }
    
    // Replace all children in one operation
    this.container.replaceChildren(fragment)
  }

  /**
   * Update items and re-render
   */
  updateItems(newItems: T[]): void {
    this.items = newItems
    this.render()
  }

  /**
   * Force re-render (e.g., after resize)
   */
  forceUpdate(): void {
    this.render()
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
    }
    this.items = []
  }
}

/**
 * Create a virtual scroller for search results
 */
export function createSearchVirtualScroller(
  container: HTMLElement,
  items: any[],
  buildCardFn: (item: any, enablePrefetch: boolean) => HTMLElement
): VirtualScroller<any> {
  const itemHeight = 320 // card height + gap
  const containerHeight = container.clientHeight || window.innerHeight * 0.7

  return new VirtualScroller(
    container,
    items,
    {
      itemHeight,
      containerHeight,
      bufferSize: 8,
      gap: 16
    },
    (item, _index) => buildCardFn(item, true)
  )
}
