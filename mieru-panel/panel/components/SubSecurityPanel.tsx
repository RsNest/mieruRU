'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { SubSecurity } from '@/lib/types'
import { useToast } from './useToast'

// SubSecurityPanel lets the admin pin /sub/<token> to a list of
// allowed clients (User-Agent substring match) and force the X-HWID
// header. With UA allow-list + RequireHWID enabled, a client cannot
// silently bypass the per-user device limit by rotating User-Agent
// in their app config — the X-HWID will keep the fingerprint stable.
export function SubSecurityPanel() {
  const { t } = useTranslation()
  const { success, error } = useToast()

  const [data, setData] = useState<SubSecurity | null>(null)
  const [text, setText] = useState('')
  const [requireHWID, setRequireHWID] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.getSubSecurity()
        if (cancelled) return
        setData(res)
        setText((res.allowedUserAgents ?? []).join('\n'))
        setRequireHWID(!!res.requireHWID)
      } catch (e) {
        error((e as Error).message || t('toast_error'))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [error, t])

  const defaults = data?.defaultsList ?? []

  const list = useMemo(
    () =>
      text
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [text],
  )

  const presetOfficial = () => setText((defaults ?? []).join('\n'))
  const presetKaringOnly = () => setText('Karing')
  const presetAny = () => setText('')

  const save = async () => {
    setSaving(true)
    try {
      await api.updateSubSecurity({ allowedUserAgents: list, requireHWID })
      success(t('saved'))
    } catch (e) {
      error((e as Error).message || t('toast_error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <div>
          <h2>{t('sub_security_title')}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {t('sub_security_hint')}
          </p>
        </div>
      </div>

      <div className="field" style={{ marginTop: 8 }}>
        <span>{t('sub_security_allowed_label')}</span>
        <textarea
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          rows={6}
          placeholder={t('sub_security_allowed_placeholder')}
          spellCheck={false}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        <span className="muted" style={{ fontSize: 11 }}>
          {t('sub_security_allowed_help')}
        </span>
      </div>

      <div className="preset-chips" style={{ margin: '8px 0' }}>
        <button type="button" className="chip" onClick={presetOfficial}>
          {t('sub_security_preset_official')}
        </button>
        <button type="button" className="chip" onClick={presetKaringOnly}>
          {t('sub_security_preset_karing')}
        </button>
        <button type="button" className="chip" onClick={presetAny}>
          {t('sub_security_preset_any')}
        </button>
      </div>

      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={requireHWID}
          onChange={(ev) => setRequireHWID(ev.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
        />
        <span>
          <strong>{t('sub_security_require_hwid')}</strong>
          <span className="muted" style={{ fontSize: 11, display: 'block' }}>
            {t('sub_security_require_hwid_hint')}
          </span>
        </span>
      </label>

      <div className="inline-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}
