import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16',
        className
      )}
    >
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-primary-600" />
      {message && (
        <p className="text-sm font-medium text-gray-500">{message}</p>
      )}
    </div>
  )
}
