// ═══════════════════════════════════════
// ERROR HANDLER — Global error boundaries
// ═══════════════════════════════════════

import { showToast } from './toast.js'

interface ErrorInfo {
  message: string
  source?: string
  line?: number
  column?: number
  error?: Error
}

/**
 * Display a user-friendly error screen for critical failures
 */
export function showErrorScreen(message: string, action?: string): void {
  const existing = document.getElementById('kiroshi-error-overlay')
  if (existing) return

  const overlay = document.createElement('div')
  overlay.id = 'kiroshi-error-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '10000',
    background: 'rgba(13,13,26,0.95)',
    backdropFilter: 'blur(24px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  })

  overlay.innerHTML = `
    <div style="
      max-width: 480px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    ">
      <div style="
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(207,102,121,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CF6679" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <h2 style="
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 1.6rem;
        font-weight: 400;
        color: #f0f0f5;
        margin: 0;
      ">Something went wrong</h2>
      <p style="
        color: rgba(240,240,245,0.6);
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0;
      ">${message}</p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
        <button id="kiroshi-error-retry" style="
          padding: 10px 24px;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #f0f0f5;
          font-size: 0.85rem;
          cursor: pointer;
          backdrop-filter: blur(16px);
        ">Reload Page</button>
        ${action ? `<button id="kiroshi-error-action" style="
          padding: 10px 24px;
          border-radius: 100px;
          border: 1px solid rgba(207,102,121,0.3);
          background: rgba(207,102,121,0.15);
          color: #CF6679;
          font-size: 0.85rem;
          cursor: pointer;
          backdrop-filter: blur(16px);
        ">${action}</button>` : ''}
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  document.getElementById('kiroshi-error-retry')?.addEventListener('click', () => {
    window.location.reload()
  })

  if (action) {
    document.getElementById('kiroshi-error-action')?.addEventListener('click', () => {
      overlay.remove()
    })
  }
}

/**
 * Hide the error screen if visible
 */
export function hideErrorScreen(): void {
  const overlay = document.getElementById('kiroshi-error-overlay')
  overlay?.remove()
}

/**
 * Initialize global error handlers
 */
export function initErrorHandlers(): void {
  // Uncaught JS errors
  window.addEventListener('error', (event: ErrorEvent) => {
    const info: ErrorInfo = {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error,
    }

    console.error('[ErrorHandler]', info)

    // Don't show overlay for minor errors, only toast
    const isCritical = event.error?.name === 'TypeError' || event.message.includes('Uncaught')
    if (isCritical && !import.meta.env.DEV) {
      showToast('An unexpected error occurred. Please try again.', 'error', 6000)
    }
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason
    console.error('[ErrorHandler] Unhandled rejection:', reason)

    // Only suppress known harmless rejections
    if (reason?.name === 'AbortError' && reason?.message?.includes('Transition was skipped')) {
      event.preventDefault()
      return
    }

    if (!import.meta.env.DEV) {
      const message = reason?.message || reason?.toString() || 'An unexpected error occurred'
      showToast(message, 'error', 5000)
    }
  })
}

/**
 * Wrap an async function with error handling
 * Returns null on failure and shows a toast
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallbackMsg: string = 'Failed to load'
): Promise<T | null> {
  try {
    return await fn()
  } catch (err: any) {
    console.error(`[safeAsync] ${fallbackMsg}:`, err)
    showToast(fallbackMsg, 'warning', 4000)
    return null
  }
}
