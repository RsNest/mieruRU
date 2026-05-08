import { create } from 'zustand'
import { api } from '@/lib/api'

export type CredentialsLoginResult =
  | { needs2FA: false }
  | { needs2FA: true; challengeToken: string }

type AuthState = {
  authReady: boolean
  isAuthed: boolean
  loginWithPassword: (username: string, password: string) => Promise<CredentialsLoginResult>
  complete2FALogin: (username: string, code: string, challengeToken: string, useBackup: boolean) => Promise<void>
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  authReady: false,
  isAuthed: false,
  loginWithPassword: async (username, password) => {
    const res = await api.postLogin({ username, password })
    if ('requires_2fa' in res && res.requires_2fa) {
      return { needs2FA: true, challengeToken: res.challenge_token }
    }
    set({ isAuthed: true })
    return { needs2FA: false }
  },
  complete2FALogin: async (username, code, challengeToken, useBackup) => {
    await api.postLogin({
      username,
      code,
      challenge_token: challengeToken,
      use_backup: useBackup,
    })
    set({ isAuthed: true })
  },
  logout: async () => {
    await api.logout()
    set({ isAuthed: false })
  },
  bootstrap: async () => {
    try {
      const result = await api.me()
      set({ isAuthed: result.authenticated, authReady: true })
    } catch {
      set({ isAuthed: false, authReady: true })
    }
  },
}))
