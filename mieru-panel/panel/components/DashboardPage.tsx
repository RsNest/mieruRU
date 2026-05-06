'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@/lib/api'
import { dashboardHref, parseDashboardTab } from '@/lib/dashboardTab'
import type { ServerStatus as ServerStatusValue, User } from '@/lib/types'
import { AddUserModal } from './AddUserModal'
import { AdminCredentialsPanel } from './AdminCredentialsPanel'
import { AdvancedSettingsPanel } from './AdvancedSettingsPanel'
import { ConfigBackupPanel } from './ConfigBackupPanel'
import { ConfirmModal } from './ConfirmModal'
import { ConnectionsPanel } from './ConnectionsPanel'
import { LogsPanel } from './LogsPanel'
import { ServerConfigPanel } from './ServerConfigPanel'
import { ServerStatus } from './ServerStatus'
import { StatCard } from './StatCard'
import { Toasts } from './Toast'
import { UserTable } from './UserTable'
import { useToast } from './useToast'

// parseTraffic returns the cumulative number of MiB encoded in a "↓ 5.6 MiB
// / ↑ 2.3 MiB" style string. Tokens with KiB/MiB/GiB or the legacy KB/MB/GB
// suffixes are summed; tokens we cannot parse contribute 0.
function parseTraffic(raw?: string): number {
  if (!raw) return 0
  const tokens = raw.match(/[\d.,]+\s*[KMG]i?B/gi)
  if (!tokens || tokens.length === 0) return 0
  return tokens.reduce((acc, tok) => {
    const numeric = Number(tok.replace(',', '.').replace(/[^\d.]/g, ''))
    if (Number.isNaN(numeric)) return acc
    const upper = tok.toUpperCase()
    if (upper.includes('GIB') || upper.includes('GB')) return acc + numeric * 1024
    if (upper.includes('MIB') || upper.includes('MB')) return acc + numeric
    if (upper.includes('KIB') || upper.includes('KB')) return acc + numeric / 1024
    return acc + numeric / (1024 * 1024)
  }, 0)
}

type BarRow = {
  name: string
  fullName: string
  trafficMB: number
  displayDay: string
  displayMon: string
}

