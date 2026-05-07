'use client'

import { useTranslation } from 'react-i18next'
import type { TopUser } from '@/hooks/useUsersStats'
import type { User } from '@/lib/types'
import { KpiStrip } from '@/components/users/KpiStrip'
import { TopUsersList } from '@/components/users/TopUsersList'
import { Button } from '@/components/ui/Button'
import { UserTable } from './UserTable'

interface DashboardUsersTabProps {
  active: boolean
  users: User[]
  filteredUsers: User[]
  loading: boolean
  connectionsLoading: boolean
  hasError: boolean
  search: string
  setSearch: (next: string) => void
  usersTotal: number
  usersActive5m: number
  todayTrafficTotal: number
  todayTrafficUsers: number
  connectionsCount: number
  serverStatus: string
  serverStatusSince: string | null
  todayTopUsers: TopUser[]
  monthTopUsers: TopUser[]
  onShowAdd: () => void
  onClearSearch: () => void
  onRetry: () => void
  onDelete: (name: string) => void
  onRegen: (name: string) => Promise<string>
  onUpdate: (
    name: string,
    payload: {
      quotaDayMB?: number
      quotaMonthMB?: number
      expiresAt?: number
      maxDevices?: number
    },
  ) => Promise<void>
  onResetDevices: (name: string, fingerprint?: string) => Promise<void>
  onBulkDelete: (names: string[]) => Promise<void>
  onDownloadSubscriptions: () => void
}

export function DashboardUsersTab({
  active,
  users,
  filteredUsers,
  loading,
  connectionsLoading,
  hasError,
  search,
  setSearch,
  usersTotal,
  usersActive5m,
  todayTrafficTotal,
  todayTrafficUsers,
  connectionsCount,
  serverStatus,
  serverStatusSince,
  todayTopUsers,
  monthTopUsers,
  onShowAdd,
  onClearSearch,
  onRetry,
  onDelete,
  onRegen,
  onUpdate,
  onResetDevices,
  onBulkDelete,
  onDownloadSubscriptions,
}: DashboardUsersTabProps) {
  const { t } = useTranslation()

  return (
    <div className={`tab-pane ${active ? 'active' : 'inactive'}`}>
      <>
        {!loading && users.length === 0 ? (
          <div className="dashboard-card empty-state">
            <h2>{t('empty_state_title')}</h2>
            <p className="muted">{t('empty_state_hint')}</p>
            <Button type="button" variant="cta" size="md" onClick={onShowAdd}>
              + {t('users_add')}
            </Button>
          </div>
        ) : null}

        {users.length > 0 ? (
          <div className="dashboard-card">
            <div className="section-head">
              <div>
                <h2>{t('stats_chart_title')}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {t('stats_chart_hint')}
                </p>
              </div>
              <Button type="button" variant="secondary" size="md" onClick={onDownloadSubscriptions}>
                ⤓ {t('users_export_subs')}
              </Button>
            </div>
            <KpiStrip
              loading={loading}
              usersTotal={usersTotal}
              usersActive5m={usersActive5m}
              todayTrafficTotal={todayTrafficTotal}
              todayTrafficUsers={todayTrafficUsers}
              connectionsCount={connectionsCount}
              connectionsLoading={connectionsLoading}
              serverStatus={serverStatus}
              serverStatusSince={serverStatusSince}
            />
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
        ) : null}

        {users.length > 0 ? (
          <div className="dashboard-card">
            <div className="section-head">
              <h2>{t('nav_users')}</h2>
              <div className="inline-actions">
                <input
                  type="search"
                  className="search-input"
                  placeholder={t('users_search_placeholder')}
                  value={search}
                  onChange={(ev) => setSearch(ev.target.value)}
                  aria-label={t('users_search_placeholder')}
                />
                <Button type="button" variant="cta" size="md" onClick={onShowAdd}>
                  + {t('users_add')}
                </Button>
              </div>
            </div>
            <UserTable
              users={filteredUsers}
              loading={loading}
              error={hasError}
              searchActive={search.trim().length > 0}
              onClearSearch={onClearSearch}
              onRetry={onRetry}
              onDelete={onDelete}
              onRegen={onRegen}
              onUpdate={onUpdate}
              onResetDevices={onResetDevices}
              onBulkDelete={onBulkDelete}
              onAdd={onShowAdd}
            />
          </div>
        ) : null}
      </>
    </div>
  )
}
