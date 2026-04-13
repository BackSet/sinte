import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useAuthStore } from '../../store/auth-store'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const matchesQuery = useQuery({
    queryKey: ['dashboard-matches'],
    queryFn: async () => (await apiClient.get<Array<{ id: string; status: string; startsAt: string }>>('/api/v1/matches')).data,
  })
  const seriesQuery = useQuery({
    queryKey: ['dashboard-series'],
    queryFn: async () => (await apiClient.get<Array<{ id: string; active: boolean }>>('/api/v1/series')).data,
    enabled: Boolean(canManage),
  })
  const groupsQuery = useQuery({
    queryKey: ['dashboard-groups'],
    queryFn: async () => (await apiClient.get<Array<{ id: string; active: boolean }>>('/api/v1/groups')).data,
    enabled: Boolean(canManage),
  })

  const nextMatch = matchesQuery.data
    ?.filter((match) => match.status !== 'CANCELLED')
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())[0]
  const activeSeries = (seriesQuery.data ?? []).filter((series) => series.active).length
  const activeGroups = (groupsQuery.data ?? []).filter((group) => group.active).length

  return (
    <div className="space-y-4">
      <section className="ui-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{canManage ? 'Inicio de gestion DT' : 'Inicio'}</h1>
        <p className="ui-text-muted mt-2">
          Bienvenido, <span className="font-medium">{user?.fullName ?? 'usuario'}</span>. Elige tu siguiente accion.
        </p>
      </section>

      {canManage ? (
        <>
          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">Resumen operativo</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <article className="ui-muted-surface p-3">
                <p className="ui-text-muted text-xs">Partidos visibles</p>
                <p className="text-2xl font-semibold">{matchesQuery.data?.length ?? 0}</p>
              </article>
              <article className="ui-muted-surface p-3">
                <p className="ui-text-muted text-xs">Series activas</p>
                <p className="text-2xl font-semibold">{activeSeries}</p>
              </article>
              <article className="ui-muted-surface p-3">
                <p className="ui-text-muted text-xs">Grupos activos</p>
                <p className="text-2xl font-semibold">{activeGroups}</p>
              </article>
            </div>
            {nextMatch && (
              <p className="ui-text-muted mt-3 text-sm">
                Proximo partido: {new Date(nextMatch.startsAt).toLocaleString()}.
              </p>
            )}
          </section>

          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">Acciones rapidas de gestion</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link className="ui-nav-link ui-nav-link-active" to="/matches">Gestionar partidos y convocatorias</Link>
              <Link className="ui-nav-link ui-nav-link-active" to="/series">Gestionar series recurrentes</Link>
              <Link className="ui-nav-link ui-nav-link-active" to="/groups">Administrar grupos</Link>
              <Link className="ui-nav-link ui-nav-link-active" to="/notifications">Revisar notificaciones</Link>
            </div>
          </section>
        </>
      ) : (
        <section className="ui-card p-5">
          <h2 className="text-base font-semibold tracking-tight">Acciones rapidas del jugador</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link className="ui-nav-link ui-nav-link-active" to="/matches">Ver convocatorias</Link>
            <Link className="ui-nav-link ui-nav-link-active" to="/attendance">Confirmar asistencia</Link>
            <Link className="ui-nav-link ui-nav-link-active" to="/my-groups">Revisar mis grupos</Link>
            <Link className="ui-nav-link ui-nav-link-active" to="/notifications">Ver notificaciones</Link>
          </div>
        </section>
      )}

      <section className="ui-muted-surface p-4 text-sm">
        <p className="font-medium">Roles actuales: {user?.roles.join(', ') || 'Sin roles'}</p>
        {canManage && (
          <p className="ui-text-muted mt-1">
            Tambien tienes accesos de gestion disponibles en la seccion "Gestion" del menu lateral.
          </p>
        )}
      </section>
    </div>
  )
}
