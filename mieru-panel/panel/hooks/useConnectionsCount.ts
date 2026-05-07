'use client'

import { useCallback, useState } from 'react'
import { api } from '@/lib/api'
import { usePollingTask } from '@/components/usePollingTask'

const POLL_MS = 10000

type ConnectionsCountState = {
  count: number
  loading: boolean
  error: Error | null
}

export function useConnectionsCount(enabled = true): ConnectionsCountState {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const pollConnections = useCallback(async (isCancelled: () => boolean) => {
    try {
      const res = await api.getConnections()
      if (isCancelled()) return
      setCount(res.available ? res.items.length : 0)
      setError(null)
    } catch (cause) {
      if (isCancelled()) return
      setCount(0)
      setError(cause instanceof Error ? cause : new Error('Failed to fetch connections'))
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [])

  usePollingTask(pollConnections, POLL_MS, { enabled })

  return { count, loading, error }
}
