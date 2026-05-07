import type { Theme } from './types'

const THEME_BROWSER_COLOR: Record<Theme, string> = {
  midnight: '#0b0d12',
  sakura: '#130f13',
  ghost: '#f7f8fb',
  daylight: '#f4f7ff',
  solar: '#1a130c',
  cyber: '#080b11',
  // Auto follows the system; pick the dark default for the browser chrome.
  auto: '#0b0d12',
}

/** Updates <meta name="theme-color"> for mobile/browser chrome (SharX-style). */
export function syncThemeColorMeta(theme: Theme) {
  let el = document.querySelector('meta[name="theme-color"]')
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', 'theme-color')
    document.head.appendChild(el)
  }
  el.setAttribute('content', THEME_BROWSER_COLOR[theme])
}