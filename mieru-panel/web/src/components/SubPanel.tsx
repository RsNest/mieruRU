import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from './useToast'

interface SubPanelProps {
  open: boolean
  subUrl: string
  newPassword: string | null
  onClearPassword: () => void
}

export function SubPanel({ open, subUrl, newPassword, onClearPassword }: SubPanelProps) {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [fgColor, setFgColor] = useState('black')
  const [timerId, setTimerId] = useState<number | null>(null)

  useEffect(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (accent) setFgColor(accent)
  }, [open])

  useEffect(() => {
    if (!newPassword) return
    const id = window.setTimeout(() => onClearPassword(), 60000)
    setTimerId(id)
    return () => window.clearTimeout(id)
  }, [newPassword, onClearPassword])

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      success(t('toast_copied'))
    } catch {
      error(t('toast_error'))
    }
  }

  const passwordBlock = useMemo(() => {
    if (!newPassword) return null
    return (
      <div className="sub-password-box">
        <strong>{t('sub_new_password')}</strong>
        <code>{newPassword}</code>
        <div className="inline-actions">
          <button type="button" className="ghost-btn" onClick={() => void copy(newPassword)}>
            {t('sub_copy')}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              if (timerId) {
                window.clearTimeout(timerId)
              }
              onClearPassword()
            }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }, [copy, newPassword, onClearPassword, t, timerId])

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className="sub-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="sub-grid">
            <div>
              <label>{t('sub_url_label')}</label>
              <div className="inline-input">
                <input readOnly value={subUrl} />
                <button type="button" className="ghost-btn" onClick={() => void copy(subUrl)}>
                  {t('sub_copy')}
                </button>
              </div>
              {passwordBlock}
            </div>
            <div className="sub-qr">
              <QRCodeSVG value={subUrl} size={160} fgColor={fgColor} bgColor="transparent" />
              <p>{t('sub_qr_hint')}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
