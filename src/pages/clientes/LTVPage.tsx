import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, Clock, Target } from 'lucide-react'

import { getDemoData } from '@/services/demo-data'
import { calculateLTV } from '@/services/customer-analytics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { formatCurrency, formatNumber } from '@/lib/utils'

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
  valueFormatter = formatCurrency,
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
// LTV Health Indicator
// ---------------------------------------------------------------------------

function LTVHealthBadge({ ratio }: { ratio: number }) {
  let color: string
  let label: string

  if (ratio >= 5) {
    color = 'bg-green-50 text-green-700 ring-green-600/20'
    label = 'Excelente'
  } else if (ratio >= 3) {
    color = 'bg-blue-50 text-blue-700 ring-blue-600/20'
    label = 'Saudavel'
  } else if (ratio >= 1) {
    color = 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
    label = 'Atencao'
  } else {
    color = 'bg-red-50 text-red-700 ring-red-600/20'
    label = 'Critico'
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {label} ({ratio.toFixed(1)}x)
    </span>
  )
}

// ---------------------------------------------------------------------------
// LTVPage
// ---------------------------------------------------------------------------

export function LTVPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const demoData = useMemo(() => getDemoData(), [])

  const ltvData = useMemo(
    () => calculateLTV(demoData.transactions),
    [demoData.transactions],
  )

  // Horizontal bar chart data for LTV by product
  const productData = useMemo(
    () =>
      ltvData.byProduct.map((p) => ({
        name: p.product.length > 30 ? p.product.slice(0, 28) + '...' : p.product,
        ltv: Math.round(p.ltv),
        customers: p.customers,
      })),
    [ltvData.byProduct],
  )

  // Bar chart data for LTV by source
  const sourceData = useMemo(
    () =>
      ltvData.bySource.map((s) => ({
        name: s.source,
        ltv: Math.round(s.ltv),
        customers: s.customers,
      })),
    [ltvData.bySource],
  )

  // Distribution histogram
  const distributionData = useMemo(
    () =>
      ltvData.distribution.map((d) => ({
        range: d.range,
        count: d.count,
      })),
    [ltvData.distribution],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Lifetime Value (LTV)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Valor vitalicio dos seus clientes e analise de retorno sobre investimento
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="LTV Medio"
          value={ltvData.overall}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="LTV:CAC Ratio"
          value={ltvData.ltvToCac}
          format="number"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Payback Period"
          value={ltvData.paybackDays}
          format="number"
          icon={<Clock className="h-5 w-5" />}
        />
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Target className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Saude do LTV</p>
          <div className="mt-2">
            <LTVHealthBadge ratio={ltvData.ltvToCac} />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {ltvData.ltvToCac >= 3 ? 'Seu negocio esta saudavel' : 'Foco em aumentar LTV ou reduzir CAC'}
          </p>
        </div>
      </div>

      {/* LTV by Product (horizontal bar) */}
      <ChartContainer title="LTV por Produto" className="min-h-[420px]">
        <ResponsiveContainer width="100%" height={Math.max(productData.length * 55, 300)}>
          <BarChart
            data={productData}
            layout="vertical"
            margin={{ left: 20, right: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={shortCurrency}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={180}
            />
            <Tooltip content={<CustomTooltip valueFormatter={formatCurrency} />} />
            <Bar
              dataKey="ltv"
              name="LTV"
              fill="#3b82f6"
              radius={[0, 6, 6, 0]}
              barSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* LTV by Source + Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LTV by Source */}
        <ChartContainer title="LTV por Canal de Aquisicao" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
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
              <Tooltip content={<CustomTooltip valueFormatter={formatCurrency} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                dataKey="ltv"
                name="LTV"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Source details */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {ltvData.bySource.map((s) => (
              <div key={s.source} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                <p className="text-xs font-medium text-gray-500">{s.source}</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(s.ltv)}</p>
                <p className="text-xs text-gray-400">{formatNumber(s.customers)} clientes</p>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* Distribution Histogram */}
        <ChartContainer title="Distribuicao de LTV" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    valueFormatter={(v) => `${formatNumber(v)} clientes`}
                  />
                }
              />
              <Bar
                dataKey="count"
                name="Clientes"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Insights */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
              <span className="text-xs font-medium text-green-700">Clientes acima de R$1000</span>
              <span className="text-xs font-bold text-green-800">
                {formatNumber(
                  ltvData.distribution
                    .filter((d) => d.range.includes('1000') || d.range.includes('2000'))
                    .reduce((s, d) => s + d.count, 0),
                )}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs font-medium text-gray-600">Mediana estimada</span>
              <span className="text-xs font-bold text-gray-800">
                {formatCurrency(ltvData.overall * 0.85)}
              </span>
            </div>
          </div>
        </ChartContainer>
      </div>
    </div>
  )
}
