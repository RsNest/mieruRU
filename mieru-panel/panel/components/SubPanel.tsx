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
  maxDevices: number
  devices: Array<{
    hash: string
    hwid?: string
    userAgent?: string
    ip?: string
    firstSeen: number
    lastSeen: number
  }>
  onClearPassword: () => void
  onUpdateQuotas: (
    name: string,
    payload: { quotaDayMB?: number; quotaMonthMB?: number; maxDevices?: number },
  ) => Promise<void>
  onResetDevices: (name: string, fingerprint?: string) => Promise<void>
}

export function SubPanel({
  open,
  userName,
  subUrl,
  newPassword,
  quotaDayMB,
  quotaMonMB,
  maxDevices,
  devices,
  onClearPassword,
  onUpdateQuotas,
  onResetDevices,
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
  const [draftMaxDevices, setDraftMaxDevices] = useState(String(maxDevices))
  const [savingQuota, setSavingQuota] = useState(false)

  useEffect(() => {
    setDraftDay(String(quotaDayMB))
    setDraftMonth(String(quotaMonMB))
    setDraftMaxDevices(String(maxDevices))
  }, [quotaDayMB, quotaMonMB, maxDevices, open])

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
    const md = Math.max(0, Number(draftMaxDevices) || 0)
    if (day === quotaDayMB && month === quotaMonMB && md === maxDevices) return
    setSavingQuota(true)
    try {
      await onUpdateQuotas(userName, { quotaDayMB: day, quotaMonthMB: month, maxDevices: md })
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    } finally {
      setSavingQuota(false)
    }
  }

  const resetAllDevices = async () => {
    if (!confirm(t('sub_devices_reset_confirm'))) return
    try {
      await onResetDevices(userName)
      success(t('sub_devices_reset_ok'))
    } catch (err) {
      error((err as Error).message || t('toast_error'))
    }
  }

  const removeDevice = async (hash: string) => {
    try {
      await onResetDevices(userName, hash)
      success(t('sub_devices_remove_ok'))
    } catch (err) {
      error((err as Error).message || t('toast_error'))
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
                  <label className="field">
                    {t('modal_device_limit')}
                    <input
                      type="number"
                      min={0}
                      value={draftMaxDevices}
                      onChange={(ev) => setDraftMaxDevices(ev.target.value)}
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

              <div className="devices-block">
                <div className="section-head" style={{ marginTop: 12 }}>
                  <strong className="quota-editor-title">{t('sub_devices_title')}</strong>
                  {devices.length > 0 ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void resetAllDevices()}
                    >
                      ↺ {t('sub_devices_reset_all')}
                    </button>
                  ) : null}
                </div>
                {devices.length === 0 ? (
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                    {t('sub_devices_empty')}
                  </p>
                ) : (
                  <ul className="devices-list">
                    {devices.map((d) => (
                      <li key={d.hash} className="device-item">
                        <div className="device-item-meta">
                          <span className="device-item-ua" title={d.userAgent}>
                            {d.userAgent || t('sub_devices_unknown_ua')}
                          </span>
                          <span className="device-item-sub">
                            {d.hwid ? (
                              <span className="device-hwid" title={t('sub_devices_hwid')}>
                                HWID:{d.hwid.slice(0, 12)}…
                              </span>
                            ) : null}
                            {d.ip ? ` · ${d.ip}` : ''}
                            {' · '}
                            {new Date(d.lastSeen * 1000).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="action-btn icon-only danger"
                          onClick={() => void removeDevice(d.hash)}
                          aria-label={t('sub_devices_remove')}
                          title={t('sub_devices_remove')}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
