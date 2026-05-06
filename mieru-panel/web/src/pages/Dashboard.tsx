import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { AddUserModal } from '../components/AddUserModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { ServerStatus } from '../components/ServerStatus'
import { StatCard } from '../components/StatCard'
import { Toasts } from '../components/Toast'
import { UserTable } from '../components/UserTable'
import { useToast } from '../components/useToast'
import type { ServerStatus as ServerStatusValue, User } from '../types'

type Tab = 'users' | 'stats' | 'server'

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

export function DashboardPage() {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [status, setStatus] = useState<ServerStatusValue>('IDLE')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteName, setDeleteName] = useState<string | null>(null)

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

  const totalTrafficTodayMB = useMemo(
    () => users.reduce((sum, user) => sum + parseTraffic(user.trafficDay), 0),
    [users],
  )

  const totalTrafficLabel = totalTrafficTodayMB >= 1024
    ? `${(totalTrafficTodayMB / 1024).toFixed(2)} ${t('unit_gb')}`
    : `${totalTrafficTodayMB.toFixed(1)} ${t('unit_mb')}`
  const statusLabel = String(status).toUpperCase().includes('RUN')
    ? t('server_running')
    : t('server_idle')

  const chartData = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7].map((day, index) => ({
        day: String(day),
        traffic: 320 + index * 40,
      })),
    [],
  )

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
        <button type="button" className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          {t('tab_users')}
        </button>
        <button type="button" className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          {t('tab_stats')}
        </button>
        <button type="button" className={`tab-btn ${tab === 'server' ? 'active' : ''}`} onClick={() => setTab('server')}>
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
            <button type="button" className="primary-btn" onClick={() => setShowAdd(true)}>
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
          <p className="muted">{t('stats_mock_hint')}</p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip />
                <Area type="monotone" dataKey="traffic" stroke="var(--accent)" fill="var(--accent-dim)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
        <div className="dashboard-card">
          <ServerStatus initialStatus={status} onStatusChange={setStatus} />
        </div>
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
