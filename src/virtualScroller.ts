// Window-based virtualization for the responsive search results grid.
export class VirtualScroller<T> {
  private items: T[]
  private readonly container: HTMLElement
  private readonly renderCard: (item: T) => HTMLElement
  private readonly grid = document.createElement('div')
  private readonly top = document.createElement('div')
  private readonly bottom = document.createElement('div')
  private readonly resizeObserver: ResizeObserver
  private frame = 0
  private rowHeight = 360
  private columns = 1
  private gap = 24
  private readonly originalRowGap: string
  private start = -1
  private end = -1

  constructor(container: HTMLElement, items: T[], renderCard: (item: T) => HTMLElement) {
    this.container = container
    this.items = items
    this.renderCard = renderCard
    this.originalRowGap = container.style.rowGap
    this.gap = parseFloat(getComputedStyle(container).rowGap) || 0
    // The outer grid contains only the two spacers and the inner grid.
    container.style.rowGap = '0px'
    this.grid.style.gridColumn = '1 / -1'
    this.grid.style.display = 'grid'
    this.top.style.gridColumn = '1 / -1'
    this.bottom.style.gridColumn = '1 / -1'
    container.replaceChildren(this.top, this.grid, this.bottom)
    this.resizeObserver = new ResizeObserver(() => this.measure())
    this.resizeObserver.observe(container)
    window.addEventListener('scroll', this.schedule, { passive: true })
    window.addEventListener('resize', this.measure)
    this.measure()
  }

  private measure = (): void => {
    const styles = getComputedStyle(this.container)
    this.columns = Math.max(1, styles.gridTemplateColumns.split(' ').filter(Boolean).length)
    const width = (this.container.clientWidth - (this.columns - 1) * (parseFloat(styles.columnGap) || 0)) / this.columns
    // Posters have a 2:3 aspect ratio; allow space for the metadata below.
    this.rowHeight = width * 1.5 + (window.innerWidth < 640 ? 55 : 105) + this.gap
    this.grid.style.gridTemplateColumns = styles.gridTemplateColumns
    this.grid.style.gap = `${this.gap}px ${styles.columnGap}`
    this.start = -1
    this.schedule()
  }

  private schedule = (): void => {
    if (!this.frame) this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.render()
    })
  }

  render(): void {
    const offset = this.container.getBoundingClientRect().top
    const firstRow = Math.max(0, Math.floor((-offset - window.innerHeight) / this.rowHeight))
    const lastRow = Math.min(Math.ceil(this.items.length / this.columns), Math.ceil((-offset + window.innerHeight * 2) / this.rowHeight))
    const start = firstRow * this.columns
    const end = Math.max(start, lastRow * this.columns)
    if (start === this.start && end === this.end) return
    this.start = start
    this.end = end
    this.top.style.height = `${firstRow * this.rowHeight}px`
    this.bottom.style.height = `${Math.max(0, Math.ceil(this.items.length / this.columns) - lastRow) * this.rowHeight}px`
    this.grid.replaceChildren(...this.items.slice(start, end).map(item => {
      const card = this.renderCard(item)
      card.style.minHeight = `${this.rowHeight - this.gap}px`
      return card
    }))
  }

  updateItems(items: T[]): void {
    this.items = items
    this.start = -1
    this.schedule()
  }

  destroy(): void {
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.container.style.rowGap = this.originalRowGap
    window.removeEventListener('scroll', this.schedule)
    window.removeEventListener('resize', this.measure)
  }
}

export function createSearchVirtualScroller<T>(
  container: HTMLElement,
  items: T[],
  buildCardFn: (item: T, enablePrefetch: boolean) => HTMLElement
): VirtualScroller<T> {
  return new VirtualScroller(container, items, item => buildCardFn(item, true))
}
