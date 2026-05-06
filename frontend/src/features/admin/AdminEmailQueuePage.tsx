import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

type EmailQueueItem = {
  id: string
  toEmail: string
  subject: string
  status: string
  attemptCount: number
  nextAttemptAt: string
  lastError?: string
  createdAt: string
  sentAt?: string
}

export function AdminEmailQueuePage() {
  const queryClient = useQueryClient()
  const queueQuery = useQuery({
    queryKey: ['admin-email-queue'],
    queryFn: async () => (await apiClient.get<EmailQueueItem[]>('/api/v1/admin/email-queue')).data,
  })

  const retryMutation = useMutation({
    mutationFn: async (emailQueueId: string) => {
      await apiClient.post(`/api/v1/admin/email-queue/${emailQueueId}/retry`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-email-queue'] }),
  })

  const processMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/admin/email-queue/process-due')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-email-queue'] }),
  })

  return (
    <ResponsiveSection
      title="Admin: cola de correos"
      action={
        <button className="ui-button-muted" onClick={() => processMutation.mutate()}>
          Procesar pendientes
        </button>
      }
    >
      {queueQuery.data && (
        <ResponsiveTable
          data={queueQuery.data}
          rowKey={(item) => item.id}
          emptyMessage="No hay correos en cola."
          columns={[
            { key: 'to', label: 'Destino', render: (item) => item.toEmail },
            { key: 'subject', label: 'Asunto', render: (item) => item.subject },
            {
              key: 'status',
              label: 'Estado',
              render: (item) => (
                <StatusBadge
                  label={item.status}
                  tone={item.status === 'SENT' ? 'success' : item.status === 'FAILED' ? 'danger' : 'warning'}
                />
              ),
            },
            { key: 'attempts', label: 'Intentos', render: (item) => item.attemptCount },
            {
              key: 'error',
              label: 'Error',
              render: (item) => <span className="ui-text-muted inline-block max-w-80 truncate">{item.lastError || '-'}</span>,
            },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (item) => (
                <button className="ui-button-muted" onClick={() => retryMutation.mutate(item.id)}>
                  Retry
                </button>
              ),
            },
          ]}
          renderMobileCard={(item) => (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{item.subject}</p>
              <p className="ui-text-muted">{item.toEmail}</p>
              <p className="ui-text-muted">
                <StatusBadge
                  label={item.status}
                  tone={item.status === 'SENT' ? 'success' : item.status === 'FAILED' ? 'danger' : 'warning'}
                />{' '}
                intentos: {item.attemptCount}
              </p>
              <p className="ui-text-muted max-h-14 overflow-hidden text-xs">{item.lastError || 'Sin error'}</p>
              <button className="ui-button-muted" onClick={() => retryMutation.mutate(item.id)}>
                Retry
              </button>
            </div>
          )}
        />
      )}
    </ResponsiveSection>
  )
}
