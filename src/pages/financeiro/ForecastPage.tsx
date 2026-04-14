import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import { calculateForecast } from '@/services/customer-analytics'
import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `R$${(value / 1_000).toFixed(1)}K`
  return `R$${value.toFixed(0)}`
}

interface TooltipPayloadEntry {
  name: string
  value: number | null
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function ForecastTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{label}</p>
      {payload.map((entry) => {
        if (entry.value === null || entry.value === undefined) return null
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(entry.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scenario card data
// ---------------------------------------------------------------------------

interface ScenarioInfo {
  label: string
  key: 'optimistic' | 'realistic' | 'pessimistic'
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: typeof ArrowUpRight
  description: string
}

const SCENARIOS: ScenarioInfo[] = [
  {
    label: 'Otimista',
    key: 'optimistic',
    color: '#22c55e',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    icon: ArrowUpRight,
    description: 'Cenario com crescimento acelerado e condicoes favoraveis',
  },
  {
    label: 'Realista',
    key: 'realistic',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Minus,
    description: 'Projecao baseada na tendencia atual dos ultimos meses',
  },
  {
    label: 'Pessimista',
    key: 'pessimistic',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    icon: ArrowDownRight,
    description: 'Cenario com desaceleracao e condicoes desfavoraveis',
  },
]

// ---------------------------------------------------------------------------
// ForecastPage
// ---------------------------------------------------------------------------

export function ForecastPage() {
  const { data: demoData } = useData()
  const forecast = useMemo(
    () => calculateForecast(demoData.transactions),
    [demoData],
  )

  // Chart data: convert null actuals to undefined so Recharts skips them
  const chartData = useMemo(
    () =>
      forecast.months.map((m) => ({
        month: m.month,
        Realizado: m.actual ?? undefined,
        Otimista: m.optimistic,
        Realista: m.realistic,
        Pessimista: m.pessimistic,
      })),
    [forecast],
  )

  // Scenario cards: use the last forecast month for each scenario
  const lastForecast = useMemo(() => {
    const forecastOnly = forecast.months.filter((m) => m.actual === null)
    return forecastOnly[forecastOnly.length - 1] ?? null
  }, [forecast])

  // Percentage vs target for each scenario
  const scenarioStats = useMemo(() => {
    if (!lastForecast) return {}
    const target = forecast.targetRevenue
    return {
      optimistic: {
        value: lastForecast.optimistic,
        pct: target > 0 ? ((lastForecast.optimistic - target) / target) * 100 : 0,
      },
      realistic: {
        value: lastForecast.realistic,
        pct: target > 0 ? ((lastForecast.realistic - target) / target) * 100 : 0,
      },
      pessimistic: {
        value: lastForecast.pessimistic,
        pct: target > 0 ? ((lastForecast.pessimistic - target) / target) * 100 : 0,
      },
    }
  }, [lastForecast, forecast.targetRevenue])

  // Gap between projected and target
  const revenueGap = forecast.projectedRevenue - forecast.targetRevenue
  const gapPct = forecast.targetRevenue > 0
    ? ((revenueGap) / forecast.targetRevenue) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Forecast de Receita
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Projecoes de receita com cenarios otimista, realista e pessimista
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Meta Mensal"
          value={forecast.targetRevenue}
          format="currency"
          icon={<Target className="h-5 w-5" />}
        />
        <KPICard
          title="Projecao Realista"
          value={forecast.projectedRevenue}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
        />

        {/* Status card with badge */}
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl p-5',
            'border shadow-sm transition-all duration-200 hover:shadow-md',
            forecast.onTrack
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200',
          )}
        >
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60',
              )}
            >
              {forecast.onTrack ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <Badge variant={forecast.onTrack ? 'success' : 'warning'}>
              {forecast.onTrack ? 'No Alvo' : 'Abaixo da Meta'}
            </Badge>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Status</p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold tracking-tight',
              forecast.onTrack ? 'text-green-700' : 'text-amber-700',
            )}
          >
            {gapPct >= 0 ? '+' : ''}{gapPct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {revenueGap >= 0
              ? `${formatCurrency(revenueGap)} acima da meta`
              : `${formatCurrency(Math.abs(revenueGap))} abaixo da meta`}
          </p>
        </div>

        {/* Gap card */}
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl p-5',
            'border border-gray-100 bg-white shadow-sm',
            'transition-all duration-200 hover:shadow-md hover:border-gray-200',
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              {revenueGap >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Gap vs Meta</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {formatCurrency(Math.abs(revenueGap))}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {revenueGap >= 0 ? 'Superavit projetado' : 'Deficit projetado'}
          </p>
        </div>
      </div>

      {/* Forecast line chart */}
      <ChartContainer title="Projecao de Receita por Cenario" className="min-h-[440px]">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={shortCurrency}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<ForecastTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />

            {/* Target reference line */}
            <ReferenceLine
              y={forecast.targetRevenue}
              stroke="#f59e0b"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{
                value: `Meta: ${shortCurrency(forecast.targetRevenue)}`,
                position: 'insideTopRight',
                fill: '#f59e0b',
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* Actual revenue (solid blue) */}
            <Line
              type="monotone"
              dataKey="Realizado"
              name="Realizado"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
              connectNulls={false}
            />

            {/* Optimistic (dashed green) */}
            <Line
              type="monotone"
              dataKey="Otimista"
              name="Otimista"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            />

            {/* Realistic (dashed blue) */}
            <Line
              type="monotone"
              dataKey="Realista"
              name="Realista"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            />

            {/* Pessimistic (dashed red) */}
            <Line
              type="monotone"
              dataKey="Pessimista"
              name="Pessimista"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Scenario comparison cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Comparativo de Cenarios
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SCENARIOS.map((scenario) => {
            const stats = scenarioStats[scenario.key]
            if (!stats) return null

            const Icon = scenario.icon
            const isAboveTarget = stats.pct >= 0

            return (
              <Card
                key={scenario.key}
                className={cn('border-2 transition-all duration-200 hover:shadow-md', scenario.borderColor)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          scenario.bgColor,
                        )}
                      >
                        <Icon className={cn('h-4 w-4', scenario.textColor)} />
                      </div>
                      <CardTitle className="text-base">{scenario.label}</CardTitle>
                    </div>
                    <Badge variant={isAboveTarget ? 'success' : 'danger'}>
                      {stats.pct >= 0 ? '+' : ''}{stats.pct.toFixed(1)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Projected value */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Receita Projetada (3 meses)
                    </p>
                    <p className={cn('mt-1 text-2xl font-bold tracking-tight', scenario.textColor)}>
                      {formatCurrency(stats.value)}
                    </p>
                  </div>

                  {/* Progress bar vs target */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">vs Meta</span>
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(forecast.targetRevenue)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            (stats.value / forecast.targetRevenue) * 100,
                            100,
                          )}%`,
                          backgroundColor: scenario.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {((stats.value / forecast.targetRevenue) * 100).toFixed(0)}% da meta
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                    {scenario.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Monthly forecast table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50/95">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Mes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Realizado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Otimista
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Realista
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Pessimista
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forecast.months.map((m) => {
                  const isForecast = m.actual === null
                  const realisticVsTarget = m.realistic >= forecast.targetRevenue

                  return (
                    <tr
                      key={m.month}
                      className={cn(
                        'transition-colors duration-100 hover:bg-gray-50/70',
                        isForecast && 'bg-blue-50/30',
                      )}
                    >
                      <td className="px-4 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {m.month}
                          {isForecast && (
                            <Badge variant="info">Projecao</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {m.actual !== null ? (
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(m.actual)}
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-green-600">
                        {formatCurrency(m.optimistic)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-blue-600 font-medium">
                        {formatCurrency(m.realistic)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-red-600">
                        {formatCurrency(m.pessimistic)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isForecast ? (
                          <Badge variant={realisticVsTarget ? 'success' : 'warning'}>
                            {realisticVsTarget ? 'No alvo' : 'Abaixo'}
                          </Badge>
                        ) : (
                          <Badge variant="default">Concluido</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
