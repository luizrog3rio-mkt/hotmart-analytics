import { useState, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  ShoppingCart,
  Users,
  UserPlus,
  Wallet,
  Megaphone,
  RotateCcw,
  FileText,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  X,
  Zap,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubItem {
  label: string
  path: string
}

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
  subItems?: SubItem[]
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/dashboard',
  },
  {
    label: 'Vendas',
    icon: <ShoppingCart size={20} />,
    path: '/vendas',
    subItems: [
      { label: 'Transações', path: '/vendas/transacoes' },
      { label: 'Produtos', path: '/vendas/produtos' },
      { label: 'Ofertas', path: '/vendas/ofertas' },
      { label: 'Reembolsos', path: '/vendas/reembolsos' },
    ],
  },
  {
    label: 'Clientes',
    icon: <Users size={20} />,
    path: '/clientes',
    subItems: [
      { label: 'Jornada', path: '/clientes/jornada' },
      { label: 'Segmentos', path: '/clientes/segmentos' },
      { label: 'Coortes', path: '/clientes/coortes' },
      { label: 'LTV', path: '/clientes/ltv' },
      { label: 'Churn', path: '/clientes/churn' },
    ],
  },
  {
    label: 'Afiliados',
    icon: <UserPlus size={20} />,
    path: '/afiliados',
  },
  {
    label: 'Financeiro',
    icon: <Wallet size={20} />,
    path: '/financeiro',
    subItems: [
      { label: 'Fluxo de Caixa', path: '/financeiro/fluxo-de-caixa' },
      { label: 'Unit Economics', path: '/financeiro/unit-economics' },
      { label: 'Forecast', path: '/financeiro/forecast' },
    ],
  },
  {
    label: 'Marketing',
    icon: <Megaphone size={20} />,
    path: '/marketing',
    subItems: [
      { label: 'Atribuição', path: '/marketing' },
      { label: 'Campanhas', path: '/marketing/campanhas' },
    ],
  },
  {
    label: 'Recuperação',
    icon: <RotateCcw size={20} />,
    path: '/recuperacao',
  },
  {
    label: 'Anomalias',
    icon: <Zap size={20} />,
    path: '/anomalias',
  },
  {
    label: 'Relatórios',
    icon: <FileText size={20} />,
    path: '/relatorios',
  },
  {
    label: 'Alertas',
    icon: <Bell size={20} />,
    path: '/alertas',
  },
  {
    label: 'Compartilhar',
    icon: <Share2 size={20} />,
    path: '/compartilhamento',
  },
  {
    label: 'Configurações',
    icon: <Settings size={20} />,
    path: '/configuracoes',
  },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const location = useLocation()

  const toggleExpanded = useCallback((label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }, [])

  const isParentActive = (item: NavItem): boolean => {
    if (item.subItems) {
      return item.subItems.some((sub) => location.pathname.startsWith(sub.path))
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5 shrink-0">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Hotmart Analytics
            </span>
          </NavLink>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-sidebar-hover hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isExpanded = expandedItems.has(item.label)
              const parentActive = isParentActive(item)

              return (
                <li key={item.label}>
                  {hasSubItems ? (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.label)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                          'text-gray-400 hover:bg-sidebar-hover hover:text-white',
                          parentActive && 'bg-sidebar-active text-white'
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            'shrink-0 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                      <ul
                        className={cn(
                          'overflow-hidden transition-all duration-200',
                          isExpanded
                            ? 'mt-0.5 max-h-96 opacity-100'
                            : 'max-h-0 opacity-0'
                        )}
                      >
                        {item.subItems?.map((sub) => (
                          <li key={sub.path}>
                            <NavLink
                              to={sub.path}
                              onClick={onClose}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center rounded-lg py-2 pl-11 pr-3 text-[13px] font-medium transition-colors',
                                  'text-gray-500 hover:bg-sidebar-hover hover:text-white',
                                  isActive && 'bg-sidebar-active/60 text-white'
                                )
                              }
                            >
                              {sub.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                          'text-gray-400 hover:bg-sidebar-hover hover:text-white',
                          isActive && 'bg-sidebar-active text-white'
                        )
                      }
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">Usuário</p>
              <p className="truncate text-xs text-gray-500">usuario@email.com</p>
            </div>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-sidebar-hover hover:text-white transition-colors"
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
