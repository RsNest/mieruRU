'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/lib/api'
import { useToast } from './useToast'

interface SubPanelProps {
  open: boolean
  userName: string
  subUrl: string
  newPassword: string | null
  quotaDayMB: number
  quotaMonMB: number
  onClearPassword: () => void
  onUpdateQuotas: (
    name: string,
    payload: { quotaDayMB?: number; quotaMonthMB?: number },
  ) => Promise<void>
}

export function SubPanel({
  open,
  userName,
  subUrl,
  newPassword,
  quotaDayMB,
  quotaMonMB,
  onClearPassword,
  onUpdateQuotas,
}: SubPanelProps) {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [fgColor, setFgColor] = useState('black')
  const [timerId, setTimerId] = useState<number | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [configJson, setConfigJson] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [draftDay, setDraftDay] = useState(String(quotaDayMB))
  const [draftMonth, setDraftMonth] = useState(String(quotaMonMB))
  const [savingQuota, setSavingQuota] = useState(false)

  useEffect(() => {
    setDraftDay(String(quotaDayMB))
    setDraftMonth(String(quotaMonMB))
  }, [quotaDayMB, quotaMonMB, open])

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

  useEffect(() => {
    if (!open) {
      setConfigOpen(false)
      setConfigJson(null)
    }
  }, [open])

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      success(t('toast_copied'))
    } catch {
      error(t('toast_error'))
    }
  }

  const saveQuotas = async () => {
    const day = Math.max(0, Number(draftDay) || 0)
    const month = Math.max(0, Number(draftMonth) || 0)
    if (day === quotaDayMB && month === quotaMonMB) return
    setSavingQuota(true)
    try {
      await onUpdateQuotas(userName, { quotaDayMB: day, quotaMonthMB: month })
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setSavingQuota(false)
    }
  }

  const toggleConfig = async () => {
    if (configOpen) {
      setConfigOpen(false)
      return
    }
    if (configJson) {
      setConfigOpen(true)
      return
    }
    setConfigLoading(true)
    try {
      const data = await api.getUserConfig(userName)
      setConfigJson(JSON.stringify(data, null, 2))
      setConfigOpen(true)
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setConfigLoading(false)
    }
  }

  const passwordBlock = useMemo(() => {
    if (!newPassword) return null
    return (
      <div className="new-password-box">
        <strong>{t('sub_new_password')}</strong>
        <code className="new-password-value">{newPassword}</code>
        <div className="inline-actions">
          <button type="button" className="action-btn" onClick={() => void copy(newPassword)}>
            {t('sub_copy')}
          </button>
          <button
            type="button"
            className="action-btn"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPassword, onClearPassword, t, timerId])

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className="sub-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className="sub-panel-grid">
            <div>
              <label className="field">{t('sub_url_label')}</label>
              <div className="sub-url-field">
                <input className="sub-url-input" readOnly value={subUrl} />
                <button type="button" className="action-btn" onClick={() => void copy(subUrl)}>
                  {t('sub_copy')}
                </button>
              </div>
              <p className="sub-hint">{t('sub_qr_hint')}</p>

              <div className="quota-editor">
                <strong className="quota-editor-title">{t('sub_quota_edit_title')}</strong>
                <div className="field-grid">
                  <label className="field">
                    {t('modal_quota_day')}
                    <input
                      type="number"
                      min={0}
                      value={draftDay}
                      onChange={(ev) => setDraftDay(ev.target.value)}
                    />
                  </label>
                  <label className="field">
                    {t('modal_quota_month')}
                    <input
                      type="number"
                      min={0}
                      value={draftMonth}
                      onChange={(ev) => setDraftMonth(ev.target.value)}
                    />
                  </label>
                </div>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void saveQuotas()}
                    disabled={savingQuota}
                  >
                    {savingQuota ? t('saving') : t('sub_quota_save')}
                  </button>
                </div>
              </div>

              {passwordBlock}
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="action-btn"
                  disabled={configLoading}
                  onClick={() => void toggleConfig()}
                >
                  {configOpen ? t('user_hide_config') : t('user_show_config')}
                </button>
                {configJson ? (
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => void copy(configJson)}
                  >
                    {t('user_copy_config')}
                  </button>
                ) : null}
              </div>
              {configOpen && configJson ? (
                <pre className="user-config-pre">{configJson}</pre>
              ) : null}
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
