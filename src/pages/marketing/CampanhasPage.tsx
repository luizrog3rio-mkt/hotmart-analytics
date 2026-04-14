import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  DollarSign,
  TrendingUp,
  Megaphone,
  Users,
  MousePointerClick,
  Eye,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import { calculateCampaigns } from '@/services/marketing-analytics'
import type { DateRange } from '@/services/metrics'

import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Chart helpers
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
// ROAS color helpers
// ---------------------------------------------------------------------------

function roasColor(roas: number): string {
  if (roas >= 3) return 'text-green-600 font-semibold'
  if (roas >= 2) return 'text-yellow-600 font-semibold'
  return 'text-red-600 font-semibold'
}

function roasBg(roas: number): string {
  if (roas >= 3) return 'bg-green-50'
  if (roas >= 2) return 'bg-yellow-50'
  return 'bg-red-50'
}

function roasBarColor(roas: number): string {
  if (roas >= 3) return '#22c55e'
  if (roas >= 2) return '#eab308'
  return '#ef4444'
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function statusBadge(status: 'active' | 'paused' | 'ended') {
  const map = {
    active: { label: 'Ativo', variant: 'success' as const },
    paused: { label: 'Pausado', variant: 'warning' as const },
    ended: { label: 'Encerrado', variant: 'default' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

// ---------------------------------------------------------------------------
// Campaign type
// ---------------------------------------------------------------------------

interface Campaign {
  name: string
  source: string
  spend: number
  revenue: number
  roas: number
  cpa: number
  conversions: number
  clicks: number
  impressions: number
  ctr: number
  status: 'active' | 'paused' | 'ended'
}

// ---------------------------------------------------------------------------
// CampanhasPage
// ---------------------------------------------------------------------------

export function CampanhasPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const { data: demoData } = useData()

  const campaignData = useMemo(
    () => calculateCampaigns(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  const { campaigns, totalSpend, totalRevenue, avgRoas } = campaignData

  // Derived metrics
  const totalConversions = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.conversions, 0),
    [campaigns],
  )

  const totalClicks = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.clicks, 0),
    [campaigns],
  )

  const totalImpressions = useMemo(
    () => campaigns.reduce((sum, c) => sum + c.impressions, 0),
    [campaigns],
  )

  // Active, paused, ended counts
  const statusCounts = useMemo(() => {
    const counts = { active: 0, paused: 0, ended: 0 }
    for (const c of campaigns) {
      counts[c.status] += 1
    }
    return counts
  }, [campaigns])

  // Top campaigns by ROAS for bar chart - colored by ROAS performance
  const topByRoas = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 8),
    [campaigns],
  )

  // ROAS trend data - simulated from campaigns sorted by spend (proxy for timeline)
  const roasTrend = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => a.spend - b.spend)
      .map((c) => ({
        name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
        roas: c.roas,
        revenue: c.revenue,
        spend: c.spend,
      }))
  }, [campaigns])

  // Spend vs Revenue comparison
  const spendVsRevenue = useMemo(
    () =>
      campaigns.map((c) => ({
        name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
        spend: c.spend,
        revenue: c.revenue,
      })),
    [campaigns],
  )

  // Campaign columns
  const campaignColumns: Column<Campaign>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Campanha',
        render: (row) => (
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.source}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => statusBadge(row.status),
      },
      {
        key: 'spend',
        header: 'Investimento',
        align: 'right' as const,
        sortValue: (row) => row.spend,
        render: (row) => formatCurrency(row.spend),
      },
      {
        key: 'revenue',
        header: 'Receita',
        align: 'right' as const,
        sortValue: (row) => row.revenue,
        render: (row) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(row.revenue)}
          </span>
        ),
      },
      {
        key: 'roas',
        header: 'ROAS',
        align: 'right' as const,
        sortValue: (row) => row.roas,
        render: (row) => (
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-sm',
              roasColor(row.roas),
              roasBg(row.roas),
            )}
          >
            {row.roas.toFixed(2)}x
          </span>
        ),
      },
      {
        key: 'cpa',
        header: 'CPA',
        align: 'right' as const,
        sortValue: (row) => row.cpa,
        render: (row) => formatCurrency(row.cpa),
      },
      {
        key: 'conversions',
        header: 'Conversoes',
        align: 'right' as const,
        sortValue: (row) => row.conversions,
        render: (row) => formatNumber(row.conversions),
      },
      {
        key: 'clicks',
        header: 'Cliques',
        align: 'right' as const,
        sortValue: (row) => row.clicks,
        render: (row) => formatNumber(row.clicks),
      },
      {
        key: 'impressions',
        header: 'Impressoes',
        align: 'right' as const,
        sortValue: (row) => row.impressions,
        render: (row) => formatNumber(row.impressions),
      },
      {
        key: 'ctr',
        header: 'CTR',
        align: 'right' as const,
        sortValue: (row) => row.ctr,
        render: (row) => `${row.ctr.toFixed(2)}%`,
      },
    ],
    [],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Performance de Campanhas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analise detalhada de investimento, retorno e metricas de cada campanha
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Investimento Total"
          value={totalSpend}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Receita"
          value={totalRevenue}
          format="currency"
          icon={<Megaphone className="h-5 w-5" />}
        />
        <KPICard
          title="ROAS Medio"
          value={avgRoas}
          format="number"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="Conversoes"
          value={totalConversions}
          format="number"
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="Cliques"
          value={totalClicks}
          format="number"
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <KPICard
          title="Impressoes"
          value={totalImpressions}
          format="number"
          icon={<Eye className="h-5 w-5" />}
        />
      </div>

      {/* Status overview cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-gray-700">Ativas</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {statusCounts.active}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Pausadas</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {statusCounts.paused}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-sm font-medium text-gray-700">Encerradas</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {statusCounts.ended}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top campaigns by ROAS - colored bars */}
        <ChartContainer
          title="ROAS por Campanha"
          className="min-h-[400px]"
        >
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={topByRoas}
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
                  <CustomTooltip
                    valueFormatter={(v) => `${v.toFixed(2)}x`}
                  />
                }
              />
              <Bar
                dataKey="roas"
                name="ROAS"
                radius={[0, 6, 6, 0]}
                barSize={20}
              >
                {topByRoas.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={roasBarColor(entry.roas)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* ROAS trend line */}
        <ChartContainer
          title="Tendencia de ROAS"
          className="min-h-[400px]"
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={roasTrend} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                height={60}
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
                    valueFormatter={(v) => `${v.toFixed(2)}x`}
                  />
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="roas"
                name="ROAS"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Spend vs Revenue comparison */}
      <ChartContainer
        title="Investimento vs Receita por Campanha"
        className="min-h-[380px]"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={spendVsRevenue} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={shortCurrency}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              content={<CustomTooltip valueFormatter={formatCurrency} />}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              dataKey="spend"
              name="Investimento"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="revenue"
              name="Receita"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Full campaign table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            Detalhamento de Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={campaignColumns}
            data={campaigns}
            searchable
            searchPlaceholder="Buscar campanha..."
            pageSize={10}
            rowKey={(row) => row.name}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default CampanhasPage
