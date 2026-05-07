'use client'

type SkeletonProps = {
  variant?: 'block' | 'line' | 'circle'
  count?: number
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ variant = 'block', count = 1, width, height, className }: SkeletonProps) {
  const classes = ['skeleton-v2', `skeleton-v2-${variant}`, className].filter(Boolean).join(' ')
  if (count <= 1) {
    return <span className={classes} style={{ width, height }} aria-hidden />
  }
  return (
    <span className="skeleton-v2-stack" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={classes} style={{ width, height }} />
      ))}
    </span>
  )
}
