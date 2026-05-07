'use client'

import { Inbox } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { colorFromName } from '@/lib/colorFromName'
import type { TopUser } from '@/hooks/useUsersStats'

type TopUsersListProps = {
  title: string
  users: TopUser[]
  emptyMessage: string
}

export function TopUsersList({ title, users, emptyMessage }: TopUsersListProps) {
  const topUsers = users.slice(0, 10)
  const maxBytes = useMemo(
    () => topUsers.reduce((currentMax, user) => Math.max(currentMax, user.trafficBytes), 0),
    [topUsers],
  )

  return (
    <section className="dashboard-card top-users-card">
      <div className="section-head">
        <h2>{title}</h2>
      </div>
      {topUsers.length === 0 ? (
        <div className="top-users-empty">
          <Inbox size={32} />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="top-users-list">
          {topUsers.map((user, index) => {
            const initial = user.name.trim().charAt(0).toUpperCase()
            const width = maxBytes > 0 ? (user.trafficBytes / maxBytes) * 100 : 0
            return (
              <div className="top-user-row" key={`${user.name}-${index}`}>
                <span className="top-user-avatar" style={{ background: colorFromName(user.name) }}>
                  {initial || '?'}
                </span>
                <span className="top-user-name">{user.name}</span>
                <span className="top-user-bar-wrap">
                  <motion.span
                    className="top-user-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.4, delay: index * 0.03, ease: 'easeOut' }}
                  />
                </span>
                <span className="top-user-value">{user.displayValue}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
