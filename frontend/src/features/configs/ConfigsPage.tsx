import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { Modal } from '../../components/ui/Modal'
import { DetailModal } from '../../components/ui/DetailModal'
import { FormField } from '../../components/ui/FormField'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../store/toast-store'

type MatchConfigItem = {
  id: string
  location: string
  targetPlayers: number
  durationMinutes: number
  timezone: string
  description: string | null
  createdAt: string
}

const timezoneOptions = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Montevideo',
  'America/Caracas',
  'America/Panama',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Asuncion',
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/Madrid',
]

function emptyForm() {
  return { location: '', targetPlayers: 14, durationMinutes: 90, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota', description: '' }
}

export function ConfigsPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<MatchConfigItem | null>(null)
  const [viewingConfig, setViewingConfig] = useState<MatchConfigItem | null>(null)
  const [form, setForm] = useState(emptyForm())

  const configsQuery = useQuery({
    queryKey: ['configs'],
    queryFn: async () => (await apiClient.get<MatchConfigItem[]>('/api/v1/configs')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/configs', {
        location: form.location.trim(),
        targetPlayers: form.targetPlayers,
        durationMinutes: form.durationMinutes,
        timezone: form.timezone,
        description: form.description.trim() || null,
      })
    },
    onSuccess: () => {
      addToast('success', 'Configuracion creada')
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      setFormModalOpen(false)
      setForm(emptyForm())
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear la configuracion')),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingConfig) return
      await apiClient.put(`/api/v1/configs/${editingConfig.id}`, {
        location: form.location.trim(),
        targetPlayers: form.targetPlayers,
        durationMinutes: form.durationMinutes,
        timezone: form.timezone,
        description: form.description.trim() || null,
      })
    },
    onSuccess: () => {
      addToast('success', 'Configuracion actualizada')
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      setFormModalOpen(false)
      setEditingConfig(null)
      setForm(emptyForm())
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo actualizar la configuracion')),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/configs/${id}`)
    },
    onSuccess: () => {
      addToast('success', 'Configuracion eliminada')
      queryClient.invalidateQueries({ queryKey: ['configs'] })
      setDetailModalOpen(false)
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar la configuracion')),
  })

  function openCreate() {
    setEditingConfig(null)
    setForm(emptyForm())
    setFormModalOpen(true)
  }

  function openEdit(config: MatchConfigItem) {
    setEditingConfig(config)
    setForm({
      location: config.location ?? '',
      targetPlayers: config.targetPlayers,
      durationMinutes: config.durationMinutes,
      timezone: config.timezone,
      description: config.description ?? '',
    })
    setFormModalOpen(true)
  }

  function openDetail(config: MatchConfigItem) {
    setViewingConfig(config)
    setDetailModalOpen(true)
  }

  const handleSubmit = () => {
    if (editingConfig) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const handleDelete = async (config: MatchConfigItem) => {
    const confirmed = await requestConfirm({
      title: 'Eliminar configuracion',
      description: `Seguro que deseas eliminar "${config.location}"? Los partidos que referencien esta configuracion no se veran afectados.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (confirmed) {
      deleteMutation.mutate(config.id)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error ?? updateMutation.error

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <ResponsiveSection
        title="Configuraciones"
        description="Configuraciones reutilizables para partidos y series"
        action={
          <button className="ui-button" onClick={openCreate}>
            Nueva configuracion
          </button>
        }
      >
        {configsQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando configuraciones...</p>}
        {configsQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar las configuraciones.</p>}
        {configsQuery.data && (
          <ResponsiveTable
            data={configsQuery.data}
            rowKey={(c) => c.id}
            emptyMessage="No hay configuraciones creadas."
            columns={[
              { key: 'location', label: 'Ubicacion', render: (c) => c.location },
              { key: 'target', label: 'Plantilla', render: (c) => c.targetPlayers },
              { key: 'duration', label: 'Duracion', render: (c) => `${c.durationMinutes} min` },
              { key: 'timezone', label: 'Zona horaria', render: (c) => c.timezone },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (c) => (
                  <div className="flex justify-end gap-1">
                    <button className="ui-icon-btn" onClick={() => openDetail(c)} title="Ver">
                      <Icon name="eye" size="sm" />
                    </button>
                    <button className="ui-icon-btn" onClick={() => openEdit(c)} title="Editar">
                      <Icon name="configs" size="sm" />
                    </button>
                    <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => handleDelete(c)} disabled={deleteMutation.isPending} title="Eliminar">
                      <Icon name="trash" size="sm" />
                    </button>
                  </div>
                ),
              },
            ]}
            renderMobileCard={(c) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{c.location}</p>
                <p className="ui-text-muted">Plantilla: {c.targetPlayers} jugadores</p>
                <p className="ui-text-muted">Duracion: {c.durationMinutes} min | {c.timezone}</p>
                {c.description && <p className="ui-text-muted">{c.description}</p>}
                <div className="flex gap-1">
                  <button className="ui-icon-btn" onClick={() => openDetail(c)} title="Ver">
                    <Icon name="eye" size="sm" />
                  </button>
                  <button className="ui-icon-btn" onClick={() => openEdit(c)} title="Editar">
                    <Icon name="configs" size="sm" />
                  </button>
                  <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => handleDelete(c)} disabled={deleteMutation.isPending} title="Eliminar">
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      {/* Create / Edit Modal */}
      <Modal
        open={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingConfig(null); setForm(emptyForm()); }}
        size="md"
        title={editingConfig ? 'Editar configuracion' : 'Nueva configuracion'}
        subtitle={editingConfig ? `Editando: ${editingConfig.location}` : 'Configuracion para partidos y series'}
      >
        <FormField label="Ubicacion">
          <input
            className="ui-input"
            placeholder="Cancha principal"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Plantilla objetivo">
            <input
              className="ui-input"
              type="number"
              min={1}
              value={form.targetPlayers}
              onChange={(e) => setForm({ ...form, targetPlayers: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })}
              required
            />
          </FormField>
          <FormField label="Duracion (minutos)">
            <input
              className="ui-input"
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })}
              required
            />
          </FormField>
        </div>

        <FormField label="Zona horaria">
          <select className="ui-input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} required>
            {timezoneOptions.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Descripcion (opcional)">
          <textarea
            className="ui-input"
            placeholder="Notas sobre la cancha, horario, etc."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </FormField>

        {mutationError && (
          <p className="text-sm text-[var(--danger)]">
            {getApiErrorMessage(mutationError, 'No se pudo guardar la configuracion.')}
          </p>
        )}

        <Modal.Footer>
          <button className="ui-button-muted" onClick={() => { setFormModalOpen(false); setEditingConfig(null); setForm(emptyForm()); }} title="Cancelar">
            <Icon name="x" size="sm" />
            <span>Cancelar</span>
          </button>
          <button className="ui-button" onClick={handleSubmit} disabled={isPending || !form.location.trim()} title={editingConfig ? 'Guardar cambios' : 'Crear configuracion'}>
            <Icon name="check" size="sm" />
            <span>{isPending ? 'Guardando...' : editingConfig ? 'Guardar cambios' : 'Crear configuracion'}</span>
          </button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      {viewingConfig && (
        <DetailModal
          open={detailModalOpen}
          onClose={() => { setDetailModalOpen(false); setViewingConfig(null); }}
          size="sm"
          title="Detalle de configuracion"
          subtitle={viewingConfig.location}
        >
          <DetailModal.Section title="Informacion general">
            <DetailModal.InfoRow label="Ubicacion" value={viewingConfig.location} />
            <DetailModal.InfoRow label="Plantilla objetivo" value={`${viewingConfig.targetPlayers} jugadores`} />
            <DetailModal.InfoRow label="Duracion" value={`${viewingConfig.durationMinutes} minutos`} />
            <DetailModal.InfoRow label="Zona horaria" value={viewingConfig.timezone} />
          </DetailModal.Section>

          {viewingConfig.description && (
            <>
              <DetailModal.Divider />
              <DetailModal.Section title="Descripcion">
                <p className="text-sm ui-text-muted">{viewingConfig.description}</p>
              </DetailModal.Section>
            </>
          )}

          <DetailModal.Divider />
          <DetailModal.Section title="Creada el">
            <p className="text-sm ui-text-muted">{new Date(viewingConfig.createdAt).toLocaleString()}</p>
          </DetailModal.Section>

          <Modal.Footer>
            <button className="ui-button-muted" onClick={() => { setDetailModalOpen(false); setViewingConfig(null); }} title="Cerrar">
              <Icon name="x" size="sm" />
              <span>Cerrar</span>
            </button>
            <button className="ui-button" onClick={() => { setDetailModalOpen(false); openEdit(viewingConfig); }} title="Editar">
              <Icon name="configs" size="sm" />
              <span>Editar</span>
            </button>
          </Modal.Footer>
        </DetailModal>
      )}
    </div>
  )
}
