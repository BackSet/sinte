import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Icon } from '../ui/Icon'

type MobileTabBarProps = {
  isAdmin: boolean
  canManageSeries: boolean
}

export function MobileTabBar({ isAdmin, canManageSeries }: MobileTabBarProps) {
  const [openMore, setOpenMore] = useState(false)
  const mainTabs = canManageSeries
    ? [
        { to: '/dashboard', label: 'Inicio', icon: 'dashboard' as const },
        { to: '/matches', label: 'Partidos', icon: 'matches' as const },
        { to: '/series', label: 'Series', icon: 'series' as const },
        { to: '/groups', label: 'Grupos', icon: 'groups' as const },
        { to: '/notifications', label: 'Notificaciones', icon: 'notifications' as const },
      ]
    : [
        { to: '/dashboard', label: 'Inicio', icon: 'dashboard' as const },
        { to: '/matches', label: 'Partidos', icon: 'matches' as const },
        { to: '/attendance', label: 'Asistencia', icon: 'attendance' as const },
        { to: '/my-groups', label: 'Mis grupos', icon: 'groups' as const },
        { to: '/notifications', label: 'Notificaciones', icon: 'notifications' as const },
      ]

  const moreLinks = useMemo(
    () =>
      [
        ...(canManageSeries ? [{ to: '/attendance', label: 'Asistencia jugador', icon: 'attendance' as const }] : []),
        ...(canManageSeries ? [{ to: '/my-groups', label: 'Mis grupos', icon: 'groups' as const }] : []),
        ...(isAdmin ? [{ to: '/users', label: 'Usuarios', icon: 'users' as const }] : []),
        ...(isAdmin ? [{ to: '/roles', label: 'Roles', icon: 'roles' as const }] : []),
      ],
    [canManageSeries, isAdmin],
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-[var(--bg-panel)]/95 backdrop-blur md:hidden">
      {openMore && (
        <div id="mobile-more-menu" className="ui-card mx-2 mb-2 p-2" role="menu" aria-label="Mas accesos">
          <div className="px-1 pb-2">
            <ThemeToggle />
          </div>
          {moreLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpenMore(false)}
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

      <nav className="grid grid-cols-6 gap-1 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1" aria-label="Barra inferior">
        {mainTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `rounded-xl px-1 py-2.5 text-center text-[11px] font-medium ${
                isActive ? 'ui-nav-link-active' : 'ui-text-muted'
              }`
            }
            aria-label={tab.label}
          >
            <span className="flex flex-col items-center gap-0.5">
              <Icon name={tab.icon} size="sm" />
              <span>{tab.label}</span>
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`rounded-lg px-1 py-2.5 text-center text-[11px] font-medium transition ${
            openMore ? 'ui-nav-link-active' : 'ui-text-muted'
          }`}
          onClick={() => setOpenMore((prev) => !prev)}
          aria-expanded={openMore}
          aria-controls="mobile-more-menu"
          aria-label="Abrir mas opciones"
        >
          <span className="flex flex-col items-center gap-0.5">
            <Icon name="more" size="sm" />
            <span>Mas</span>
          </span>
        </button>
      </nav>
    </div>
  )
}
