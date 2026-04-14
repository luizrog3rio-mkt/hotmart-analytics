import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

const themeOrder = ['light', 'dark', 'system'] as const

const themeConfig = {
  light: { icon: Sun, label: 'Modo claro' },
  dark: { icon: Moon, label: 'Modo escuro' },
  system: { icon: Monitor, label: 'Tema do sistema' },
} as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themeOrder.length
    setTheme(themeOrder[nextIndex])
  }

  const config = themeConfig[theme]
  const Icon = config.icon

  return (
    <div className="relative group">
      <button
        onClick={cycleTheme}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
          'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200',
        )}
        aria-label={config.label}
      >
        <Icon size={20} />
      </button>

      {/* Tooltip */}
      <span
        className={cn(
          'pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2',
          'whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white',
          'opacity-0 transition-opacity group-hover:opacity-100',
          'dark:bg-gray-700',
        )}
        role="tooltip"
      >
        {config.label}
      </span>
    </div>
  )
}
