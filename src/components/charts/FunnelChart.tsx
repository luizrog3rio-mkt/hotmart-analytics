import { cn, formatNumber, formatPercent } from '@/lib/utils'

interface FunnelStep {
  name: string
  value: number
  fill: string
}

interface FunnelChartProps {
  data: FunnelStep[]
}

function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0) return null

  const maxValue = data[0].value

  return (
    <div className="flex flex-col gap-3">
      {data.map((step, index) => {
        const widthPercent = maxValue > 0 ? (step.value / maxValue) * 100 : 0
        const prevStep = index > 0 ? data[index - 1] : null
        const conversionRate =
          prevStep && prevStep.value > 0
            ? (step.value / prevStep.value) * 100
            : null

        return (
          <div key={step.name}>
            {/* Conversion rate between steps */}
            {conversionRate !== null && (
              <div className="flex items-center gap-2 py-1.5 pl-4">
                <div className="flex items-center gap-1.5">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    className="shrink-0 text-gray-400"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 2 L6 10 M3 7 L6 10 L9 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs font-medium text-gray-500">
                    {formatPercent(conversionRate)}
                  </span>
                </div>
              </div>
            )}

            {/* Bar row */}
            <div className="group flex items-center gap-3">
              {/* Label */}
              <div className="w-28 shrink-0 text-right">
                <span className="text-sm font-medium text-gray-700 truncate block">
                  {step.name}
                </span>
              </div>

              {/* Bar track */}
              <div className="relative flex-1 h-10 rounded-lg bg-gray-50 overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-lg',
                    'transition-all duration-700 ease-out',
                    'group-hover:brightness-110',
                  )}
                  style={{
                    width: `${Math.max(widthPercent, 2)}%`,
                    backgroundColor: step.fill,
                  }}
                />
                {/* Value label inside bar */}
                <div
                  className={cn(
                    'absolute inset-y-0 flex items-center px-3',
                    widthPercent > 30 ? 'text-white' : 'text-gray-700',
                  )}
                  style={{
                    left: widthPercent > 30 ? '0' : `${Math.max(widthPercent, 2)}%`,
                  }}
                >
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatNumber(step.value)}
                  </span>
                </div>
              </div>

              {/* Percentage of total */}
              <div className="w-14 shrink-0 text-right">
                <span className="text-xs font-medium text-gray-400">
                  {maxValue > 0 ? `${widthPercent.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { FunnelChart }
export type { FunnelChartProps, FunnelStep }
