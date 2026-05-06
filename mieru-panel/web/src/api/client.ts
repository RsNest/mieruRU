import type { ServerStatus, User } from '../types'

type LoginResponse = { ok: boolean }
type MeResponse = { authenticated: boolean }
type UsersResponse = { users: User[] }
type StatusResponse = { status: ServerStatus }
type RegenResponse = { ok: boolean; password: string }

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
  }) {
    return request<{ ok: boolean }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  deleteUser(name: string) {
    return request<{ ok: boolean }>(`/api/users/${encodeURIComponent(name)}`, {
      method: 'DELETE',
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
}
