export type DashboardTab = 'users' | 'server' | 'logs'

export function dashboardHref(tab: DashboardTab): string {
  if (tab === 'users') return '/users'
  return `/${tab}`
}