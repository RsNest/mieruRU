import type { ServerStatus } from './types'

export function isServerRunning(status: ServerStatus): boolean {
  return String(status).toUpperCase().includes('RUN')
}

export function isServerOffline(status: ServerStatus, reachable = true): boolean {
  const upper = String(status).toUpperCase()
  return !reachable || upper.includes('OFFLINE') || upper.includes('UNAVAILABLE')
}
