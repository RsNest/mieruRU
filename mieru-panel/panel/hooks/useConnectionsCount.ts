'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { usePollingTask } from '@/components/usePollingTask'
import { useServerStatusStore } from '@/store/serverStatus'

const POLL_MS = 10000

function isRunningStatus(status: string): boolean {
  return status.toUpperCase().includes('RUNNING')
}

type ConnectionsCountState = {
  count: number
  loading: boolean
  error: Error | null
  /** False when mita is not RUNNING or the endpoint reports connections unavailable. */
  available: boolean
}

export function useConnectionsCount(enabled = true): ConnectionsCountState {
  const status = useServerStatusStore((s) => s.status)
  const pollEnabled = enabled && isRunningStatus(status)

  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!pollEnabled) {
      setCount(0)
      setLoading(false)
      setError(null)
      setAvailable(false)
    }
  }, [pollEnabled])

  const pollConnections = useCallback(async (isCancelled: () => boolean) => {
    setLoading(true)
    try {
      const res = await api.getConnections()
      if (isCancelled()) return
      if (!res.available) {
        setCount(0)
        setAvailable(false)
        setError(res.error ? new Error(res.error) : null)
        return
      }
      setCount(res.items.length)
      setAvailable(true)
      setError(null)
    } catch (cause) {
      if (isCancelled()) return
      setCount(0)
      setAvailable(false)
      setError(cause instanceof Error ? cause : new Error('Failed to fetch connections'))
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [])

  usePollingTask(pollConnections, POLL_MS, { enabled: pollEnabled })

  return { count, loading, error, available }
}
