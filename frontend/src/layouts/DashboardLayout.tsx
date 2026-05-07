import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { logout } from '../features/auth/auth-api'
import { useAuthStore } from '../store/auth-store'
import { useToastStore } from '../store/toast-store'
import { MobileTabBar } from '../components/navigation/MobileTabBar'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Icon } from '../components/ui/Icon'

export function DashboardLayout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.roles.includes('ADMIN')
  const canManage = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const playerLinks = [
    { to: '/dashboard', label: 'Inicio', icon: 'dashboard' as const },
    ...(!canManage ? [{ to: '/matches', label: 'Partidos', icon: 'matches' as const }] : []),
    { to: '/attendance', label: 'Asistencia', icon: 'attendance' as const },
    { to: '/my-groups', label: 'Mis grupos', icon: 'groups' as const },
    { to: '/notifications', label: 'Notificaciones', icon: 'notifications' as const },
  ]
  const managementLinks = [
    ...(canManage ? [{ to: '/matches', label: 'Partidos', icon: 'matches' as const }] : []),
    ...(canManage ? [{ to: '/series', label: 'Series', icon: 'series' as const }] : []),
    ...(canManage ? [{ to: '/configs', label: 'Configuraciones', icon: 'configs' as const }] : []),
    ...(canManage ? [{ to: '/groups', label: 'Grupos', icon: 'groups' as const }] : []),
    ...(isAdmin ? [{ to: '/users', label: 'Usuarios', icon: 'users' as const }] : []),
    ...(isAdmin ? [{ to: '/roles', label: 'Roles', icon: 'roles' as const }] : []),
  ]

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await logout(refreshToken)
      }
    },
    onSettled: () => {
      addToast('info', 'Sesion cerrada')
      clearAuth()
      navigate('/login', { replace: true })
    },
  })

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 md:grid-cols-[250px_1fr]">
        <aside className="hidden border-r p-4 md:block" aria-label="Navegacion principal">
          <Link className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight" to="/dashboard">
            <Icon name="dashboard" size="lg" />
            SINTE
          </Link>
          <nav className="space-y-4" aria-label="Secciones">
            <div className="space-y-1.5">
              <p className="ui-text-muted px-2 text-[11px] font-semibold uppercase tracking-wide">Jugador</p>
              {playerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `ui-nav-link ${isActive ? 'ui-nav-link-active' : ''}`
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon name={link.icon} size="sm" />
                    {link.label}
                  </span>
                </NavLink>
              ))}
            </div>

            {managementLinks.length > 0 && (
              <div className="space-y-1.5">
                <p className="ui-text-muted px-2 text-[11px] font-semibold uppercase tracking-wide">Gestion</p>
                {managementLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `ui-nav-link ${isActive ? 'ui-nav-link-active' : ''}`
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon name={link.icon} size="sm" />
                      {link.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}

            {isAdmin && (
              <NavLink
                to="/admin/email-queue"
                className={({ isActive }) =>
                  `ui-nav-link ${isActive ? 'ui-nav-link-active' : ''}`
                }
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="admin" size="sm" />
                  Cola de correos
                </span>
              </NavLink>
            )}
          </nav>
        </aside>

        <main className="px-3 pb-24 pt-3 sm:px-4 md:px-6 md:pb-6 md:pt-6">
          <h1 className="sr-only">Panel principal SINTE</h1>
          <header className="ui-card mb-4 flex items-center justify-between px-3 py-3 sm:mb-6 sm:px-4">
            <div>
              <p className="ui-text-muted text-xs">Sesion activa</p>
              <p className="text-sm font-medium">
                {user?.fullName ?? 'Usuario'}
                <span className="ui-text-muted ml-2 hidden text-xs sm:inline">
                  ({user?.roles.join(', ') ?? 'sin rol'})
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button className="ui-button-muted" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="logout" size="sm" />
                  <span className="hidden sm:inline">{logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesion'}</span>
                </span>
              </button>
            </div>
          </header>
          <Outlet />
        </main>
      </div>
      <MobileTabBar isAdmin={Boolean(isAdmin)} canManageSeries={Boolean(canManage)} />
    </div>
  )
}