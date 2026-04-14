import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Users, CalendarDays, TrendingUp, Repeat } from 'lucide-react'

import { getDemoData } from '@/services/demo-data'
import { calculateCohorts } from '@/services/customer-analytics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortCurrency(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(1)}K`
  return `R$${value.toFixed(0)}`
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  valueFormatter?: (v: number) => string
}

function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter = formatNumber,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold text-gray-900">
            {valueFormatter(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Retention heatmap color scale
// ---------------------------------------------------------------------------

function getRetentionColor(value: number): string {
  if (value >= 80) return '#15803d'   // green-700
  if (value >= 60) return '#22c55e'   // green-500
  if (value >= 40) return '#86efac'   // green-300
  if (value >= 20) return '#fbbf24'   // yellow-400
  if (value >= 10) return '#f97316'   // orange-500
  if (value > 0)   return '#ef4444'   // red-500
  return '#f3f4f6'                     // gray-100
}

function getRetentionTextColor(value: number): string {
  if (value >= 60) return '#ffffff'
  if (value >= 20) return '#1f2937'
  if (value > 0) return '#ffffff'
  return '#9ca3af'
}

// ---------------------------------------------------------------------------
// Line chart colors for cohorts
// ---------------------------------------------------------------------------

const COHORT_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
]

// ---------------------------------------------------------------------------
// CoortesPage
// ---------------------------------------------------------------------------

export function CoortesPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const demoData = useMemo(() => getDemoData(), [])

  const cohorts = useMemo(
    () => calculateCohorts(demoData.transactions),
    [demoData.transactions],
  )

  // Max retention columns across all cohorts
  const maxColumns = useMemo(
    () => Math.max(...cohorts.map((c) => c.retention.length), 0),
    [cohorts],
  )

  // KPI metrics
  const totalCohortCustomers = useMemo(
    () => cohorts.reduce((sum, c) => sum + c.totalCustomers, 0),
    [cohorts],
  )

  const avgMonth1Retention = useMemo(() => {
    const withMonth1 = cohorts.filter((c) => c.retention.length > 1)
    if (withMonth1.length === 0) return 0
    return withMonth1.reduce((sum, c) => sum + c.retention[1], 0) / withMonth1.length
  }, [cohorts])

  const totalCohortRevenue = useMemo(
    () => cohorts.reduce((sum, c) => sum + c.revenue.reduce((s, r) => s + r, 0), 0),
    [cohorts],
  )

  const latestCohortSize = cohorts.length > 0 ? cohorts[cohorts.length - 1].totalCustomers : 0

  // Retention curves data for LineChart
  const retentionCurves = useMemo(() => {
    const months = Array.from({ length: maxColumns }, (_, i) => i)
    return months.map((monthIdx) => {
      const point: Record<string, number | string> = { month: `Mes ${monthIdx}` }
      for (const cohort of cohorts) {
        if (monthIdx < cohort.retention.length) {
          point[cohort.cohortLabel] = Math.round(cohort.retention[monthIdx] * 10) / 10
        }
      }
      return point
    })
  }, [cohorts, maxColumns])

  // Revenue by cohort for BarChart
  const revenueByCohor = useMemo(
    () =>
      cohorts.map((c) => ({
        cohort: c.cohortLabel,
        revenue: c.revenue.reduce((sum, r) => sum + r, 0),
        customers: c.totalCustomers,
      })),
    [cohorts],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Analise de Coortes
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Retencao e receita agrupadas por mes de primeira compra
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total de Clientes"
          value={totalCohortCustomers}
          format="number"
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="Retencao Mes 1 (media)"
          value={avgMonth1Retention}
          format="percent"
          icon={<Repeat className="h-5 w-5" />}
        />
        <KPICard
          title="Receita Total Coortes"
          value={totalCohortRevenue}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Ultima Coorte"
          value={latestCohortSize}
          format="number"
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </div>

      {/* Retention Heatmap */}
      <ChartContainer title="Heatmap de Retencao por Coorte">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Coorte
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Clientes
                </th>
                {Array.from({ length: maxColumns }, (_, i) => (
                  <th
                    key={i}
                    className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                  >
                    Mes {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cohorts.map((cohort) => (
                <tr key={cohort.cohort}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                    {cohort.cohortLabel}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {formatNumber(cohort.totalCustomers)}
                  </td>
                  {Array.from({ length: maxColumns }, (_, i) => {
                    const value = i < cohort.retention.length ? cohort.retention[i] : null
                    if (value === null) {
                      return (
                        <td key={i} className="px-1 py-1">
                          <div className="mx-auto h-9 w-16 rounded bg-gray-50" />
                        </td>
                      )
                    }
                    return (
                      <td key={i} className="px-1 py-1">
                        <div
                          className={cn(
                            'mx-auto flex h-9 w-16 items-center justify-center rounded',
                            'text-xs font-semibold transition-all duration-200',
                          )}
                          style={{
                            backgroundColor: getRetentionColor(value),
                            color: getRetentionTextColor(value),
                          }}
                        >
                          {value.toFixed(1)}%
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Color legend */}
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
          <span>Baixa</span>
          <div className="flex gap-0.5">
            {[0, 10, 20, 40, 60, 80, 100].map((v) => (
              <div
                key={v}
                className="h-3 w-6 rounded-sm"
                style={{ backgroundColor: getRetentionColor(v) }}
              />
            ))}
          </div>
          <span>Alta</span>
        </div>
      </ChartContainer>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Retention Curves */}
        <ChartContainer title="Curvas de Retencao por Coorte" className="min-h-[420px]">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={retentionCurves}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                content={
                  <CustomTooltip valueFormatter={(v) => `${v.toFixed(1)}%`} />
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {cohorts.map((cohort, idx) => (
                <Line
                  key={cohort.cohort}
                  type="monotone"
                  dataKey={cohort.cohortLabel}
                  name={cohort.cohortLabel}
                  stroke={COHORT_COLORS[idx % COHORT_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Revenue by Cohort */}
        <ChartContainer title="Receita por Coorte" className="min-h-[420px]">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueByCohor}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="cohort"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={shortCurrency}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                content={
                  <CustomTooltip valueFormatter={formatCurrency} />
                }
              />
              <Bar
                dataKey="revenue"
                name="Receita"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
