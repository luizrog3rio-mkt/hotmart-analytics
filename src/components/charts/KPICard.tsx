import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatPercent, getPercentChange } from '@/lib/utils'

type FormatType = 'currency' | 'number' | 'percent'
type TrendDirection = 'up' | 'down' | 'neutral'

interface KPICardProps {
  title: string
  value: number
  previousValue?: number
  format: FormatType
  icon: ReactNode
  trend?: TrendDirection
  loading?: boolean
}

const formatters: Record<FormatType, (v: number) => string> = {
  currency: formatCurrency,
  number: formatNumber,
  percent: formatPercent,
}

function resolveTrend(change: number, explicit?: TrendDirection): TrendDirection {
  if (explicit) return explicit
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'neutral'
}

const trendConfig: Record<TrendDirection, {
  icon: typeof TrendingUp
  badge: string
  ring: string
}> = {
  up: {
    icon: TrendingUp,
    badge: 'bg-success-50 text-success-600',
    ring: 'ring-success-500/20',
  },
  down: {
    icon: TrendingDown,
    badge: 'bg-danger-50 text-danger-600',
    ring: 'ring-danger-500/20',
  },
  neutral: {
    icon: Minus,
    badge: 'bg-gray-100 text-gray-500',
    ring: 'ring-gray-400/20',
  },
}

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-gray-200', className)} />
}

function KPICard({
  title,
  value,
  previousValue,
  format,
  icon,
  trend: explicitTrend,
  loading = false,
}: KPICardProps) {
  const change =
    previousValue !== undefined ? getPercentChange(value, previousValue) : 0
  const hasPrevious = previousValue !== undefined
  const direction = resolveTrend(change, explicitTrend)
  const { icon: TrendIcon, badge, ring } = trendConfig[direction]
  const formatter = formatters[format]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-white p-5',
        'border border-gray-100 shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:border-gray-200',
      )}
    >
      {/* Subtle gradient accent on hover */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300',
          'bg-gradient-to-br from-primary-50/60 to-transparent',
          'group-hover:opacity-100',
        )}
      />

      <div className="relative flex items-start justify-between">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'bg-primary-50 text-primary-600',
            'transition-colors duration-200 group-hover:bg-primary-100',
          )}
        >
          {icon}
        </div>

        {/* Change badge */}
        {hasPrevious && !loading && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'text-xs font-semibold ring-1',
              badge,
              ring,
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Title */}
      <p className="relative mt-3 text-sm font-medium text-gray-500 truncate">
        {title}
      </p>

      {/* Value */}
      {loading ? (
        <SkeletonPulse className="mt-1.5 h-8 w-32" />
      ) : (
        <p className="relative mt-1 text-2xl font-bold tracking-tight text-gray-900">
          {formatter(value)}
        </p>
      )}

      {/* Previous value label */}
      {hasPrevious && !loading && (
        <p className="relative mt-1 text-xs text-gray-400">
          Anterior: {formatter(previousValue)}
        </p>
      )}

      {/* Loading overlay for entire card */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
          <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
        </div>
      )}
    </div>
  )
}

export { KPICard }
export type { KPICardProps, FormatType, TrendDirection }
