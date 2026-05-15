import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { useToastStore } from '../../store/toast-store'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { Icon } from '../../components/ui/Icon'

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
  const addToast = useToastStore((s) => s.addToast)

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
    onSuccess: () => {
      addToast('success', 'Todas las notificaciones marcadas como leidas')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => addToast('error', 'No se pudieron marcar las notificaciones'),
  })

  const unreadCount = (notificationsQuery.data ?? []).filter((n) => !n.read).length

  return (
    <ResponsiveSection
      title="Notificaciones"
      description={unreadCount > 0 ? `${unreadCount} sin leer` : undefined}
      action={
        unreadCount > 0 ? (
          <button className="ui-button-muted" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <Icon name="check" size="sm" />
            <span>{markAllMutation.isPending ? 'Marcando...' : 'Marcar todas como leidas'}</span>
          </button>
        ) : undefined
      }
    >
      {notificationsQuery.isLoading && <p className="ui-text-muted text-sm">Cargando notificaciones...</p>}
      {notificationsQuery.isError && (
        <p className="text-sm text-[var(--danger)]">No se pudieron cargar las notificaciones. Intenta nuevamente.</p>
      )}
      {notificationsQuery.data && notificationsQuery.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Icon name="notifications" size="lg" className="ui-text-muted mb-3" />
          <p className="text-sm font-medium">No tienes notificaciones</p>
          <p className="ui-text-muted mt-1 text-xs">Las notificaciones apareceran aqui cuando las recibas.</p>
        </div>
      )}
      <div className="space-y-2" aria-live="polite">
        {notificationsQuery.data?.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-lg border p-3 sm:p-4 transition-colors ${
              notification.read ? 'border-[var(--border-soft)] bg-[var(--bg-muted)]' : 'border-[var(--border-strong)] bg-[var(--bg-panel)]'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                  )}
                  <p className="text-sm font-semibold">{notification.title}</p>
                </div>
                <p className="ui-text-muted mt-0.5 text-xs">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.read && (
                <button className="ui-button-muted shrink-0" onClick={() => markReadMutation.mutate(notification.id)} disabled={markReadMutation.isPending}>
                  <Icon name="check" size="sm" />
                  <span>Marcar leida</span>
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