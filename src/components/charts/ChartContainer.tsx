import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartContainerProps {
  title: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

function ChartContainer({ title, children, className, actions }: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-gray-100 shadow-sm',
        'flex flex-col overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>

        {actions && (
          <div className="flex items-center gap-1">{actions}</div>
        )}
      </div>

      {/* Chart body */}
      <div className="flex-1 p-5">{children}</div>
    </div>
  )
}

export { ChartContainer }
export type { ChartContainerProps }
