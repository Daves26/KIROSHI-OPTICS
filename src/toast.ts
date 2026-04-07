// ═══════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════

import type { ToastType, ToastConfig } from './types.js'

const TOAST_DURATION: number = 3000
const TOAST_MAX: number = 3
let toasts: HTMLElement[] = []
let container: HTMLElement | null = null

// Toast types with icons and colors
const TOAST_TYPES: Record<ToastType, ToastConfig> = {
  success: {
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    </svg>`,
    accent: '#4ADE80',
  },
  info: {
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 7v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
    </svg>`,
    accent: '#60A5FA',
  },
  warning: {
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 5.5v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="8" cy="10.5" r="0.75" fill="currentColor"/>
      <path d="M8 2L1.5 13h13L8 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
    accent: '#FBBF24',
  },
  error: {
    icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    accent: '#CF6679',
  },
}

function getContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    container.setAttribute('aria-live', 'polite')
    container.setAttribute('aria-label', 'Notifications')
    document.body.appendChild(container)
  }
  return container
}

export function showToast(message: string, type: ToastType = 'info', duration: number = TOAST_DURATION): HTMLElement {
  const toastType = TOAST_TYPES[type] ?? TOAST_TYPES.info
  const container = getContainer()

  // Remove oldest toast if max reached
  if (toasts.length >= TOAST_MAX) {
    const oldest = toasts.shift()
    if (oldest) removeToast(oldest)
  }

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.setAttribute('role', 'status')
  toast.innerHTML = `
    <span class="toast-icon">${toastType.icon}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss notification">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  `

  // Style the accent
  toast.style.setProperty('--toast-accent', toastType.accent)

  container.appendChild(toast)
  toasts.push(toast)

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-enter')
  })

  // Close button
  const closeBtn = toast.querySelector<HTMLButtonElement>('.toast-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => removeToast(toast))
  }

  // Auto-dismiss
  const timer = setTimeout(() => removeToast(toast), duration)
  ;(toast as any)._timer = timer

  return toast
}

function removeToast(toast: HTMLElement): void {
  if ((toast as any)._removed) return
  ;(toast as any)._removed = true

  clearTimeout((toast as any)._timer)
  toast.classList.remove('toast-enter')
  toast.classList.add('toast-exit')

  // Remove from DOM after animation
  toast.addEventListener('transitionend', () => {
    if (toast.parentNode) toast.parentNode.removeChild(toast)
  }, { once: true })

  // Fallback removal
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast)
  }, 400)

  toasts = toasts.filter(t => t !== toast)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
