'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ConnectionInfo } from '@/lib/types'

const POLL_MS = 10000

/** ConnectionsPanel polls /api/connections every 10s and renders the
 *  active mita sessions in a compact table. While the proxy is IDLE the
 *  list is empty and we show a friendly hint instead of an error. */
export function ConnectionsPanel() {
  const { t } = useTranslation()
  const [items, setItems] = useState<ConnectionInfo[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const res = await api.getConnections()
        if (cancelled) return
        setItems(res.items)
        setAvailable(res.available)
      } catch {
        if (cancelled) return
        setAvailable(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <div>
          <h2>{t('connections_title')}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {t('connections_hint')}
          </p>
        </div>
        <span className="badge">
          {items.length} {t('connections_count_suffix')}
        </span>
      </div>

      {loading ? (
        <p className="muted">{t('loading')}</p>
      ) : !available ? (
        <p className="muted">{t('connections_unavailable')}</p>
      ) : items.length === 0 ? (
        <p className="muted">{t('connections_empty')}</p>
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
    </div>
  )
}
