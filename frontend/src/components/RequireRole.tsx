import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'

type RequireRoleProps = {
  allowed: string[]
}

export function RequireRole({ allowed }: RequireRoleProps) {
  const user = useAuthStore((s) => s.user)
  const hasRole = user?.roles?.some((role) => allowed.includes(role))

  if (!hasRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
