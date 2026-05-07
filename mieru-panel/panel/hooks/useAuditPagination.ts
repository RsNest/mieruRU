'use client'

import { useCallback, useState } from 'react'
import { api } from '@/lib/api'
import type { AuditEntry } from '@/lib/types'
import { usePollingTask } from '@/components/usePollingTask'

type Options = {
  pollMs?: number
  pageSize?: number
}

export function useAuditPagination({ pollMs = 15000, pageSize = 200 }: Options = {}) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [limit, setLimit] = useState(pageSize)
  const [loadingMore, setLoadingMore] = useState(false)

  const pollAudit = useCallback(async (isCancelled: () => boolean) => {
    try {
      const res = await api.getAudit(limit)
      if (isCancelled()) return
      setEntries(res.entries)
    } catch {
      // audit endpoint can be unavailable at startup
    } finally {
      if (!isCancelled()) {
        setLoaded(true)
        setLoadingMore(false)
      }
    }
  }, [limit])

  usePollingTask(pollAudit, pollMs)

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    setLimit((prev) => prev + pageSize)
  }, [pageSize])

  return { entries, loaded, loadMore, loadingMore, limit, pageSize }
}
