import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Search,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { detectAnomalies, type AnomalyData } from '@/services/marketing-analytics'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeverityFilter = 'all' | 'critical' | 'warning' | 'opportunity'
type StatusFilter = 'all' | 'new' | 'investigating' | 'resolved' | 'ignored'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const severityConfig = {
  critical: {
    dot: 'bg-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    label: 'Critico',
    icon: ShieldAlert,
  },
  warning: {
    dot: 'bg-yellow-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    label: 'Aviso',
    icon: AlertTriangle,
  },
  opportunity: {
    dot: 'bg-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    label: 'Oportunidade',
    icon: TrendingUp,
  },
} as const

const statusBadgeVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  new: 'info',
  investigating: 'warning',
  resolved: 'success',
  ignored: 'default',
}

const statusLabel: Record<string, string> = {
  new: 'Novo',
  investigating: 'Investigando',
  resolved: 'Resolvido',
  ignored: 'Ignorado',
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMetricValue(metric: string, value: number): string {
  if (metric.includes('receita') || metric.includes('ticket')) {
    return formatCurrency(value)
  }
  if (metric.includes('taxa') || metric.includes('conversao') || metric.includes('roas')) {
    return `${value.toFixed(1)}%`
  }
  return formatNumber(value)
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function TimelineTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const count = payload.find(p => p.dataKey === 'count')?.value ?? 0
  const critical = payload.find(p => p.dataKey === 'critical')?.value ?? 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-xs text-gray-500">
        Total: <span className="font-medium text-gray-900">{count}</span>
      </p>
      <p className="text-xs text-gray-500">
        Criticos: <span className="font-medium text-red-600">{critical}</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            color,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AnomalyCard({
  anomaly,
}: {
  anomaly: AnomalyData['anomalies'][number]
}) {
  const config = severityConfig[anomaly.severity]
  const isPositive = anomaly.deviation > 0

  return (
    <Card className={cn('border-l-4 transition-shadow hover:shadow-md', config.border)}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left section */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span
              className={cn(
                'mt-1 h-3 w-3 shrink-0 rounded-full',
                config.dot,
              )}
              aria-label={`Severidade: ${config.label}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">
                  {anomaly.type}
                </h3>
                <Badge variant={statusBadgeVariant[anomaly.status]}>
                  {statusLabel[anomaly.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {anomaly.context}
              </p>

              {/* Metrics row */}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Esperado
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatMetricValue(anomaly.metric, anomaly.expectedValue)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Real
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatMetricValue(anomaly.metric, anomaly.actualValue)}
                  </span>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    isPositive
                      ? anomaly.severity === 'opportunity'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                      : 'bg-red-50 text-red-700',
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {isPositive ? '+' : ''}
                  {anomaly.deviation.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0 sm:mt-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTimestamp(anomaly.detectedAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnomaliasPage() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const data = useMemo(() => detectAnomalies(), [])

  const summary = useMemo(() => {
    const newCount = data.anomalies.filter(a => a.status === 'new').length
    const critical = data.anomalies.filter(a => a.severity === 'critical').length
    const warnings = data.anomalies.filter(a => a.severity === 'warning').length
    const opportunities = data.anomalies.filter(a => a.severity === 'opportunity').length
    return { newCount, critical, warnings, opportunities }
  }, [data.anomalies])

  const filteredAnomalies = useMemo(() => {
    return data.anomalies.filter(a => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
  }, [data.anomalies, severityFilter, statusFilter])

  const severityButtons: { key: SeverityFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'critical', label: 'Criticos' },
    { key: 'warning', label: 'Avisos' },
    { key: 'opportunity', label: 'Oportunidades' },
  ]

  const statusButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'new', label: 'Novos' },
    { key: 'investigating', label: 'Investigando' },
    { key: 'resolved', label: 'Resolvidos' },
    { key: 'ignored', label: 'Ignorados' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-gray-900">
          Deteccao de Anomalias
        </h2>
        <p className="text-sm text-gray-500">
          Monitoramento inteligente de metricas fora do padrao
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Novas anomalias"
          value={summary.newCount}
          icon={Activity}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          label="Criticas"
          value={summary.critical}
          icon={ShieldAlert}
          color="bg-red-50 text-red-600"
        />
        <SummaryCard
          label="Avisos"
          value={summary.warnings}
          icon={AlertTriangle}
          color="bg-yellow-50 text-yellow-600"
        />
        <SummaryCard
          label="Oportunidades"
          value={summary.opportunities}
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Timeline chart */}
      <ChartContainer title="Timeline de Anomalias (14 dias)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.timeline} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TimelineTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32} name="Total">
              {data.timeline.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.critical > 0 ? '#ef4444' : '#3b82f6'}
                  fillOpacity={entry.critical > 0 ? 0.85 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Severidade:
          </span>
          {severityButtons.map(btn => (
            <Button
              key={btn.key}
              variant={severityFilter === btn.key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Status:
          </span>
          {statusButtons.map(btn => (
            <Button
              key={btn.key}
              variant={statusFilter === btn.key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Anomaly feed */}
      <div className="space-y-3">
        {filteredAnomalies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-gray-400">
              <Search className="h-10 w-10" />
              <p className="text-sm font-medium">
                Nenhuma anomalia encontrada com esses filtros.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAnomalies.map(anomaly => (
            <AnomalyCard key={anomaly.id} anomaly={anomaly} />
          ))
        )}
      </div>
    </div>
  )
}
