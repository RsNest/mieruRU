'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ConnectionInfo } from '@/lib/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionCard } from '@/components/ui/SectionCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePollingTask } from './usePollingTask'

const POLL_MS = 10000

/** ConnectionsPanel polls /api/connections every 10s and renders the
 *  active mita sessions in a compact table. While the proxy is IDLE the
 *  list is empty and we show a friendly hint instead of an error. */
export function ConnectionsPanel({ active = true, compact = false }: { active?: boolean; compact?: boolean }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ConnectionInfo[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  const pollConnections = useCallback(async (isCancelled: () => boolean) => {
    try {
      const res = await api.getConnections()
      if (isCancelled()) return
      setItems(res.items)
      setAvailable(res.available)
    } catch {
      if (isCancelled()) return
      setAvailable(false)
    } finally {
      if (!isCancelled()) setLoading(false)
    }
  }, [])

  usePollingTask(pollConnections, POLL_MS, { enabled: active })

  return (
    <SectionCard
      title={t('connections_title')}
      description={t('connections_hint')}
      className={compact ? 'connections-card-compact' : undefined}
    >
      <div className="section-head">
        <div />
        <span className="badge">
          {items.length} {t('connections_count_suffix')}
        </span>
      </div>

      {loading ? (
        <Skeleton variant="line" count={3} className="skeleton-v2-stack" />
      ) : !available ? (
        <EmptyState title={t('connections_unavailable')} description={t('connections_hint')} />
      ) : items.length === 0 ? (
        <EmptyState title={t('connections_empty')} description={t('connections_hint')} />
      ) : (
        <div className="table-scroll">
          <table className="simple-table compact">
            <thead>
              <tr>
                <th>{t('connections_col_remote')}</th>
                <th>{t('connections_col_protocol')}</th>
                <th>{t('connections_col_state')}</th>
                <th>{t('connections_col_recvq')}</th>
                <th>{t('connections_col_sendq')}</th>
                <th>{t('connections_col_lastrecv')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((conn) => (
                <tr key={conn.sessionId}>
                  <td title={conn.remote}>{conn.remote}</td>
                  <td>{conn.protocol}</td>
                  <td>{conn.state}</td>
                  <td>{conn.recvQ}</td>
                  <td>{conn.sendQ}</td>
                  <td>{conn.lastRecv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