export function DashboardPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  const tab = parseDashboardTab(searchParams)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [status, setStatus] = useState<ServerStatusValue>('IDLE')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteName, setDeleteName] = useState<string | null>(null)
  const [accentColor, setAccentColor] = useState('var(--accent)')
  const [search, setSearch] = useState('')

  const fetchData = async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const [usersResp, statusResp] = await Promise.all([api.getUsers(), api.getStatus()])
      setUsers(usersResp.users)
      setStatus(statusResp.status)
      setHasError(false)
    } catch {
      if (initial) setHasError(true)
    } finally {
      if (initial) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData(true)
    const id = window.setInterval(() => {
      void fetchData(false)
    }, 15000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const readAccent = () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      if (accent) setAccentColor(accent)
    }
    readAccent()
    const observer = new MutationObserver(readAccent)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const totalTrafficTodayMB = useMemo(
    () => users.reduce((sum, user) => sum + parseTraffic(user.trafficDay), 0),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q))
  }, [users, search])

  const barData: BarRow[] = useMemo(() => {
    return [...users]
      .map((u) => ({
        fullName: u.name,
        name: u.name.length > 14 ? `${u.name.slice(0, 12)}…` : u.name,
        trafficMB: Math.round(parseTraffic(u.trafficDay) * 100) / 100,
        displayDay: u.trafficDay || '-',
        displayMon: u.trafficMon || '-',
      }))
      .sort((a, b) => b.trafficMB - a.trafficMB)
  }, [users])

  const totalTrafficLabel =
    totalTrafficTodayMB >= 1024
      ? `${(totalTrafficTodayMB / 1024).toFixed(2)} ${t('unit_gb')}`
      : `${totalTrafficTodayMB.toFixed(1)} ${t('unit_mb')}`
  const upperStatus = String(status).toUpperCase()
  const statusLabel = upperStatus.includes('RUN')
    ? t('server_running')
    : upperStatus.includes('OFFLINE') || upperStatus.includes('UNAVAILABLE')
      ? t('server_offline')
      : t('server_idle')

  const onAddUser = async (payload: {
    name: string
    password: string
    quotaDayMB: number
    quotaMonthMB: number
    expiresAt: number
  }) => {
    const res = await api.addUser(payload)
    success(t('toast_user_added'))
    if (res.autoStarted) success(t('toast_server_auto_started'))
    await fetchData(false)
  }

  const onDeleteUser = async () => {
    if (!deleteName) return
    try {
      await api.deleteUser(deleteName)
      success(t('toast_user_deleted'))
      setDeleteName(null)
      await fetchData(false)
    } catch {
      error(t('toast_error'))
    }
  }

  const onRegenUser = async (name: string) => {
    const response = await api.regenUser(name)
    await fetchData(false)
    return response.password
  }

  const onUpdateUser = async (
    name: string,
    payload: { quotaDayMB?: number; quotaMonthMB?: number; expiresAt?: number },
  ) => {
    await api.updateUser(name, payload)
    success(t('toast_user_updated'))
    await fetchData(false)
  }

  const downloadSubscriptions = () => {
    window.location.href = api.exportSubscriptionsUrl()
  }

  // Avoid unused lint warnings while we keep `router` available for tab
  // navigation triggered elsewhere on the page.
  void router

  return (
    <section className="dashboard-stack">
      <Toasts />

      <div className="stats-grid">
        <StatCard label={t('stat_total_users')} value={users.length} accent />
        <StatCard label={t('stat_total_traffic_today')} value={totalTrafficLabel} />
        <StatCard label={t('stat_server_status')} value={statusLabel} />
      </div>

      <div className={`tabs-stack tab-${tab}`}>
      <div className={`tab-pane ${tab === 'users' ? 'active' : 'inactive'}`}>
        <>
          {!loading && users.length === 0 ? (
            <div className="dashboard-card empty-state">
              <h2>{t('empty_state_title')}</h2>
              <p className="muted">{t('empty_state_hint')}</p>
              <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
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
                <button type="button" className="btn-secondary" onClick={downloadSubscriptions}>
                  ⤓ {t('users_export_subs')}
                </button>
              </div>
              {barData.length === 0 || barData.every((row) => row.trafficMB === 0) ? (
                <p className="muted" style={{ marginBottom: 0 }}>{t('stats_chart_empty')}</p>
              ) : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ top: 10, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={64}
                      />
                      <YAxis
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: 11 }}
                        label={{
                          value: t('stats_chart_axis_mb'),
                          angle: -90,
                          position: 'insideLeft',
                          fill: 'var(--text-secondary)',
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}
                        formatter={(value: number) => [
                          `${value} ${t('unit_mb').toUpperCase()}`,
                          t('stats_day'),
                        ]}
                        labelFormatter={(label, payload) => {
                          const full = payload?.[0]?.payload as BarRow | undefined
                          return full?.fullName ?? String(label)
                        }}
                        contentStyle={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary)',
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
                <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
                  + {t('users_add')}
                </button>
              </div>
            </div>
            <UserTable
              users={filteredUsers}
              loading={loading}
              error={hasError}
              onRetry={() => void fetchData(true)}
              onDelete={(name) => setDeleteName(name)}
              onRegen={onRegenUser}
              onUpdate={onUpdateUser}
              onAdd={() => setShowAdd(true)}
            />
          </div>
        </>
      </div>

      <div className={`tab-pane ${tab === 'server' ? 'active' : 'inactive'}`}>
        <div className="dashboard-card">
          <ServerStatus initialStatus={status} onStatusChange={setStatus} />
        </div>
        <ConnectionsPanel />
        <ServerConfigPanel />
        <AdvancedSettingsPanel />
        <ConfigBackupPanel onRestored={() => void fetchData(false)} />
        <AdminCredentialsPanel />
      </div>

      <div className={`tab-pane ${tab === 'logs' ? 'active' : 'inactive'}`}>
        <LogsPanel />
      </div>
      </div>

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={onAddUser} />

      <ConfirmModal
        open={deleteName !== null}
        title={t('confirm_delete_title')}
        message={t('confirm_delete_message', { name: deleteName || '' })}
        confirmLabel={t('confirm_yes')}
        cancelLabel={t('confirm_no')}
        onConfirm={() => void onDeleteUser()}
        onCancel={() => setDeleteName(null)}
      />
    </section>
  )
}

// Re-export so other components can deep-link to a tab. dashboardHref is
// already exported from the lib but referenced here via `parseDashboardTab`
// to keep the import surface stable.
export { dashboardHref }
