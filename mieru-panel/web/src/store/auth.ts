import { create } from 'zustand'
import { api } from '../api/client'

type AuthState = {
  isAuthed: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthed: false,
  login: async (username, password) => {
    await api.login(username, password)
    set({ isAuthed: true })
  },
  logout: async () => {
    await api.logout()
    set({ isAuthed: false })
  },
  bootstrap: async () => {
    try {
      const result = await api.me()
      set({ isAuthed: result.authenticated })
    } catch {
      set({ isAuthed: false })
    }
  },
}))
