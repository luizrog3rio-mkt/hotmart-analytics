import { useState, useMemo } from 'react'
import { subDays, parseISO, format, isWithinInterval, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  RotateCcw,
  DollarSign,
  Percent,
  Clock,
} from 'lucide-react'

import { getDemoData } from '@/services/demo-data'
import type { DemoTransaction, DemoRefund } from '@/services/demo-data'
import { filterTransactions } from '@/services/metrics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { DataTable } from '@/components/data/DataTable'
import type { Column } from '@/components/data/DataTable'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber } from '@/lib/utils'

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

const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']

// ---------------------------------------------------------------------------
// Build refund timeline data
// ---------------------------------------------------------------------------

function buildRefundTimeline(
  refunds: DemoRefund[],
  range: DateRange,
): { date: string; count: number; amount: number }[] {
  const filtered = refunds.filter((r) => {
    const d = parseISO(r.requested_at)
    return isWithinInterval(d, { start: range.from, end: range.to })
  })

  const days = differenceInDays(range.to, range.from) + 1
  const map = new Map<string, { count: number; amount: number }>()

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = subDays(range.to, days - 1 - i)
    const key = format(date, 'yyyy-MM-dd')
    map.set(key, { count: 0, amount: 0 })
  }

  for (const r of filtered) {
    const key = r.requested_at.slice(0, 10)
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      existing.amount += r.amount
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, data]) => ({
      date: format(parseISO(dateStr), 'dd/MM'),
      count: data.count,
      amount: Math.round(data.amount * 100) / 100,
    }))
}

// ---------------------------------------------------------------------------
// Build refund reasons distribution
// ---------------------------------------------------------------------------

function buildRefundReasons(
  refunds: DemoRefund[],
  range: DateRange,
): { name: string; value: number; fill: string }[] {
  const filtered = refunds.filter((r) => {
    const d = parseISO(r.requested_at)
    return isWithinInterval(d, { start: range.from, end: range.to })
  })

  const counts = new Map<string, number>()
  for (const r of filtered) {
    counts.set(r.reason, (counts.get(r.reason) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count], idx) => ({
      name: reason,
      value: count,
      fill: PIE_COLORS[idx % PIE_COLORS.length],
    }))
}

// ---------------------------------------------------------------------------
// Recent refunds joined with transaction data
// ---------------------------------------------------------------------------

interface RefundRow {
  id: string
  buyerName: string
  productName: string
  amount: number
  reason: string
  date: string
  dateRaw: string
}

function buildRecentRefunds(
  refunds: DemoRefund[],
  transactions: DemoTransaction[],
  range: DateRange,
): RefundRow[] {
  const txMap = new Map<string, DemoTransaction>()
  for (const tx of transactions) {
    txMap.set(tx.id, tx)
  }

  return refunds
    .filter((r) => {
      const d = parseISO(r.requested_at)
      return isWithinInterval(d, { start: range.from, end: range.to })
    })
    .map((r) => {
      const tx = txMap.get(r.transaction_id)
      return {
        id: r.id,
        buyerName: tx?.buyer_name ?? 'Desconhecido',
        productName: tx?.product_name ?? 'N/A',
        amount: r.amount,
        reason: r.reason,
        date: format(parseISO(r.requested_at), "dd/MM/yyyy HH:mm", {
          locale: ptBR,
        }),
        dateRaw: r.requested_at,
      }
    })
    .sort((a, b) => b.dateRaw.localeCompare(a.dateRaw))
}

// ---------------------------------------------------------------------------
// Avg refund processing time (simulated based on data)
// ---------------------------------------------------------------------------

