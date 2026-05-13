import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { Modal } from '../../components/ui/Modal'
import { FormField } from '../../components/ui/FormField'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { GroupSelector } from '../../components/ui/GroupSelector'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../store/toast-store'

type RecurrenceType = 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY_DAY_OF_MONTH'

type SeriesRule = {
  recurrenceType: RecurrenceType
  dayOfWeek?: number
  intervalDays?: number
  dayOfMonth?: number
  startTime: string
}

type SeriesItem = {
  id: string
  createdByName?: string
  configId: string
  defaultTitle: string
  timezone: string
  targetGroupIds?: string[]
  targetGroups?: Array<{ id: string; name: string }>
  active: boolean
  startDate: string
  endDate?: string
  rules: SeriesRule[]
}

type MatchConfigItem = {
  id: string
  location?: string
  targetPlayers: number
  durationMinutes: number
  timezone: string
  description?: string
}

const weekdays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' },
  { value: 7, label: 'Domingo' },
]

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

type RuleFormItem = {
  id: string
  recurrenceType: RecurrenceType
  dayOfWeek?: number
  intervalDays?: number
  dayOfMonth?: number
  startTime: string
}

const DEFAULT_TARGET_PLAYERS = 14
const DEFAULT_DURATION_MINUTES = 90
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'

function createWeeklyRule(): RuleFormItem {
  return { id: crypto.randomUUID(), recurrenceType: 'WEEKLY', dayOfWeek: 7, startTime: '09:00' }
}

function ruleFromSeries(rule: SeriesRule): RuleFormItem {
  return {
    id: crypto.randomUUID(),
    recurrenceType: rule.recurrenceType,
    dayOfWeek: rule.dayOfWeek,
    intervalDays: rule.intervalDays,
    dayOfMonth: rule.dayOfMonth,
    startTime: rule.startTime,
  }
}

function describeRule(rule: SeriesRule) {
  if (rule.recurrenceType === 'WEEKLY') {
    const label = weekdays.find((day) => day.value === rule.dayOfWeek)?.label ?? `Dia ${rule.dayOfWeek}`
    return `Semanal: ${label} ${rule.startTime}`
  }
  if (rule.recurrenceType === 'EVERY_N_DAYS') {
    return `Cada ${rule.intervalDays ?? '?'} dias a las ${rule.startTime}`
  }
  return `Mensual: dia ${rule.dayOfMonth ?? '?'} a las ${rule.startTime}`
}

function describeDraftRule(rule: RuleFormItem) {
  if (rule.recurrenceType === 'WEEKLY') {
    const label = weekdays.find((day) => day.value === rule.dayOfWeek)?.label ?? `Dia ${rule.dayOfWeek}`
    return `Cada ${label} a las ${rule.startTime}`
  }
  if (rule.recurrenceType === 'EVERY_N_DAYS') {
    return `Cada ${rule.intervalDays ?? '?'} dias a las ${rule.startTime}`
  }
  return `Dia ${rule.dayOfMonth ?? '?'} de cada mes a las ${rule.startTime}`
}

function emptyForm() {
  return {
    defaultTitle: '',
    timezone: DEFAULT_TIMEZONE,
    targetGroupIds: [] as string[],
    rules: [createWeeklyRule()] as RuleFormItem[],
    configLocation: '',
    configTargetPlayers: DEFAULT_TARGET_PLAYERS,
    configDurationMinutes: DEFAULT_DURATION_MINUTES,
    configTimezone: DEFAULT_TIMEZONE,
  }
}

