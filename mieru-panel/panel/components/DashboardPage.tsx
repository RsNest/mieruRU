'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import type { DashboardTab } from '@/lib/dashboardTab'
import { useConnectionsCount } from '@/hooks/useConnectionsCount'
import { useUsersStats } from '@/hooks/useUsersStats'
import type { User } from '@/lib/types'
import { useServerStatusStore } from '@/store/serverStatus'
import { AddUserModal } from './AddUserModal'
import { ConfirmModal } from './ConfirmModal'
import { DashboardPage as DashboardOverview } from './dashboard/DashboardPage'
import { DashboardServerTab } from './DashboardServerTab'
import { DashboardUsersTab } from './DashboardUsersTab'
import { Toasts } from './Toast'
import { useToast } from './useToast'

type DashboardPageProps = {
  forcedTab: DashboardTab
}

export function DashboardPage({ forcedTab }: DashboardPageProps) {
  const { t } = useTranslation()
  const { success, error } = useToast()
  const tab = forcedTab
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const status = useServerStatusStore((state) => state.status)
  const statusSince = useServerStatusStore((state) => state.currentStatusSince)
  const startStatusPolling = useServerStatusStore((state) => state.startPolling)
  const stopStatusPolling = useServerStatusStore((state) => state.stopPolling)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteName, setDeleteName] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { count: connectionsCount, loading: connectionsLoading, available: connectionsAvailable } =
    useConnectionsCount(tab === 'users')

  const fetchData = async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const usersResp = await api.getUsers()
      setUsers(usersResp.users)
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
    startStatusPolling()
    return () => stopStatusPolling()
  }, [startStatusPolling, stopStatusPolling])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q))
  }, [users, search])
  const usersStats = useUsersStats(users)

  const onAddUser = async (payload: {
    name: string
    password: string
    quotaDayMB: number
    quotaMonthMB: number
    expiresAt: number
    maxDevices: number
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
    payload: {
      quotaDayMB?: number
      quotaMonthMB?: number
      expiresAt?: number
      maxDevices?: number
    },
  ) => {
    await api.updateUser(name, payload)
    success(t('toast_user_updated'))
    await fetchData(false)
  }

  const onResetDevices = async (name: string, fingerprint?: string) => {
    await api.resetDevices(name, fingerprint)
    await fetchData(false)
  }

  const onBulkDelete = async (names: string[]) => {
    await api.bulkDeleteUsers(names)
    await fetchData(false)
  }

  const downloadSubscriptions = () => {
    window.location.href = api.exportSubscriptionsUrl()
  }

  return (
    <section className="dashboard-stack">
      <Toasts />

      <div className={`tabs-stack tab-${tab}`}>
        {tab === 'dashboard' ? (
          <DashboardOverview
            users={users}
            metricsEnabled
            timeseriesEnabled
          />
        ) : null}

        <DashboardUsersTab
          active={tab === 'users'}
          users={users}
          filteredUsers={filteredUsers}
          loading={loading}
          connectionsLoading={connectionsLoading}
          hasError={hasError}
          search={search}
          setSearch={setSearch}
          usersTotal={usersStats.totalUsers}
          usersActive5m={usersStats.activeUsers5m}
          todayTrafficTotal={usersStats.todayTrafficTotal}
          todayTrafficUsers={usersStats.todayNonZeroCount}
          connectionsCount={connectionsCount}
          connectionsAvailable={connectionsAvailable}
          serverStatus={status}
          serverStatusSince={statusSince}
          todayTopUsers={usersStats.todayTopUsers}
          monthTopUsers={usersStats.monthTopUsers}
          onShowAdd={() => setShowAdd(true)}
          onClearSearch={() => setSearch('')}
          onRetry={() => void fetchData(true)}
          onDelete={(name) => setDeleteName(name)}
          onRegen={onRegenUser}
          onUpdate={onUpdateUser}
          onResetDevices={onResetDevices}
          onBulkDelete={onBulkDelete}
          onDownloadSubscriptions={downloadSubscriptions}
        />

        <DashboardServerTab active={tab === 'settings'} onRestored={() => void fetchData(false)} />
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
