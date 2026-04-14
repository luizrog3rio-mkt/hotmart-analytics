import { useState, useMemo } from 'react'
import { subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  UserMinus,
  UserX,
  CreditCard,
  DollarSign,
  AlertCircle,
} from 'lucide-react'

import { getDemoData } from '@/services/demo-data'
import { calculateChurn } from '@/services/customer-analytics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  valueFormatter = formatNumber,
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
// Donut chart colors for reasons
// ---------------------------------------------------------------------------

const REASON_COLORS = [
  '#ef4444', '#f59e0b', '#f97316', '#8b5cf6', '#3b82f6',
  '#06b6d4', '#6b7280',
]

// ---------------------------------------------------------------------------
// ChurnPage
// ---------------------------------------------------------------------------

export function ChurnPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const demoData = useMemo(() => getDemoData(), [])

  const churnData = useMemo(
    () => calculateChurn(demoData.transactions, dateRange),
    [demoData.transactions, dateRange],
  )

  // Donut chart data for reasons
  const reasonsDonutData = useMemo(
    () =>
      churnData.reasons.map((r, i) => ({
        name: r.reason,
        value: r.count,
        fill: REASON_COLORS[i % REASON_COLORS.length],
      })),
    [churnData.reasons],
  )

  // Retention by plan bar data
  const planRetentionData = useMemo(
    () =>
      churnData.retentionByPlan.map((p) => ({
        plan: p.plan,
        retention: p.retention,
      })),
    [churnData.retentionByPlan],
  )

  // Net MRR impact
  const netMRRImpact = churnData.recoveredMRR - churnData.churnedMRR

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Analise de Churn
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitore cancelamentos, motivos e estrategias de retencao
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Taxa de Churn"
          value={churnData.currentRate}
          previousValue={churnData.previousRate}
          format="percent"
          icon={<UserMinus className="h-5 w-5" />}
          trend={churnData.currentRate > churnData.previousRate ? 'down' : 'up'}
        />
        <KPICard
          title="Churn Voluntario"
          value={churnData.voluntaryRate}
          format="percent"
          icon={<UserX className="h-5 w-5" />}
        />
        <KPICard
          title="Churn Involuntario"
          value={churnData.involuntaryRate}
          format="percent"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <KPICard
          title="MRR Perdido"
          value={churnData.churnedMRR}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* MRR Impact Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">MRR Perdido (Churn)</p>
          <p className="mt-1 text-xl font-bold text-red-700">
            -{formatCurrency(churnData.churnedMRR)}
          </p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wider">MRR Recuperado</p>
          <p className="mt-1 text-xl font-bold text-green-700">
            +{formatCurrency(churnData.recoveredMRR)}
          </p>
        </div>
        <div className={cn(
          'rounded-2xl border p-4',
          netMRRImpact >= 0
            ? 'border-green-100 bg-green-50'
            : 'border-red-100 bg-red-50',
        )}>
          <p className={cn(
            'text-xs font-medium uppercase tracking-wider',
            netMRRImpact >= 0 ? 'text-green-600' : 'text-red-600',
          )}>
            Impacto Liquido MRR
          </p>
          <p className={cn(
            'mt-1 text-xl font-bold',
            netMRRImpact >= 0 ? 'text-green-700' : 'text-red-700',
          )}>
            {netMRRImpact >= 0 ? '+' : ''}{formatCurrency(netMRRImpact)}
          </p>
        </div>
      </div>

      {/* Monthly Churn Rate Chart */}
      <ChartContainer title="Evolucao da Taxa de Churn" className="min-h-[420px]">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={churnData.monthlyRates}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              content={
                <CustomTooltip valueFormatter={(v) => `${v.toFixed(2)}%`} />
              }
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              name="Churn Total"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="voluntary"
              name="Voluntario"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            />
            <Line
              type="monotone"
              dataKey="involuntary"
              name="Involuntario"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Reasons Donut + Retention by Plan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cancellation Reasons */}
        <ChartContainer title="Motivos de Cancelamento" className="min-h-[420px]">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={reasonsDonutData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
                {reasonsDonutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <CustomTooltip
                    valueFormatter={(v) => `${formatNumber(v)} cancelamentos`}
                  />
                }
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, lineHeight: '22px' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Top reasons list */}
          <div className="mt-2 space-y-2">
            {churnData.reasons.slice(0, 3).map((reason, idx) => (
              <div
                key={reason.reason}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle
                    className="h-4 w-4"
                    style={{ color: REASON_COLORS[idx] }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {reason.reason}
                  </span>
                </div>
                <Badge variant={idx === 0 ? 'danger' : idx === 1 ? 'warning' : 'default'}>
                  {formatPercent(reason.percentage)}
                </Badge>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* Retention by Plan */}
        <ChartContainer title="Retencao por Tipo de Plano" className="min-h-[420px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={planRetentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="plan"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                content={
                  <CustomTooltip valueFormatter={(v) => `${v.toFixed(1)}%`} />
                }
              />
              <Bar
                dataKey="retention"
                name="Retencao"
                radius={[6, 6, 0, 0]}
                barSize={48}
              >
                {planRetentionData.map((entry) => (
                  <Cell
                    key={entry.plan}
                    fill={
                      entry.retention >= 90
                        ? '#22c55e'
                        : entry.retention >= 80
                        ? '#3b82f6'
                        : entry.retention >= 70
                        ? '#f59e0b'
                        : '#ef4444'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Plan retention details */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {churnData.retentionByPlan.map((plan) => {
              const churnPct = 100 - plan.retention
              return (
                <div key={plan.plan} className="rounded-lg border border-gray-100 p-3 text-center">
                  <p className="text-xs font-medium text-gray-500">{plan.plan}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {plan.retention}%
                  </p>
                  <p className="text-xs text-gray-400">retencao</p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${plan.retention}%`,
                        backgroundColor:
                          plan.retention >= 90 ? '#22c55e' :
                          plan.retention >= 80 ? '#3b82f6' :
                          plan.retention >= 70 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-red-500">
                    {churnPct}% churn
                  </p>
                </div>
              )
            })}
          </div>

          {/* Recommendation */}
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs font-semibold text-blue-800">Recomendacao</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              Planos anuais tem {churnData.retentionByPlan[2]?.retention}% de retencao vs{' '}
              {churnData.retentionByPlan[0]?.retention}% no mensal. Incentive a migracao
              para planos de maior recorrencia com descontos progressivos.
            </p>
          </div>
        </ChartContainer>
      </div>
    </div>
  )
}