function computeAvgRefundDays(
  refunds: DemoRefund[],
  range: DateRange,
): number {
  const filtered = refunds.filter((r) => {
    const d = parseISO(r.requested_at)
    return isWithinInterval(d, { start: range.from, end: range.to })
  })
  if (filtered.length === 0) return 0
  // Simulated: average 2-5 days processing
  return 3.2
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const refundColumns: Column<RefundRow>[] = [
  {
    key: 'buyerName',
    header: 'Comprador',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900">{row.buyerName}</span>
    ),
  },
  {
    key: 'productName',
    header: 'Produto',
    sortable: true,
    render: (row) => (
      <span className="text-gray-700 truncate block max-w-[200px]">
        {row.productName}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Valor',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.amount,
    render: (row) => (
      <span className="font-semibold text-red-600">
        {formatCurrency(row.amount)}
      </span>
    ),
  },
  {
    key: 'reason',
    header: 'Motivo',
    sortable: true,
    render: (row) => (
      <Badge variant="warning">{row.reason}</Badge>
    ),
  },
  {
    key: 'date',
    header: 'Data',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.dateRaw,
    render: (row) => (
      <span className="text-sm text-gray-500">{row.date}</span>
    ),
  },
]

// ---------------------------------------------------------------------------
// ReembolsosPage
// ---------------------------------------------------------------------------

export function ReembolsosPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const demoData = useMemo(() => getDemoData(), [])

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

  // Filtered transactions
  const currentTx = useMemo(
    () => filterTransactions(demoData.transactions, dateRange),
    [demoData, dateRange],
  )
  const previousTx = useMemo(
    () => filterTransactions(demoData.transactions, previousRange),
    [demoData, previousRange],
  )

  // KPIs
  const kpis = useMemo(() => {
    const refundedCurrent = currentTx.filter((t) => t.status === 'refunded')
    const refundedPrevious = previousTx.filter((t) => t.status === 'refunded')

    const totalRefunds = refundedCurrent.length
    const prevRefunds = refundedPrevious.length

    const refundAmount = refundedCurrent.reduce((s, t) => s + t.amount, 0)
    const prevRefundAmount = refundedPrevious.reduce(
      (s, t) => s + t.amount,
      0,
    )

    const approvedCurrent = currentTx.filter((t) => t.status === 'approved')
    const approvedPrevious = previousTx.filter((t) => t.status === 'approved')

    const refundRate =
      approvedCurrent.length > 0
        ? (totalRefunds / approvedCurrent.length) * 100
        : 0
    const prevRefundRate =
      approvedPrevious.length > 0
        ? (prevRefunds / approvedPrevious.length) * 100
        : 0

    const avgDays = computeAvgRefundDays(demoData.refunds, dateRange)

    return {
      totalRefunds,
      prevRefunds,
      refundRate,
      prevRefundRate,
      refundAmount,
      prevRefundAmount,
      avgDays,
    }
  }, [currentTx, previousTx, demoData.refunds, dateRange])

  // Timeline chart
  const timeline = useMemo(
    () => buildRefundTimeline(demoData.refunds, dateRange),
    [demoData, dateRange],
  )

  // Pie chart reasons
  const reasons = useMemo(
    () => buildRefundReasons(demoData.refunds, dateRange),
    [demoData, dateRange],
  )

  // Recent refunds table
  const recentRefunds = useMemo(
    () =>
      buildRecentRefunds(
        demoData.refunds,
        demoData.transactions,
        dateRange,
      ),
    [demoData, dateRange],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Reembolsos e Chargebacks
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analise de reembolsos, disputas e motivos de devolucao
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KPICard
          title="Total Reembolsos"
          value={kpis.totalRefunds}
          previousValue={kpis.prevRefunds}
          format="number"
          icon={<RotateCcw className="h-5 w-5" />}
        />
        <KPICard
          title="Taxa de Reembolso"
          value={kpis.refundRate}
          previousValue={kpis.prevRefundRate}
          format="percent"
          icon={<Percent className="h-5 w-5" />}
          trend={kpis.refundRate > kpis.prevRefundRate ? 'down' : 'up'}
        />
        <KPICard
          title="Valor Reembolsado"
          value={kpis.refundAmount}
          previousValue={kpis.prevRefundAmount}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
          trend={kpis.refundAmount > kpis.prevRefundAmount ? 'down' : 'up'}
        />
        <KPICard
          title="Tempo Medio"
          value={kpis.avgDays}
          format="number"
          icon={<Clock className="h-5 w-5" />}
          trend="neutral"
        />
      </div>

      {/* Avg processing time info */}
      <div className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
        O tempo medio de processamento de reembolsos e de{' '}
        <strong>{kpis.avgDays.toFixed(1)} dias</strong> uteis.
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Timeline chart */}
        <ChartContainer
          title="Reembolsos ao Longo do Tempo"
          className="min-h-[380px]"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="count"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="amount"
                orientation="right"
                tickFormatter={shortCurrency}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                content={<CustomTooltip valueFormatter={formatNumber} />}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                name="Quantidade"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
              />
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="amount"
                name="Valor (R$)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Pie chart of refund reasons */}
        <ChartContainer
          title="Motivos de Reembolso"
          className="min-h-[380px]"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reasons}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
                {reasons.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip valueFormatter={formatNumber} />}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, lineHeight: '22px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Recent refunds table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Reembolsos Recentes
        </h2>
        <DataTable
          columns={refundColumns}
          data={recentRefunds}
          searchable
          searchPlaceholder="Buscar reembolso..."
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </div>
    </div>
  )
}
