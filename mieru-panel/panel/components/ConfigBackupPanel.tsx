'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { useToast } from './useToast'

interface ConfigBackupPanelProps {
  onRestored?: () => void
}

export function ConfigBackupPanel({ onRestored }: ConfigBackupPanelProps) {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [restoring, setRestoring] = useState(false)

  const downloadBackup = () => {
    window.location.href = api.configBackupUrl()
  }

  const onPickFile = () => fileRef.current?.click()

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!confirm(t('backup_restore_confirm'))) return
    setRestoring(true)
    try {
      const res = await api.restoreConfig(file)
      if (res.warning) {
        error(res.warning)
      } else {
        success(t('backup_restore_ok'))
      }
      onRestored?.()
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <div>
          <h2>{t('backup_title')}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {t('backup_hint')}
          </p>
        </div>
      </div>
      <div className="inline-actions">
        <button type="button" className="btn-secondary" onClick={downloadBackup}>
          ⤓ {t('backup_download')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onPickFile}
          disabled={restoring}
        >
          {restoring ? t('saving') : `⤒ ${t('backup_restore')}`}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(ev) => void onFileChange(ev)}
        />
      </div>
    </div>
  )
}
