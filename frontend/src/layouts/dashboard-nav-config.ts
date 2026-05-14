import type { IconName } from '../components/ui/Icon'

export type DashboardNavLink = {
  to: string
  label: string
  icon: IconName
}

export function buildDashboardNavLinks(options: { isAdmin: boolean; canManage: boolean }): {
  playerLinks: DashboardNavLink[]
  managementLinks: DashboardNavLink[]
} {
  const { isAdmin, canManage } = options
  const playerLinks: DashboardNavLink[] = [
    { to: '/dashboard', label: 'Inicio', icon: 'dashboard' },
    ...(!canManage ? [{ to: '/matches', label: 'Partidos', icon: 'matches' as const }] : []),
    { to: '/attendance', label: 'Asistencia', icon: 'attendance' },
    { to: '/my-groups', label: 'Mis grupos', icon: 'groups' },
    { to: '/notifications', label: 'Notificaciones', icon: 'notifications' },
  ]
  const managementLinks: DashboardNavLink[] = [
    ...(canManage ? [{ to: '/matches', label: 'Partidos', icon: 'matches' as const }] : []),
    ...(canManage ? [{ to: '/series', label: 'Series', icon: 'series' as const }] : []),
    ...(canManage ? [{ to: '/configs', label: 'Configuraciones', icon: 'configs' as const }] : []),
    ...(canManage ? [{ to: '/groups', label: 'Grupos', icon: 'groups' as const }] : []),
    ...(isAdmin ? [{ to: '/users', label: 'Usuarios', icon: 'users' as const }] : []),
    ...(isAdmin ? [{ to: '/roles', label: 'Roles', icon: 'roles' as const }] : []),
  ]
  return { playerLinks, managementLinks }
}
