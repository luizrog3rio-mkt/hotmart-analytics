import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingState } from '@/components/layout/LoadingState'

export function ProtectedRoute() {
  const { isAuthenticated, loading, profile } = useAuth()
  const location = useLocation()

  // Still resolving session -- show loading spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Verificando autentica\u00e7\u00e3o..." />
      </div>
    )
  }

  // Not logged in -- redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but onboarding not finished (and not already on /onboarding)
  const onOnboardingPage = location.pathname.startsWith('/onboarding')
  if (profile && !profile.onboarding_completed && !onOnboardingPage) {
    return <Navigate to="/onboarding" replace />
  }

  // All checks passed -- render the protected content
  return <Outlet />
}
