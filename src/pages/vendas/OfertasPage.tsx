import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import {
  Tag,
  TrendingUp,
  DollarSign,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Ticket,
  ShoppingBag,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import { calculateOffers, calculatePricing } from '@/services/marketing-analytics'
import type { OfferData, PricingData } from '@/services/marketing-analytics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTable } from '@/components/data/DataTable'
import type { Column } from '@/components/data/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

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
// Offer type badge styling
// ---------------------------------------------------------------------------

const OFFER_TYPE_CONFIG: Record<
  OfferData['offers'][number]['type'],
  { label: string; className: string }
> = {
  standard: {
    label: 'Padrão',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  bump: {
    label: 'Bump',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  upsell: {
    label: 'Upsell',
    className: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  },
  downsell: {
    label: 'Downsell',
    className: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  },
  coupon: {
    label: 'Cupom',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
}

function OfferTypeBadge({ type }: { type: OfferData['offers'][number]['type'] }) {
  const config = OFFER_TYPE_CONFIG[type]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'precificacao', label: 'Precificação' },
]

// ---------------------------------------------------------------------------
// Offer row type
// ---------------------------------------------------------------------------

type OfferRow = OfferData['offers'][number]

// ---------------------------------------------------------------------------
// Column definitions for offers DataTable
// ---------------------------------------------------------------------------

const offerColumns: Column<OfferRow>[] = [
  {
    key: 'name',
    header: 'Oferta',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    ),
  },
  {
    key: 'product',
    header: 'Produto',
    sortable: true,
    render: (row) => (
      <span className="text-gray-700 truncate block max-w-[200px]">
        {row.product}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Tipo',
    sortable: true,
    render: (row) => <OfferTypeBadge type={row.type} />,
  },
  {
    key: 'price',
    header: 'Preço',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.price,
    render: (row) => (
      <span className="font-semibold text-gray-900">
        {formatCurrency(row.price)}
      </span>
    ),
  },
  {
    key: 'discount',
    header: 'Desconto',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.discount,
    render: (row) =>
      row.discount > 0 ? (
        <Badge variant="warning">{row.discount.toFixed(1)}%</Badge>
      ) : (
        <span className="text-gray-400">-</span>
      ),
  },
  {
    key: 'conversions',
    header: 'Conversões',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.conversions,
    render: (row) => (
      <span className="text-gray-700">{formatNumber(row.conversions)}</span>
    ),
  },
  {
    key: 'revenue',
    header: 'Receita',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.revenue,
    render: (row) => (
      <span className="font-semibold text-emerald-600">
        {formatCurrency(row.revenue)}
      </span>
    ),
  },
  {
    key: 'conversionRate',
    header: 'Taxa Conv.',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.conversionRate,
    render: (row) => (
      <span className="text-gray-700">{formatPercent(row.conversionRate)}</span>
    ),
  },
  {
    key: 'refundRate',
    header: 'Taxa Reemb.',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.refundRate,
    render: (row) => (
      <span
        className={cn(
          'font-medium',
          row.refundRate > 5 ? 'text-red-600' : 'text-gray-500',
        )}
      >
        {formatPercent(row.refundRate)}
      </span>
    ),
  },
]

// ---------------------------------------------------------------------------
// Simulation row type
// ---------------------------------------------------------------------------

type SimulationRow = PricingData['simulation'][number]

const simulationColumns: Column<SimulationRow>[] = [
  {
    key: 'changePercent',
    header: 'Variação de Preço',
    sortable: true,
    sortValue: (row) => row.changePercent,
    render: (row) => (
      <span
        className={cn(
          'font-semibold',
          row.changePercent === 0
            ? 'text-gray-900'
            : row.changePercent > 0
              ? 'text-red-600'
              : 'text-green-600',
        )}
      >
        {row.changePercent > 0 ? '+' : ''}
        {row.changePercent}%
      </span>
    ),
  },
  {
    key: 'estimatedVolume',
    header: 'Volume Estimado',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.estimatedVolume,
    render: (row) => (
      <span className="text-gray-700">{formatNumber(row.estimatedVolume)}</span>
    ),
  },
  {
    key: 'estimatedRevenue',
    header: 'Receita Estimada',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.estimatedRevenue,
    render: (row) => (
      <span className="font-semibold text-gray-900">
        {formatCurrency(row.estimatedRevenue)}
      </span>
    ),
  },
  {
    key: 'revenueChange',
    header: 'Variação Receita',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.revenueChange,
    render: (row) => (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-semibold',
          row.revenueChange > 0
            ? 'text-green-600'
            : row.revenueChange < 0
              ? 'text-red-600'
              : 'text-gray-500',
        )}
      >
        {row.revenueChange > 0 ? (
          <ArrowUpRight className="h-3.5 w-3.5" />
        ) : row.revenueChange < 0 ? (
          <ArrowDownRight className="h-3.5 w-3.5" />
        ) : null}
        {row.revenueChange > 0 ? '+' : ''}
        {row.revenueChange}%
      </span>
    ),
  },
]

// ---------------------------------------------------------------------------
// Coupon impact comparison card
// ---------------------------------------------------------------------------

interface CouponComparisonProps {
  label: string
  icon: React.ReactNode
  data: { volume: number; revenue: number; avgTicket: number }
  highlight?: boolean
}

function CouponComparisonCard({ label, icon, data, highlight }: CouponComparisonProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        highlight && 'ring-2 ring-blue-500/30',
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              highlight
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-50 text-gray-600',
            )}
          >
            {icon}
          </div>
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Volume</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatNumber(data.volume)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Receita</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(data.revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Ticket Medio</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatCurrency(data.avgTicket)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// OfertasPage
// ---------------------------------------------------------------------------

export function OfertasPage() {
  const [activeTab, setActiveTab] = useState('ofertas')

  const { data: demoData } = useData()

  const offerData = useMemo<OfferData>(
    () => calculateOffers(demoData.transactions),
    [demoData.transactions],
  )

  const pricingData = useMemo<PricingData>(
    () => calculatePricing(),
    [],
  )

  const totalOfferRevenue = useMemo(
    () => offerData.offers.reduce((sum, o) => sum + o.revenue, 0),
    [offerData.offers],
  )

  // Elasticity chart data with color coding for optimal
  const elasticityChartData = useMemo(
    () =>
      pricingData.elasticity.map((e) => ({
        ...e,
        label: formatCurrency(e.pricePoint),
        fill: e.isOptimal ? '#f59e0b' : '#3b82f6',
      })),
    [pricingData.elasticity],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Ofertas e Inteligencia de Precos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Analise o desempenho das ofertas, bumps, upsells e otimize sua
          precificacao
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* ================================================================= */}
      {/* OFERTAS TAB                                                       */}
      {/* ================================================================= */}
      {activeTab === 'ofertas' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              title="Taxa Aceitacao Bump"
              value={offerData.bumpAcceptanceRate}
              format="percent"
              icon={<ShoppingBag className="h-5 w-5" />}
              trend="neutral"
            />
            <KPICard
              title="Taxa Aceitacao Upsell"
              value={offerData.upsellAcceptanceRate}
              format="percent"
              icon={<TrendingUp className="h-5 w-5" />}
              trend="neutral"
            />
            <KPICard
              title="Receita Total de Ofertas"
              value={totalOfferRevenue}
              format="currency"
              icon={<DollarSign className="h-5 w-5" />}
              trend="neutral"
            />
          </div>

          {/* Offers DataTable */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Todas as Ofertas
            </h2>
            <DataTable
              columns={offerColumns}
              data={offerData.offers}
              searchable
              searchPlaceholder="Buscar oferta..."
              pageSize={10}
              rowKey={(row) => row.name}
            />
          </div>

          {/* Coupon Impact Comparison */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Impacto dos Cupons
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CouponComparisonCard
                label="Com Cupom"
                icon={<Ticket className="h-5 w-5" />}
                data={offerData.couponImpact.withCoupon}
                highlight
              />
              <CouponComparisonCard
                label="Sem Cupom"
                icon={<Tag className="h-5 w-5" />}
                data={offerData.couponImpact.withoutCoupon}
              />
            </div>

            {/* Coupon insight */}
            {offerData.couponImpact.withCoupon.avgTicket <
              offerData.couponImpact.withoutCoupon.avgTicket && (
              <div className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                Cupons geram um ticket medio{' '}
                <strong>
                  {formatPercent(
                    ((offerData.couponImpact.withoutCoupon.avgTicket -
                      offerData.couponImpact.withCoupon.avgTicket) /
                      offerData.couponImpact.withoutCoupon.avgTicket) *
                      100,
                  )}
                </strong>{' '}
                menor, mas podem aumentar o volume total de vendas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* PRECIFICACAO TAB                                                  */}
      {/* ================================================================= */}
      {activeTab === 'precificacao' && (
        <div className="space-y-8">
          {/* Current vs Optimal price card */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Preco Atual vs Preco Otimo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      Preco Atual
                    </p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">
                      {formatCurrency(pricingData.currentPrice)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center">
                    <ArrowUpRight
                      className={cn(
                        'h-8 w-8',
                        pricingData.optimalPrice > pricingData.currentPrice
                          ? 'text-green-500'
                          : pricingData.optimalPrice < pricingData.currentPrice
                            ? 'text-red-500'
                            : 'text-gray-400',
                      )}
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-xs font-medium text-gray-500">
                      Preco Otimo
                    </p>
                    <p className="mt-1 text-3xl font-bold text-amber-600">
                      {formatCurrency(pricingData.optimalPrice)}
                    </p>
                  </div>
                </div>

                {pricingData.optimalPrice !== pricingData.currentPrice && (
                  <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                    {pricingData.optimalPrice > pricingData.currentPrice ? (
                      <>
                        Existe espaco para aumento de preco. O preco otimo e{' '}
                        <strong>
                          {formatPercent(
                            ((pricingData.optimalPrice -
                              pricingData.currentPrice) /
                              pricingData.currentPrice) *
                              100,
                          )}
                        </strong>{' '}
                        acima do atual, maximizando a receita total.
                      </>
                    ) : (
                      <>
                        O preco atual esta acima do otimo. Considere reduzir em{' '}
                        <strong>
                          {formatPercent(
                            ((pricingData.currentPrice -
                              pricingData.optimalPrice) /
                              pricingData.currentPrice) *
                              100,
                          )}
                        </strong>{' '}
                        para maximizar a receita total.
                      </>
                    )}
                  </div>
                )}

                {pricingData.optimalPrice === pricingData.currentPrice && (
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
                    Seu preco atual ja esta no ponto otimo de receita.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optimal price point highlight */}
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Ponto Otimo de Receita</CardTitle>
              </CardHeader>
              <CardContent>
                {pricingData.elasticity
                  .filter((e) => e.isOptimal)
                  .map((opt) => (
                    <div key={opt.pricePoint} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                          <Star className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">
                            Preco que maximiza receita
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(opt.pricePoint)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-medium text-gray-500">
                            Volume Estimado
                          </p>
                          <p className="mt-1 text-lg font-bold text-gray-900">
                            {formatNumber(opt.volume)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-medium text-gray-500">
                            Receita Estimada
                          </p>
                          <p className="mt-1 text-lg font-bold text-emerald-600">
                            {formatCurrency(opt.revenue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* Elasticity chart */}
          <ChartContainer
            title="Elasticidade de Preco — Receita x Volume por Faixa de Preco"
            className="min-h-[420px]"
          >
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={elasticityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  tickFormatter={shortCurrency}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      valueFormatter={(v) => {
                        if (v >= 1000) return formatCurrency(v)
                        return formatNumber(v)
                      }}
                    />
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  name="Receita"
                  radius={[4, 4, 0, 0]}
                  barSize={36}
                >
                  {elasticityChartData.map((entry) => (
                    <Cell
                      key={entry.pricePoint}
                      fill={entry.isOptimal ? '#f59e0b' : '#3b82f6'}
                      fillOpacity={entry.isOptimal ? 1 : 0.7}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="volume"
                  type="monotone"
                  dataKey="volume"
                  name="Volume"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                />
                {/* Highlight optimal with a reference line */}
                {pricingData.elasticity
                  .filter((e) => e.isOptimal)
                  .map((opt) => (
                    <ReferenceLine
                      key={opt.pricePoint}
                      yAxisId="revenue"
                      y={opt.revenue}
                      stroke="#f59e0b"
                      strokeDasharray="6 4"
                      strokeOpacity={0.6}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
                Ponto otimo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-blue-500 opacity-70" />
                Outros precos
              </span>
            </div>
          </ChartContainer>

          {/* Price History chart */}
          <ChartContainer
            title="Historico de Precos e Volume"
            className="min-h-[400px]"
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={pricingData.priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="price"
                  tickFormatter={shortCurrency}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  yAxisId="volume"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      valueFormatter={(v) =>
                        v >= 100 ? formatCurrency(v) : formatNumber(v)
                      }
                    />
                  }
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line
                  yAxisId="price"
                  type="stepAfter"
                  dataKey="price"
                  name="Preço (R$)"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                />
                <Line
                  yAxisId="volume"
                  type="monotone"
                  dataKey="volume"
                  name="Volume"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Simulation Table */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Simulacao de Precificacao
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              O que acontece se o preco mudar de -30% a +30% em relacao ao preco
              atual de{' '}
              <strong className="text-gray-700">
                {formatCurrency(pricingData.currentPrice)}
              </strong>
              ?
            </p>
            <DataTable
              columns={simulationColumns}
              data={pricingData.simulation}
              pageSize={10}
              rowKey={(row) => String(row.changePercent)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
