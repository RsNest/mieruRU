'use client'

import { useEffect } from 'react'

interface UsePollingTaskOptions {
  enabled?: boolean
  runImmediately?: boolean
}

export function usePollingTask(
  task: (isCancelled: () => boolean) => Promise<void> | void,
  intervalMs: number,
  options?: UsePollingTaskOptions,
) {
  const enabled = options?.enabled ?? true
  const runImmediately = options?.runImmediately ?? true

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const isCancelled = () => cancelled
    const tick = () => {
      void task(isCancelled)
    }

    if (runImmediately) tick()
    const id = window.setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, intervalMs, runImmediately, task])
}
