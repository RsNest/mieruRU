export type DashboardTab = 'users' | 'stats' | 'server' | 'logs'

export function parseDashboardTab(searchParams: URLSearchParams): DashboardTab {
  const v = searchParams.get('tab')
  if (v === 'stats' || v === 'server' || v === 'logs') return v
  return 'users'
}

export function dashboardHref(tab: DashboardTab): string {
  if (tab === 'users') return '/'
  return `/?tab=${tab}`
}