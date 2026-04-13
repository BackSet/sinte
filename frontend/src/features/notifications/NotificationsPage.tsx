import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
  readAt?: string
}

export function NotificationsPage() {
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await apiClient.get<NotificationItem[]>('/api/v1/notifications')).data,
  })

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.post(`/api/v1/notifications/${notificationId}/read`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/notifications/read-all')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <ResponsiveSection
      title="Notificaciones"
      action={
        <button className="ui-button-muted" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          {markAllMutation.isPending ? 'Marcando...' : 'Marcar todas como leidas'}
        </button>
      }
    >
      {notificationsQuery.isLoading && <p className="ui-text-muted text-sm">Cargando notificaciones...</p>}
      {notificationsQuery.isError && (
        <p className="text-sm text-red-600">No se pudieron cargar las notificaciones. Intenta nuevamente.</p>
      )}
      {notificationsQuery.data && notificationsQuery.data.length === 0 && (
        <p className="ui-text-muted text-sm">No tienes notificaciones nuevas.</p>
      )}
      <div className="space-y-3" aria-live="polite">
        {notificationsQuery.data?.map((notification) => (
          <article key={notification.id} className={`rounded-lg border p-3 sm:p-4 ${notification.read ? 'ui-muted-surface' : 'ui-card'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{notification.title}</p>
                <p className="ui-text-muted mt-1 text-xs">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.read && (
                <button className="ui-button-muted" onClick={() => markReadMutation.mutate(notification.id)} disabled={markReadMutation.isPending}>
                  Marcar leida
                </button>
              )}
            </div>
            <p className="mt-2 text-sm">{notification.body}</p>
          </article>
        ))}
      </div>
    </ResponsiveSection>
  )
}
