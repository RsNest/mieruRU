'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardTimeseriesResponse } from '@/hooks/useDashboardTimeseries'

type BandwidthChartProps = {
  data: DashboardTimeseriesResponse | null
  error?: string | null
}

export function BandwidthChart({ data, error }: BandwidthChartProps) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    const buckets = data?.buckets ?? []
    return buckets.map((b) => {
      const d = new Date(b.t)
      const label = Number.isNaN(d.getTime()) ? b.t : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      return {
        label,
        rxMb: b.rxBytes / (1024 * 1024),
        txMb: b.txBytes / (1024 * 1024),
      }
    })
  }, [data])

  // Treat the chart as "warming up" while the ring is empty or carries only zero-sum buckets.
  // The collector fills minute buckets lazily, so the first ~5 minutes after boot are expected to be flat.
  const hasAnyTraffic = useMemo(
    () => chartData.some((p) => p.rxMb > 0 || p.txMb > 0),
    [chartData],
  )

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <h2>{t('dashboard.chart_bandwidth')}</h2>
        {error ? <span className="muted">{error}</span> : null}
      </div>
      <div
        style={{
          width: '100%',
          height: 260,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {chartData.length === 0 || !hasAnyTraffic ? (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
            {t('dashboard.chart_warming_up')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                }}
                labelStyle={{ color: 'var(--color-text-secondary)' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="rxMb"
                name={t('dashboard.chart_rx')}
                stroke="var(--color-accent)"
                fill="color-mix(in oklab, var(--color-accent) 35%, transparent)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="txMb"
                name={t('dashboard.chart_tx')}
                stroke="var(--color-success)"
                fill="color-mix(in oklab, var(--color-success) 28%, transparent)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

