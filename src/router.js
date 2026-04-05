// ═══════════════════════════════════════
// ROUTER — View transitions & navigation
// ═══════════════════════════════════════

import { CLASSES } from './constants.js'

// View references (injected by main)
let views = {}

export function initRouter(viewRefs) {
  views = viewRefs
}

// Focus targets for each view
const FOCUS_TARGETS = {
  home: '#logoBtn',
  detail: '#backToHome',
  episodes: '#backToSeasons',
  player: '#backToEpisodes',
  favs: '#backToHomeFavs',
}

export function showView(name, onPlayerExit) {
  // Si salimos del player, vaciamos el src para cortar audio/video
  if (name !== 'player' && onPlayerExit) {
    onPlayerExit()
  }

  // Use View Transitions API if available
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      updateViewClasses(name)
    })
  } else {
    updateViewClasses(name)
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })

  // ACCESSIBILITY: Focus management after view change
  requestAnimationFrame(() => {
    const focusTarget = document.querySelector(FOCUS_TARGETS[name])
    if (focusTarget && focusTabable(focusTarget)) {
      focusTarget.focus({ preventScroll: true })
    }
  })
}

function focusTabable(el) {
  return el && !el.disabled && el.offsetParent !== null
}

function updateViewClasses(name) {
  Object.values(views).forEach(v => v.classList.remove(CLASSES.VIEW_ACTIVE))
  views[name].classList.add(CLASSES.VIEW_ACTIVE)
}
