import { create } from 'zustand'

export type SidebarWidth = 'expanded' | 'collapsed'

type UIState = {
  sidebar: SidebarWidth
  mobileSidebarOpen: boolean
  setSidebar: (next: SidebarWidth) => void
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebar: 'expanded',
  mobileSidebarOpen: false,
  setSidebar: (next) => set({ sidebar: next }),
  toggleSidebar: () =>
    set((state) => ({
      sidebar: state.sidebar === 'expanded' ? 'collapsed' : 'expanded',
    })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}))
