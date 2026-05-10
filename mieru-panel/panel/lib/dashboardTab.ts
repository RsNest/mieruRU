export type DashboardTab = 'dashboard' | 'users' | 'settings'

/** Map a tab slug to its canonical route path. */
export function dashboardHref(tab: DashboardTab): string {
  return `/${tab}`
}

/** Coerce an unknown value to a known tab. Anything unexpected becomes 'dashboard'. */
export function parseDashboardTab(value: unknown): DashboardTab {
  if (value === 'users' || value === 'settings' || value === 'dashboard') {
    return value
  }
  return 'dashboard'
}
