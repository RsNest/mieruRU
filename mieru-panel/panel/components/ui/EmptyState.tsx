'use client'

import { Inbox } from 'lucide-react'
import type React from 'react'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  const classes = ['empty-state-v2', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <div className="empty-state-v2-icon" aria-hidden>
        {icon ?? <Inbox className="empty-state-default-icon" size={20} />}
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state-v2-action">{action}</div> : null}
    </div>
  )
}
