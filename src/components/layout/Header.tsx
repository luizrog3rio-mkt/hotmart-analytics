import { Bell, Menu, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface HeaderProps {
  title: string
  breadcrumbs?: BreadcrumbItem[]
  onToggleSidebar: () => void
  notificationCount?: number
}

export function Header({
  title,
  breadcrumbs,
  onToggleSidebar,
  notificationCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-0.5 flex items-center gap-1 text-xs text-gray-400">
              {breadcrumbs.map((item, index) => (
                <span key={item.label} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight size={12} className="shrink-0" />}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-gray-600 transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-gray-500">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="truncate text-lg font-semibold text-gray-900">
            {title}
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Notificações"
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-danger-500 text-[10px] font-bold text-white',
                notificationCount > 9 ? 'h-5 min-w-5 px-1' : 'h-4 w-4'
              )}
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white hover:bg-primary-700 transition-colors"
          aria-label="Menu do usuário"
        >
          U
        </button>
      </div>
    </header>
  )
}
