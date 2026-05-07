import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ServerStatus } from '@/lib/types'

const POLL_MS = 15000

let pollRefCount = 0
let pollTimer: number | null = null
let suppressPollUntil = 0

type ServerStatusState = {
  status: ServerStatus
  reachable: boolean
  refresh: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  setOptimistic: (next: ServerStatus, suppressMs?: number) => void
}

async function refreshStatus() {
  if (Date.now() < suppressPollUntil) return
  try {
    const res = await api.getStatus()
    useServerStatusStore.setState({ status: res.status, reachable: true })
  } catch {
    useServerStatusStore.setState({ reachable: false })
  }
}

function startGlobalPolling() {
  pollRefCount += 1
  if (pollTimer !== null) return
  void refreshStatus()
  pollTimer = window.setInterval(() => {
    void refreshStatus()
  }, POLL_MS)
}

function stopGlobalPolling() {
  pollRefCount = Math.max(0, pollRefCount - 1)
  if (pollRefCount > 0) return
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

export const useServerStatusStore = create<ServerStatusState>(() => ({
  status: 'IDLE',
  reachable: true,
  refresh: async () => {
    await refreshStatus()
  },
  startPolling: () => {
    if (typeof window === 'undefined') return
    startGlobalPolling()
  },
  stopPolling: () => {
    if (typeof window === 'undefined') return
    stopGlobalPolling()
  },
  setOptimistic: (next, suppressMs = 5000) => {
    suppressPollUntil = Date.now() + suppressMs
    useServerStatusStore.setState({ status: next, reachable: true })
  },
}))
