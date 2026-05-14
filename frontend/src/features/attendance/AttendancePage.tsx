import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useToastStore } from '../../store/toast-store'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'

type AttendanceItem = {
  id: string
  matchId: string
  matchTitle: string
  matchStartsAt: string
  matchStatus: string
  status: 'PENDING' | 'YES' | 'NO' | 'CANCELLED'
  respondedAt?: string
  comment?: string
  attendanceOpen: boolean
  targetPlayers?: number
  confirmedYesCount: number
  pendingCount: number
}

function StatusBadge({ status }: { status: AttendanceItem['status'] }) {
  if (status === 'YES') return <span className="ui-badge ui-badge-success">Confirmada</span>
  if (status === 'NO') return <span className="ui-badge ui-badge-danger">No asistire</span>
  if (status === 'CANCELLED') return <span className="ui-badge ui-badge-danger">Cancelada</span>
  return <span className="ui-badge ui-badge-muted">Pendiente</span>
}

export function AttendancePage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  const attendanceQuery = useQuery({
    queryKey: ['attendance-me'],
    queryFn: async () => (await apiClient.get<AttendanceItem[]>('/api/v1/attendance/me')).data,
  })

  const respondMutation = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: 'YES' | 'NO' | 'CANCELLED' }) => {
      await apiClient.post('/api/v1/attendance/respond', { matchId, status })
    },
    onSuccess: () => {
      addToast('success', 'Respuesta registrada')
      queryClient.invalidateQueries({ queryKey: ['attendance-me'] })
    },
    onError: () => addToast('error', 'No se pudo registrar tu respuesta'),
  })

  return (
    <ResponsiveSection
      title="Mi asistencia a partidos"
      description="Confirma tu disponibilidad y revisa el estado de cada convocatoria"
    >
      {attendanceQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando asistencias...</p>}
      {attendanceQuery.isError && (
        <p className="mt-3 text-sm text-[var(--danger)]">No se pudo cargar tu asistencia. Intenta nuevamente.</p>
      )}
      {attendanceQuery.data && (
        <ResponsiveTable
          data={attendanceQuery.data}
          rowKey={(attendance) => attendance.id}
          emptyMessage="No tienes convocatorias."
          emptyIcon="attendance"
          columns={[
            {
              key: 'match',
              label: 'Partido',
              render: (attendance) => (
                <div>
                  <p className="font-medium">{attendance.matchTitle}</p>
                  <p className="ui-text-muted text-xs">{new Date(attendance.matchStartsAt).toLocaleString()}</p>
                </div>
              ),
            },
            { key: 'status', label: 'Tu respuesta', render: (attendance) => <StatusBadge status={attendance.status} /> },
            {
              key: 'quota',
              label: 'Convocatoria',
              render: (attendance) =>
                attendance.targetPlayers
                  ? `${attendance.confirmedYesCount}/${attendance.targetPlayers} (${attendance.attendanceOpen ? 'Abierta' : 'Cerrada'})`
                  : '-',
            },
            {
              key: 'matchState',
              label: 'Estado',
              render: (attendance) => (
                <span className={`ui-badge ${attendance.matchStatus === 'SCHEDULED' ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {attendance.matchStatus}
                </span>
              ),
            },
            {
              key: 'responseDate',
              label: 'Respuesta',
              render: (attendance) =>
                attendance.respondedAt ? new Date(attendance.respondedAt).toLocaleString() : '-',
            },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (attendance) => (
                <div className="flex justify-end gap-2">
                  {attendance.status !== 'YES' && (
                    <button
                      className="ui-button"
                      disabled={!attendance.attendanceOpen || respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'YES' })}
                    >
                      Confirmar
                    </button>
                  )}
                  {attendance.status !== 'NO' && attendance.status !== 'CANCELLED' && (
                    <button
                      className="ui-button-muted"
                      disabled={!attendance.attendanceOpen || respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'NO' })}
                    >
                      No podre
                    </button>
                  )}
                  {attendance.status === 'YES' && (
                    <button
                      className="ui-button-muted"
                      disabled={!attendance.attendanceOpen || respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'CANCELLED' })}
                    >
                      Cancelar asistencia
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          renderMobileCard={(attendance) => (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{attendance.matchTitle}</p>
                <StatusBadge status={attendance.status} />
              </div>
              <p className="ui-text-muted">Inicio: {new Date(attendance.matchStartsAt).toLocaleString()}</p>
              <p className="ui-text-muted">
                Plantilla:{' '}
                {attendance.targetPlayers
                  ? `${attendance.confirmedYesCount}/${attendance.targetPlayers} (${attendance.attendanceOpen ? 'Abierta' : 'Cerrada'})`
                  : 'Sin objetivo'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {attendance.status !== 'YES' && (
                  <button
                    className="ui-button"
                    disabled={!attendance.attendanceOpen || respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'YES' })}
                  >
                    Confirmar
                  </button>
                )}
                {attendance.status !== 'NO' && attendance.status !== 'CANCELLED' && (
                  <button
                    className="ui-button-muted"
                    disabled={!attendance.attendanceOpen || respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'NO' })}
                  >
                    No podre
                  </button>
                )}
                {attendance.status === 'YES' && (
                  <button
                    className="ui-button-muted col-span-2"
                    disabled={!attendance.attendanceOpen || respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'CANCELLED' })}
                  >
                    Cancelar asistencia
                  </button>
                )}
              </div>
            </div>
          )}
        />
      )}
    </ResponsiveSection>
  )
}