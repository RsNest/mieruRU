'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { AdvancedSettings } from '@/lib/types'
import { useToast } from './useToast'

const LOG_LEVELS: AdvancedSettings['loggingLevel'][] = ['DEBUG', 'INFO', 'WARN', 'ERROR']
const MUX_LEVELS: AdvancedSettings['multiplexing'][] = [
  'MULTIPLEXING_OFF',
  'MULTIPLEXING_LOW',
  'MULTIPLEXING_MIDDLE',
  'MULTIPLEXING_HIGH',
]

const DEFAULT: AdvancedSettings = {
  loggingLevel: 'INFO',
  mtu: 1400,
  multiplexing: 'MULTIPLEXING_HIGH',
}

export function AdvancedSettingsPanel() {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .getAdvancedSettings()
      .then((value) => {
        if (cancelled) return
        setSettings({
          loggingLevel: value.loggingLevel || 'INFO',
          mtu: value.mtu || 1400,
          multiplexing: value.multiplexing || 'MULTIPLEXING_HIGH',
        })
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (settings.mtu < 1280 || settings.mtu > 1500) {
      error(t('advanced_mtu_error'))
      return
    }
    setSaving(true)
    try {
      const res = await api.updateAdvancedSettings(settings)
      if (res.warning) {
        error(res.warning)
      } else {
        success(t('advanced_saved'))
      }
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <div>
          <h2>{t('advanced_title')}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {t('advanced_hint')}
          </p>
        </div>
      </div>
      <form className="modal-form" onSubmit={submit} aria-busy={!loaded}>
        <div className="field-grid">
          <label className="field">
            {t('advanced_log_level')}
            <select
              value={settings.loggingLevel}
              onChange={(ev) =>
                setSettings((prev) => ({
                  ...prev,
                  loggingLevel: ev.target.value as AdvancedSettings['loggingLevel'],
                }))
              }
            >
              {LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('advanced_mtu')}
            <input
              type="number"
              min={1280}
              max={1500}
              step={1}
              value={settings.mtu}
              onChange={(ev) =>
                setSettings((prev) => ({ ...prev, mtu: Number(ev.target.value) || 0 }))
              }
            />
          </label>
          <label className="field">
            {t('advanced_multiplexing')}
            <select
              value={settings.multiplexing}
              onChange={(ev) =>
                setSettings((prev) => ({
                  ...prev,
                  multiplexing: ev.target.value as AdvancedSettings['multiplexing'],
                }))
              }
            >
              {MUX_LEVELS.map((mux) => (
                <option key={mux} value={mux}>
                  {mux.replace('MULTIPLEXING_', '')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn-primary" disabled={saving || !loaded}>
            {saving ? t('saving') : t('modal_save')}
          </button>
        </div>
      </form>
    </div>
  )
}
