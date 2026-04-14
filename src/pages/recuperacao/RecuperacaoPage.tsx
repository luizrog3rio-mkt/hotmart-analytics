import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
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
  TrendingUp,
  AlertCircle,
  CreditCard,
  FileText,
  ShoppingCart,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react'

import { getDemoData } from '@/services/demo-data'
import { filterTransactions } from '@/services/metrics'
import type { DateRange } from '@/services/metrics'
import { calculateRecovery } from '@/services/customer-analytics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { Tabs } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Currency formatter reserved for axis labels

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

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4']

const FUNNEL_COLORS = [
  '#3b82f6',
  '#60a5fa',
  '#93c5fd',
  '#bfdbfe',
  '#22c55e',
]

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
}

const TAB_LIST = [
  { id: 'boletos', label: 'Boletos' },
  { id: 'cartoes', label: 'Cartoes Recusados' },
  { id: 'abandono', label: 'Abandono de Checkout' },
] as const

// ---------------------------------------------------------------------------
// RecuperacaoPage
// ---------------------------------------------------------------------------

export function RecuperacaoPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState('boletos')

  const demoData = useMemo(() => getDemoData(), [])

  const filteredTx = useMemo(
    () => filterTransactions(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  const recovery = useMemo(
    () => calculateRecovery(filteredTx),
    [filteredTx],
  )

  // Total lost revenue across all channels
  const totalLostRevenue = useMemo(
    () =>
      recovery.boletos.lostRevenue +
      recovery.failedCards.lostRevenue +
      recovery.abandonedCheckouts.lostRevenue,
    [recovery],
  )

  // Overall recovery rate
  const overallRecoveryRate = useMemo(() => {
    if (totalLostRevenue === 0) return 0
    return (recovery.totalRecoverable / totalLostRevenue) * 100
  }, [recovery, totalLostRevenue])

  // Funnel data for checkout steps
  const funnelData = useMemo(
    () =>
      recovery.abandonedCheckouts.steps.map((step, i) => ({
        name: step.step,
        value: step.count,
        fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
      })),
    [recovery],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Recuperacao de Vendas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Boletos, cartoes recusados e abandonos de checkout
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          title="Receita Perdida Total"
          value={totalLostRevenue}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
          trend="down"
        />
        <KPICard
          title="Receita Recuperavel"
          value={recovery.totalRecoverable}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
          trend="up"
        />
        <KPICard
          title="Taxa de Recuperacao"
          value={overallRecoveryRate}
          format="percent"
          icon={<AlertCircle className="h-5 w-5" />}
          trend="up"
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[...TAB_LIST]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* ============================================================== */}
        {/* BOLETOS TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'boletos' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <FileText className="h-4 w-4" />
                    Boletos Gerados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(recovery.boletos.generated)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <FileText className="h-4 w-4" />
                    Boletos Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(recovery.boletos.paid)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    Taxa de Conversao
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPercent(recovery.boletos.conversionRate)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    Receita Perdida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(recovery.boletos.lostRevenue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Average days to pay */}
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tempo medio de pagamento:{' '}
              <strong>{recovery.boletos.avgDaysToPay.toFixed(1)} dias</strong>{' '}
              apos a geracao do boleto.
            </div>

            {/* Bar chart: generated vs paid by day */}
            <ChartContainer
              title="Boletos Gerados vs Pagos (Ultimos 7 dias)"
              className="min-h-[380px]"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recovery.boletos.byDay}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip valueFormatter={formatNumber} />
                    }
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="generated"
                    name="Gerados"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  <Bar
                    dataKey="paid"
                    name="Pagos"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}

        {/* ============================================================== */}
        {/* CARTOES RECUSADOS TAB                                          */}
        {/* ============================================================== */}
        {activeTab === 'cartoes' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <CreditCard className="h-4 w-4" />
                    Recusas Totais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(recovery.failedCards.total)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <CreditCard className="h-4 w-4" />
                    Recuperados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(recovery.failedCards.recovered)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    Taxa de Recuperacao
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPercent(recovery.failedCards.recoveryRate)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    Receita Perdida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(recovery.failedCards.lostRevenue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pie chart of failure reasons + details */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartContainer
                title="Motivos de Recusa"
                className="min-h-[380px]"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={recovery.failedCards.byReason}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="reason"
                      strokeWidth={0}
                    >
                      {recovery.failedCards.byReason.map((entry, index) => (
                        <Cell
                          key={entry.reason}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
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
                      wrapperStyle={{ fontSize: 12, lineHeight: '22px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Failure reasons breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Motivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recovery.failedCards.byReason.map((item, idx) => (
                      <div key={item.reason}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            {item.reason}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">
                              {formatNumber(item.count)}
                            </span>
                            <Badge
                              variant={
                                item.percentage > 25
                                  ? 'danger'
                                  : item.percentage > 15
                                    ? 'warning'
                                    : 'default'
                              }
                            >
                              {formatPercent(item.percentage)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor:
                                PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABANDONO TAB                                                   */}
        {/* ============================================================== */}
        {activeTab === 'abandono' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <ShoppingCart className="h-4 w-4" />
                    Checkouts Abandonados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(recovery.abandonedCheckouts.total)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    Receita Perdida Estimada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      recovery.abandonedCheckouts.lostRevenue,
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    Recuperavel (10%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      recovery.abandonedCheckouts.lostRevenue * 0.1,
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Funnel + Device breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Funnel Chart - takes 2 cols */}
              <ChartContainer
                title="Funil de Checkout"
                className="min-h-[420px] lg:col-span-2"
              >
                <FunnelChart data={funnelData} />
              </ChartContainer>

              {/* Device abandon rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Abandono por Dispositivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {recovery.abandonedCheckouts.byDevice.map((item) => {
                      const DeviceIcon = DEVICE_ICONS[item.device] || Monitor
                      return (
                        <div key={item.device}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DeviceIcon className="h-5 w-5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">
                                {item.device}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                item.rate > 45
                                  ? 'text-red-600'
                                  : item.rate > 35
                                    ? 'text-yellow-600'
                                    : 'text-green-600',
                              )}
                            >
                              {formatPercent(item.rate)}
                            </span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                item.rate > 45
                                  ? 'bg-red-500'
                                  : item.rate > 35
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500',
                              )}
                              style={{ width: `${item.rate}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Insight */}
                  <div className="mt-6 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                    <strong>Insight:</strong> A taxa de abandono em
                    dispositivos moveis e significativamente maior.
                    Considere otimizar a experiencia de checkout mobile.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Step-by-step drop rates */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Desistencia por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Etapa
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Usuarios
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Taxa de Saida
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Visual
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recovery.abandonedCheckouts.steps.map((step) => (
                        <tr
                          key={step.step}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-700">
                            {step.step}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatNumber(step.count)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {step.dropRate === 0 ? (
                              <Badge variant="info">Entrada</Badge>
                            ) : (
                              <span
                                className={cn(
                                  'font-medium',
                                  step.dropRate > 50
                                    ? 'text-red-600'
                                    : step.dropRate > 20
                                      ? 'text-yellow-600'
                                      : 'text-green-600',
                                )}
                              >
                                {formatPercent(step.dropRate)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                style={{
                                  width: `${
                                    recovery.abandonedCheckouts.steps[0]
                                      .count > 0
                                      ? (step.count /
                                          recovery.abandonedCheckouts
                                            .steps[0].count) *
                                        100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
