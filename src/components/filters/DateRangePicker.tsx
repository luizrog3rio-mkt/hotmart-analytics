import { useCallback, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  isEqual,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

interface Preset {
  label: string
  getRange: () => DateRange
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const presets: Preset[] = [
  {
    label: 'Hoje',
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: '7 dias',
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: '30 dias',
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: '90 dias',
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 89)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Este mes',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Mes passado',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toInputDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromInputDate(value: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function isSameDay(a: Date, b: Date): boolean {
  return isEqual(startOfDay(a), startOfDay(b))
}

// ---------------------------------------------------------------------------
// DateRangePicker component
// ---------------------------------------------------------------------------

function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const activePreset = useMemo(() => {
    return presets.findIndex((preset) => {
      const range = preset.getRange()
      return isSameDay(range.from, value.from) && isSameDay(range.to, value.to)
    })
  }, [value])

  const handlePresetClick = useCallback(
    (preset: Preset) => {
      onChange(preset.getRange())
    },
    [onChange],
  )

  const handleFromChange = useCallback(
    (dateStr: string) => {
      const date = fromInputDate(dateStr)
      if (!date) return
      onChange({
        from: startOfDay(date),
        to: value.to,
      })
    },
    [onChange, value.to],
  )

  const handleToChange = useCallback(
    (dateStr: string) => {
      const date = fromInputDate(dateStr)
      if (!date) return
      onChange({
        from: value.from,
        to: endOfDay(date),
      })
    },
    [onChange, value.from],
  )

  const formattedRange = useMemo(() => {
    const fromStr = format(value.from, "d 'de' MMM", { locale: ptBR })
    const toStr = format(value.to, "d 'de' MMM, yyyy", { locale: ptBR })
    return `${fromStr} - ${toStr}`
  }, [value])

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {/* Preset buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {presets.map((preset, idx) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                idx === activePreset
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />

        {/* Custom date inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toInputDate(value.from)}
            max={toInputDate(value.to)}
            onChange={(e) => handleFromChange(e.target.value)}
            className={cn(
              'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700',
              'transition-colors duration-150',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            )}
            aria-label="Data inicial"
          />

          <span className="text-sm text-gray-400">ate</span>

          <input
            type="date"
            value={toInputDate(value.to)}
            min={toInputDate(value.from)}
            onChange={(e) => handleToChange(e.target.value)}
            className={cn(
              'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700',
              'transition-colors duration-150',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            )}
            aria-label="Data final"
          />
        </div>

        {/* Separator */}
        <div className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />

        {/* Formatted range display */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">{formattedRange}</span>
        </div>
      </div>
    </div>
  )
}

DateRangePicker.displayName = 'DateRangePicker'

export { DateRangePicker }
export type { DateRangePickerProps }
