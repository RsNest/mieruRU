'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { ServerConfig } from '@/lib/types'
import { useToast } from './useToast'

const RANGE_RE = /^\d{1,5}-\d{1,5}$/

export function ServerConfigPanel() {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [serverIP, setServerIP] = useState('')
  const [defaultPort, setDefaultPort] = useState(2015)
  const [serverPortRange, setServerPortRange] = useState('2012-2022')
  const [loaded, setLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data: ServerConfig = await api.getServerConfig()
        if (cancelled) return
        setServerIP(data.serverIP)
        setDefaultPort(data.defaultPort || 2015)
        setServerPortRange(data.serverPortRange || '2012-2022')
      } catch (err) {
        if (!cancelled) error((err as Error).message || t('toast_error'))
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [error, t])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!RANGE_RE.test(serverPortRange.trim())) {
      error(t('server_settings_invalid_range'))
      return
    }
    setSubmitting(true)
    try {
      const res = await api.updateServerConfig({
        serverIP: serverIP.trim(),
        defaultPort,
        serverPortRange: serverPortRange.trim(),
      })
      if (res.warning) {
        error(t('server_settings_warning', { warning: res.warning }))
      } else {
        success(t('server_settings_saved'))
      }
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-card admin-credentials-card">
      <h3 className="modal-title">{t('server_settings_title')}</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
        {t('server_settings_hint')}
      </p>
      <form className="admin-credentials-form" onSubmit={(ev) => void onSubmit(ev)}>
        <div className="field">
          <label htmlFor="srv-ip">{t('server_settings_ip')}</label>
          <input
            id="srv-ip"
            type="text"
            placeholder="147.90.12.43"
            value={serverIP}
            onChange={(ev) => setServerIP(ev.target.value)}
            disabled={!loaded}
          />
        </div>
        <div className="field">
          <label htmlFor="srv-port">{t('server_settings_port')}</label>
          <input
            id="srv-port"
            type="number"
            min={1}
            max={65535}
            value={defaultPort}
            onChange={(ev) => setDefaultPort(Number(ev.target.value) || 0)}
            disabled={!loaded}
          />
        </div>
        <div className="field">
          <label htmlFor="srv-range">{t('server_settings_range')}</label>
          <input
            id="srv-range"
            type="text"
            placeholder="2012-2022"
            value={serverPortRange}
            onChange={(ev) => setServerPortRange(ev.target.value)}
            disabled={!loaded}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={submitting || !loaded}>
          {t('server_settings_save')}
        </button>
      </form>
    </div>
  )
}
