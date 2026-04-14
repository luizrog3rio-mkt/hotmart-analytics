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
  Cell,
} from 'recharts'
import {
  Target,
  Heart,
  Scale,
  Clock,
  TrendingUp,
} from 'lucide-react'

import { getDemoData } from '@/services/demo-data'
import { calculateUnitEconomics } from '@/services/customer-analytics'
import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

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
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function EconTooltip({ active, payload, label }: CustomTooltipProps) {
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
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LTV:CAC color logic
// ---------------------------------------------------------------------------

function getRatioColor(ratio: number): { bg: string; text: string; variant: 'success' | 'warning' | 'danger' } {
  if (ratio >= 3) return { bg: 'bg-green-50 border-green-200', text: 'text-green-700', variant: 'success' }
  if (ratio >= 2) return { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', variant: 'warning' }
  return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', variant: 'danger' }
}

// ---------------------------------------------------------------------------
// Margin gauge component
// ---------------------------------------------------------------------------

function MarginGauge({ label, value, maxValue, color }: {
  label: string
  value: number
  maxValue: number
  color: string
}) {
  const pct = Math.min(Math.max((value / maxValue) * 100, 0), 100)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{formatPercent(value)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product row type
// ---------------------------------------------------------------------------

interface ProductRow {
  product: string
  revenue: number
  cogs: number
  margin: number
  marginPercent: number
}

// ---------------------------------------------------------------------------
// Margin color for bar
// ---------------------------------------------------------------------------

function getMarginBarColor(pct: number): string {
  if (pct >= 70) return '#22c55e'
  if (pct >= 50) return '#3b82f6'
  if (pct >= 30) return '#f59e0b'
  return '#ef4444'
}

// ---------------------------------------------------------------------------
// UnitEconomicsPage
// ---------------------------------------------------------------------------

export function UnitEconomicsPage() {
  const demoData = useMemo(() => getDemoData(), [])
  const economics = useMemo(
    () => calculateUnitEconomics(demoData.transactions),
    [demoData],
  )

  const ratioColor = useMemo(
    () => getRatioColor(economics.ltvCacRatio),
    [economics.ltvCacRatio],
  )

  // By-product chart data
  const productChartData = useMemo(
    () =>
      economics.byProduct.map((p) => ({
        name: p.product.length > 25 ? p.product.slice(0, 22) + '...' : p.product,
        fullName: p.product,
        Receita: p.revenue,
        Custo: p.cogs,
        Margem: p.margin,
        marginPercent: p.marginPercent,
      })),
    [economics],
  )

  // Breakeven data
  const breakevenData = useMemo(() => {
    const cac = economics.cac
    const monthlyLtvAccum: { month: string; acumulado: number; cac: number }[] = []
    const monthlyRevPerCustomer = economics.ltv / 12

    for (let i = 1; i <= 12; i++) {
      monthlyLtvAccum.push({
        month: `Mes ${i}`,
        acumulado: Math.round(monthlyRevPerCustomer * i),
        cac,
      })
    }
    return monthlyLtvAccum
  }, [economics])

  // Table columns
  const productColumns = useMemo<Column<ProductRow>[]>(
    () => [
      {
        key: 'product',
        header: 'Produto',
        width: '240px',
        render: (row: ProductRow) => (
          <span className="font-medium text-gray-900 truncate block max-w-[220px]" title={row.product}>
            {row.product}
          </span>
        ),
      },
      {
        key: 'revenue',
        header: 'Receita',
        align: 'right' as const,
        render: (row: ProductRow) => formatCurrency(row.revenue),
        sortable: true,
        sortValue: (row: ProductRow) => row.revenue,
      },
      {
        key: 'cogs',
        header: 'Custo',
        align: 'right' as const,
        render: (row: ProductRow) => (
          <span className="text-red-600">{formatCurrency(row.cogs)}</span>
        ),
        sortable: true,
        sortValue: (row: ProductRow) => row.cogs,
      },
      {
        key: 'margin',
        header: 'Margem (R$)',
        align: 'right' as const,
        render: (row: ProductRow) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(row.margin)}
          </span>
        ),
        sortable: true,
        sortValue: (row: ProductRow) => row.margin,
      },
      {
        key: 'marginPercent',
        header: 'Margem (%)',
        align: 'right' as const,
        width: '180px',
        render: (row: ProductRow) => (
          <div className="flex items-center gap-2 justify-end">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(row.marginPercent, 100)}%`,
                  backgroundColor: getMarginBarColor(row.marginPercent),
                }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums w-12 text-right">
              {row.marginPercent.toFixed(1)}%
            </span>
          </div>
        ),
        sortable: true,
        sortValue: (row: ProductRow) => row.marginPercent,
      },
    ],
    [],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Unit Economics
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Analise de CAC, LTV, margens e rentabilidade por produto
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="CAC"
          value={economics.cac}
          format="currency"
          icon={<Target className="h-5 w-5" />}
        />
        <KPICard
          title="LTV"
          value={economics.ltv}
          format="currency"
          icon={<Heart className="h-5 w-5" />}
        />

        {/* LTV:CAC with custom color coding */}
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl p-5',
            'border shadow-sm transition-all duration-200 hover:shadow-md',
            ratioColor.bg,
          )}
        >
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                'bg-white/60',
              )}
            >
              <Scale className={cn('h-5 w-5', ratioColor.text)} />
            </div>
            <Badge variant={ratioColor.variant}>
              {economics.ltvCacRatio >= 3 ? 'Saudavel' : economics.ltvCacRatio >= 2 ? 'Atencao' : 'Critico'}
            </Badge>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">LTV:CAC Ratio</p>
          <p className={cn('mt-1 text-2xl font-bold tracking-tight', ratioColor.text)}>
            {economics.ltvCacRatio.toFixed(1)}x
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {economics.ltvCacRatio >= 3
              ? 'Acima de 3x e o ideal'
              : economics.ltvCacRatio >= 2
                ? 'Entre 2-3x requer atencao'
                : 'Abaixo de 2x e critico'}
          </p>
        </div>

        <KPICard
          title="Payback (meses)"
          value={economics.paybackMonths}
          format="number"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Margin comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comparativo de Margens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <MarginGauge
              label="Margem Bruta"
              value={economics.grossMargin}
              maxValue={100}
              color="#22c55e"
            />
            <MarginGauge
              label="Margem Liquida"
              value={economics.netMargin}
              maxValue={100}
              color="#3b82f6"
            />

            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Detalhamento</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Diferenca</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(economics.grossMargin - economics.netMargin).toFixed(1)}pp
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Custos sobre receita</p>
                  <p className="text-lg font-bold text-gray-900">
                    {(100 - economics.netMargin).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Breakeven analysis */}
        <ChartContainer title="Analise de Breakeven (CAC vs LTV Acumulado)" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={breakevenData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
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
              <Tooltip content={<EconTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar
                dataKey="acumulado"
                name="LTV Acumulado"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={24}
              >
                {breakevenData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.acumulado >= entry.cac ? '#22c55e' : '#3b82f6'}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="cac"
                name="CAC"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={24}
                fillOpacity={0.3}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* By-product margin chart */}
      <ChartContainer title="Receita vs Custo por Produto" className="min-h-[400px]">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={productChartData}
            layout="vertical"
            margin={{ left: 20, right: 20 }}
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
            <Tooltip content={<EconTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="Receita" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
            <Bar dataKey="Custo" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} fillOpacity={0.7} />
            <Bar dataKey="Margem" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* By-product margin table */}
      <Card>
        <CardHeader>
          <CardTitle>Margem por Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<ProductRow>
            columns={productColumns}
            data={economics.byProduct}
            pageSize={10}
            rowKey={(row) => row.product}
          />
        </CardContent>
      </Card>
    </div>
  )
}
