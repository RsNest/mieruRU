'use client'

import { useTranslation } from 'react-i18next'
import type { User } from '@/lib/types'
import { useUsersStats } from '@/hooks/useUsersStats'
import { TopUsersList } from '@/components/users/TopUsersList'

type DashboardTopUsersProps = {
  users: User[]
}

export function DashboardTopUsers({ users }: DashboardTopUsersProps) {
  const { t } = useTranslation()
  const { todayTopUsers, monthTopUsers } = useUsersStats(users)

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <h2>{t('dashboard.top_users_section', { defaultValue: 'Traffic leaders' })}</h2>
      </div>
      <div className="top-users-grid">
        <TopUsersList
          title={t('top_users.today_title')}
          users={todayTopUsers}
          emptyMessage={t('top_users.empty_today')}
        />
        <TopUsersList
          title={t('top_users.month_title')}
          users={monthTopUsers}
          emptyMessage={t('top_users.empty_month')}
        />
      </div>
    </div>
  )
}
