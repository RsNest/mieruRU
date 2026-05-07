'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { api } from '@/lib/api'
import { usePollingTask } from '@/components/usePollingTask'

const TRUNCATE_HINT_LIMIT = 50 * 1024

export function MitaLogsSection() {
  const { t } = useTranslation()
  const [output, setOutput] = useState('')
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getMitaLogs(200)
      setOutput(res.output)
      setAvailable(res.available)
    } catch {
      setAvailable(false)
    } finally {
      setLoading(false)
    }
  }, [])

  usePollingTask(() => refresh(), 15000)

  return (
    <SectionCard title={t('logs_mita_title')} description={t('logs_mita_hint')}>
      <div className="logs-mita-toolbar">
        <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
          {t('logs_mita_refresh')}
        </Button>
      </div>
      {!available ? (
        <p className="muted">{t('logs_mita_unavailable')}</p>
      ) : (
        <>
          <pre className="logs-mita-pre" tabIndex={0}>
            {output || t('logs_empty')}
          </pre>
          {output.length > TRUNCATE_HINT_LIMIT ? (
            <p className="muted">{t('logs_mita_truncated_hint')}</p>
          ) : null}
        </>
      )}
    </SectionCard>
  )
}
