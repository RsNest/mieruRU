'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { usePollingTask } from '@/components/usePollingTask'
import { useServerStatusStore } from '@/store/serverStatus'

const POLL_MS = 10000

/**
 * Consecutive failed polls before KPI shows "unavailable" (also ~30s at default 10s interval).
 * Mitigates transient "multiplexier unavailable" right after mita starts while status is already RUNNING.
 */
const FAILURE_THRESHOLD = 3

function isRunningStatus(status: string): boolean {
  return status.toUpperCase().includes('RUNNING')
}

type ConnectionsCountState = {
  count: number
  /** True while waiting for first good sample, during in-flight probes, or grace retries */
  loading: boolean
  /** False when stopped or too many failures; may stay true during grace with last-known count */
  available: boolean
}

// TODO(mita): Persistent RPC failures while status is RUNNING (multiplexier unavailable) may indicate
// a mita daemon bug or a warm-up race inside the server — investigate in cmd/mita, not just the panel.

export function useConnectionsCount(enabled = true): ConnectionsCountState {
  const status = useServerStatusStore((s) => s.status)
  const pollEnabled = enabled && isRunningStatus(status)

  const lastGoodRef = useRef<{ count: number } | null>(null)
  const failureStreakRef = useRef(0)

  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!pollEnabled) {
      lastGoodRef.current = null
      failureStreakRef.current = 0
      setCount(0)
      setAvailable(false)
      setLoading(false)
    }
  }, [pollEnabled])

  const applySuccess = useCallback((nextCount: number) => {
    failureStreakRef.current = 0
    lastGoodRef.current = { count: nextCount }
    setCount(nextCount)
    setAvailable(true)
    setLoading(false)
  }, [])

  const applyFailure = useCallback((detail: unknown) => {
    if (typeof console !== 'undefined') {
      console.debug('[mieru-panel] connections poll failed', detail)
    }

    failureStreakRef.current += 1
    const streak = failureStreakRef.current
    const snap = lastGoodRef.current

    if (snap !== null && streak < FAILURE_THRESHOLD) {
      setCount(snap.count)
      setAvailable(true)
      setLoading(false)
      return
    }

    if (snap !== null && streak >= FAILURE_THRESHOLD) {
      lastGoodRef.current = null
    }

    setCount(0)
    setAvailable(false)
    const stillTrying = streak < FAILURE_THRESHOLD && lastGoodRef.current === null
    setLoading(stillTrying)
  }, [])

  const pollConnections = useCallback(
    async (isCancelled: () => boolean) => {
      const needsProbeUi = lastGoodRef.current === null || failureStreakRef.current > 0
      if (needsProbeUi) {
        setLoading(true)
      }

      try {
        const res = await api.getConnections()
        if (isCancelled()) return

        if (!res.available) {
          if (res.reason === 'server not running') {
            lastGoodRef.current = null
            failureStreakRef.current = 0
            setCount(0)
            setAvailable(false)
            setLoading(false)
            return
          }
          applyFailure(res.error ?? res)
          return
        }

        applySuccess(res.items.length)
      } catch (cause) {
        if (isCancelled()) return
        applyFailure(cause)
      }
    },
    [applyFailure, applySuccess],
  )

  usePollingTask(pollConnections, POLL_MS, { enabled: pollEnabled })

  return { count, loading, available }
}
