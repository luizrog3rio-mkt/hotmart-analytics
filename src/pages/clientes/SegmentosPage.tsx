import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Users, Target, Crown, AlertTriangle } from 'lucide-react'

import { useData } from '@/hooks/useData'
import { calculateRFM, getRFMSegmentSummary } from '@/services/customer-analytics'
import type { RFMScore } from '@/services/customer-analytics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { DataTable } from '@/components/data/DataTable'
import type { Column } from '@/components/data/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
  dataKey: string
  payload: { name: string; value: number; fill: string }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-gray-600">{entry.name}:</span>
        <span className="font-semibold text-gray-900">
          {formatNumber(entry.value)} clientes
        </span>
      </div>
    </div>
  )
}

function getSegmentBadgeVariant(segment: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (segment) {
    case 'Champions':
    case 'Alto Valor':
      return 'success'
    case 'Clientes Fieis':
    case 'Potenciais Fieis':
      return 'info'
    case 'Novos Clientes':
      return 'default'
    case 'Em Risco':
      return 'warning'
    case 'Hibernando':
      return 'danger'
    default:
      return 'default'
  }
}

// ---------------------------------------------------------------------------
// Score bar component
// ---------------------------------------------------------------------------

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor:
              score >= 4 ? '#22c55e' : score >= 3 ? '#3b82f6' : score >= 2 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{score.toFixed(1)}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DataTable columns
// ---------------------------------------------------------------------------

const customerColumns: Column<RFMScore>[] = [
  {
    key: 'buyerName',
    header: 'Cliente',
    sortable: true,
    render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.buyerName}</p>
        <p className="text-xs text-gray-400">{row.buyerEmail}</p>
      </div>
    ),
  },
  {
    key: 'segment',
    header: 'Segmento',
    sortable: true,
    render: (row) => (
      <Badge variant={getSegmentBadgeVariant(row.segment)}>
        {row.segment}
      </Badge>
    ),
  },
  {
    key: 'recency',
    header: 'Recencia',
    align: 'center',
    sortable: true,
    sortValue: (row) => row.recency,
    render: (row) => (
      <div className="text-center">
        <p className="text-sm text-gray-700">{row.recency}d</p>
        <p className="text-xs text-gray-400">R: {row.rScore}</p>
      </div>
    ),
  },
  {
    key: 'frequency',
    header: 'Frequencia',
    align: 'center',
    sortable: true,
    sortValue: (row) => row.frequency,
    render: (row) => (
      <div className="text-center">
        <p className="text-sm text-gray-700">{row.frequency}x</p>
        <p className="text-xs text-gray-400">F: {row.fScore}</p>
      </div>
    ),
  },
  {
    key: 'monetary',
    header: 'Monetario',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.monetary,
    render: (row) => (
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{formatCurrency(row.monetary)}</p>
        <p className="text-xs text-gray-400">M: {row.mScore}</p>
      </div>
    ),
  },
]

// ---------------------------------------------------------------------------
// SegmentosPage
// ---------------------------------------------------------------------------

export function SegmentosPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const { data: demoData } = useData()

  const rfmScores = useMemo(
    () => calculateRFM(demoData.transactions),
    [demoData.transactions],
  )

  const segmentSummary = useMemo(
    () => getRFMSegmentSummary(rfmScores),
    [rfmScores],
  )

  // Donut chart data
  const donutData = useMemo(
    () =>
      segmentSummary.map((s) => ({
        name: s.segment,
        value: s.count,
        fill: s.color,
      })),
    [segmentSummary],
  )

  // KPI metrics
  const totalCustomers = rfmScores.length
  const champions = segmentSummary.find((s) => s.segment === 'Champions')
  const atRisk = segmentSummary.find((s) => s.segment === 'Em Risco')
  const avgMonetary = totalCustomers > 0
    ? rfmScores.reduce((sum, r) => sum + r.monetary, 0) / totalCustomers
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Segmentacao RFM
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Recencia, Frequencia e Valor Monetario dos seus clientes
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total de Clientes"
          value={totalCustomers}
          format="number"
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="Champions"
          value={champions?.count ?? 0}
          format="number"
          icon={<Crown className="h-5 w-5" />}
        />
        <KPICard
          title="Em Risco"
          value={atRisk?.count ?? 0}
          format="number"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KPICard
          title="Gasto Medio"
          value={avgMonetary}
          format="currency"
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      {/* Donut Chart + Segment Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Donut Chart */}
        <ChartContainer title="Distribuicao de Segmentos" className="lg:col-span-2 min-h-[420px]">
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, lineHeight: '24px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Segment Cards Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {segmentSummary.map((segment) => (
            <Card key={segment.segment} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <CardTitle className="text-sm">{segment.segment}</CardTitle>
                  </div>
                  <Badge variant={getSegmentBadgeVariant(segment.segment)}>
                    {segment.count} ({formatPercent(segment.percentage)})
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Avg scores */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Recencia</p>
                    <ScoreBar score={segment.avgRecency > 100 ? 1 : 5 - (segment.avgRecency / 25)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Frequencia</p>
                    <ScoreBar score={Math.min(segment.avgFrequency, 5)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Monetario</p>
                    <p className="text-xs font-medium text-gray-700">
                      {formatCurrency(segment.avgMonetary)}
                    </p>
                  </div>
                </div>

                {/* Recommendation */}
                {segment.recommendation && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {segment.recommendation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Customer DataTable */}
      <ChartContainer title="Clientes por Segmento RFM">
        <DataTable<RFMScore>
          columns={customerColumns}
          data={rfmScores}
          searchable
          searchPlaceholder="Buscar por nome ou email..."
          pageSize={10}
          rowKey={(row) => row.buyerEmail}
        />
      </ChartContainer>
    </div>
  )
}
