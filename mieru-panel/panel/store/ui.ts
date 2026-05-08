import { create } from 'zustand'

export type SidebarWidth = 'expanded' | 'collapsed'

type UIState = {
  sidebar: SidebarWidth
  mobileSidebarOpen: boolean
  logsDrawerOpen: boolean
  setSidebar: (next: SidebarWidth) => void
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setLogsDrawerOpen: (open: boolean) => void
  openLogs: () => void
  closeLogs: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebar: 'expanded',
  mobileSidebarOpen: false,
  logsDrawerOpen: false,
  setSidebar: (next) => set({ sidebar: next }),
  toggleSidebar: () =>
    set((state) => ({
      sidebar: state.sidebar === 'expanded' ? 'collapsed' : 'expanded',
    })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setLogsDrawerOpen: (open) => set({ logsDrawerOpen: open }),
  openLogs: () => set({ logsDrawerOpen: true }),
  closeLogs: () => set({ logsDrawerOpen: false }),
}))
