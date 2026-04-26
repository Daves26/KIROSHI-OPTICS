import { CLASSES } from '../constants.js'
import { getFavorites, removeFromFavorites, state, isFavorite } from '../state.js'
import type { MediaItem } from '../types.js'
import { dom, onShowView } from './context.js'
import { buildResultCard } from './components.js'
import { refreshContinueWatchingRow } from './home.js'

// ═══════════════════════════════════════
// FAVORITES VIEW
// ═══════════════════════════════════════

export function openFavs(): void {
  dom.favsGrid!.innerHTML = ''
  const favs = Object.values(getFavorites())

  if (favs.length === 0) {
    dom.favsGrid!.innerHTML = '<p style="color:var(--text-3);grid-column:1/-1;text-align:center;padding:64px 0">Your watchlist is empty.<br>Add movies and series to keep track.</p>'
    onShowView('favs')
    return
  }

  favs.forEach(item => {
    const card = buildResultCard(item as MediaItem)
    const heartBtn = card.querySelector(`.${CLASSES.FAV_BTN}`)
    if (heartBtn) (heartBtn as HTMLElement).style.display = 'none'

    const removeBtn = document.createElement('button')
    removeBtn.className = 'remove-btn'
    removeBtn.setAttribute('aria-label', 'Remove from watchlist')
    removeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      removeFromFavorites(item.id)
      card.style.transform = 'scale(0.8) opacity(0)'
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
      setTimeout(() => card.remove(), 300)
    })

    card.style.position = 'relative'
    card.appendChild(removeBtn)
    dom.favsGrid!.appendChild(card)
  })
  onShowView('favs')
}

export function goHome(): void {
  const homeView = dom.homeRows?.closest('.view')
  const isHomeActive = homeView?.classList.contains(CLASSES.VIEW_ACTIVE)
  
  if (isHomeActive) {
    clearSearchState()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    refreshContinueWatchingRow()
  } else {
    onShowView('home')
    clearSearchState()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function clearSearchState(): void {
  dom.searchInput!.value = ''
  ;(dom.clearBtn as HTMLElement).classList.remove('visible')
  dom.searchResults?.classList.add(CLASSES.HIDDEN)
  dom.homeRows?.classList.remove(CLASSES.HIDDEN)
  dom.heroText?.classList.remove(CLASSES.HIDDEN)
  dom.resultsGrid!.innerHTML = ''
  state.searchQuery = ''
}

// ═══════════════════════════════════════
// FAV ICON UPDATER
// ═══════════════════════════════════════

export function updateAllFavIcons(): void {
  document.querySelectorAll(`.${CLASSES.RESULT_CARD}`).forEach(card => {
    const id = (card as any).dataset.id
    if (id) {
      const isFav = isFavorite(Number(id))
      const btn = (card as HTMLElement).querySelector(`.${CLASSES.FAV_BTN}`)
      if (btn) btn.classList.toggle(CLASSES.FAV_ACTIVE, isFav)
    }
  })
}