export function SeriesPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingSeries, setEditingSeries] = useState<SeriesItem | null>(null)
  const [form, setForm] = useState(emptyForm())

  const seriesQuery = useQuery({
    queryKey: ['series'],
    queryFn: async () => (await apiClient.get<SeriesItem[]>('/api/v1/series')).data,
  })

  const configsQuery = useQuery({
    queryKey: ['configs'],
    queryFn: async () => (await apiClient.get<MatchConfigItem[]>('/api/v1/configs')).data,
  })

  const buildRulesPayload = () =>
    form.rules.map((rule) => ({
      recurrenceType: rule.recurrenceType,
      dayOfWeek: rule.recurrenceType === 'WEEKLY' ? rule.dayOfWeek : null,
      intervalDays: rule.recurrenceType === 'EVERY_N_DAYS' ? rule.intervalDays : null,
      dayOfMonth: rule.recurrenceType === 'MONTHLY_DAY_OF_MONTH' ? rule.dayOfMonth : null,
      startTime: rule.startTime,
    }))

  const resetForm = () => {
    setEditingSeries(null)
    setForm(emptyForm())
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const configResponse = await apiClient.post<MatchConfigItem>('/api/v1/configs', {
        location: form.configLocation || null,
        targetPlayers: form.configTargetPlayers,
        durationMinutes: form.configDurationMinutes,
        timezone: form.timezone,
      })
      await apiClient.post('/api/v1/series', {
        configId: configResponse.data.id,
        defaultTitle: form.defaultTitle,
        timezone: form.timezone,
        targetGroupIds: form.targetGroupIds,
        rules: buildRulesPayload(),
      })
    },
    onSuccess: () => {
      addToast('success', 'Serie creada correctamente')
      queryClient.invalidateQueries({ queryKey: ['series'] })
      setFormModalOpen(false)
      resetForm()
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear la serie')),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { configId?: string; defaultTitle: string; timezone: string; targetGroupIds: string[]; rules: ReturnType<typeof buildRulesPayload>; active?: boolean }) => {
      await apiClient.put(`/api/v1/series/${editingSeries!.id}`, data)
    },
    onSuccess: () => {
      addToast('success', 'Serie actualizada')
      queryClient.invalidateQueries({ queryKey: ['series'] })
      setFormModalOpen(false)
      resetForm()
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo actualizar la serie')),
  })

  const deactivateMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      await apiClient.delete(`/api/v1/series/${seriesId}`)
    },
    onSuccess: () => {
      addToast('success', 'Serie desactivada')
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo desactivar la serie')),
  })

  const openCreate = () => {
    setEditingSeries(null)
    setForm(emptyForm())
    setFormModalOpen(true)
  }

  const openEdit = (series: SeriesItem) => {
    setEditingSeries(series)
    const config = configsQuery.data?.find((c) => c.id === series.configId)
    setForm({
      defaultTitle: series.defaultTitle,
      timezone: series.timezone,
      targetGroupIds: series.targetGroupIds ?? [],
      rules: series.rules.length > 0 ? series.rules.map(ruleFromSeries) : [createWeeklyRule()],
      configLocation: config?.location ?? '',
      configTargetPlayers: config?.targetPlayers ?? DEFAULT_TARGET_PLAYERS,
      configDurationMinutes: config?.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      configTimezone: config?.timezone ?? DEFAULT_TIMEZONE,
    })
    setFormModalOpen(true)
  }

  const reactivateSeries = (series: SeriesItem) => {
    updateMutation.mutate({
      configId: series.configId,
      defaultTitle: series.defaultTitle,
      timezone: series.timezone,
      targetGroupIds: series.targetGroupIds ?? [],
      rules: series.rules.map((rule) => ({
        recurrenceType: rule.recurrenceType,
        dayOfWeek: rule.recurrenceType === 'WEEKLY' ? rule.dayOfWeek : null,
        intervalDays: rule.recurrenceType === 'EVERY_N_DAYS' ? rule.intervalDays : null,
        dayOfMonth: rule.recurrenceType === 'MONTHLY_DAY_OF_MONTH' ? rule.dayOfMonth : null,
        startTime: rule.startTime,
      })),
      active: true,
    })
  }

  const handleSubmit = () => {
    if (editingSeries) {
      updateMutation.mutate({
        configId: editingSeries.configId,
        defaultTitle: form.defaultTitle,
        timezone: form.timezone,
        targetGroupIds: form.targetGroupIds,
        rules: buildRulesPayload(),
      })
    } else {
      createMutation.mutate()
    }
  }

  const updateRule = (ruleId: string, update: Partial<RuleFormItem>) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => (rule.id === ruleId ? { ...rule, ...update } : rule)),
    }))
  }

  const toggleGroup = (groupId: string) => {
    setForm((prev) => ({
      ...prev,
      targetGroupIds: prev.targetGroupIds.includes(groupId)
        ? prev.targetGroupIds.filter((id) => id !== groupId)
        : [...prev.targetGroupIds, groupId],
    }))
  }

  const changeRuleType = (ruleId: string, recurrenceType: RecurrenceType) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id !== ruleId) return rule
        if (recurrenceType === 'WEEKLY') {
          return { ...rule, recurrenceType, dayOfWeek: rule.dayOfWeek ?? 1, intervalDays: undefined, dayOfMonth: undefined }
        }
        if (recurrenceType === 'EVERY_N_DAYS') {
          return { ...rule, recurrenceType, intervalDays: rule.intervalDays ?? 7, dayOfWeek: undefined, dayOfMonth: undefined }
        }
        return { ...rule, recurrenceType, dayOfMonth: rule.dayOfMonth ?? 1, dayOfWeek: undefined, intervalDays: undefined }
      }),
    }))
  }

  const removeRule = (ruleId: string) => {
    if (form.rules.length <= 1) return
    setForm((prev) => ({ ...prev, rules: prev.rules.filter((r) => r.id !== ruleId) }))
  }

  const addRule = () => {
    setForm((prev) => ({ ...prev, rules: [...prev.rules, createWeeklyRule()] }))
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error ?? updateMutation.error

  return (
    <div className="space-y-6">
      <ResponsiveSection
        title="Series recurrentes"
        description="Configura reglas semanales, cada N dias o mensual por dia del mes"
        action={
          <button className="ui-button" onClick={openCreate} title="Nueva serie">
            <Icon name="user-plus" size="sm" />
            <span>Nueva serie</span>
          </button>
        }
      >
        {seriesQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando series...</p>}
        {seriesQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar las series.</p>}
        {seriesQuery.data && (
          <ResponsiveTable
            data={seriesQuery.data}
            rowKey={(series) => series.id}
            emptyMessage="No hay series registradas."
            columns={[
              { key: 'name', label: 'Nombre', render: (series) => series.defaultTitle },
              { key: 'period', label: 'Periodo', render: (series) => `${series.startDate} - ${series.endDate ?? 'En curso'}` },
              { key: 'groups', label: 'Grupos', render: (series) =>
                series.targetGroups && series.targetGroups.length > 0
                  ? series.targetGroups.map((group) => group.name).join(', ')
                  : 'Todos'
              },
              { key: 'creator', label: 'Creado por', render: (series) => series.createdByName ?? '-' },
              { key: 'rule', label: 'Reglas', render: (series) => series.rules.map((rule) => describeRule(rule)).join(' | ') },
              { key: 'status', label: 'Estado', render: (series) => (
                <span className={`ui-badge ${series.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {series.active ? 'Activa' : 'Inactiva'}
                </span>
              )},
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (series) => (
                  <div className="flex justify-end gap-1">
                    <button className="ui-icon-btn" onClick={() => openEdit(series)} title="Editar">
                      <Icon name="eye" size="sm" />
                    </button>
                    {series.active ? (
                      <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => deactivateMutation.mutate(series.id)} disabled={deactivateMutation.isPending} title="Desactivar">
                        <Icon name="x" size="sm" />
                      </button>
                    ) : (
                      <button className="ui-icon-btn" onClick={() => reactivateSeries(series)} disabled={updateMutation.isPending} title="Reactivar">
                        <Icon name="check" size="sm" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            renderMobileCard={(series) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{series.defaultTitle}</p>
                <p className="ui-text-muted">{series.startDate} - {series.endDate ?? 'En curso'}</p>
                <p className="ui-text-muted">Grupos: {series.targetGroups && series.targetGroups.length > 0 ? series.targetGroups.map((g) => g.name).join(', ') : 'Todos'}</p>
                <div className="ui-card p-2 text-sm">
                  {series.rules.map((rule, i) => <p key={`${series.id}-${i}`}>{describeRule(rule)}</p>)}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <button className="ui-icon-btn" onClick={() => openEdit(series)} title="Editar">
                    <Icon name="eye" size="sm" />
                  </button>
                  {series.active ? (
                    <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => deactivateMutation.mutate(series.id)} title="Desactivar">
                      <Icon name="x" size="sm" />
                    </button>
                  ) : (
                    <button className="ui-icon-btn" onClick={() => reactivateSeries(series)} title="Reactivar">
                      <Icon name="check" size="sm" />
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      {/* Create / Edit Modal */}
      <Modal
        open={formModalOpen}
        onClose={() => { setFormModalOpen(false); resetForm(); }}
        size="lg"
        title={editingSeries ? 'Editar serie' : 'Nueva serie recurrente'}
        subtitle={editingSeries ? `Editando: ${editingSeries.defaultTitle}` : 'Configura reglas de recurrencia para partidos automaticos'}
      >
        {/* Series data */}
        <div className="ui-detail-section">
          <p className="ui-detail-section-title">Datos de la serie</p>
          <FormField label="Nombre de la serie">
            <input
              className="ui-input"
              placeholder="Ej: Liga domingo maniana"
              value={form.defaultTitle}
              onChange={(e) => setForm({ ...form, defaultTitle: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Zona horaria">
            <select className="ui-input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} required>
              {timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </FormField>
        </div>

        <hr className="ui-section-divider" />

        {/* Config */}
        <div className="ui-detail-section">
          <p className="ui-detail-section-title">Configuracion de plantilla</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ubicacion">
              <input className="ui-input" placeholder="Cancha principal" value={form.configLocation} onChange={(e) => setForm({ ...form, configLocation: e.target.value })} required />
            </FormField>
            <FormField label="Plantilla objetivo">
              <input className="ui-input" type="number" min={1} value={form.configTargetPlayers} onChange={(e) => setForm({ ...form, configTargetPlayers: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })} required />
            </FormField>
            <FormField label="Duracion (minutos)">
              <input className="ui-input" type="number" min={1} value={form.configDurationMinutes} onChange={(e) => setForm({ ...form, configDurationMinutes: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })} required />
            </FormField>
          </div>
        </div>

        <hr className="ui-section-divider" />

        {/* Groups */}
        <div className="ui-detail-section">
          <p className="ui-detail-section-title">Grupos objetivo</p>
          <p className="ui-form-hint mb-2">Opcional. Si no seleccionas grupos, los partidos notificaran a todos los jugadores activos.</p>
          <GroupSelector selectedGroupIds={form.targetGroupIds} onToggleGroup={toggleGroup} />
        </div>

        <hr className="ui-section-divider" />

        {/* Rules */}
        <div className="ui-detail-section">
          <p className="ui-detail-section-title">Reglas de recurrencia ({form.rules.length})</p>
          <div className="space-y-3">
            {form.rules.map((rule, index) => (
              <div key={rule.id} className="ui-muted-surface grid grid-cols-1 gap-2 p-3 md:grid-cols-6">
                <div>
                  <label className="ui-form-label">Tipo</label>
                  <select className="ui-input" value={rule.recurrenceType} onChange={(e) => changeRuleType(rule.id, e.target.value as RecurrenceType)}>
                    <option value="WEEKLY">Semanal</option>
                    <option value="EVERY_N_DAYS">Cada N dias</option>
                    <option value="MONTHLY_DAY_OF_MONTH">Mensual por dia</option>
                  </select>
                </div>
                {rule.recurrenceType === 'WEEKLY' && (
                  <div>
                    <label className="ui-form-label">Dia</label>
                    <select className="ui-input" value={rule.dayOfWeek ?? 1} onChange={(e) => updateRule(rule.id, { dayOfWeek: Number(e.target.value) })}>
                      {weekdays.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                )}
                {rule.recurrenceType === 'EVERY_N_DAYS' && (
                  <div>
                    <label className="ui-form-label">Cada N dias</label>
                    <input className="ui-input" type="number" min={1} value={rule.intervalDays ?? 7} onChange={(e) => updateRule(rule.id, { intervalDays: Number(e.target.value) })} />
                  </div>
                )}
                {rule.recurrenceType === 'MONTHLY_DAY_OF_MONTH' && (
                  <div>
                    <label className="ui-form-label">Dia del mes</label>
                    <input className="ui-input" type="number" min={1} max={31} value={rule.dayOfMonth ?? 1} onChange={(e) => updateRule(rule.id, { dayOfMonth: Number(e.target.value) })} />
                  </div>
                )}
                <div>
                  <label className="ui-form-label">Hora</label>
                  <DateTimeField type="time" value={rule.startTime} onChange={(e) => updateRule(rule.id, { startTime: e.target.value })} required />
                </div>
                <div className="ui-muted-surface flex items-center rounded-lg px-3 py-2 md:col-span-1">
                  <div>
                    <p className="text-xs font-medium">Regla #{index + 1}</p>
                    <p className="ui-text-muted text-xs">{describeDraftRule(rule)}</p>
                  </div>
                </div>
                <div className="flex items-end justify-end md:col-span-1">
                  <button className="ui-icon-btn ui-icon-btn-danger" type="button" disabled={form.rules.length === 1} onClick={() => removeRule(rule.id)} title="Quitar regla">
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="ui-button-muted mt-3" type="button" onClick={addRule} title="Agregar regla">
            <Icon name="user-plus" size="sm" />
            <span>Agregar regla</span>
          </button>
        </div>

        {mutationError && (
          <p className="text-sm text-[var(--danger)]">
            {getApiErrorMessage(mutationError, editingSeries ? 'No se pudo actualizar la serie.' : 'No se pudo crear la serie.')}
          </p>
        )}

        <Modal.Footer>
          <button className="ui-button-muted" onClick={() => { setFormModalOpen(false); resetForm(); }} title="Cancelar">
            <Icon name="x" size="sm" />
            <span>Cancelar</span>
          </button>
          <button className="ui-button" onClick={handleSubmit} disabled={isPending} title={editingSeries ? 'Guardar cambios' : 'Crear serie'}>
            <Icon name="check" size="sm" />
            <span>{isPending ? 'Guardando...' : editingSeries ? 'Guardar cambios' : 'Crear serie'}</span>
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
