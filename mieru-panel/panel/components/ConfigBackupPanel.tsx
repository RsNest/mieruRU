'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { SectionCard } from '@/components/ui/SectionCard'
import { api } from '@/lib/api'
import { ConfirmModal } from './ConfirmModal'
import { useToast } from './useToast'

interface ConfigBackupPanelProps {
  onRestored?: () => void
}

export function ConfigBackupPanel({ onRestored }: ConfigBackupPanelProps) {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingFileRef = useRef<File | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const downloadBackup = () => {
    window.location.href = api.configBackupUrl()
  }

  const onPickFile = () => fileRef.current?.click()

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    pendingFileRef.current = file
    setConfirmOpen(true)
  }

  const restorePickedFile = async () => {
    const file = pendingFileRef.current
    setConfirmOpen(false)
    if (!file) return
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
      pendingFileRef.current = null
      setRestoring(false)
    }
  }

  return (
    <SectionCard title={t('backup_title')} description={t('backup_hint')}>
      <div className="inline-actions">
        <Button type="button" variant="secondary" onClick={downloadBackup}>
          ⤓ {t('backup_download')}
        </Button>
        <Button type="button" variant="secondary" onClick={onPickFile} disabled={restoring}>
          {restoring ? t('saving') : `⤒ ${t('backup_restore')}`}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(ev) => void onFileChange(ev)}
        />
      </div>
      <ConfirmModal
        open={confirmOpen}
        title={t('backup_restore')}
        message={t('backup_restore_confirm')}
        cancelLabel={t('modal_cancel')}
        confirmLabel={t('backup_restore')}
        onCancel={() => {
          pendingFileRef.current = null
          setConfirmOpen(false)
        }}
        onConfirm={() => void restorePickedFile()}
      />
    </SectionCard>
  )
}
