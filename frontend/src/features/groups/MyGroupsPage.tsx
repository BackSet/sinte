import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'

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
        <p className="mt-3 text-sm text-red-600">No se pudieron cargar tus grupos. Intenta nuevamente.</p>
      )}
      <div className="mt-3 space-y-3">
        {(myGroupsQuery.data ?? []).map((group) => (
          <article key={group.id} className="ui-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{group.name}</h3>
              <span className="ui-text-muted text-xs">{group.members.length} miembro(s)</span>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {group.members.map((member) => (
                <p key={member.userId} className="ui-text-muted">
                  {member.fullName} - {member.playerHandle ?? member.email}
                </p>
              ))}
            </div>
          </article>
        ))}
        {myGroupsQuery.data && myGroupsQuery.data.length === 0 && (
          <p className="ui-text-muted text-sm">No perteneces a ningun grupo activo.</p>
        )}
      </div>
    </ResponsiveSection>
  )
}
