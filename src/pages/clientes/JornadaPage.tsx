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
  Footprints,
  MousePointerClick,
  CreditCard,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

// Demo data available for future drill-down features
import { getFunnelData } from '@/services/metrics'
import type { DateRange } from '@/services/metrics'

import { KPICard } from '@/components/charts/KPICard'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { cn, formatNumber, formatPercent } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Currency formatter reserved for future tooltip use

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
// Journey stages config
// ---------------------------------------------------------------------------

const JOURNEY_STAGES = [
  {
    key: 'discovery',
    label: 'Descoberta',
    description: 'Visitante chega a pagina de vendas',
    icon: Footprints,
    color: '#3b82f6',
  },
  {
    key: 'interest',
    label: 'Interesse',
    description: 'Clica no botao de compra e inicia checkout',
    icon: MousePointerClick,
    color: '#8b5cf6',
  },
  {
    key: 'decision',
    label: 'Decisao',
    description: 'Preenche dados e seleciona pagamento',
    icon: CreditCard,
    color: '#f59e0b',
  },
  {
    key: 'action',
    label: 'Compra',
    description: 'Pagamento aprovado e entrega realizada',
    icon: CheckCircle2,
    color: '#22c55e',
  },
]

// ---------------------------------------------------------------------------
// Build channel funnel demo data
// ---------------------------------------------------------------------------

function buildChannelFunnelData() {
  const channels = ['Organico', 'Afiliado', 'Campanha']
  return channels.map((channel) => {
    const base = channel === 'Organico' ? 5000 : channel === 'Afiliado' ? 3500 : 4200
    const checkoutRate = channel === 'Organico' ? 0.18 : channel === 'Afiliado' ? 0.22 : 0.15
    const paymentRate = channel === 'Organico' ? 0.6 : channel === 'Afiliado' ? 0.55 : 0.5
    const approvalRate = channel === 'Organico' ? 0.82 : channel === 'Afiliado' ? 0.78 : 0.75

    const visits = base + Math.floor(Math.random() * 1000)
    const checkout = Math.floor(visits * checkoutRate)
    const payment = Math.floor(checkout * paymentRate)
    const approved = Math.floor(payment * approvalRate)

    return {
      channel,
      'Visitas': visits,
      'Checkout': checkout,
      'Pagamento': payment,
      'Aprovado': approved,
    }
  })
}

// ---------------------------------------------------------------------------
// JornadaPage
// ---------------------------------------------------------------------------

export function JornadaPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })

  const funnelData = useMemo(() => getFunnelData(), [])
  const channelData = useMemo(() => buildChannelFunnelData(), [])

  // KPI metrics derived from funnel
  const kpiMetrics = useMemo(() => {
    if (funnelData.length < 4) return { visits: 0, checkouts: 0, payments: 0, approved: 0 }
    return {
      visits: funnelData[0].value,
      checkouts: funnelData[1].value,
      payments: funnelData[2].value,
      approved: funnelData[3].value,
    }
  }, [funnelData])

  const overallConversion = useMemo(
    () => (kpiMetrics.visits > 0 ? (kpiMetrics.approved / kpiMetrics.visits) * 100 : 0),
    [kpiMetrics],
  )

  // Previous period simulated values
  const previousVisits = Math.floor(kpiMetrics.visits * 0.92)
  const previousApproved = Math.floor(kpiMetrics.approved * 0.88)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Jornada do Cliente
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Analise o funil de conversao e a jornada completa dos seus clientes
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Visitas Totais"
          value={kpiMetrics.visits}
          previousValue={previousVisits}
          format="number"
          icon={<Footprints className="h-5 w-5" />}
        />
        <KPICard
          title="Checkouts Iniciados"
          value={kpiMetrics.checkouts}
          previousValue={Math.floor(kpiMetrics.checkouts * 0.9)}
          format="number"
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <KPICard
          title="Vendas Aprovadas"
          value={kpiMetrics.approved}
          previousValue={previousApproved}
          format="number"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KPICard
          title="Taxa de Conversao"
          value={overallConversion}
          previousValue={previousVisits > 0 ? (previousApproved / previousVisits) * 100 : 0}
          format="percent"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

      {/* Customer Journey Timeline */}
      <ChartContainer title="Jornada do Cliente">
        <div className="relative flex flex-col gap-0 sm:flex-row sm:items-start sm:justify-between">
          {JOURNEY_STAGES.map((stage, index) => {
            const StageIcon = stage.icon
            const isLast = index === JOURNEY_STAGES.length - 1
            const stageValues = [
              kpiMetrics.visits,
              kpiMetrics.checkouts,
              kpiMetrics.payments,
              kpiMetrics.approved,
            ]
            const stageValue = stageValues[index]
            const prevValue = index > 0 ? stageValues[index - 1] : null
            const dropRate = prevValue && prevValue > 0
              ? ((prevValue - stageValue) / prevValue) * 100
              : null

            return (
              <div key={stage.key} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                {/* Stage card */}
                <div className="flex flex-col items-center gap-3 sm:w-full">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl',
                      'shadow-sm transition-transform duration-200 hover:scale-105',
                    )}
                    style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                  >
                    <StageIcon className="h-7 w-7" />
                  </div>
                  <div className="sm:text-center">
                    <p className="text-sm font-semibold text-gray-900">{stage.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{stage.description}</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {formatNumber(stageValue)}
                    </p>
                    {dropRate !== null && (
                      <p className="mt-0.5 text-xs font-medium text-red-500">
                        -{dropRate.toFixed(1)}% perda
                      </p>
                    )}
                  </div>
                </div>

                {/* Arrow connector */}
                {!isLast && (
                  <div className="hidden flex-1 items-center justify-center px-2 pt-6 sm:flex">
                    <div className="h-px flex-1 bg-gray-200" />
                    <ArrowRight className="mx-1 h-4 w-4 shrink-0 text-gray-300" />
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ChartContainer>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Full Conversion Funnel */}
        <ChartContainer title="Funil de Conversao Completo" className="min-h-[380px]">
          <FunnelChart data={funnelData} />
        </ChartContainer>

        {/* Funnel by Channel */}
        <ChartContainer title="Funil por Canal de Aquisicao" className="min-h-[380px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="channel"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatNumber(v)}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip valueFormatter={formatNumber} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="Visitas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="Checkout" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="Pagamento" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="Aprovado" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Channel Conversion Rates Table */}
      <ChartContainer title="Taxas de Conversao por Canal">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Canal
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Visitas
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Checkout
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Taxa Checkout
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Aprovados
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Conversao Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {channelData.map((row) => {
                const checkoutRate = row['Visitas'] > 0
                  ? (row['Checkout'] / row['Visitas']) * 100
                  : 0
                const totalConversion = row['Visitas'] > 0
                  ? (row['Aprovado'] / row['Visitas']) * 100
                  : 0

                return (
                  <tr key={row.channel} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.channel}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(row['Visitas'])}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(row['Checkout'])}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {formatPercent(checkoutRate)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNumber(row['Aprovado'])}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {formatPercent(totalConversion)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  )
}
