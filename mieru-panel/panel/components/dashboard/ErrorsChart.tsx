'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardTimeseriesResponse } from '@/hooks/useDashboardTimeseries'

type ErrorsChartProps = {
  data: DashboardTimeseriesResponse | null
  error?: string | null
}

export function ErrorsChart({ data, error }: ErrorsChartProps) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    const buckets = data?.buckets ?? []
    return buckets.map((b) => {
      const d = new Date(b.t)
      const label = Number.isNaN(d.getTime()) ? b.t : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      return { label, errors: b.errors }
    })
  }, [data])

  // The errors series is meaningful only once the ring has collected data;
  // before that we render a matching warm-up hint so the two charts stay in sync.
  const hasAnyErrors = useMemo(() => chartData.some((p) => p.errors > 0), [chartData])

  return (
    <div className="dashboard-card">
      <div className="section-head">
        <h2>{t('dashboard.chart_errors')}</h2>
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
        {chartData.length === 0 || !hasAnyErrors ? (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
            {t('dashboard.chart_warming_up')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={32} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="errors" name={t('dashboard.chart_errors')} fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
