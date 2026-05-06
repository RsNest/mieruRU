/**
 * formatRelative returns a "5 min ago" / "in 3 days" string for the given
 * ISO timestamp. Returns "" when the input cannot be parsed (e.g. mita
 * never observed traffic for the user yet).
 */
export function formatRelative(iso: string | undefined, locale: string): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const diffSec = (ms - Date.now()) / 1000

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  const abs = Math.abs(diffSec)
  if (abs < 45) return rtf.format(Math.round(diffSec), 'second')
  if (abs < 60 * 45) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 60 * 60 * 22) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 60 * 60 * 24 * 26) return rtf.format(Math.round(diffSec / (3600 * 24)), 'day')
  if (abs < 60 * 60 * 24 * 320) return rtf.format(Math.round(diffSec / (3600 * 24 * 30)), 'month')
  return rtf.format(Math.round(diffSec / (3600 * 24 * 365)), 'year')
}

/** formatExpiry produces a "expires in 5 days" / "expired 3 days ago" string. */
export function formatExpiry(unixSeconds: number | undefined, locale: string): string {
  if (!unixSeconds) return ''
  return formatRelative(new Date(unixSeconds * 1000).toISOString(), locale)
}
