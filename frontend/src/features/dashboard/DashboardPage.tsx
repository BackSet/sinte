import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useAuthStore } from '../../store/auth-store'
import { Icon } from '../../components/ui/Icon'

type DashboardMatch = { id: string; status: string; startsAt: string }
type DashboardSeries = { id: string; active: boolean }
type DashboardGroup = { id: string; active: boolean }

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const matchesQuery = useQuery({
    queryKey: ['dashboard-matches'],
    queryFn: async () => (await apiClient.get<DashboardMatch[]>('/api/v1/matches')).data,
  })
  const seriesQuery = useQuery({
    queryKey: ['dashboard-series'],
    queryFn: async () => (await apiClient.get<DashboardSeries[]>('/api/v1/series')).data,
    enabled: Boolean(canManage),
  })
  const groupsQuery = useQuery({
    queryKey: ['dashboard-groups'],
    queryFn: async () => (await apiClient.get<DashboardGroup[]>('/api/v1/groups')).data,
    enabled: Boolean(canManage),
  })

  const nextMatch = matchesQuery.data
    ?.filter((match) => match.status !== 'CANCELLED')
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())[0]
  const activeSeries = (seriesQuery.data ?? []).filter((s) => s.active).length
  const activeGroups = (groupsQuery.data ?? []).filter((g) => g.active).length

  const stats = canManage
    ? [
        { label: 'Partidos visibles', value: matchesQuery.data?.length ?? 0, icon: 'matches' as const },
        { label: 'Series activas', value: activeSeries, icon: 'series' as const },
        { label: 'Grupos activos', value: activeGroups, icon: 'groups' as const },
      ]
    : []

  const playerActions = [
    { to: '/matches', label: 'Ver convocatorias', description: 'Revisa partidos y confirma asistencia', icon: 'matches' as const },
    { to: '/attendance', label: 'Confirmar asistencia', description: 'Responde a las convocatorias activas', icon: 'attendance' as const },
    { to: '/my-groups', label: 'Mis grupos', description: 'Grupos a los que perteneces', icon: 'groups' as const },
    { to: '/notifications', label: 'Notificaciones', description: 'Revisa tus avisos pendientes', icon: 'notifications' as const },
  ]

  const managerActions = [
    { to: '/matches', label: 'Gestionar partidos', description: 'Crear y administrar convocatorias', icon: 'matches' as const },
    { to: '/series', label: 'Series recurrentes', description: 'Configurar partidos automaticos', icon: 'series' as const },
    { to: '/groups', label: 'Administrar grupos', description: 'Crear y gestionar grupos de jugadores', icon: 'groups' as const },
    { to: '/notifications', label: 'Notificaciones', description: 'Revisar avisos del sistema', icon: 'notifications' as const },
  ]

  return (
    <div className="space-y-5">
      <section className="ui-card p-5 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{canManage ? 'Inicio de gestion' : 'Inicio'}</h1>
        <p className="ui-text-muted mt-1">
          Bienvenido, <span className="font-medium text-[var(--text-primary)]">{user?.fullName ?? 'usuario'}</span>
        </p>
      </section>

      {canManage && stats.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label} className="ui-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-muted)]">
                  <Icon name={stat.icon} size="md" className="ui-text-muted" />
                </div>
                <div>
                  <p className="ui-text-muted text-xs">{stat.label}</p>
                  <p className="text-xl font-semibold">{stat.value}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {nextMatch && (
        <section className="ui-card p-4">
          <div className="flex items-center gap-2">
            <Icon name="calendar" size="md" className="ui-text-muted" />
            <div>
              <p className="text-sm font-medium">Proximo partido</p>
              <p className="ui-text-muted text-xs">{new Date(nextMatch.startsAt).toLocaleString()}</p>
            </div>
          </div>
        </section>
      )}

      <section className="ui-card p-5 sm:p-6">
        <h2 className="mb-3 text-base font-semibold tracking-tight">
          {canManage ? 'Acciones rapidas' : 'Acciones rapidas'}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(canManage ? managerActions : playerActions).map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="ui-muted-surface flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-panel)]">
                <Icon name={action.icon} size="sm" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="ui-text-muted truncate text-xs">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="ui-muted-surface p-3 text-sm">
        <div className="flex items-center gap-2">
          <Icon name="roles" size="sm" className="ui-text-muted" />
          <span className="font-medium">Roles: {user?.roles.join(', ') || 'Sin roles'}</span>
        </div>
      </section>
    </div>
  )
}