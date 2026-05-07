'use client'

import type React from 'react'

type SectionCardProps = {
  title: string
  description?: string
  isDirty?: boolean
  children: React.ReactNode
  className?: string
}

export function SectionCard({ title, description, isDirty = false, children, className }: SectionCardProps) {
  const classes = ['section-card', className].filter(Boolean).join(' ')
  return (
    <section className={classes}>
      <header className="section-card-head">
        <div className="section-card-title-row">
          <h2>{title}</h2>
          {isDirty ? <span className="section-dirty-dot" aria-label="Unsaved changes" /> : null}
        </div>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="section-card-body">{children}</div>
    </section>
  )
}
