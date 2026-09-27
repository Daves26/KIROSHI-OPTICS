import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSearchVirtualScroller } from './virtualScroller.js'

describe('search grid virtualization', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('renders the first visible rows and cleans up its scroll listener', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      gridTemplateColumns: '160px 160px', gap: '24px', rowGap: '24px', columnGap: '24px',
    } as CSSStyleDeclaration)
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 344 })
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
    const remove = vi.spyOn(window, 'removeEventListener')
    const scroller = createSearchVirtualScroller(container, Array.from({ length: 200 }, (_, i) => i), item => {
      const el = document.createElement('a')
      el.textContent = String(item)
      return el
    })
    scroller.render()
    expect(container.querySelectorAll('a').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('a').length).toBeLessThan(200)
    scroller.destroy()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
