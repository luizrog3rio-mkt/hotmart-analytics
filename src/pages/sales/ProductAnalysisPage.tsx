import { useState, useMemo } from 'react'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Package } from 'lucide-react'
import { getDemoData } from '@/services/demo-data'
import { filterTransactions, getSalesByProduct } from '@/services/metrics'
import type { DateRange } from '@/types'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { Card, CardContent } from '@/components/ui/Card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

interface ProductMetrics {
  id: string
  name: string
  revenue: number
  count: number
  avgTicket: number
  refundRate: number
  refundCount: number
}

interface TooltipPayloadEntry {
  value: number
}

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductAnalysisPage() {
  const data = useMemo(() => getDemoData(), [])

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  })

  // -- Product metrics ------------------------------------------------------

  const salesByProduct = useMemo(
    () => getSalesByProduct(data.transactions, dateRange),
    [data.transactions, dateRange],
  )

  const productMetrics: ProductMetrics[] = useMemo(() => {
    const filteredTx = filterTransactions(data.transactions, dateRange)

    return data.products
      .map((product) => {
        const productTx = filteredTx.filter((t) => t.product_id === product.id)
        const approved = productTx.filter((t) => t.status === 'approved')
        const refunded = productTx.filter((t) => t.status === 'refunded')
        const revenue = approved.reduce((s, t) => s + t.amount, 0)

        return {
          id: product.id,
          name: product.name,
          revenue,
          count: approved.length,
          avgTicket: approved.length > 0 ? revenue / approved.length : 0,
          refundRate:
            productTx.length > 0
              ? (refunded.length / productTx.length) * 100
              : 0,
          refundCount: refunded.length,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [data.products, data.transactions, dateRange])

  // -- Chart data -----------------------------------------------------------

  const chartData = useMemo(
    () =>
      salesByProduct.map((p) => ({
        name: p.name.length > 25 ? p.name.slice(0, 22) + '...' : p.name,
        revenue: Math.round(p.revenue * 100) / 100,
      })),
    [salesByProduct],
  )

  // -- Totals ---------------------------------------------------------------

  const totals = useMemo(() => {
    const totalRevenue = productMetrics.reduce((s, p) => s + p.revenue, 0)
    const totalSales = productMetrics.reduce((s, p) => s + p.count, 0)
    const totalRefunds = productMetrics.reduce((s, p) => s + p.refundCount, 0)
    return { totalRevenue, totalSales, totalRefunds }
  }, [productMetrics])

  // -- Render ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Analise de performance por produto no periodo selecionado
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Product cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {productMetrics.map((product, index) => (
          <Card
            key={product.id}
            className={cn(
              'transition-all duration-200 hover:shadow-md hover:border-gray-200',
              index === 0 && 'ring-1 ring-blue-100',
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                {index === 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Top
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-sm font-semibold text-gray-900 line-clamp-1">
                {product.name}
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Receita
                  </p>
                  <p className="mt-0.5 text-base font-bold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Vendas
                  </p>
                  <p className="mt-0.5 text-base font-bold text-gray-900">
                    {formatNumber(product.count)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Ticket Medio
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700">
                    {formatCurrency(product.avgTicket)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    Reembolso
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-sm font-semibold',
                      product.refundRate > 5 ? 'text-red-600' : 'text-gray-700',
                    )}
                  >
                    {formatPercent(product.refundRate)}
                  </p>
                </div>
              </div>

              {/* Revenue proportion bar */}
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${totals.totalRevenue > 0 ? (product.revenue / totals.totalRevenue) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  {totals.totalRevenue > 0
                    ? ((product.revenue / totals.totalRevenue) * 100).toFixed(1)
                    : '0'}
                  % da receita total
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      <ChartContainer title="Receita por Produto">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                angle={-25}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                }
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>

      {/* Detailed table */}
      <ChartContainer title="Metricas Detalhadas por Produto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Produto
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Receita
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Vendas
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ticket Medio
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reembolsos
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Taxa Reembolso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productMetrics.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="py-3 pr-4">
                    <span className="font-medium text-gray-900">
                      {product.name}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {formatNumber(product.count)}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {formatCurrency(product.avgTicket)}
                  </td>
                  <td className="py-3 text-right text-gray-700">
                    {formatNumber(product.refundCount)}
                  </td>
                  <td
                    className={cn(
                      'py-3 text-right font-medium',
                      product.refundRate > 5 ? 'text-red-600' : 'text-gray-700',
                    )}
                  >
                    {formatPercent(product.refundRate)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="py-3 pr-4 font-bold text-gray-900">Total</td>
                <td className="py-3 text-right font-bold text-gray-900">
                  {formatCurrency(totals.totalRevenue)}
                </td>
                <td className="py-3 text-right font-bold text-gray-900">
                  {formatNumber(totals.totalSales)}
                </td>
                <td className="py-3 text-right font-bold text-gray-900">
                  {totals.totalSales > 0
                    ? formatCurrency(totals.totalRevenue / totals.totalSales)
                    : '-'}
                </td>
                <td className="py-3 text-right font-bold text-gray-900">
                  {formatNumber(totals.totalRefunds)}
                </td>
                <td className="py-3 text-right font-bold text-gray-900">
                  {totals.totalSales + totals.totalRefunds > 0
                    ? formatPercent(
                        (totals.totalRefunds /
                          (totals.totalSales + totals.totalRefunds)) *
                          100,
                      )
                    : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ChartContainer>
    </div>
  )
}
