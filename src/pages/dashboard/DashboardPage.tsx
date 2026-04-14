import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  TrendingUp,
  RotateCcw,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import {
  calculateKPIs,
  getRevenueOverTime,
  getSalesByProduct,
  getPaymentMethodDistribution,
  getTopAffiliates,
  getSalesHeatmap,
  getFunnelData,
} from '@/services/metrics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { HeatmapChart } from '@/components/charts/HeatmapChart'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { formatCurrency, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Currency formatter for Recharts tooltips / axes
// ---------------------------------------------------------------------------
function shortCurrency(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(1)}K`
  return `R$${value.toFixed(0)}`
}

// ---------------------------------------------------------------------------
// Custom Recharts tooltip
// ---------------------------------------------------------------------------
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
        <div
          key={entry.dataKey}
          className="flex items-center gap-2 text-sm"
        >
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
// Heatmap data adapter: converts flat array from metrics to the 2D format
// that HeatmapChart expects ( HeatmapCell[][] )
// ---------------------------------------------------------------------------
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function adaptHeatmapData(
  flat: { day: number; hour: number; value: number }[],
) {
  const grid: { day: string; hour: number; value: number }[][] = DAY_LABELS.map(
    () => [],
  )
  for (const cell of flat) {
    grid[cell.day].push({
      day: DAY_LABELS[cell.day],
      hour: cell.hour,
      value: cell.value,
    })
  }
  return grid
}

// ---------------------------------------------------------------------------
// Pie chart colors (stable reference)
// ---------------------------------------------------------------------------
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------
function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const { data: demoData } = useData()

  // KPIs
  const kpis = useMemo(
    () => calculateKPIs(demoData, dateRange),
    [demoData, dateRange],
  )

  // Charts data
  const revenueOverTime = useMemo(
    () => getRevenueOverTime(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  const salesByProduct = useMemo(
    () => getSalesByProduct(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  const paymentDistribution = useMemo(
    () => getPaymentMethodDistribution(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  const topAffiliates = useMemo(
    () => getTopAffiliates(demoData.transactions, dateRange, 10),
    [demoData, dateRange],
  )

  const heatmapData = useMemo(
    () => adaptHeatmapData(getSalesHeatmap(demoData.transactions, dateRange)),
    [demoData, dateRange],
  )

  const funnelData = useMemo(() => getFunnelData(), [])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Visao geral das suas vendas e metricas
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* KPI Cards                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KPICard
          title="Receita Total"
          value={kpis.totalRevenue}
          previousValue={kpis.previousRevenue}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Vendas Realizadas"
          value={kpis.totalSales}
          previousValue={kpis.previousSales}
          format="number"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="Ticket Medio"
          value={kpis.avgTicket}
          previousValue={kpis.previousAvgTicket}
          format="currency"
          icon={<Receipt className="h-5 w-5" />}
        />
        <KPICard
          title="MRR"
          value={kpis.mrr}
          previousValue={kpis.previousMrr}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Reembolsos"
          value={kpis.refundCount}
          previousValue={kpis.previousRefundCount}
          format="number"
          icon={<RotateCcw className="h-5 w-5" />}
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Charts Grid                                                       */}
      {/* ----------------------------------------------------------------- */}

      {/* Row 1 -- Revenue over time + Sales by product */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue over time */}
        <ChartContainer title="Receita ao Longo do Tempo" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
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
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Periodo atual"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="previousRevenue"
                name="Periodo anterior"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Sales by product */}
        <ChartContainer title="Vendas por Produto" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={salesByProduct}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                horizontal={false}
              />
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
                width={160}
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
                radius={[0, 6, 6, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Row 2 -- Payment distribution + Top affiliates */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment method distribution (Donut) */}
        <ChartContainer title="Distribuicao por Metodo de Pagamento" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
                {paymentDistribution.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={
                  <CustomTooltip valueFormatter={formatNumber} />
                }
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 13, lineHeight: '24px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Top affiliates */}
        <ChartContainer title="Top 10 Afiliados" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topAffiliates}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                horizontal={false}
              />
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
                width={120}
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
                radius={[0, 6, 6, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Row 3 -- Heatmap + Funnel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sales heatmap */}
        <ChartContainer title="Mapa de Calor de Vendas" className="min-h-[380px]">
          <HeatmapChart data={heatmapData} />
        </ChartContainer>

        {/* Conversion funnel */}
        <ChartContainer title="Funil de Conversao" className="min-h-[380px]">
          <FunnelChart data={funnelData} />
        </ChartContainer>
      </div>
    </div>
  )
}

export { DashboardPage }
export default DashboardPage
