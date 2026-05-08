'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { LogEntry, LogLevel } from '@/lib/types'
import { usePollingTask } from '@/components/usePollingTask'

type FilterLevel = LogLevel | 'ALL'

type Options = {
  pollMs: number
  maxSize: number
  /** When true, polls /api/logs. Default false so only explicit callers (e.g. LogsDrawer) opt in. */
  enabled?: boolean
}

export function useLogBuffer({ pollMs, maxSize, enabled = false }: Options) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<FilterLevel>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [paused, setPaused] = useState(false)
  const seqCursor = useRef(0)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 120)
    return () => window.clearTimeout(id)
  }, [searchInput])

  const pollLogs = useCallback(async (isCancelled: () => boolean) => {
    try {
      const data = await api.getLogs(seqCursor.current)
      if (isCancelled()) return
      if (data.entries.length === 0) return
      setEntries((prev) => {
        const merged = [...prev, ...data.entries]
        return merged.length > maxSize ? merged.slice(-maxSize) : merged
      })
      seqCursor.current = data.entries[data.entries.length - 1]?.seq ?? seqCursor.current
    } catch {
      // transient read error; keep stream alive
    }
  }, [maxSize])

  usePollingTask(pollLogs, pollMs, { enabled: enabled && !paused })

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return entries.filter((entry) => {
      const byLevel = filter === 'ALL' || entry.level === filter
      if (!byLevel) return false
      if (!q) return true
      return entry.message.toLowerCase().includes(q)
    })
  }, [entries, filter, debouncedSearch])

  const clear = useCallback(() => {
    setEntries([])
  }, [])

  const togglePause = useCallback(() => {
    setPaused((v) => !v)
  }, [])

  return {
    entries,
    filtered,
    filter,
    setFilter,
    search: searchInput,
    setSearch: setSearchInput,
    clear,
    paused,
    togglePause,
    seqCursor: seqCursor.current,
  }
}
