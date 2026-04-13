import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'

type AttendanceItem = {
  id: string
  matchId: string
  matchTitle: string
  matchStartsAt: string
  matchStatus: string
  status: 'PENDING' | 'YES' | 'NO'
  respondedAt?: string
  comment?: string
  attendanceOpen: boolean
  targetPlayers?: number
  confirmedYesCount: number
  pendingCount: number
}

export function AttendancePage() {
  const queryClient = useQueryClient()

  const attendanceQuery = useQuery({
    queryKey: ['attendance-me'],
    queryFn: async () => (await apiClient.get<AttendanceItem[]>('/api/v1/attendance/me')).data,
  })

  const respondMutation = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: 'YES' | 'NO' }) => {
      await apiClient.post('/api/v1/attendance/respond', { matchId, status })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-me'] }),
  })

  const unconfirmMutation = useMutation({
    mutationFn: async ({ matchId }: { matchId: string }) => {
      await apiClient.post('/api/v1/attendance/unconfirm', { matchId })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-me'] }),
  })

  const formatAttendanceStatus = (status: AttendanceItem['status']) => {
    if (status === 'YES') return 'Confirmada'
    if (status === 'NO') return 'No asistire'
    return 'Pendiente'
  }

  return (
    <ResponsiveSection
      title="Mi asistencia a partidos"
      description="Confirma tu disponibilidad y revisa el estado de cada convocatoria"
    >
      {attendanceQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando asistencias...</p>}
      {attendanceQuery.isError && (
        <p className="mt-3 text-sm text-red-600">No se pudo cargar tu asistencia. Intenta nuevamente.</p>
      )}
      {attendanceQuery.data && (
        <ResponsiveTable
          data={attendanceQuery.data}
          rowKey={(attendance) => attendance.id}
          emptyMessage="No tienes convocatorias pendientes."
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
            { key: 'status', label: 'Tu respuesta', render: (attendance) => formatAttendanceStatus(attendance.status) },
            {
              key: 'quota',
              label: 'Convocatoria',
              render: (attendance) =>
                attendance.targetPlayers
                  ? `${attendance.confirmedYesCount} confirmados / ${attendance.pendingCount} pendientes (${attendance.attendanceOpen ? 'Abierta' : 'Cerrada'})`
                  : '-',
            },
            {
              key: 'matchState',
              label: 'Estado del partido',
              render: (attendance) => attendance.matchStatus,
            },
            {
              key: 'responseDate',
              label: 'Respuesta',
              render: (attendance) =>
                attendance.respondedAt ? new Date(attendance.respondedAt).toLocaleString() : 'Pendiente',
            },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (attendance) => (
                <div className="flex justify-end gap-2">
                  <button
                    className="ui-button-muted"
                    disabled={!attendance.attendanceOpen || respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'YES' })}
                  >
                    Confirmar
                  </button>
                  <button
                    className="ui-button-muted"
                    disabled={!attendance.attendanceOpen || respondMutation.isPending}
                    onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'NO' })}
                  >
                    No podre asistir
                  </button>
                  {attendance.status !== 'PENDING' && (
                    <button
                      className="ui-button-muted"
                      disabled={unconfirmMutation.isPending}
                      onClick={() => unconfirmMutation.mutate({ matchId: attendance.matchId })}
                    >
                      Limpiar respuesta
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          renderMobileCard={(attendance) => (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{attendance.matchTitle}</p>
              <p className="ui-text-muted">Inicio: {new Date(attendance.matchStartsAt).toLocaleString()}</p>
              <p className="ui-text-muted">Tu respuesta: {formatAttendanceStatus(attendance.status)}</p>
              <p className="ui-text-muted">
                Plantilla:{' '}
                {attendance.targetPlayers
                  ? `${attendance.confirmedYesCount} confirmados / ${attendance.pendingCount} pendientes (${attendance.attendanceOpen ? 'Abierta' : 'Cerrada'})`
                  : 'Sin objetivo'}
              </p>
              <p className="ui-text-muted">Estado del partido: {attendance.matchStatus}</p>
              <p className="ui-text-muted">
                Respondido: {attendance.respondedAt ? new Date(attendance.respondedAt).toLocaleString() : 'Pendiente'}
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <button
                  className="ui-button-muted"
                  disabled={!attendance.attendanceOpen || respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'YES' })}
                >
                  Confirmar
                </button>
                <button
                  className="ui-button-muted"
                  disabled={!attendance.attendanceOpen || respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ matchId: attendance.matchId, status: 'NO' })}
                >
                  No podre asistir
                </button>
                {attendance.status !== 'PENDING' && (
                  <button
                    className="ui-button-muted"
                    disabled={unconfirmMutation.isPending}
                    onClick={() => unconfirmMutation.mutate({ matchId: attendance.matchId })}
                  >
                    Limpiar respuesta
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
