import type { Theme } from './types'

const THEME_BROWSER_COLOR: Record<Theme, string> = {
  midnight: '#0a1628',
  sakura: '#140f0c',
  ghost: '#f6f8fa',
  daylight: '#fbfcfe',
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