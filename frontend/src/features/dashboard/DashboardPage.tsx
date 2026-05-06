import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useAuthStore } from '../../store/auth-store'
import { Icon } from '../../components/ui/Icon'

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
  const isLoading = matchesQuery.isLoading || seriesQuery.isLoading || groupsQuery.isLoading
  const hasError = matchesQuery.isError || seriesQuery.isError || groupsQuery.isError

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-[var(--bg-panel)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="ui-badge ui-badge-success">{canManage ? 'Panel de gestion' : 'Panel jugador'}</span>
            <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{canManage ? 'Inicio de gestion DT' : 'Inicio'}</h1>
            <p className="ui-text-muted mt-2 max-w-2xl text-sm">
              Bienvenido, <span className="font-medium text-[var(--text-primary)]">{user?.fullName ?? 'usuario'}</span>. Elige tu siguiente accion.
            </p>
          </div>
          <div className="ui-muted-surface px-3 py-2 text-sm">
            <span className="ui-text-muted">Roles: </span>
            <span className="font-medium">{user?.roles.join(', ') || 'Sin roles'}</span>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="ui-card flex items-center gap-3 p-4">
          <span className="ui-loader" />
          <p className="ui-text-muted text-sm">Actualizando resumen operativo...</p>
        </section>
      )}

      {hasError && (
        <section className="ui-empty-state">
          <p className="text-sm font-medium text-[var(--danger)]">No se pudo cargar una parte del resumen.</p>
        </section>
      )}

      {canManage ? (
        <>
          <section className="ui-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Resumen operativo</h2>
                <p className="ui-text-muted mt-1 text-sm">Lectura rapida del estado actual.</p>
              </div>
              <span className="ui-badge ui-badge-info">Tiempo real</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <article className="ui-kpi-card">
                <p className="ui-text-muted text-xs">Partidos visibles</p>
                <p className="text-2xl font-semibold">{matchesQuery.data?.length ?? 0}</p>
              </article>
              <article className="ui-kpi-card">
                <p className="ui-text-muted text-xs">Series activas</p>
                <p className="text-2xl font-semibold">{activeSeries}</p>
              </article>
              <article className="ui-kpi-card">
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
            <h2 className="text-base font-semibold">Acciones rapidas de gestion</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/matches"><Icon name="matches" size="sm" /> Gestionar partidos y convocatorias</Link>
              <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/series"><Icon name="series" size="sm" /> Gestionar series recurrentes</Link>
              <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/groups"><Icon name="groups" size="sm" /> Administrar grupos</Link>
              <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/notifications"><Icon name="notifications" size="sm" /> Revisar notificaciones</Link>
            </div>
          </section>
        </>
      ) : (
        <section className="ui-card p-5">
          <h2 className="text-base font-semibold">Acciones rapidas del jugador</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/matches"><Icon name="matches" size="sm" /> Ver convocatorias</Link>
            <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/attendance"><Icon name="attendance" size="sm" /> Confirmar asistencia</Link>
            <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/my-groups"><Icon name="groups" size="sm" /> Revisar mis grupos</Link>
            <Link className="ui-muted-surface flex items-center gap-3 p-3 transition hover:bg-[var(--bg-hover)]" to="/notifications"><Icon name="notifications" size="sm" /> Ver notificaciones</Link>
          </div>
        </section>
      )}
    </div>
  )
}
