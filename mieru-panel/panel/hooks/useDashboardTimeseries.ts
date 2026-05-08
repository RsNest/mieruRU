'use client'

import { useCallback, useState } from 'react'
import { usePollingTask } from '@/components/usePollingTask'

const POLL_MS = 60_000

export type DashboardTimeseriesBucket = {
  t: string
  rxBytes: number
  txBytes: number
  errors: number
  requests: number
}

/** Wire shape of GET /api/dashboard/timeseries */
export type DashboardTimeseriesResponse = {
  buckets: DashboardTimeseriesBucket[]
}

type UseDashboardTimeseriesOptions = {
  /** When false, no polling. Default true. */
  enabled?: boolean
  /** Passed as query param; backend currently implements 60m ring only. */
  range?: string
}

async function fetchDashboardTimeseries(range: string): Promise<DashboardTimeseriesResponse> {
  const q = new URLSearchParams({ range })
  const response = await fetch(`/api/dashboard/timeseries?${q.toString()}`, {
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
  return (await response.json()) as DashboardTimeseriesResponse
}

/**
 * Polls GET /api/dashboard/timeseries every 60s when enabled.
 * On failure, keeps the last successful payload in `data` and sets `error`.
 */
export function useDashboardTimeseries(options?: UseDashboardTimeseriesOptions) {
  const enabled = options?.enabled ?? true
  const range = options?.range ?? '60m'
  const [data, setData] = useState<DashboardTimeseriesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const poll = useCallback(
    async (isCancelled: () => boolean) => {
      try {
        const next = await fetchDashboardTimeseries(range)
        if (isCancelled()) return
        setData(next)
        setError(null)
      } catch (e) {
        if (isCancelled()) return
        setError((e as Error).message || 'error')
      }
    },
    [range],
  )

  usePollingTask(poll, POLL_MS, { enabled, runImmediately: true })

  return { data, error }
}
