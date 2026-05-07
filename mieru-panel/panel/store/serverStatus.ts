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
  currentStatusSince: string | null
  refresh: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  setOptimistic: (next: ServerStatus, suppressMs?: number) => void
}

function nowHHMM(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function refreshStatus() {
  if (Date.now() < suppressPollUntil) return
  try {
    const res = await api.getStatus()
    useServerStatusStore.setState((state) => {
      if (state.status === res.status) {
        return { status: res.status, reachable: true }
      }
      return { status: res.status, reachable: true, currentStatusSince: nowHHMM() }
    })
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
  currentStatusSince: null,
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
    useServerStatusStore.setState((state) => {
      if (state.status === next) {
        return { status: next, reachable: true }
      }
      return { status: next, reachable: true, currentStatusSince: nowHHMM() }
    })
  },
}))
