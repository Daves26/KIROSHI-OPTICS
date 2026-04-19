// ═══════════════════════════════════════
// POSTER PLACEHOLDER — Deterministic gradient placeholders
// ═══════════════════════════════════════

/**
 * Generate a deterministic hue based on an ID.
 * Mapped to teal/cyan range (160-200) for aesthetic consistency.
 */
function hueFromId(id: number | string): number {
  const num = typeof id === 'string'
    ? id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : id
  return (num % 40) + 160
}

/**
 * Generate a CSS gradient string for a poster placeholder.
 * Creates a subtle, teal-toned gradient based on the item ID.
 */
export function posterPlaceholderStyle(id: number | string): string {
  const hue = hueFromId(id)
  const hue2 = (hue + 25) % 360
  return `
    background: linear-gradient(
      135deg,
      hsl(${hue}, 30%, 18%) 0%,
      hsl(${hue2}, 35%, 12%) 100%
    );
  `
}

/**
 * Apply crossfade transition from placeholder to actual image.
 * Call this on the poster container when the image loads.
 */
export function setupImageCrossfade(container: HTMLElement, img: HTMLImageElement): void {
  img.style.opacity = '0'
  img.style.transition = 'opacity 0.4s ease'

  img.addEventListener('load', () => {
    img.style.opacity = '1'
    container.classList.add('image-loaded')
  }, { once: true })

  img.addEventListener('error', () => {
    // Keep placeholder visible
    img.style.display = 'none'
  }, { once: true })
}
