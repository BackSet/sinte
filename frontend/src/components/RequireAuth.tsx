import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'

export function RequireAuth() {
  const location = useLocation()
  const hydrated = useAuthStore((s) => s.hydrated)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!hydrated) {
    return <div className="ui-text-muted p-6 text-sm">Cargando sesion...</div>
  }

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
