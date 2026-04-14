import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  DollarSign,
  Award,
  Star,
  AlertTriangle,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import type { DemoTransaction } from '@/services/demo-data'
import { filterTransactions, getTopAffiliates } from '@/services/metrics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { DataTable } from '@/components/data/DataTable'
import type { Column } from '@/components/data/DataTable'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'

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
// Affiliate row type for the ranking table
// ---------------------------------------------------------------------------

interface AffiliateRow {
  id: string
  name: string
  sales: number
  revenue: number
  conversionRate: number
  commission: number
  qualityScore: number
  refundRate: number
}

function getQualityBadge(score: number) {
  if (score >= 80) return <Badge variant="success">Excelente</Badge>
  if (score >= 60) return <Badge variant="info">Bom</Badge>
  if (score >= 40) return <Badge variant="warning">Regular</Badge>
  return <Badge variant="danger">Baixo</Badge>
}

// ---------------------------------------------------------------------------
// Compute affiliate analytics
// ---------------------------------------------------------------------------

function computeAffiliateRows(
  transactions: DemoTransaction[],
  range: DateRange,
): AffiliateRow[] {
  const filtered = filterTransactions(transactions, range).filter(
    (t) => t.affiliate_id,
  )

  const map = new Map<
    string,
    {
      name: string
      approved: number
      total: number
      revenue: number
      refunded: number
    }
  >()

  for (const tx of filtered) {
    const id = tx.affiliate_id!
    const existing = map.get(id)
    if (existing) {
      existing.total += 1
      if (tx.status === 'approved') {
        existing.approved += 1
        existing.revenue += tx.amount
      }
      if (tx.status === 'refunded') existing.refunded += 1
    } else {
      map.set(id, {
        name: tx.affiliate_name || 'Desconhecido',
        total: 1,
        approved: tx.status === 'approved' ? 1 : 0,
        revenue: tx.status === 'approved' ? tx.amount : 0,
        refunded: tx.status === 'refunded' ? 1 : 0,
      })
    }
  }

  return Array.from(map.entries())
    .map(([id, data]) => {
      const conversionRate =
        data.total > 0 ? (data.approved / data.total) * 100 : 0
      const refundRate =
        data.approved > 0 ? (data.refunded / data.approved) * 100 : 0
      // Quality score: weighted by conversion and inverse of refund rate
      const qualityScore = Math.min(
        100,
        Math.max(0, conversionRate * 0.7 + (100 - refundRate * 10) * 0.3),
      )

      return {
        id,
        name: data.name,
        sales: data.approved,
        revenue: data.revenue,
        conversionRate,
        commission: data.revenue * 0.3,
        qualityScore: Math.round(qualityScore),
        refundRate,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

// ---------------------------------------------------------------------------
// Compute traffic quality (refund rate per affiliate + avg retention)
// ---------------------------------------------------------------------------

interface TrafficQualityRow {
  name: string
  totalSales: number
  refunds: number
  refundRate: number
  avgTicket: number
}

function computeTrafficQuality(
  transactions: DemoTransaction[],
  range: DateRange,
): TrafficQualityRow[] {
  const filtered = filterTransactions(transactions, range).filter(
    (t) => t.affiliate_id && (t.status === 'approved' || t.status === 'refunded'),
  )

  const map = new Map<
    string,
    { name: string; approved: number; refunded: number; revenue: number }
  >()

  for (const tx of filtered) {
    const id = tx.affiliate_id!
    const existing = map.get(id)
    if (existing) {
      if (tx.status === 'approved') {
        existing.approved += 1
        existing.revenue += tx.amount
      }
      if (tx.status === 'refunded') existing.refunded += 1
    } else {
      map.set(id, {
        name: tx.affiliate_name || 'Desconhecido',
        approved: tx.status === 'approved' ? 1 : 0,
        refunded: tx.status === 'refunded' ? 1 : 0,
        revenue: tx.status === 'approved' ? tx.amount : 0,
      })
    }
  }

  return Array.from(map.values())
    .map((d) => ({
      name: d.name,
      totalSales: d.approved,
      refunds: d.refunded,
      refundRate: d.approved > 0 ? (d.refunded / d.approved) * 100 : 0,
      avgTicket: d.approved > 0 ? d.revenue / d.approved : 0,
    }))
    .sort((a, b) => b.refundRate - a.refundRate)
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const rankingColumns: Column<AffiliateRow>[] = [
  {
    key: 'name',
    header: 'Afiliado',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    ),
  },
  {
    key: 'sales',
    header: 'Vendas',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.sales,
    render: (row) => formatNumber(row.sales),
  },
  {
    key: 'revenue',
    header: 'Receita',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.revenue,
    render: (row) => (
      <span className="font-semibold text-gray-900">
        {formatCurrency(row.revenue)}
      </span>
    ),
  },
  {
    key: 'conversionRate',
    header: 'Conversao',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.conversionRate,
    render: (row) => formatPercent(row.conversionRate),
  },
  {
    key: 'commission',
    header: 'Comissao',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.commission,
    render: (row) => formatCurrency(row.commission),
  },
  {
    key: 'qualityScore',
    header: 'Qualidade',
    align: 'center',
    sortable: true,
    sortValue: (row) => row.qualityScore,
    render: (row) => getQualityBadge(row.qualityScore),
  },
]

const trafficColumns: Column<TrafficQualityRow>[] = [
  {
    key: 'name',
    header: 'Afiliado',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{row.name}</span>
    ),
  },
  {
    key: 'totalSales',
    header: 'Vendas',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.totalSales,
    render: (row) => formatNumber(row.totalSales),
  },
  {
    key: 'refunds',
    header: 'Reembolsos',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.refunds,
    render: (row) => formatNumber(row.refunds),
  },
  {
    key: 'refundRate',
    header: 'Taxa Reembolso',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.refundRate,
    render: (row) => (
      <span
        className={cn(
          'font-medium',
          row.refundRate > 10
            ? 'text-red-600'
            : row.refundRate > 5
              ? 'text-yellow-600'
              : 'text-green-600',
        )}
      >
        {formatPercent(row.refundRate)}
      </span>
    ),
  },
  {
    key: 'avgTicket',
    header: 'Ticket Medio',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.avgTicket,
    render: (row) => formatCurrency(row.avgTicket),
  },
]

// ---------------------------------------------------------------------------
// AfiliadosPage
// ---------------------------------------------------------------------------

export function AfiliadosPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const { data: demoData } = useData()

  // Previous period for KPI comparison
  const previousRange = useMemo<DateRange>(() => {
    const days =
      Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    return {
      from: subDays(dateRange.from, days),
      to: subDays(dateRange.from, 1),
    }
  }, [dateRange])

  // Affiliate rows for ranking
  const affiliateRows = useMemo(
    () => computeAffiliateRows(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  const previousAffiliateRows = useMemo(
    () => computeAffiliateRows(demoData.transactions, previousRange),
    [demoData, previousRange],
  )

  // KPIs
  const kpis = useMemo(() => {
    const totalAffiliates = affiliateRows.length
    const prevTotalAffiliates = previousAffiliateRows.length
    const totalRevenue = affiliateRows.reduce((s, r) => s + r.revenue, 0)
    const prevRevenue = previousAffiliateRows.reduce((s, r) => s + r.revenue, 0)
    const totalCommissions = affiliateRows.reduce(
      (s, r) => s + r.commission,
      0,
    )
    const prevCommissions = previousAffiliateRows.reduce(
      (s, r) => s + r.commission,
      0,
    )
    const topAffiliate = affiliateRows[0]

    return {
      totalAffiliates,
      prevTotalAffiliates,
      totalRevenue,
      prevRevenue,
      totalCommissions,
      prevCommissions,
      topAffiliateName: topAffiliate?.name ?? '-',
      topAffiliateRevenue: topAffiliate?.revenue ?? 0,
    }
  }, [affiliateRows, previousAffiliateRows])

  // Top 10 for bar chart
  const top10Chart = useMemo(
    () => getTopAffiliates(demoData.transactions, dateRange, 10),
    [demoData, dateRange],
  )

  // Traffic quality
  const trafficQuality = useMemo(
    () => computeTrafficQuality(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Afiliados
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Performance e qualidade da rede de afiliados
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Total de Afiliados"
          value={kpis.totalAffiliates}
          previousValue={kpis.prevTotalAffiliates}
          format="number"
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="Receita via Afiliados"
          value={kpis.totalRevenue}
          previousValue={kpis.prevRevenue}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Comissoes Pagas"
          value={kpis.totalCommissions}
          previousValue={kpis.prevCommissions}
          format="currency"
          icon={<Award className="h-5 w-5" />}
        />
        <KPICard
          title="Top Afiliado"
          value={kpis.topAffiliateRevenue}
          format="currency"
          icon={<Star className="h-5 w-5" />}
          trend="up"
        />
      </div>

      {/* Top affiliate label */}
      {kpis.topAffiliateName !== '-' && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <Star className="h-4 w-4 shrink-0" />
          <span>
            Melhor afiliado no periodo:{' '}
            <strong>{kpis.topAffiliateName}</strong> com{' '}
            {formatCurrency(kpis.topAffiliateRevenue)} em receita
          </span>
        </div>
      )}

      {/* Performance chart: top 10 affiliates by revenue */}
      <ChartContainer
        title="Performance dos Top 10 Afiliados"
        className="min-h-[420px]"
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={top10Chart}
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
              width={130}
            />
            <Tooltip
              content={<CustomTooltip valueFormatter={formatCurrency} />}
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

      {/* Ranking table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Ranking de Afiliados
        </h2>
        <DataTable
          columns={rankingColumns}
          data={affiliateRows}
          searchable
          searchPlaceholder="Buscar afiliado..."
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </div>

      {/* Traffic quality analysis */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Qualidade do Trafego
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Analise de taxa de reembolso e ticket medio por afiliado para
          identificar fontes de trafego de baixa qualidade.
        </p>
        <DataTable
          columns={trafficColumns}
          data={trafficQuality}
          pageSize={10}
          rowKey={(row) => row.name}
        />
      </div>
    </div>
  )
}
