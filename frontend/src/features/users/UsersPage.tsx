import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { Modal } from '../../components/ui/Modal'
import { DetailModal } from '../../components/ui/DetailModal'
import { FormField } from '../../components/ui/FormField'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../store/toast-store'
import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'

const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  PLAYER_POSITION_OPTIONS.map((opt) => [opt.value, opt.label]),
)

type UserItem = {
  id: string
  fullName: string
  email: string
  phone: string
  nickname?: string
  nicknameTag?: string
  shirtNumber?: number
  playerHandle?: string
  active: boolean
  roles: string[]
}

type UserPositionItem = {
  id: string
  positionCode: string
  priority: number
}

function emptyUserForm() {
  return { fullName: '', email: '', phone: '', nickname: '', shirtNumber: '', password: '' }
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [positionsModalOpen, setPositionsModalOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<UserItem | null>(null)
  const [editingPositionsUser, setEditingPositionsUser] = useState<UserItem | null>(null)
  const [userForm, setUserForm] = useState(emptyUserForm())
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get<UserItem[]>('/api/v1/users?page=0&size=100')).data,
  })

  const currentPositionsQuery = useQuery({
    queryKey: ['user-positions', editingPositionsUser?.id],
    queryFn: async () => (await apiClient.get<UserPositionItem[]>(`/api/v1/users/${editingPositionsUser!.id}/positions`)).data,
    enabled: Boolean(editingPositionsUser),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/users', {
        fullName: userForm.fullName,
        email: userForm.email,
        phone: userForm.phone,
        nickname: userForm.nickname || undefined,
        shirtNumber: userForm.shirtNumber ? Number(userForm.shirtNumber) : undefined,
        password: userForm.password,
        initialRole: 'PLAYER',
      })
    },
    onSuccess: () => {
      addToast('success', 'Usuario creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreateModalOpen(false)
      setUserForm(emptyUserForm())
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear el usuario')),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      await apiClient.patch(`/api/v1/users/${userId}/active?value=${!active}`)
    },
    onSuccess: () => {
      addToast('success', 'Estado del usuario actualizado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo cambiar el estado del usuario')),
  })

  const savePositionsMutation = useMutation({
    mutationFn: async () => {
      const assignments = selectedPositions.map((code, index) => ({ positionCode: code, priority: index + 1 }))
      await apiClient.put(`/api/v1/users/${editingPositionsUser!.id}/positions`, assignments)
    },
    onSuccess: () => {
      addToast('success', 'Posiciones actualizadas')
      setPositionsModalOpen(false)
      setEditingPositionsUser(null)
      setSelectedPositions([])
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudieron guardar las posiciones')),
  })

  const deletePositionMutation = useMutation({
    mutationFn: async ({ userId, positionCode }: { userId: string; positionCode: string }) => {
      await apiClient.delete(`/api/v1/users/${userId}/positions/${positionCode}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-positions', editingPositionsUser?.id] })
      addToast('success', 'Posicion eliminada')
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar la posicion')),
  })

  const openDetail = (user: UserItem) => {
    setViewingUser(user)
    setDetailModalOpen(true)
  }

  const openPositions = (user: UserItem) => {
    setEditingPositionsUser(user)
    setSelectedPositions([])
    setPositionsModalOpen(true)
  }

  const handleToggleActive = async (user: UserItem) => {
    const confirmed = await requestConfirm({
      title: user.active ? 'Desactivar usuario' : 'Activar usuario',
      description: user.active
        ? `Seguro que deseas desactivar a ${user.fullName}? No podra iniciar sesion.`
        : `Seguro que deseas reactivar a ${user.fullName}?`,
      confirmLabel: user.active ? 'Desactivar' : 'Activar',
      variant: user.active ? 'danger' : 'default',
    })
    if (confirmed) {
      toggleMutation.mutate({ userId: user.id, active: user.active })
    }
  }

  const togglePositionSelection = (code: string) => {
    setSelectedPositions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const currentPositions = currentPositionsQuery.data ?? []

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <ResponsiveSection
        title="Usuarios"
        description="Gestiona jugadores y staff del sistema"
        action={
          <button className="ui-button" onClick={() => setCreateModalOpen(true)}>
            Nuevo usuario
          </button>
        }
      >
        {usersQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando usuarios...</p>}
        {usersQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudo cargar el listado.</p>}
        {usersQuery.data && (
          <ResponsiveTable
            data={usersQuery.data}
            rowKey={(user) => user.id}
            emptyMessage="Sin usuarios registrados."
            columns={[
              { key: 'name', label: 'Nombre', render: (user) => (
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="ui-text-muted text-xs">{user.email}</p>
                </div>
              )},
              { key: 'phone', label: 'Telefono', render: (user) => user.phone },
              { key: 'handle', label: 'Codigo', render: (user) => (
                <span className="ui-badge">{user.playerHandle ?? '-'}</span>
              )},
              { key: 'roles', label: 'Roles', render: (user) => user.roles.join(', ') || '-' },
              { key: 'status', label: 'Estado', render: (user) => (
                <span className={`ui-badge ${user.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </span>
              )},
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (user) => (
                  <div className="flex justify-end gap-2">
                    <button className="ui-button-muted" onClick={() => openDetail(user)}>Ver</button>
                    <button className="ui-button-muted" onClick={() => openPositions(user)}>Posiciones</button>
                    <button className="ui-button-muted" onClick={() => handleToggleActive(user)}>
                      {user.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ),
              },
            ]}
            renderMobileCard={(user) => (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{user.fullName}</p>
                  <span className={`ui-badge ${user.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="ui-text-muted">{user.email}</p>
                <p className="ui-text-muted">Telefono: {user.phone}</p>
                <p className="ui-text-muted">Codigo: {user.playerHandle ?? '-'}</p>
                <p className="ui-text-muted">Roles: {user.roles.join(', ') || '-'}</p>
                <div className="flex gap-2">
                  <button className="ui-button-muted" onClick={() => openDetail(user)}>Ver</button>
                  <button className="ui-button-muted" onClick={() => openPositions(user)}>Posiciones</button>
                  <button className="ui-button-muted" onClick={() => handleToggleActive(user)}>
                    {user.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      {/* Create User Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setUserForm(emptyUserForm()); }}
        size="md"
        title="Nuevo usuario"
        subtitle="Alta rapida de jugadores y staff"
      >
        <FormField label="Nombre completo">
          <input
            className="ui-input"
            placeholder="Nombre completo"
            value={userForm.fullName}
            onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Correo">
            <input
              className="ui-input"
              type="email"
              placeholder="correo@ejemplo.com"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Telefono">
            <input
              className="ui-input"
              placeholder="0991234567"
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              required
            />
          </FormField>
        </div>

        <FormField label="Apodo (opcional)">
          <input
            className="ui-input"
            placeholder="Apodo"
            value={userForm.nickname}
            onChange={(e) => setUserForm({ ...userForm, nickname: e.target.value })}
          />
        </FormField>

        <FormField label="Numero de camiseta">
          <input
            className="ui-input"
            type="number"
            placeholder="Ej: 10"
            min={1}
            max={99}
            value={userForm.shirtNumber}
            onChange={(e) => setUserForm({ ...userForm, shirtNumber: e.target.value })}
          />
        </FormField>

        <FormField label="Contrasena temporal">
          <input
            className="ui-input"
            type="password"
            placeholder="Minimo 8 caracteres"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            required
          />
        </FormField>

        {createMutation.isError && (
          <p className="text-sm text-[var(--danger)]">
            {getApiErrorMessage(createMutation.error, 'No se pudo crear el usuario.')}
          </p>
        )}

        <Modal.Footer>
          <button className="ui-button-muted" onClick={() => { setCreateModalOpen(false); setUserForm(emptyUserForm()); }}>
            Cancelar
          </button>
          <button className="ui-button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !userForm.fullName || !userForm.email || !userForm.phone || !userForm.password}>
            {createMutation.isPending ? 'Guardando...' : 'Guardar usuario'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* User Detail Modal */}
      {viewingUser && (
        <DetailModal
          open={detailModalOpen}
          onClose={() => { setDetailModalOpen(false); setViewingUser(null); }}
          size="md"
          title="Detalle del usuario"
          subtitle={viewingUser.fullName}
        >
          <DetailModal.Section title="Informacion personal">
            <DetailModal.InfoRow label="Nombre" value={viewingUser.fullName} />
            <DetailModal.InfoRow label="Correo" value={viewingUser.email} />
            <DetailModal.InfoRow label="Telefono" value={viewingUser.phone} />
            {viewingUser.nickname && <DetailModal.InfoRow label="Apodo" value={viewingUser.nickname} />}
            {viewingUser.shirtNumber && <DetailModal.InfoRow label="Camiseta" value={`#${viewingUser.shirtNumber}`} />}
            {viewingUser.playerHandle && <DetailModal.InfoRow label="Codigo" value={viewingUser.playerHandle} />}
          </DetailModal.Section>

          <DetailModal.Divider />

          <DetailModal.Section title="Cuenta">
            <DetailModal.InfoRow label="Roles" value={viewingUser.roles.join(', ') || '-'} />
            <DetailModal.InfoRow
              label="Estado"
              value={
                <span className={`ui-badge ${viewingUser.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {viewingUser.active ? 'Activo' : 'Inactivo'}
                </span>
              }
            />
          </DetailModal.Section>

          <Modal.Footer>
            <button className="ui-button-muted" onClick={() => { setDetailModalOpen(false); setViewingUser(null); }}>
              Cerrar
            </button>
            <button className="ui-button" onClick={() => { setDetailModalOpen(false); openPositions(viewingUser); }}>
              Gestionar posiciones
            </button>
          </Modal.Footer>
        </DetailModal>
      )}

      {/* Positions Modal */}
      {editingPositionsUser && (
        <Modal
          open={positionsModalOpen}
          onClose={() => { setPositionsModalOpen(false); setEditingPositionsUser(null); setSelectedPositions([]); }}
          size="md"
          title="Posiciones"
          subtitle={`Gestionar posiciones de ${editingPositionsUser.fullName}`}
        >
          {currentPositions.length > 0 && (
            <div className="ui-detail-section">
              <p className="ui-detail-section-title">Posiciones actuales</p>
              <div className="space-y-1">
                {currentPositions
                  .sort((a, b) => a.priority - b.priority)
                  .map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span>
                        <span className="ui-text-muted mr-2 text-xs">#{pos.priority}</span>
                        {POSITION_LABELS[pos.positionCode] ?? pos.positionCode}
                      </span>
                      <button
                        className="text-xs text-[var(--danger)] hover:underline"
                        onClick={() => deletePositionMutation.mutate({ userId: editingPositionsUser!.id, positionCode: pos.positionCode })}
                        disabled={deletePositionMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <hr className="ui-section-divider" />

          <div className="ui-detail-section">
            <p className="ui-detail-section-title">Seleccionar posiciones</p>
            <p className="ui-text-muted mb-3 text-xs">Selecciona en orden de preferencia. La primera sera la posicion principal.</p>
            <div className="flex flex-wrap gap-2">
              {PLAYER_POSITION_OPTIONS.map((opt) => {
                const isSelected = selectedPositions.includes(opt.value)
                const priority = selectedPositions.indexOf(opt.value) + 1
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]'
                        : 'border-[var(--border-soft)]'
                    }`}
                    onClick={() => togglePositionSelection(opt.value)}
                  >
                    {isSelected ? `#${priority} ` : ''}{opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {savePositionsMutation.isError && (
            <p className="text-sm text-[var(--danger)]">
              {getApiErrorMessage(savePositionsMutation.error, 'No se pudieron guardar las posiciones.')}
            </p>
          )}

          <Modal.Footer>
            <button className="ui-button-muted" onClick={() => { setPositionsModalOpen(false); setEditingPositionsUser(null); setSelectedPositions([]); }}>
              Cancelar
            </button>
            <button className="ui-button" onClick={() => savePositionsMutation.mutate()} disabled={savePositionsMutation.isPending || selectedPositions.length === 0}>
              {savePositionsMutation.isPending ? 'Guardando...' : 'Guardar posiciones'}
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  )
}
