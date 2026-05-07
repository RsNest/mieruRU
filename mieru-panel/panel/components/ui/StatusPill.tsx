'use client'

type StatusPillTone = 'success' | 'warn' | 'danger' | 'neutral'

type StatusPillProps = {
  label: string
  tone?: StatusPillTone
  withDot?: boolean
  pulseDot?: boolean
  className?: string
}

export function StatusPill({
  label,
  tone = 'neutral',
  withDot = false,
  pulseDot = false,
  className,
}: StatusPillProps) {
  const classes = ['status-pill', `status-pill-${tone}`, className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      {withDot ? <span className={`status-pill-dot ${pulseDot ? 'pulse' : ''}`} aria-hidden /> : null}
      {label}
    </span>
  )
}
