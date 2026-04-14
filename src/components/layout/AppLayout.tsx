import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vendas': 'Vendas',
  '/vendas/transacoes': 'Transações',
  '/vendas/produtos': 'Produtos',
  '/vendas/ofertas': 'Ofertas',
  '/vendas/reembolsos': 'Reembolsos',
  '/clientes': 'Clientes',
  '/clientes/jornada': 'Jornada do Cliente',
  '/clientes/segmentos': 'Segmentos',
  '/clientes/coortes': 'Coortes',
  '/clientes/ltv': 'LTV',
  '/clientes/churn': 'Churn',
  '/afiliados': 'Afiliados',
  '/financeiro': 'Financeiro',
  '/financeiro/fluxo-de-caixa': 'Fluxo de Caixa',
  '/financeiro/unit-economics': 'Unit Economics',
  '/financeiro/forecast': 'Forecast',
  '/marketing': 'Marketing',
  '/recuperacao': 'Recuperação',
  '/relatorios': 'Relatórios',
  '/alertas': 'Alertas',
  '/configuracoes': 'Configurações',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return undefined

  const items: { label: string; href?: string }[] = []
  let path = ''

  for (let i = 0; i < segments.length; i++) {
    path += `/${segments[i]}`
    const title = pageTitles[path] ?? segments[i]
    items.push({
      label: title,
      href: i < segments.length - 1 ? path : undefined,
    })
  }

  return items
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const pageTitle = pageTitles[location.pathname] ?? 'Hotmart Analytics'
  const breadcrumbs = getBreadcrumbs(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={pageTitle}
          breadcrumbs={breadcrumbs}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
