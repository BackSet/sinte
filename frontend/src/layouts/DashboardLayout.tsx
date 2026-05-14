import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { logout } from '../features/auth/auth-api'
import { useAuthStore } from '../store/auth-store'
import { useToastStore } from '../store/toast-store'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Icon } from '../components/ui/Icon'
import { buildDashboardNavLinks } from './dashboard-nav-config'

export function DashboardLayout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.roles.includes('ADMIN')
  const canManage = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const { playerLinks, managementLinks } = buildDashboardNavLinks({
    isAdmin: Boolean(isAdmin),
    canManage: Boolean(canManage),
  })

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
    <div className="min-h-screen bg-[var(--bg-app)]">
      <div className="flex min-h-screen w-full">
        <aside
          className="sticky top-0 flex h-screen w-14 shrink-0 flex-col border-r border-[var(--border-soft)] bg-[var(--bg-panel)] py-3 md:w-[272px] md:p-5"
          aria-label="Navegacion principal"
        >
          <Link
            className="mb-4 flex items-center justify-center gap-2 md:mb-6 md:justify-start md:text-lg md:font-bold md:tracking-tight"
            to="/dashboard"
            title="SINTE — Inicio"
          >
            <Icon name="dashboard" size="lg" />
            <span className="hidden truncate md:inline">SINTE</span>
          </Link>
          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain" aria-label="Secciones">
            <div className="flex flex-col gap-1 md:space-y-1.5">
              <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] md:block">
                Jugador
              </p>
              {playerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) =>
                    `ui-nav-link flex items-center justify-center gap-2 md:justify-start ${isActive ? 'ui-nav-link-active' : ''}`
                  }
                >
                  <Icon name={link.icon} size="sm" className="shrink-0" />
                  <span className="hidden min-w-0 truncate md:inline">{link.label}</span>
                </NavLink>
              ))}
            </div>

            {managementLinks.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-[var(--border-soft)] pt-3 md:space-y-1.5 md:border-t-0 md:pt-0">
                <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] md:block">
                  Gestion
                </p>
                {managementLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={link.label}
                    className={({ isActive }) =>
                      `ui-nav-link flex items-center justify-center gap-2 md:justify-start ${isActive ? 'ui-nav-link-active' : ''}`
                    }
                  >
                    <Icon name={link.icon} size="sm" className="shrink-0" />
                    <span className="hidden min-w-0 truncate md:inline">{link.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        </aside>

        <div className="flex min-w-0 min-h-screen flex-1 flex-col">
          <main className="ui-page-shell flex-1 pt-3 md:pt-6">
            <h1 className="sr-only">Panel principal SINTE</h1>
            <header className="ui-card mb-4 flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:mb-6 sm:px-4">
              <div className="min-w-0">
                <p className="ui-text-muted text-xs">Sesion activa</p>
                <p className="truncate text-sm font-medium">
                  <Link to="/profile" className="hover:underline">
                    {user?.fullName ?? 'Usuario'}
                  </Link>
                  <span className="ui-text-muted ml-2 hidden text-xs sm:inline">
                    ({user?.roles.join(', ') ?? 'sin rol'})
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
      </div>
    </div>
  )
}
