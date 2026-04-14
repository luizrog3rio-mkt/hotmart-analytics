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
import {
  DollarSign,
  Target,
  TrendingUp,
  Globe,
  Megaphone,
  Route,
  MapPin,
  Clock,
  Banknote,
} from 'lucide-react'

import { useData } from '@/hooks/useData'
import {
  calculateAttribution,
  calculateCampaigns,
  calculateGeo,
} from '@/services/marketing-analytics'
import type { DateRange } from '@/services/metrics'

import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------

// Currency formatter for charts

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
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'atribuicao', label: 'Atribuicao' },
  { id: 'campanhas', label: 'Campanhas' },
  { id: 'geografico', label: 'Geografico' },
] as const

// ---------------------------------------------------------------------------
// ROAS color helper
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
// Attribution channel type
// ---------------------------------------------------------------------------

interface AttributionChannel {
  channel: string
  firstTouch: number
  lastTouch: number
  linear: number
  revenue: number
  conversions: number
  avgTicket: number
}

interface Journey {
  path: string
  conversions: number
  revenue: number
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
// Geo types
// ---------------------------------------------------------------------------

interface Country {
  code: string
  name: string
  revenue: number
  sales: number
  avgTicket: number
  refundRate: number
  flag: string
}

interface State {
  code: string
  name: string
  revenue: number
  sales: number
}

interface Currency {
  currency: string
  symbol: string
  revenue: number
  revenueInBRL: number
  rate: number
}

interface PeakHour {
  timezone: string
  peakHour: number
  sales: number
}

// ---------------------------------------------------------------------------
// Atribuicao Tab
// ---------------------------------------------------------------------------

function AtribuicaoTab({
  channels,
  journeys,
}: {
  channels: AttributionChannel[]
  journeys: Journey[]
}) {
  const channelColumns: Column<AttributionChannel>[] = useMemo(
    () => [
      {
        key: 'channel',
        header: 'Canal',
        render: (row) => (
          <span className="font-medium text-gray-900">{row.channel}</span>
        ),
      },
      {
        key: 'firstTouch',
        header: 'First Touch',
        align: 'right' as const,
        sortValue: (row) => row.firstTouch,
        render: (row) => formatNumber(row.firstTouch),
      },
      {
        key: 'lastTouch',
        header: 'Last Touch',
        align: 'right' as const,
        sortValue: (row) => row.lastTouch,
        render: (row) => formatNumber(row.lastTouch),
      },
      {
        key: 'linear',
        header: 'Linear',
        align: 'right' as const,
        sortValue: (row) => row.linear,
        render: (row) => formatNumber(row.linear),
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
        key: 'conversions',
        header: 'Conversoes',
        align: 'right' as const,
        sortValue: (row) => row.conversions,
        render: (row) => formatNumber(row.conversions),
      },
      {
        key: 'avgTicket',
        header: 'Ticket Medio',
        align: 'right' as const,
        sortValue: (row) => row.avgTicket,
        render: (row) => formatCurrency(row.avgTicket),
      },
    ],
    [],
  )

  const journeyColumns: Column<Journey>[] = useMemo(
    () => [
      {
        key: 'path',
        header: 'Jornada',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="font-medium text-gray-900">{row.path}</span>
          </div>
        ),
      },
      {
        key: 'conversions',
        header: 'Conversoes',
        align: 'right' as const,
        sortValue: (row) => row.conversions,
        render: (row) => formatNumber(row.conversions),
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
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Attribution comparison chart */}
      <ChartContainer
        title="Comparativo de Modelos de Atribuicao"
        className="min-h-[380px]"
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={channels} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="channel"
              tick={{ fontSize: 11, fill: '#64748b' }}
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
              content={<CustomTooltip valueFormatter={formatNumber} />}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              dataKey="firstTouch"
              name="First Touch"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="lastTouch"
              name="Last Touch"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="linear"
              name="Linear"
              fill="#06b6d4"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Channel metrics table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Metricas por Canal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={channelColumns}
            data={channels}
            pageSize={10}
            rowKey={(row) => row.channel}
          />
        </CardContent>
      </Card>

      {/* Journey paths table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-purple-600" />
            Jornadas Multi-Touch
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={journeyColumns}
            data={journeys}
            pageSize={10}
            rowKey={(row) => row.path}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campanhas Tab
// ---------------------------------------------------------------------------

function CampanhasTab({
  campaigns,
  totalSpend,
  totalRevenue,
  avgRoas,
}: {
  campaigns: Campaign[]
  totalSpend: number
  totalRevenue: number
  avgRoas: number
}) {
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

  // Top campaigns by ROAS for chart
  const topByRoas = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => b.roas - a.roas)
        .slice(0, 8),
    [campaigns],
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          title="Investimento Total"
          value={totalSpend}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Receita de Campanhas"
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
      </div>

      {/* Top campaigns by ROAS chart */}
      <ChartContainer
        title="Top Campanhas por ROAS"
        className="min-h-[380px]"
      >
        <ResponsiveContainer width="100%" height={320}>
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
              fill="#3b82f6"
              radius={[0, 6, 6, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Campaign table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            Todas as Campanhas
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

// ---------------------------------------------------------------------------
// Geografico Tab
// ---------------------------------------------------------------------------

function GeograficoTab({
  countries,
  states,
  currencies,
  peakHours,
}: {
  countries: Country[]
  states: State[]
  currencies: Currency[]
  peakHours: PeakHour[]
}) {
  const countryColumns: Column<Country>[] = useMemo(
    () => [
      {
        key: 'rank',
        header: '#',
        width: '50px',
        render: (_row, ) => {
          const idx = countries.indexOf(_row)
          return (
            <span className="text-xs font-bold text-gray-400">
              {idx + 1}
            </span>
          )
        },
        sortable: false,
      },
      {
        key: 'name',
        header: 'Pais',
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">{row.flag}</span>
            <span className="font-medium text-gray-900">{row.name}</span>
            <span className="text-xs text-gray-400">{row.code}</span>
          </div>
        ),
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
        key: 'sales',
        header: 'Vendas',
        align: 'right' as const,
        sortValue: (row) => row.sales,
        render: (row) => formatNumber(row.sales),
      },
      {
        key: 'avgTicket',
        header: 'Ticket Medio',
        align: 'right' as const,
        sortValue: (row) => row.avgTicket,
        render: (row) => formatCurrency(row.avgTicket),
      },
      {
        key: 'refundRate',
        header: 'Taxa Reembolso',
        align: 'right' as const,
        sortValue: (row) => row.refundRate,
        render: (row) => (
          <span
            className={cn(
              'text-sm',
              row.refundRate > 5
                ? 'text-red-600 font-semibold'
                : 'text-gray-700',
            )}
          >
            {row.refundRate.toFixed(1)}%
          </span>
        ),
      },
    ],
    [countries],
  )

  const stateColumns: Column<State>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'UF',
        width: '60px',
        render: (row) => (
          <Badge variant="info">{row.code}</Badge>
        ),
      },
      {
        key: 'name',
        header: 'Estado',
        render: (row) => (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
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
        key: 'sales',
        header: 'Vendas',
        align: 'right' as const,
        sortValue: (row) => row.sales,
        render: (row) => formatNumber(row.sales),
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Country ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Ranking por Pais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={countryColumns}
            data={countries}
            pageSize={10}
            rowKey={(row) => row.code}
          />
        </CardContent>
      </Card>

      {/* Two-column: States + Currency */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* States (Brazil) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Estados (Brasil)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={stateColumns}
              data={states}
              pageSize={10}
              rowKey={(row) => row.code}
            />
          </CardContent>
        </Card>

        {/* Currency breakdown + Peak hours */}
        <div className="space-y-6">
          {/* Currency breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-amber-600" />
                Moedas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currencies.map((c) => {
                  const maxRevenue = currencies[0]?.revenueInBRL || 1
                  const pct = (c.revenueInBRL / maxRevenue) * 100

                  return (
                    <div key={c.currency}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {c.symbol} {c.currency}
                          </span>
                          <span className="text-xs text-gray-400">
                            Taxa: {c.rate.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(c.revenueInBRL)}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            ({c.symbol}{formatNumber(c.revenue)})
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Peak hours by timezone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Horario de Pico por Fuso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {peakHours.map((ph) => (
                  <div
                    key={ph.timezone}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ph.timezone}
                      </p>
                      <p className="text-xs text-gray-500">
                        Pico: {String(ph.peakHour).padStart(2, '0')}:00h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatNumber(ph.sales)}
                      </p>
                      <p className="text-xs text-gray-500">vendas</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MarketingPage
// ---------------------------------------------------------------------------

export function MarketingPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState<string>('atribuicao')

  const { data: demoData } = useData()

  // Attribution data
  const attribution = useMemo(
    () => calculateAttribution(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  // Campaign data
  const campaignData = useMemo(
    () => calculateCampaigns(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  // Geo data
  const geoData = useMemo(
    () => calculateGeo(demoData.transactions, dateRange),
    [demoData, dateRange],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Marketing & Atribuicao
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analise de canais, campanhas e distribuicao geografica
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[...TABS]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'atribuicao' && (
          <AtribuicaoTab
            channels={attribution.channels}
            journeys={attribution.journeys}
          />
        )}

        {activeTab === 'campanhas' && (
          <CampanhasTab
            campaigns={campaignData.campaigns}
            totalSpend={campaignData.totalSpend}
            totalRevenue={campaignData.totalRevenue}
            avgRoas={campaignData.avgRoas}
          />
        )}

        {activeTab === 'geografico' && (
          <GeograficoTab
            countries={geoData.countries}
            states={geoData.states}
            currencies={geoData.currencies}
            peakHours={geoData.peakHoursByTimezone}
          />
        )}
      </div>
    </div>
  )
}

export default MarketingPage
