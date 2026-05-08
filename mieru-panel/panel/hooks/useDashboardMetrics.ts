'use client'

import { useCallback, useState } from 'react'
import { usePollingTask } from '@/components/usePollingTask'

const POLL_MS = 10_000

export type DashboardMitaMetrics = {
  version: string
  uptimeSeconds: number
  directDecrypt: number
  failedDecrypt: number
  iterateDecrypt: number
  activeOpens: number
  currEstablished: number
  maxConn: number
  passiveOpens: number
  downloadBytes: number
  uploadBytes: number
}

export type DashboardSystemMetrics = {
  cpuPercent: number
  memUsedMB: number
  memTotalMB: number
  netRxMbps: number
  netTxMbps: number
}

/** Wire shape of GET /api/dashboard/metrics */
export type DashboardMetricsResponse = {
  mita: DashboardMitaMetrics
  system: DashboardSystemMetrics
  errorsLastHour: number
  panelUptimeSeconds: number
}

type UseDashboardMetricsOptions = {
  /** When false, no polling. Default true. */
  enabled?: boolean
}

async function fetchDashboardMetrics(): Promise<DashboardMetricsResponse> {
  const response = await fetch('/api/dashboard/metrics', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) message = payload.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return (await response.json()) as DashboardMetricsResponse
}

/**
 * Polls GET /api/dashboard/metrics every 10s when enabled.
 * On failure, keeps the last successful payload in `data` and sets `error`.
 */
export function useDashboardMetrics(options?: UseDashboardMetricsOptions) {
  const enabled = options?.enabled ?? true
  const [data, setData] = useState<DashboardMetricsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const poll = useCallback(async (isCancelled: () => boolean) => {
    try {
      const next = await fetchDashboardMetrics()
      if (isCancelled()) return
      setData(next)
      setError(null)
    } catch (e) {
      if (isCancelled()) return
      setError((e as Error).message || 'error')
    }
  }, [])

  usePollingTask(poll, POLL_MS, { enabled, runImmediately: true })

  return { data, error }
}
