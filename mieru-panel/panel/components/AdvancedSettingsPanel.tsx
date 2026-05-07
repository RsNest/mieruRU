'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SectionCard } from '@/components/ui/SectionCard'
import { api } from '@/lib/api'
import { useDirty } from '@/hooks/useDirty'
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
  const [initialSettings, setInitialSettings] = useState<AdvancedSettings>(DEFAULT)
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
        setInitialSettings({
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
        setInitialSettings(settings)
      }
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setSaving(false)
    }
  }

  const isDirty = useDirty(initialSettings, settings)

  return (
    <SectionCard title={t('advanced_title')} description={t('advanced_hint')} isDirty={isDirty}>
      <form className="modal-form" onSubmit={submit} aria-busy={!loaded}>
        <div className="field-grid">
          <Field label={t('advanced_log_level')}>
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
          </Field>
          <Field label={t('advanced_mtu')} monospace>
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
          </Field>
          <Field label={t('advanced_multiplexing')}>
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
          </Field>
        </div>
        <div className="modal-actions">
          <Button type="submit" variant="primary" disabled={saving || !loaded}>
            {saving ? t('saving') : t('modal_save')}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
