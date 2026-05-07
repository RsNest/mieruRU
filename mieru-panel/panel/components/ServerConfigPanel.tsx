'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SectionCard } from '@/components/ui/SectionCard'
import { api } from '@/lib/api'
import { useDirty } from '@/hooks/useDirty'
import type { ServerConfig } from '@/lib/types'
import { useToast } from './useToast'

const RANGE_RE = /^\d{1,5}-\d{1,5}$/

export function ServerConfigPanel() {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [serverIP, setServerIP] = useState('')
  const [defaultPort, setDefaultPort] = useState(2015)
  const [serverPortRange, setServerPortRange] = useState('2012-2022')
  const [initialValues, setInitialValues] = useState({ serverIP: '', defaultPort: 2015, serverPortRange: '2012-2022' })
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
        setInitialValues({
          serverIP: data.serverIP,
          defaultPort: data.defaultPort || 2015,
          serverPortRange: data.serverPortRange || '2012-2022',
        })
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
        setInitialValues({
          serverIP: serverIP.trim(),
          defaultPort,
          serverPortRange: serverPortRange.trim(),
        })
      }
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setSubmitting(false)
    }
  }

  const currentValues = { serverIP, defaultPort, serverPortRange }
  const isDirty = useDirty(initialValues, currentValues)

  return (
    <SectionCard title={t('server_settings_title')} description={t('server_settings_hint')} isDirty={isDirty}>
      <form className="admin-credentials-form" onSubmit={(ev) => void onSubmit(ev)}>
        <Field label={t('server_settings_ip')} htmlFor="srv-ip" monospace>
          <input
            id="srv-ip"
            type="text"
            placeholder="147.90.12.43"
            value={serverIP}
            onChange={(ev) => setServerIP(ev.target.value)}
            disabled={!loaded}
          />
        </Field>
        <Field label={t('server_settings_port')} htmlFor="srv-port" monospace>
          <input
            id="srv-port"
            type="number"
            min={1}
            max={65535}
            value={defaultPort}
            onChange={(ev) => setDefaultPort(Number(ev.target.value) || 0)}
            disabled={!loaded}
          />
        </Field>
        <Field label={t('server_settings_range')} htmlFor="srv-range" monospace>
          <input
            id="srv-range"
            type="text"
            placeholder="2012-2022"
            value={serverPortRange}
            onChange={(ev) => setServerPortRange(ev.target.value)}
            disabled={!loaded}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={submitting || !loaded}>
          {t('server_settings_save')}
        </Button>
      </form>
    </SectionCard>
  )
}
