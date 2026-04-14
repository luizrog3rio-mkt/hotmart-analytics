import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  DollarSign,
  TrendingUp,
  Percent,
  CalendarClock,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import { calculateCashFlow } from '@/services/customer-analytics'
import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Recharts helpers
// ---------------------------------------------------------------------------

function shortCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `R$${(value / 1_000).toFixed(1)}K`
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
}

function CashFlowTooltip({ active, payload, label }: CustomTooltipProps) {
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
            {formatCurrency(Math.abs(entry.value))}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upcoming receivables table types
// ---------------------------------------------------------------------------

interface UpcomingRow {
  date: string
  amount: number
  source: string
}

// ---------------------------------------------------------------------------
// Waterfall item types
// ---------------------------------------------------------------------------

interface WaterfallItem {
  label: string
  value: number
  color: string
  icon: typeof ArrowUpRight
  direction: 'positive' | 'negative'
}

// ---------------------------------------------------------------------------
// FluxoCaixaPage
// ---------------------------------------------------------------------------

export function FluxoCaixaPage() {
  const { data: demoData } = useData()
  const cashFlow = useMemo(
    () => calculateCashFlow(demoData.transactions),
    [demoData],
  )

  // Chart data: make cost bars negative so they stack downward
  const chartData = useMemo(
    () =>
      cashFlow.monthly.map((m) => ({
        month: m.month,
        'Receita Bruta': m.gross,
        Taxas: -m.fees,
        'Comissoes': -m.commissions,
        'Gastos Ads': -m.adSpend,
        'Receita Liquida': m.net,
      })),
    [cashFlow],
  )

  // KPI: upcoming total
  const upcomingTotal = useMemo(
    () => cashFlow.upcoming.reduce((s, r) => s + r.amount, 0),
    [cashFlow],
  )

  // Waterfall summary from latest month
  const waterfall = useMemo<WaterfallItem[]>(() => {
    const latest = cashFlow.monthly[cashFlow.monthly.length - 1]
    if (!latest) return []
    return [
      { label: 'Receita Bruta', value: latest.gross, color: '#22c55e', icon: ArrowUpRight, direction: 'positive' as const },
      { label: 'Taxas Hotmart', value: latest.fees, color: '#ef4444', icon: ArrowDownRight, direction: 'negative' as const },
      { label: 'Comissoes Afiliados', value: latest.commissions, color: '#f59e0b', icon: ArrowDownRight, direction: 'negative' as const },
      { label: 'Gastos com Ads', value: latest.adSpend, color: '#8b5cf6', icon: ArrowDownRight, direction: 'negative' as const },
      { label: 'Receita Liquida', value: latest.net, color: '#3b82f6', icon: ArrowUpRight, direction: 'positive' as const },
    ]
  }, [cashFlow])

  // Table columns for upcoming receivables
  const upcomingColumns = useMemo<Column<UpcomingRow>[]>(
    () => [
      {
        key: 'date',
        header: 'Data',
        width: '120px',
      },
      {
        key: 'amount',
        header: 'Valor',
        align: 'right' as const,
        render: (row: UpcomingRow) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(row.amount)}
          </span>
        ),
        sortable: true,
        sortValue: (row: UpcomingRow) => row.amount,
      },
      {
        key: 'source',
        header: 'Origem',
      },
    ],
    [],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Fluxo de Caixa
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Acompanhe receitas, custos e recebimentos futuros
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Receita Bruta"
          value={cashFlow.totalGross}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Receita Liquida"
          value={cashFlow.totalNet}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Margem"
          value={cashFlow.margin}
          format="percent"
          icon={<Percent className="h-5 w-5" />}
        />
        <KPICard
          title="Recebiveis Proximos"
          value={upcomingTotal}
          format="currency"
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      {/* Stacked bar chart */}
      <ChartContainer title="Breakdown Mensal de Receita e Custos" className="min-h-[440px]">
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} stackOffset="sign">
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
            <Tooltip content={<CashFlowTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
            <Bar
              dataKey="Receita Bruta"
              stackId="stack"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Taxas"
              stackId="stack"
              fill="#ef4444"
            />
            <Bar
              dataKey="Comissoes"
              stackId="stack"
              fill="#f59e0b"
            />
            <Bar
              dataKey="Gastos Ads"
              stackId="stack"
              fill="#8b5cf6"
              radius={[0, 0, 4, 4]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Row: Waterfall + Upcoming table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Waterfall summary (latest month) */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Waterfall (Ultimo Mes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {waterfall.map((item) => {
              const Icon = item.icon
              const isLast = item.label === 'Receita Liquida'
              return (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    isLast
                      ? 'bg-blue-50 border border-blue-100'
                      : 'bg-gray-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: item.color }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isLast ? 'text-blue-900 font-semibold' : 'text-gray-700',
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      item.direction === 'negative' ? 'text-red-600' : '',
                      isLast ? 'text-blue-700 text-base' : 'text-gray-900',
                    )}
                  >
                    {item.direction === 'negative' ? '- ' : ''}
                    {formatCurrency(item.value)}
                  </span>
                </div>
              )
            })}

            {/* Margin line */}
            {waterfall.length > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3 px-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margem Liquida
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {cashFlow.margin.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming receivables */}
        <Card>
          <CardHeader>
            <CardTitle>Recebiveis Proximos</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<UpcomingRow>
              columns={upcomingColumns}
              data={cashFlow.upcoming}
              pageSize={7}
              rowKey={(row) => `${row.date}-${row.amount}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
