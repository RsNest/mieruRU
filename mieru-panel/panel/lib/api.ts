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

export type LoginStep1Response = { ok: true } | { requires_2fa: true; challenge_token: string }

export class LoginLockedError extends Error {
  retryAfterSeconds: number

  constructor(message: string, retryAfterSeconds: number) {
    super(message)
    this.name = 'LoginLockedError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
type MeResponse = { authenticated: boolean; username?: string }
type UsersResponse = { users: User[] }
type StatusResponse = { status: ServerStatus }
type RegenResponse = { ok: boolean; password: string }
type LogsResponse = { entries: LogEntry[] }
type MitaLogsResponse = { output: string; available: boolean; error?: string }
type ConnectionsResponse = {
  items: ConnectionInfo[]
  available: boolean
  error?: string
  reason?: string
}

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

async function postLoginPayload(body: Record<string, unknown>): Promise<LoginStep1Response> {
  const response = await fetch('/api/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    requires_2fa?: boolean
    challenge_token?: string
    error?: string
    retry_after_seconds?: number
  }
  if (response.status === 423) {
    throw new LoginLockedError(data.error || 'locked', Number(data.retry_after_seconds ?? 900))
  }
  if (!response.ok) {
    throw new Error(data.error || response.statusText)
  }
  if (data.requires_2fa && data.challenge_token) {
    return { requires_2fa: true, challenge_token: data.challenge_token }
  }
  return { ok: true }
}

export const api = {
  /** Step 1 or step 2 admin login (2FA challenge flow). */
  postLogin(body: Record<string, unknown>) {
    return postLoginPayload(body)
  },
  get2FAStatus() {
    return request<{ enabled: boolean; backupCodesRemaining: number; activatedAt?: string }>(
      '/api/auth/2fa/status',
    )
  },
  setup2FA() {
    return request<{ secret: string; qrUri: string }>('/api/auth/2fa/setup', { method: 'POST', body: '{}' })
  },
  verify2FASetup(code: string) {
    return request<{ backupCodes: string[] }>('/api/auth/2fa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },
  disable2FA(password: string, code: string) {
    return request<{ ok: boolean }>('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    })
  },
  regenerate2FABackup(password: string, code: string) {
    return request<{ backupCodes: string[] }>('/api/auth/2fa/regenerate-backup', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
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