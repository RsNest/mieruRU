'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { User } from '@/lib/types'
import { UserTable } from './UserTable'

type BarRow = {
  name: string
  fullName: string
  trafficMB: number
  displayDay: string
  displayMon: string
}

interface DashboardUsersTabProps {
  active: boolean
  users: User[]
  filteredUsers: User[]
  loading: boolean
  hasError: boolean
  search: string
  setSearch: (next: string) => void
  barData: BarRow[]
  accentColor: string
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
  hasError,
  search,
  setSearch,
  barData,
  accentColor,
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
            <button type="button" className="btn-primary" onClick={onShowAdd}>
              + {t('users_add')}
            </button>
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
              <button type="button" className="btn-secondary" onClick={onDownloadSubscriptions}>
                ⤓ {t('users_export_subs')}
              </button>
            </div>
            {barData.length === 0 || barData.every((row) => row.trafficMB === 0) ? (
              <p className="muted" style={{ marginBottom: 0 }}>{t('stats_chart_empty')}</p>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 10, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-text-secondary)"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      height={64}
                    />
                    <YAxis
                      stroke="var(--color-text-secondary)"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: t('stats_chart_axis_mb'),
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--color-text-secondary)',
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'color-mix(in oklab, var(--color-accent) 8%, transparent)' }}
                      formatter={(value: number) => [
                        `${value} ${t('unit_mb').toUpperCase()}`,
                        t('stats_day'),
                      ]}
                      labelFormatter={(label, payload) => {
                        const full = payload?.[0]?.payload as BarRow | undefined
                        return full?.fullName ?? String(label)
                      }}
                      contentStyle={{
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 8,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    <Bar
                      dataKey="trafficMB"
                      fill={accentColor}
                      name={t('stats_day')}
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
                <button type="button" className="btn-primary" onClick={onShowAdd}>
                  + {t('users_add')}
                </button>
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
