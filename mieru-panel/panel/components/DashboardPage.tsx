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
import { ConfirmModal } from './ConfirmModal'
import { ServerStatus } from './ServerStatus'
import { StatCard } from './StatCard'
import { Toasts } from './Toast'
import { UserTable } from './UserTable'
import { useToast } from './useToast'

function parseTraffic(raw?: string): number {
  if (!raw) return 0
  const value = Number(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  if (Number.isNaN(value)) return 0
  const up = raw.toUpperCase()
  if (up.includes('GB')) return value * 1024
  if (up.includes('MB')) return value
  if (up.includes('KB')) return value / 1024
  return value / (1024 * 1024)
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

  const fetchData = async () => {
    setLoading(true)
    setHasError(false)
    try {
      const [usersResp, statusResp] = await Promise.all([api.getUsers(), api.getStatus()])
      setUsers(usersResp.users)
      setStatus(statusResp.status)
    } catch {
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
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
  const statusLabel = String(status).toUpperCase().includes('RUN')
    ? t('server_running')
    : t('server_idle')

  const goTab = (next: Parameters<typeof dashboardHref>[0]) => {
    router.replace(dashboardHref(next))
  }

  const onAddUser = async (payload: {
    name: string
    password: string
    quotaDayMB: number
    quotaMonthMB: number
  }) => {
    await api.addUser(payload)
    success(t('toast_user_added'))
    await fetchData()
  }

  const onDeleteUser = async () => {
    if (!deleteName) return
    try {
      await api.deleteUser(deleteName)
      success(t('toast_user_deleted'))
      setDeleteName(null)
      await fetchData()
    } catch {
      error(t('toast_error'))
    }
  }

  const onRegenUser = async (name: string) => {
    const response = await api.regenUser(name)
    await fetchData()
    return response.password
  }

  return (
    <section className="dashboard-stack">
      <Toasts />
      <div className="tabs-row">
        <button
          type="button"
          className={`tab-btn ${tab === 'users' ? 'active' : ''}`}
          onClick={() => goTab('users')}
        >
          {t('tab_users')}
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => goTab('stats')}
        >
          {t('tab_stats')}
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'server' ? 'active' : ''}`}
          onClick={() => goTab('server')}
        >
          {t('tab_server')}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label={t('stat_total_users')} value={users.length} accent />
        <StatCard label={t('stat_total_traffic_today')} value={totalTrafficLabel} />
        <StatCard label={t('stat_server_status')} value={statusLabel} />
      </div>

      {tab === 'users' ? (
        <div className="dashboard-card">
          <div className="section-head">
            <h2>{t('nav_users')}</h2>
            <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
              + {t('users_add')}
            </button>
          </div>
          <UserTable
            users={users}
            loading={loading}
            error={hasError}
            onRetry={() => void fetchData()}
            onDelete={(name) => setDeleteName(name)}
            onRegen={onRegenUser}
            onAdd={() => setShowAdd(true)}
          />
        </div>
      ) : null}

      {tab === 'stats' ? (
        <div className="dashboard-card">
          <h2>{t('stats_chart_title')}</h2>
          <p className="muted">{t('stats_chart_hint')}</p>
          {barData.length === 0 ? (
            <p className="muted">{t('stats_chart_empty')}</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 10, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={72}
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
                    formatter={(value: number) => [`${value} ${t('unit_mb').toUpperCase()}`, t('stats_day')]}
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
                  <Bar dataKey="trafficMB" fill={accentColor} name={t('stats_day')} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <h3>{t('stats_table_title')}</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>{t('users_col_name')}</th>
                <th>{t('stats_day')}</th>
                <th>{t('stats_month')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.name}>
                  <td>{user.name}</td>
                  <td>{user.trafficDay || '-'}</td>
                  <td>{user.trafficMon || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'server' ? (
        <>
          <div className="dashboard-card">
            <ServerStatus initialStatus={status} onStatusChange={setStatus} />
          </div>
          <AdminCredentialsPanel />
        </>
      ) : null}

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
