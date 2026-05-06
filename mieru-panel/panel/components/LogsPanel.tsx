'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { LogEntry, LogLevel } from '@/lib/types'
import { useToast } from './useToast'

const POLL_MS = 2000
const LEVELS: Array<LogLevel | 'ALL'> = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

const levelClass: Record<LogLevel, string> = {
  DEBUG: 'log-level log-level-debug',
  INFO: 'log-level log-level-info',
  WARN: 'log-level log-level-warn',
  ERROR: 'log-level log-level-error',
}

export function LogsPanel() {
  const { t } = useTranslation()
  const { error } = useToast()

  const [entries, setEntries] = useState<LogEntry[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<LogLevel | 'ALL'>('ALL')
  const sinceRef = useRef(0)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [mitaOutput, setMitaOutput] = useState('')
  const [mitaAvailable, setMitaAvailable] = useState(true)
  const [mitaLoading, setMitaLoading] = useState(false)

  useEffect(() => {
    if (paused) return
    let cancelled = false

    const tick = async () => {
      try {
        const data = await api.getLogs(sinceRef.current)
        if (cancelled) return
        if (data.entries.length > 0) {
          setEntries((prev) => {
            const merged = [...prev, ...data.entries]
            const trimmed = merged.length > 1000 ? merged.slice(-1000) : merged
            return trimmed
          })
          sinceRef.current = data.entries[data.entries.length - 1]!.seq
        }
      } catch (err) {
        if (!cancelled) error((err as Error).message || t('toast_error'))
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [paused, error, t])

  useEffect(() => {
    if (paused) return
    const node = listRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    if (distanceFromBottom < 80) {
      node.scrollTop = node.scrollHeight
    }
  }, [entries, paused])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return entries
    return entries.filter((e) => e.level === filter)
  }, [entries, filter])

  const refreshMita = async () => {
    setMitaLoading(true)
    try {
      const res = await api.getMitaLogs(200)
      setMitaOutput(res.output)
      setMitaAvailable(res.available)
    } catch (err) {
      error((err as Error).message || t('toast_error'))
      setMitaAvailable(false)
    } finally {
      setMitaLoading(false)
    }
  }

  useEffect(() => {
    void refreshMita()
    const id = window.setInterval(() => void refreshMita(), 15000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="logs-stack">
      <div className="dashboard-card">
        <div className="section-head">
          <div>
            <h2>{t('logs_title')}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {t('logs_hint')}
            </p>
          </div>
          <div className="logs-toolbar">
            <label className="logs-filter">
              <span className="muted">{t('logs_filter_level')}:</span>
              <select
                value={filter}
                onChange={(ev) => setFilter(ev.target.value as LogLevel | 'ALL')}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l === 'ALL' ? t('logs_filter_all') : l}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-secondary" onClick={() => setPaused((v) => !v)}>
              {paused ? t('logs_resume') : t('logs_pause')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEntries([])}
            >
              {t('logs_clear')}
            </button>
          </div>
        </div>
        <div className="logs-view" ref={listRef}>
          {filtered.length === 0 ? (
            <p className="muted" style={{ padding: '24px 8px' }}>
              {t('logs_empty')}
            </p>
          ) : (
            filtered.map((entry) => (
              <div key={entry.seq} className="log-line">
                <span className="log-time">{formatTime(entry.time)}</span>
                <span className={levelClass[entry.level] ?? 'log-level'}>{entry.level}</span>
                {entry.source ? <span className="log-source">[{entry.source}]</span> : null}
                <span className="log-msg">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <div className="section-head">
          <div>
            <h2>{t('logs_mita_title')}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {t('logs_mita_hint')}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={mitaLoading}
            onClick={() => void refreshMita()}
          >
            {t('logs_mita_refresh')}
          </button>
        </div>
        {!mitaAvailable ? (
          <p className="muted">{t('logs_mita_unavailable')}</p>
        ) : (
          <pre className="logs-mita-pre">{mitaOutput || t('logs_empty')}</pre>
        )}
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString(undefined, { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
  } catch {
    return iso
  }
}
