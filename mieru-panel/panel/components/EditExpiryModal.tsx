'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

interface EditExpiryModalProps {
  open: boolean
  currentDate: string
  onCancel: () => void
  onSubmit: (nextDate: string | null) => Promise<void>
}

export function EditExpiryModal({ open, currentDate, onCancel, onSubmit }: EditExpiryModalProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState(currentDate)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setValue(currentDate)
  }, [open, currentDate])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const next = value.trim() === '' ? null : value.trim()
      await onSubmit(next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onCancel}
        >
          <motion.div
            className="modal"
            variants={{
              hidden: { opacity: 0, y: -32, scale: 0.97 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: 'spring', damping: 28, stiffness: 380 },
              },
              exit: { opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.18 } },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 className="modal-title">{t('users_edit_expiry_hint')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                className="modal-close-btn"
                onClick={onCancel}
                aria-label={t('modal_cancel')}
              >
                <X size={14} />
              </Button>
            </div>
            <form className="modal-form" onSubmit={submit}>
              <label className="field">
                {t('modal_expiry')}
                <input type="date" value={value} onChange={(event) => setValue(event.target.value)} />
              </label>
              <div className="inline-actions">
                <Button type="button" variant="secondary" size="md" onClick={() => setValue('')}>
                  {t('expiry_never')}
                </Button>
              </div>
              <div className="modal-actions">
                <Button type="button" variant="secondary" size="md" onClick={onCancel}>
                  {t('modal_cancel')}
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={saving}>
                  {saving ? t('saving') : t('modal_save')}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
