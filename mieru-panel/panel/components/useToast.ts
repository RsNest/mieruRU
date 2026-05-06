'use client'

import { useMemo } from 'react'
import { create } from 'zustand'

type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  kind: ToastKind
  message: string
}

type ToastStore = {
  toasts: ToastItem[]
  push: (kind: ToastKind, message: string) => void
  remove: (id: string) => void
}

const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    set((state) => {
      const next = [...state.toasts, { id, kind, message }]
      return { toasts: next.slice(-3) }
    })
    window.setTimeout(() => get().remove(id), 3000)
  },
  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

export function useToast() {
  const push = useToastStore((state) => state.push)
  // The push action from the zustand store is reference-stable, so the
  // returned object is also stable as long as the store identity is.
  // Components depend on these handlers in useEffect arrays; without
  // useMemo every render created a fresh object and effects (e.g. the
  // log polling) thrashed their intervals on every state change.
  return useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  )
}

export function useToastItems() {
  return useToastStore((state) => state.toasts)
}
