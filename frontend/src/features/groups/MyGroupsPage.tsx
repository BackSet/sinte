import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { Icon } from '../../components/ui/Icon'

type GroupMember = {
  userId: string
  fullName: string
  email: string
  playerHandle?: string
}

type MyGroup = {
  id: string
  name: string
  members: GroupMember[]
}

export function MyGroupsPage() {
  const myGroupsQuery = useQuery({
    queryKey: ['my-groups'],
    queryFn: async () => (await apiClient.get<MyGroup[]>('/api/v1/groups/me')).data,
  })

  return (
    <ResponsiveSection title="Mis grupos" description="Visualiza los grupos a los que perteneces y sus miembros">
      {myGroupsQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando grupos...</p>}
      {myGroupsQuery.isError && (
        <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar tus grupos. Intenta nuevamente.</p>
      )}
      <div className="mt-3 space-y-3">
        {(myGroupsQuery.data ?? []).map((group) => (
          <article key={group.id} className="ui-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="groups" size="sm" className="ui-text-muted" />
                <h3 className="text-sm font-semibold">{group.name}</h3>
              </div>
              <span className="ui-badge ui-badge-muted">{group.members.length} miembro{group.members.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {group.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-sm">
                  <span className="font-medium">{member.fullName}</span>
                  <span className="ui-badge">{member.playerHandle ?? member.email}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
        {myGroupsQuery.data && myGroupsQuery.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Icon name="groups" size="lg" className="ui-text-muted mb-3" />
            <p className="text-sm font-medium">No perteneces a ningun grupo</p>
            <p className="ui-text-muted mt-1 text-xs">Cuando seas agregado a un grupo, aparecera aca.</p>
          </div>
        )}
      </div>
    </ResponsiveSection>
  )
}