'use client'

import { useEffect, useMemo, useState } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  accent?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, unit, accent, onClick }: StatCardProps) {
  const isNumber = typeof value === 'number'
  const target = useMemo(() => (isNumber ? Number(value) : 0), [isNumber, value])
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    if (!isNumber) return
    const start = performance.now()
    const duration = 800
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setAnimated(Math.round(target * eased))
      if (progress < 1) {
        raf = window.requestAnimationFrame(tick)
      }
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [isNumber, target])

  return (
    <button type="button" className={`stat-card ${accent ? 'stat-accent' : ''}`} onClick={onClick}>
      <div className="stat-label">{label}</div>
      <div className="stat-value data-value">
        {isNumber ? animated : value}
        {unit ? <span className="stat-unit"> {unit}</span> : null}
      </div>
    </button>
  )
}