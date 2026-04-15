import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingState } from '@/components/layout/LoadingState'

// ---------------------------------------------------------------------------
// Lazy-loaded pages (code splitting)
// ---------------------------------------------------------------------------

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const OnboardingWizard = lazy(() => import('@/pages/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))

// Vendas
const TransactionsPage = lazy(() => import('@/pages/sales/TransactionsPage').then(m => ({ default: m.TransactionsPage })))
const ProductAnalysisPage = lazy(() => import('@/pages/sales/ProductAnalysisPage').then(m => ({ default: m.ProductAnalysisPage })))
const OfertasPage = lazy(() => import('@/pages/vendas/OfertasPage').then(m => ({ default: m.OfertasPage })))
const ReembolsosPage = lazy(() => import('@/pages/vendas/ReembolsosPage').then(m => ({ default: m.ReembolsosPage })))

// Clientes
const JornadaPage = lazy(() => import('@/pages/clientes/JornadaPage').then(m => ({ default: m.JornadaPage })))
const SegmentosPage = lazy(() => import('@/pages/clientes/SegmentosPage').then(m => ({ default: m.SegmentosPage })))
const CoortesPage = lazy(() => import('@/pages/clientes/CoortesPage').then(m => ({ default: m.CoortesPage })))
const LTVPage = lazy(() => import('@/pages/clientes/LTVPage').then(m => ({ default: m.LTVPage })))
const ChurnPage = lazy(() => import('@/pages/clientes/ChurnPage').then(m => ({ default: m.ChurnPage })))

// Afiliados
const AfiliadosPage = lazy(() => import('@/pages/afiliados/AfiliadosPage').then(m => ({ default: m.AfiliadosPage })))

// Financeiro
const FluxoCaixaPage = lazy(() => import('@/pages/financeiro/FluxoCaixaPage').then(m => ({ default: m.FluxoCaixaPage })))
const UnitEconomicsPage = lazy(() => import('@/pages/financeiro/UnitEconomicsPage').then(m => ({ default: m.UnitEconomicsPage })))
const ForecastPage = lazy(() => import('@/pages/financeiro/ForecastPage').then(m => ({ default: m.ForecastPage })))

// Marketing
const MarketingPage = lazy(() => import('@/pages/marketing/MarketingPage').then(m => ({ default: m.MarketingPage })))
const CampanhasPage = lazy(() => import('@/pages/marketing/CampanhasPage').then(m => ({ default: m.CampanhasPage })))

// Recuperação, Anomalias, Relatórios, Compartilhamento
const RecuperacaoPage = lazy(() => import('@/pages/recuperacao/RecuperacaoPage').then(m => ({ default: m.RecuperacaoPage })))
const AnomaliasPage = lazy(() => import('@/pages/anomalias/AnomaliasPage').then(m => ({ default: m.AnomaliasPage })))
const RelatoriosPage = lazy(() => import('@/pages/relatorios/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })))
const CompartilhamentoPage = lazy(() => import('@/pages/compartilhamento/CompartilhamentoPage').then(m => ({ default: m.CompartilhamentoPage })))

// Alertas, Configurações
const AlertasPage = lazy(() => import('@/pages/alertas/AlertasPage').then(m => ({ default: m.AlertasPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return <LoadingState message="Carregando..." />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Onboarding (protected but outside main layout) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/onboarding" element={<OnboardingWizard />} />
                </Route>

                {/* App routes (protected + layout) */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Vendas */}
                    <Route path="/vendas/transacoes" element={<TransactionsPage />} />
                    <Route path="/vendas/produtos" element={<ProductAnalysisPage />} />
                    <Route path="/vendas/ofertas" element={<OfertasPage />} />
                    <Route path="/vendas/reembolsos" element={<ReembolsosPage />} />

                    {/* Clientes */}
                    <Route path="/clientes/jornada" element={<JornadaPage />} />
                    <Route path="/clientes/segmentos" element={<SegmentosPage />} />
                    <Route path="/clientes/coortes" element={<CoortesPage />} />
                    <Route path="/clientes/ltv" element={<LTVPage />} />
                    <Route path="/clientes/churn" element={<ChurnPage />} />

                    {/* Afiliados */}
                    <Route path="/afiliados" element={<AfiliadosPage />} />

                    {/* Financeiro */}
                    <Route path="/financeiro/fluxo-de-caixa" element={<FluxoCaixaPage />} />
                    <Route path="/financeiro/unit-economics" element={<UnitEconomicsPage />} />
                    <Route path="/financeiro/forecast" element={<ForecastPage />} />

                    {/* Marketing */}
                    <Route path="/marketing" element={<MarketingPage />} />
                    <Route path="/marketing/campanhas" element={<CampanhasPage />} />

                    {/* Recuperação */}
                    <Route path="/recuperacao" element={<RecuperacaoPage />} />

                    {/* Anomalias */}
                    <Route path="/anomalias" element={<AnomaliasPage />} />

                    {/* Relatórios */}
                    <Route path="/relatorios" element={<RelatoriosPage />} />

                    {/* Alertas */}
                    <Route path="/alertas" element={<AlertasPage />} />

                    {/* Compartilhamento */}
                    <Route path="/compartilhamento" element={<CompartilhamentoPage />} />

                    {/* Configurações */}
                    <Route path="/configuracoes" element={<SettingsPage />} />
                  </Route>
                </Route>

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '12px',
                  background: '#1f2937',
                  color: '#f9fafb',
                  fontSize: '14px',
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
