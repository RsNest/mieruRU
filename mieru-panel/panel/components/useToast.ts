'use client'

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
  return {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
}

export function useToastItems() {
  return useToastStore((state) => state.toasts)
}
