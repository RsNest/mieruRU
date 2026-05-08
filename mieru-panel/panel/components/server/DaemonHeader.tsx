'use client'

import { RotateCw, Power, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { isServerOffline, isServerRunning } from '@/lib/serverStatus'
import type { ServerStatus } from '@/lib/types'
import { useServerStatusStore } from '@/store/serverStatus'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/StatusPill'
import { useToast } from '@/components/useToast'

type ServerMeta = {
  serverIP: string
  defaultPort: number
  serverPortRange: string
}

export function DaemonHeader() {
  const { t } = useTranslation()
  const { error } = useToast()
  const status = useServerStatusStore((state) => state.status)
  const since = useServerStatusStore((state) => state.currentStatusSince)
  const refresh = useServerStatusStore((state) => state.refresh)
  const setOptimistic = useServerStatusStore((state) => state.setOptimistic)
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState<ServerMeta>({
    serverIP: '-',
    defaultPort: 0,
    serverPortRange: '-',
  })

  useEffect(() => {
    let cancelled = false
    void api
      .getServerConfig()
      .then((cfg) => {
        if (cancelled) return
        setMeta({
          serverIP: cfg.serverIP || '-',
          defaultPort: cfg.defaultPort || 0,
          serverPortRange: cfg.serverPortRange || '-',
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const running = isServerRunning(status)
  const offline = isServerOffline(status)
  const statusTone = running ? 'success' : offline ? 'neutral' : 'danger'
  const statusLabel = running ? t('server_running') : offline ? t('server_offline') : t('server_idle')

  const runWithOptimistic = async (next: ServerStatus, task: () => Promise<unknown>) => {
    if (busy) return
    const prev = status as ServerStatus
    setBusy(true)
    setOptimistic(next, 5000)
    try {
      await task()
      await refresh()
    } catch (cause) {
      setOptimistic(prev, 0)
      error((cause as Error)?.message || t('toast_error'))
    } finally {
      setBusy(false)
    }
  }

  const onRestart = () =>
    runWithOptimistic('RUNNING', async () => {
      await api.stopServer()
      await api.startServer()
    })

  const onStart = () => runWithOptimistic('RUNNING', () => api.startServer())

  const onStop = () => runWithOptimistic('IDLE', () => api.stopServer())

  return (
    <section className="daemon-header">
      <div className="daemon-main">
        <div className={`daemon-dot ${running ? 'running' : ''}`} aria-hidden />
        <div className="daemon-title-wrap">
          <div className="daemon-title-row">
            <h2>mita daemon</h2>
            <StatusPill
              label={statusLabel}
              tone={statusTone}
              withDot
              pulseDot={running}
              className="daemon-chip"
            />
          </div>
          <p className="daemon-meta">
            {`v1.x.x · ${t('kpi.status_since')} ${since ?? '--:--'} · port: ${meta.defaultPort || '-'} · ${meta.serverPortRange} · ${meta.serverIP}`}
          </p>
        </div>
      </div>
      <div className="daemon-actions">
        <Button
          variant="ghost"
          size="compact"
          type="button"
          disabled={busy || running || offline}
          aria-label="Start daemon"
          onClick={() => void onStart()}
        >
          <Play size={16} />
        </Button>
        <Button
          variant="ghost"
          size="compact"
          type="button"
          disabled={busy || offline}
          aria-label="Restart daemon"
          onClick={() => void onRestart()}
        >
          <RotateCw size={16} />
        </Button>
        <Button
          variant="ghost"
          size="compact"
          type="button"
          disabled={busy || !running}
          aria-label="Stop daemon"
          onClick={() => void onStop()}
        >
          <Power size={16} />
        </Button>
      </div>
    </section>
  )
}
