import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ui-text-muted mb-1 block text-xs">{label}</label>
      {children}
    </div>
  )
}

export function ConfigsPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()

  const [location, setLocation] = useState('')
  const [targetPlayers, setTargetPlayers] = useState(14)
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const configsQuery = useQuery({
    queryKey: ['configs'],
    queryFn: async () => (await apiClient.get<MatchConfigItem[]>('/api/v1/configs')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/configs', {
        location: location.trim(),
        targetPlayers,
        durationMinutes,
        timezone,
        description: description.trim() || null,
      })
    },
    onSuccess: () => {
      setLocation('')
      setTargetPlayers(14)
      setDurationMinutes(90)
      setDescription('')
      addToast('success', 'Configuracion creada')
      queryClient.invalidateQueries({ queryKey: ['configs'] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear la configuracion')),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await apiClient.put(`/api/v1/configs/${id}`, {
        location: location.trim(),
        targetPlayers,
        durationMinutes,
        timezone,
        description: description.trim() || null,
      })
    },
    onSuccess: () => {
      setEditingId(null)
      resetForm()
      addToast('success', 'Configuracion actualizada')
      queryClient.invalidateQueries({ queryKey: ['configs'] })
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
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar la configuracion')),
  })

  function resetForm() {
    setLocation('')
    setTargetPlayers(14)
    setDurationMinutes(90)
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota')
    setDescription('')
    setEditingId(null)
  }

  function startEdit(config: MatchConfigItem) {
    setEditingId(config.id)
    setLocation(config.location ?? '')
    setTargetPlayers(config.targetPlayers)
    setDurationMinutes(config.durationMinutes)
    setTimezone(config.timezone)
    setDescription(config.description ?? '')
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingId) {
      updateMutation.mutate({ id: editingId })
    } else {
      createMutation.mutate()
    }
  }

  const handleDelete = async (config: MatchConfigItem) => {
    const confirmed = await requestConfirm({
      title: 'Eliminar configuracion',
      description: `Seguro que deseas eliminar la configuracion "${config.location}"? Los partidos que referencien esta configuracion no se veran afectados.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (confirmed) {
      deleteMutation.mutate(config.id)
    }
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <ResponsiveSection
        title={editingId ? 'Editar configuracion' : 'Crear configuracion'}
        description="Configuraciones reutilizables para partidos y series"
      >
        <form className="mt-4 space-y-5" onSubmit={onSubmit}>
          <div className="ui-section-card space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField label="Ubicacion">
                <input
                  className="ui-input"
                  placeholder="Cancha principal"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Plantilla objetivo">
                <input
                  className="ui-input"
                  type="number"
                  min={1}
                  value={targetPlayers}
                  onChange={(e) => setTargetPlayers(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                  required
                />
              </FormField>
              <FormField label="Duracion (minutos)">
                <input
                  className="ui-input"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                  required
                />
              </FormField>
              <FormField label="Zona horaria">
                <select className="ui-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} required>
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Descripcion (opcional)">
                  <textarea
                    className="ui-input"
                    placeholder="Notas sobre la cancha, horario, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="ui-button" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId
                ? updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'
                : createMutation.isPending ? 'Creando...' : 'Crear configuracion'}
            </button>
            {editingId && (
              <button type="button" className="ui-button-muted" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-[var(--danger)]">
              {getApiErrorMessage(createMutation.error ?? updateMutation.error, 'No se pudo guardar la configuracion.')}
            </p>
          )}
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Configuraciones" description="Configuraciones reutilizables para partidos y series">
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
                  <div className="flex justify-end gap-2">
                    <button className="ui-button-muted" onClick={() => startEdit(c)}>Editar</button>
                    <button className="ui-button-muted" onClick={() => handleDelete(c)} disabled={deleteMutation.isPending}>
                      Eliminar
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
                <div className="flex gap-2">
                  <button className="ui-button-muted" onClick={() => startEdit(c)}>Editar</button>
                  <button className="ui-button-muted" onClick={() => handleDelete(c)} disabled={deleteMutation.isPending}>
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>
    </div>
  )
}