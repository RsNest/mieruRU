import type {
  AdvancedSettings,
  AuditEntry,
  ConnectionInfo,
  LogEntry,
  ServerConfig,
  ServerStatus,
  SubSecurity,
  User,
} from '@/lib/types'

type LoginResponse = { ok: boolean }
type MeResponse = { authenticated: boolean; username?: string }
type UsersResponse = { users: User[] }
type StatusResponse = { status: ServerStatus }
type RegenResponse = { ok: boolean; password: string }
type LogsResponse = { entries: LogEntry[] }
type MitaLogsResponse = { output: string; available: boolean; error?: string }
type ConnectionsResponse = { items: ConnectionInfo[]; available: boolean; error?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) {
        message = payload.error
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}

export const api = {
  login(username: string, password: string) {
    return request<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },
  logout() {
    return request<{ ok: boolean }>('/api/logout', { method: 'POST' })
  },
  me() {
    return request<MeResponse>('/api/me')
  },
  getUsers() {
    return request<UsersResponse>('/api/users')
  },
  addUser(payload: {
    name: string
    password: string
    quotaDayMB: number
    quotaMonthMB: number
    expiresAt?: number
    maxDevices?: number
  }) {
    return request<{ ok: boolean; autoStarted?: boolean }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  updateUser(
    name: string,
    payload: {
      quotaDayMB?: number
      quotaMonthMB?: number
      expiresAt?: number
      maxDevices?: number
    },
  ) {
    return request<{ ok: boolean }>(`/api/users/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  deleteUser(name: string) {
    return request<{ ok: boolean }>(`/api/users/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
  },
  bulkDeleteUsers(names: string[]) {
    return request<{ ok: boolean; removed: number }>(`/api/users/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ names }),
    })
  },
  resetDevices(name: string, fingerprint?: string) {
    const path = fingerprint
      ? `/api/users/${encodeURIComponent(name)}/devices/${encodeURIComponent(fingerprint)}`
      : `/api/users/${encodeURIComponent(name)}/devices`
    return request<{ ok: boolean }>(path, { method: 'DELETE' })
  },
  getAudit(n = 200) {
    return request<{ entries: AuditEntry[] }>(`/api/audit?n=${n}`)
  },
  getSubSecurity() {
    return request<SubSecurity>('/api/security/subscription')
  },
  updateSubSecurity(payload: { allowedUserAgents: string[]; requireHWID: boolean }) {
    return request<{ ok: boolean }>('/api/security/subscription', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  regenUser(name: string) {
    return request<RegenResponse>(`/api/users/${encodeURIComponent(name)}/regenerate`, {
      method: 'POST',
    })
  },
  getStatus() {
    return request<StatusResponse>('/api/status')
  },
  startServer() {
    return request<{ ok: boolean }>('/api/mita/start', { method: 'POST' })
  },
  stopServer() {
    return request<{ ok: boolean }>('/api/mita/stop', { method: 'POST' })
  },
  updateAdminCredentials(payload: {
    currentPassword: string
    newUsername: string
    newPassword: string
  }) {
    return request<{ ok: boolean }>('/api/admin/credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getLogs(sinceSeq?: number) {
    const qs = sinceSeq ? `?since=${sinceSeq}` : ''
    return request<LogsResponse>(`/api/logs${qs}`)
  },
  getMitaLogs(lines = 200) {
    return request<MitaLogsResponse>(`/api/mita/logs?lines=${lines}`)
  },
  getServerConfig() {
    return request<ServerConfig>('/api/server-config')
  },
  updateServerConfig(payload: ServerConfig) {
    return request<{ ok: boolean; warning?: string }>('/api/server-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  getUserConfig(name: string) {
    return request<Record<string, unknown>>(`/api/users/${encodeURIComponent(name)}/config`)
  },
  getConnections() {
    return request<ConnectionsResponse>('/api/connections')
  },
  getAdvancedSettings() {
    return request<AdvancedSettings>('/api/advanced')
  },
  updateAdvancedSettings(payload: AdvancedSettings) {
    return request<{ ok: boolean; warning?: string }>('/api/advanced', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  exportSubscriptionsUrl(): string {
    return '/api/subscriptions/export'
  },
  configBackupUrl(): string {
    return '/api/config/backup'
  },
  async restoreConfig(file: File) {
    const text = await file.text()
    const response = await fetch('/api/config/restore', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    })
    if (!response.ok) {
      let message = response.statusText
      try {
        const payload = (await response.json()) as { error?: string }
        if (payload.error) message = payload.error
      } catch {
        // ignore parse errors
      }
      throw new Error(message)
    }
    return (await response.json()) as { ok: boolean; warning?: string }
  },
}