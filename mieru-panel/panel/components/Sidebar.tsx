'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, PanelLeft, PanelLeftClose, Settings, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { LangSwitcher } from './LangSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

type SidebarProps = {
  mobile?: boolean
}

type NavItem = {
  href: '/dashboard' | '/users' | '/settings'
  labelKey: 'nav_dashboard' | 'nav_users' | 'nav_settings'
  icon: typeof Users
}

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
  { href: '/users', labelKey: 'nav_users', icon: Users },
  { href: '/settings', labelKey: 'nav_settings', icon: Settings },
]

export function Sidebar({ mobile = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const sidebar = useUIStore((state) => state.sidebar)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const logout = useAuthStore((state) => state.logout)

  const collapsed = sidebar === 'collapsed' && !mobile

  const onLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <aside className={`v2-sidebar ${collapsed ? 'collapsed' : 'expanded'} ${mobile ? 'mobile' : ''}`}>
      <div className="v2-sidebar-head">
        <Link href="/dashboard" className="v2-wordmark">
          <span className="v2-wordmark-glyph">見</span>
          {!collapsed ? <span>mieru</span> : null}
        </Link>
        {!mobile ? (
          <button
            type="button"
            className="v2-icon-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? t('sidebar_expand') : t('sidebar_collapse')}
            title={collapsed ? t('sidebar_expand') : t('sidebar_collapse')}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        ) : null}
      </div>

      <nav className="v2-sidebar-nav" aria-label={t('topbar_breadcrumb_home')}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className={`v2-nav-item ${active ? 'active' : ''}`}>
              <Icon size={16} />
              {!collapsed ? <span>{t(item.labelKey)}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="v2-sidebar-bottom">
        <ThemeSwitcher mode="select" compact={collapsed} />
        <LangSwitcher mode="segmented" compact={collapsed} />
        <button type="button" className="v2-logout-btn" onClick={() => void onLogout()}>
          <LogOut size={16} />
          {!collapsed ? <span>{t('nav_logout')}</span> : null}
        </button>
      </div>
    </aside>
  )
}
