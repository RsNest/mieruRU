'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    name: string
    password: string
    quotaDayMB: number
    quotaMonthMB: number
    expiresAt: number
    maxDevices: number
  }) => Promise<void>
}

type DevicePreset = { id: string; labelKey: string; value: number }

const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'd-unlim', labelKey: 'device_preset_unlimited', value: 0 },
  { id: 'd1', labelKey: 'device_preset_one', value: 1 },
  { id: 'd2', labelKey: 'device_preset_two', value: 2 },
  { id: 'd3', labelKey: 'device_preset_three', value: 3 },
  { id: 'd5', labelKey: 'device_preset_five', value: 5 },
]

const namePattern = /^[a-zA-Z0-9_-]{2,32}$/

type QuotaPreset = {
  id: string
  labelKey: string
  dayMB: number
  monthMB: number
}

const QUOTA_PRESETS: QuotaPreset[] = [
  { id: 'unlimited', labelKey: 'quota_preset_unlimited', dayMB: 0, monthMB: 0 },
  { id: 'home', labelKey: 'quota_preset_1gb_day', dayMB: 1024, monthMB: 30 * 1024 },
  { id: 'travel', labelKey: 'quota_preset_30gb_month', dayMB: 0, monthMB: 30 * 1024 },
  { id: 'tight', labelKey: 'quota_preset_500mb_day', dayMB: 512, monthMB: 10 * 1024 },
]

type ExpiryPreset = {
  id: string
  labelKey: string
  days: number // 0 = never
}

const EXPIRY_PRESETS: ExpiryPreset[] = [
  { id: 'never', labelKey: 'expiry_never', days: 0 },
  { id: 'd7', labelKey: 'expiry_7d', days: 7 },
  { id: 'd30', labelKey: 'expiry_30d', days: 30 },
  { id: 'd90', labelKey: 'expiry_90d', days: 90 },
  { id: 'y1', labelKey: 'expiry_365d', days: 365 },
]

function randomPassword(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const bin = String.fromCharCode(...bytes)
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function AddUserModal({ open, onClose, onSubmit }: AddUserModalProps) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [quotaPresetId, setQuotaPresetId] = useState('unlimited')
  const [quotaDay, setQuotaDay] = useState('0')
  const [quotaMonth, setQuotaMonth] = useState('0')
  const [expiryPresetId, setExpiryPresetId] = useState('never')
  const [devicePresetId, setDevicePresetId] = useState('d-unlim')
  const [error, setError] = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  const nameInvalid = useMemo(() => nameTouched && !namePattern.test(name), [name, nameTouched])

  useEffect(() => {
    if (open) {
      window.setTimeout(() => nameRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, open])

  const reset = () => {
    setName('')
    setPassword('')
    setQuotaPresetId('unlimited')
    setQuotaDay('0')
    setQuotaMonth('0')
    setExpiryPresetId('never')
    setDevicePresetId('d-unlim')
    setError('')
    setNameTouched(false)
    setShowPassword(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const applyQuotaPreset = (preset: QuotaPreset) => {
    setQuotaPresetId(preset.id)
    setQuotaDay(String(preset.dayMB))
    setQuotaMonth(String(preset.monthMB))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNameTouched(true)
    if (!namePattern.test(name)) {
      setError(t('modal_name_error'))
      return
    }
    const finalPassword = password || randomPassword()
    const expiry = EXPIRY_PRESETS.find((p) => p.id === expiryPresetId) ?? EXPIRY_PRESETS[0]!
    const expiresAt = expiry.days === 0 ? 0 : Math.floor(Date.now() / 1000) + expiry.days * 86400
    const dp = DEVICE_PRESETS.find((p) => p.id === devicePresetId) ?? DEVICE_PRESETS[0]!
    try {
      await onSubmit({
        name,
        password: finalPassword,
        quotaDayMB: Math.max(0, Number(quotaDay) || 0),
        quotaMonthMB: Math.max(0, Number(quotaMonth) || 0),
        expiresAt,
        maxDevices: dp.value,
      })
      handleClose()
    } catch (err) {
      setError((err as Error).message || t('modal_inline_error'))
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
          onClick={handleClose}
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
            ref={rootRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 className="modal-title">{t('modal_add_title')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="compact"
                className="modal-close-btn"
                onClick={handleClose}
                aria-label={t('modal_cancel')}
              >
                <X size={14} />
              </Button>
            </div>
            <form className="modal-form" onSubmit={submit}>
              <label className="field">
                {t('modal_name')}
                <input
                  ref={nameRef}
                  value={name}
                  onBlur={() => setNameTouched(true)}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="field">
                {t('modal_password')}
                <div className="inline-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    👁
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPassword(randomPassword())}
                  >
                    🎲
                  </Button>
                </div>
              </label>

              <fieldset className="preset-row">
                <legend>{t('modal_quota_preset')}</legend>
                <div className="preset-chips">
                  {QUOTA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`chip ${quotaPresetId === preset.id ? 'active' : ''}`}
                      onClick={() => applyQuotaPreset(preset)}
                    >
                      {t(preset.labelKey)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="field-grid">
                <label className="field">
                  {t('modal_quota_day')}
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={quotaDay}
                    onChange={(event) => {
                      setQuotaDay(event.target.value)
                      setQuotaPresetId('')
                    }}
                  />
                </label>
                <label className="field">
                  {t('modal_quota_month')}
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={quotaMonth}
                    onChange={(event) => {
                      setQuotaMonth(event.target.value)
                      setQuotaPresetId('')
                    }}
                  />
                </label>
              </div>

              <fieldset className="preset-row">
                <legend>{t('modal_expiry')}</legend>
                <div className="preset-chips">
                  {EXPIRY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`chip ${expiryPresetId === preset.id ? 'active' : ''}`}
                      onClick={() => setExpiryPresetId(preset.id)}
                    >
                      {t(preset.labelKey)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="preset-row">
                <legend>{t('modal_device_limit')}</legend>
                <div className="preset-chips">
                  {DEVICE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`chip ${devicePresetId === preset.id ? 'active' : ''}`}
                      onClick={() => setDevicePresetId(preset.id)}
                    >
                      {t(preset.labelKey)}
                    </button>
                  ))}
                </div>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 11 }}>
                  {t('modal_device_limit_hint')}
                </p>
              </fieldset>

              {error ? (
                <p className="field-error">{error}</p>
              ) : nameInvalid ? (
                <p className="field-error">{t('modal_name_error')}</p>
              ) : null}
              <div className="modal-actions">
                <Button type="button" variant="secondary" size="md" onClick={handleClose}>
                  {t('modal_cancel')}
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {t('modal_save')}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
