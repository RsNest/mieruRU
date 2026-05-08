'use client'

import type { User } from '@/lib/types'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useDashboardTimeseries } from '@/hooks/useDashboardTimeseries'
import { BandwidthChart } from './BandwidthChart'
import { DashboardKpi } from './DashboardKpi'
import { DashboardTopUsers } from './DashboardTopUsers'
import { ErrorsChart } from './ErrorsChart'
import { HeroStatus } from './HeroStatus'
import { MitaInternals } from './MitaInternals'
import { RecentAudit } from './RecentAudit'
import { ResourceCards } from './ResourceCards'

export type DashboardPageProps = {
  /** User list for traffic leaders; pass `[]` until a route wires users in. */
  users?: User[]
  metricsEnabled?: boolean
  timeseriesEnabled?: boolean
}

export function DashboardPage({
  users = [],
  metricsEnabled = true,
  timeseriesEnabled = true,
}: DashboardPageProps) {
  const { data: metricsData, error: metricsError } = useDashboardMetrics({ enabled: metricsEnabled })
  const { data: tsData, error: tsError } = useDashboardTimeseries({ enabled: timeseriesEnabled })

  return (
    <div className="dashboard-stack">
      <HeroStatus metricsError={metricsError} />
      <DashboardKpi data={metricsData} />
      <div className="server-section-grid">
        <BandwidthChart data={tsData} error={tsError} />
        <ErrorsChart data={tsData} error={tsError} />
      </div>
      <ResourceCards data={metricsData} />
      <DashboardTopUsers users={users} />
      <MitaInternals data={metricsData} />
      <RecentAudit />
    </div>
  )
}
