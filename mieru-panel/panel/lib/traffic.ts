const TRAFFIC_TOKEN_RE = /[\d.,]+\s*[KMG]i?B/gi

type TrafficUnit = 'bytes' | 'mb'

function parseTraffic(raw: string | undefined, unit: TrafficUnit): number {
  if (!raw) return 0
  const tokens = raw.match(TRAFFIC_TOKEN_RE)
  if (!tokens || tokens.length === 0) return 0
  return tokens.reduce((acc, tok) => {
    const numeric = Number(tok.replace(',', '.').replace(/[^\d.]/g, ''))
    if (Number.isNaN(numeric)) return acc
    const upper = tok.toUpperCase()
    if (unit === 'mb') {
      if (upper.includes('GIB') || upper.includes('GB')) return acc + numeric * 1024
      if (upper.includes('MIB') || upper.includes('MB')) return acc + numeric
      if (upper.includes('KIB') || upper.includes('KB')) return acc + numeric / 1024
      return acc + numeric / (1024 * 1024)
    }
    if (upper.includes('GIB') || upper.includes('GB')) return acc + numeric * 1024 * 1024 * 1024
    if (upper.includes('MIB') || upper.includes('MB')) return acc + numeric * 1024 * 1024
    if (upper.includes('KIB') || upper.includes('KB')) return acc + numeric * 1024
    return acc + numeric
  }, 0)
}

export function parseTrafficToMB(raw?: string): number {
  return parseTraffic(raw, 'mb')
}

export function parseTrafficToBytes(raw?: string): number {
  return parseTraffic(raw, 'bytes')
}
