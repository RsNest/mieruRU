export type DashboardTab = 'users' | 'server' | 'logs'

export function parseDashboardTab(searchParams: URLSearchParams): DashboardTab {
  const v = searchParams.get('tab')
  if (v === 'server' || v === 'logs') return v
  // Stats tab was removed — the per-user chart now lives at the top of
  // the Users tab. Old bookmarks just land on the default Users view.
  return 'users'
}

export function dashboardHref(tab: DashboardTab): string {
  if (tab === 'users') return '/'
  return `/?tab=${tab}`
}