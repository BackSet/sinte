import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { logout } from '../features/auth/auth-api'
import { useAuthStore } from '../store/auth-store'
import { MobileTabBar } from '../components/navigation/MobileTabBar'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Icon } from '../components/ui/Icon'

export function DashboardLayout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const refreshToken = useAuthStore((s) => s.refreshToken)
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
      clearAuth()
      navigate('/login', { replace: true })
    },
  })

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[272px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r bg-[var(--bg-panel)]/90 p-4 backdrop-blur lg:block" aria-label="Navegacion principal">
          <Link className="mb-6 flex items-center gap-3 rounded-lg px-2 py-2" to="/dashboard">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-contrast)]">
              ST
            </span>
            <span>
              <span className="block text-lg font-semibold">SINTE</span>
              <span className="ui-text-muted block text-xs">Reservas y convocatorias</span>
            </span>
          </Link>
          <nav className="space-y-4" aria-label="Secciones">
            <div className="space-y-1.5">
              <p className="ui-text-muted px-2 text-[11px] font-semibold uppercase">Jugador</p>
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
                <p className="ui-text-muted px-2 text-[11px] font-semibold uppercase">Gestion</p>
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

        <main className="min-w-0 px-3 pb-24 pt-3 sm:px-4 lg:px-8 lg:pb-8 lg:pt-6">
          <h1 className="sr-only">Panel principal SINTE</h1>
          <header className="mb-5 flex items-center justify-between gap-3 rounded-lg border bg-[var(--bg-panel)]/90 px-3 py-3 shadow-sm backdrop-blur sm:px-4 lg:mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="ui-badge ui-badge-success">Activo</span>
                <span className="ui-text-muted hidden text-xs sm:inline">{user?.roles.join(', ') ?? 'sin rol'}</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold sm:text-base">{user?.fullName ?? 'Usuario'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <button className="ui-button-muted" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="logout" size="sm" />
                  {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesion'}
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
