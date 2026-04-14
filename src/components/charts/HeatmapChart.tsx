import { useMemo, useState } from 'react'
import { cn, formatNumber } from '@/lib/utils'

interface HeatmapCell {
  day: string
  hour: number
  value: number
}

interface HeatmapChartProps {
  data: HeatmapCell[][]
  maxValue?: number
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

/**
 * Maps a normalized 0-1 intensity to a Tailwind blue shade class name.
 * Returns a background-color style for smooth gradients.
 */
function intensityToColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(239, 246, 255, 1)'     // ~blue-50
  if (intensity <= 0.15) return 'rgba(219, 234, 254, 1)'  // ~blue-100
  if (intensity <= 0.3) return 'rgba(191, 219, 254, 1)'   // ~blue-200
  if (intensity <= 0.45) return 'rgba(147, 197, 253, 1)'  // ~blue-300
  if (intensity <= 0.6) return 'rgba(96, 165, 250, 1)'    // ~blue-400
  if (intensity <= 0.75) return 'rgba(59, 130, 246, 1)'   // ~blue-500
  if (intensity <= 0.9) return 'rgba(37, 99, 235, 1)'     // ~blue-600
  return 'rgba(30, 64, 175, 1)'                           // ~blue-800
}

interface TooltipData {
  day: string
  hour: number
  value: number
  x: number
  y: number
}

function HeatmapChart({ data, maxValue: maxValueProp }: HeatmapChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Flatten and build lookup
  const { cellMap, resolvedMax } = useMemo(() => {
    const map = new Map<string, number>()
    let computedMax = 0

    for (const row of data) {
      for (const cell of row) {
        const key = `${cell.day}-${cell.hour}`
        map.set(key, cell.value)
        if (cell.value > computedMax) computedMax = cell.value
      }
    }

    return {
      cellMap: map,
      resolvedMax: maxValueProp ?? computedMax,
    }
  }, [data, maxValueProp])

  function getCellValue(day: string, hour: number): number {
    return cellMap.get(`${day}-${hour}`) ?? 0
  }

  function handleCellEnter(
    e: React.MouseEvent<HTMLDivElement>,
    day: string,
    hour: number,
    value: number,
  ) {
    const rect = e.currentTarget.getBoundingClientRect()
    const parentRect = e.currentTarget.closest('[data-heatmap-root]')?.getBoundingClientRect()
    if (!parentRect) return
    setTooltip({
      day,
      hour,
      value,
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top,
    })
  }

  function handleCellLeave() {
    setTooltip(null)
  }

  return (
    <div className="relative w-full overflow-x-auto" data-heatmap-root>
      <div className="inline-flex flex-col min-w-[640px]">
        {/* Hour labels row */}
        <div className="flex">
          {/* Spacer for day labels */}
          <div className="w-12 shrink-0" />
          <div className="flex flex-1 gap-px">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-[10px] font-medium text-gray-400 pb-1.5"
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* Grid rows */}
        <div className="flex flex-col gap-px">
          {DAY_LABELS.map((day) => (
            <div key={day} className="flex items-center gap-0">
              {/* Day label */}
              <div className="w-12 shrink-0 pr-2 text-right">
                <span className="text-xs font-medium text-gray-500">{day}</span>
              </div>

              {/* Cells */}
              <div className="flex flex-1 gap-px">
                {HOURS.map((hour) => {
                  const value = getCellValue(day, hour)
                  const intensity =
                    resolvedMax > 0 ? value / resolvedMax : 0

                  return (
                    <div
                      key={hour}
                      className={cn(
                        'flex-1 aspect-square rounded-[3px] cursor-pointer',
                        'transition-all duration-150',
                        'hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 hover:z-10',
                        'min-h-[16px] min-w-[16px]',
                      )}
                      style={{ backgroundColor: intensityToColor(intensity) }}
                      onMouseEnter={(e) => handleCellEnter(e, day, hour, value)}
                      onMouseLeave={handleCellLeave}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Color legend */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="text-[10px] text-gray-400">Menos</span>
          <div className="flex gap-px">
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((intensity) => (
              <div
                key={intensity}
                className="h-3 w-5 rounded-[2px]"
                style={{ backgroundColor: intensityToColor(intensity) }}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">Mais</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className={cn(
            'pointer-events-none absolute z-20',
            'rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg',
            '-translate-x-1/2 -translate-y-full',
          )}
          style={{
            left: tooltip.x,
            top: tooltip.y - 6,
          }}
        >
          <p className="font-semibold">
            {tooltip.day}, {String(tooltip.hour).padStart(2, '0')}:00
          </p>
          <p className="text-gray-300">
            {formatNumber(tooltip.value)} vendas
          </p>
          {/* Arrow */}
          <div
            className="absolute left-1/2 -bottom-1 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900"
          />
        </div>
      )}
    </div>
  )
}

export { HeatmapChart }
export type { HeatmapChartProps, HeatmapCell }
