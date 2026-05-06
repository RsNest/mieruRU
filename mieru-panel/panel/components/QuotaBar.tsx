'use client'

import { useTranslation } from 'react-i18next'

interface QuotaBarProps {
  usedBytes: number
  quotaMB: number
  label?: string
}

function toMB(bytes: number): number {
  return bytes / (1024 * 1024)
}

function humanMB(valueMB: number, unitMB: string, unitGB: string): string {
  if (valueMB >= 1024) {
    return `${(valueMB / 1024).toFixed(1)} ${unitGB}`
  }
  return `${valueMB.toFixed(1)} ${unitMB}`
}

export function QuotaBar({ usedBytes, quotaMB, label }: QuotaBarProps) {
  const { t } = useTranslation()
  const usedMB = toMB(Math.max(0, usedBytes))

  if (quotaMB === 0) {
    return (
      <div className="quota-wrapper">
        {label ? <div className="quota-label">{label}</div> : null}
        <div className="quota-unlimited">{t('quota_unlimited')} (∞)</div>
      </div>
    )
  }

  const pct = Math.min((usedMB / quotaMB) * 100, 100)
  const toneClass = pct < 80 ? 'quota-ok' : pct < 95 ? 'quota-warn' : 'quota-crit'

  return (
    <div className="quota-wrapper">
      {label ? <div className="quota-label">{label}</div> : null}
      <div className={`quota-bar ${toneClass}`}>
        <div className="quota-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="quota-caption">
        {humanMB(usedMB, t('unit_mb'), t('unit_gb'))} / {humanMB(quotaMB, t('unit_mb'), t('unit_gb'))}
      </div>
    </div>
  )
}