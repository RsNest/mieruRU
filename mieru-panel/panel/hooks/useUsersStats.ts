'use client'

import { useMemo } from 'react'
import { parseTrafficToBytes } from '@/lib/traffic'
import type { User } from '@/lib/types'

export type TopUser = {
  name: string
  trafficBytes: number
  displayValue: string
}

type UsersStats = {
  activeUsers5m: number
  todayTrafficTotal: number
  todayNonZeroCount: number
  todayTopUsers: TopUser[]
  monthTopUsers: TopUser[]
  totalUsers: number
}

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

function formatBytes(bytes: number): string {
  const abs = Math.max(0, bytes)
  const gb = 1024 * 1024 * 1024
  const mb = 1024 * 1024
  const kb = 1024
  if (abs >= gb) return `${(abs / gb).toFixed(2)} GB`
  if (abs >= mb) return `${(abs / mb).toFixed(1)} MB`
  if (abs >= kb) return `${(abs / kb).toFixed(1)} KB`
  return `${abs} B`
}

function isActiveRecent(lastActive?: string): boolean {
  if (!lastActive) return false
  const ts = Date.parse(lastActive)
  if (Number.isNaN(ts)) return false
  return Date.now() - ts <= ACTIVE_WINDOW_MS
}

function buildTopUsers(users: User[], field: 'trafficDay' | 'trafficMon'): TopUser[] {
  return users
    .map((user) => {
      const trafficBytes = parseTrafficToBytes(user[field])
      return {
        name: user.name,
        trafficBytes,
        displayValue: formatBytes(trafficBytes),
      }
    })
    .filter((item) => item.trafficBytes > 0)
    .sort((a, b) => b.trafficBytes - a.trafficBytes)
}

export function useUsersStats(users: User[]): UsersStats {
  return useMemo(() => {
    const totalUsers = users.length
    const activeUsers5m = users.reduce((sum, user) => (isActiveRecent(user.lastActive) ? sum + 1 : sum), 0)
    const todayTrafficTotal = users.reduce((sum, user) => sum + parseTrafficToBytes(user.trafficDay), 0)
    const todayNonZeroCount = users.reduce(
      (sum, user) => (parseTrafficToBytes(user.trafficDay) > 0 ? sum + 1 : sum),
      0,
    )

    return {
      totalUsers,
      activeUsers5m,
      todayTrafficTotal,
      todayNonZeroCount,
      todayTopUsers: buildTopUsers(users, 'trafficDay'),
      monthTopUsers: buildTopUsers(users, 'trafficMon'),
    }
  }, [users])
}
