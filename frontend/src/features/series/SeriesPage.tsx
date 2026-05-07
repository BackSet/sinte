import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { GroupSelector } from '../../components/ui/GroupSelector'

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

function createWeeklyRule(): RuleFormItem {
  return {
    id: crypto.randomUUID(),
    recurrenceType: 'WEEKLY',
    dayOfWeek: 7,
    startTime: '09:00',
  }
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
  let desc = ''
  if (rule.recurrenceType === 'WEEKLY') {
    const label = weekdays.find((day) => day.value === rule.dayOfWeek)?.label ?? `Dia ${rule.dayOfWeek}`
    desc = `Semanal: ${label} ${rule.startTime}`
  } else if (rule.recurrenceType === 'EVERY_N_DAYS') {
    desc = `Cada ${rule.intervalDays ?? '?'} dias a las ${rule.startTime}`
  } else {
    desc = `Mensual: dia ${rule.dayOfMonth ?? '?'} a las ${rule.startTime}`
  }
  return desc
}

function describeDraftRule(rule: RuleFormItem) {
  if (rule.recurrenceType === 'WEEKLY') {
    const label = weekdays.find((day) => day.value === rule.dayOfWeek)?.label ?? `Dia ${rule.dayOfWeek}`
    return `Se repetira cada ${label} a las ${rule.startTime}`
  }
  if (rule.recurrenceType === 'EVERY_N_DAYS') {
    return `Se repetira cada ${rule.intervalDays ?? '?'} dias a las ${rule.startTime}`
  }
  return `Se repetira el dia ${rule.dayOfMonth ?? '?'} de cada mes a las ${rule.startTime}`
}

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'

export function SeriesPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [defaultTitle, setDefaultTitle] = useState('')
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([])
  const [rules, setRules] = useState<RuleFormItem[]>([createWeeklyRule()])
  const [configLocation, setConfigLocation] = useState('')
  const [configTargetPlayers, setConfigTargetPlayers] = useState(DEFAULT_TARGET_PLAYERS)
  const [configDurationMinutes, setConfigDurationMinutes] = useState(DEFAULT_DURATION_MINUTES)
  const [configTimezone, setConfigTimezone] = useState(DEFAULT_TIMEZONE)

  const seriesQuery = useQuery({
    queryKey: ['series'],
    queryFn: async () => (await apiClient.get<SeriesItem[]>('/api/v1/series')).data,
  })

  const configsQuery = useQuery({
    queryKey: ['configs'],
    queryFn: async () => (await apiClient.get<MatchConfigItem[]>('/api/v1/configs')).data,
  })

  const buildRulesPayload = () =>
    rules.map((rule) => ({
      recurrenceType: rule.recurrenceType,
      dayOfWeek: rule.recurrenceType === 'WEEKLY' ? rule.dayOfWeek : null,
      intervalDays: rule.recurrenceType === 'EVERY_N_DAYS' ? rule.intervalDays : null,
      dayOfMonth: rule.recurrenceType === 'MONTHLY_DAY_OF_MONTH' ? rule.dayOfMonth : null,
      startTime: rule.startTime,
    }))

  const resetForm = () => {
    setEditingId(null)
    setDefaultTitle('')
    setTimezone(DEFAULT_TIMEZONE)
    setTargetGroupIds([])
    setRules([createWeeklyRule()])
    setConfigLocation('')
    setConfigTargetPlayers(DEFAULT_TARGET_PLAYERS)
    setConfigDurationMinutes(DEFAULT_DURATION_MINUTES)
    setConfigTimezone(DEFAULT_TIMEZONE)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const configResponse = await apiClient.post<MatchConfigItem>('/api/v1/configs', {
        location: configLocation || null,
        targetPlayers: configTargetPlayers,
        durationMinutes: configDurationMinutes,
        timezone: configTimezone,
      })
      const configId = configResponse.data.id
      await apiClient.post('/api/v1/series', {
        configId,
        defaultTitle,
        timezone,
        targetGroupIds,
        rules: buildRulesPayload(),
      })
    },
    onSuccess: () => {
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      seriesId: string
      data: {
        configId?: string
        defaultTitle: string
        timezone: string
        targetGroupIds: string[]
        rules: ReturnType<typeof buildRulesPayload>
        active?: boolean
      }
    }) => {
      await apiClient.put(`/api/v1/series/${payload.seriesId}`, payload.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      await apiClient.delete(`/api/v1/series/${seriesId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }),
  })

  const startEditing = (series: SeriesItem) => {
    setEditingId(series.id)
    setDefaultTitle(series.defaultTitle)
    setTimezone(series.timezone)
    setTargetGroupIds(series.targetGroupIds ?? [])
    setRules(series.rules.length > 0 ? series.rules.map(ruleFromSeries) : [createWeeklyRule()])
    const config = configsQuery.data?.find((c) => c.id === series.configId)
    if (config) {
      setConfigLocation(config.location ?? '')
      setConfigTargetPlayers(config.targetPlayers)
      setConfigDurationMinutes(config.durationMinutes)
      setConfigTimezone(config.timezone)
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const reactivateSeries = (series: SeriesItem) => {
    updateMutation.mutate({
      seriesId: series.id,
      data: {
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
      },
    })
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingId) {
      const series = seriesQuery.data?.find((s) => s.id === editingId)
      updateMutation.mutate(
        {
          seriesId: editingId,
          data: {
            configId: series?.configId,
            defaultTitle,
            timezone,
            targetGroupIds,
            rules: buildRulesPayload(),
          },
        },
        {
          onSuccess: () => {
            resetForm()
          },
        },
      )
      return
    }
    createMutation.mutate()
  }

  const updateRule = (ruleId: string, update: Partial<RuleFormItem>) => {
    setRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...update,
            }
          : rule,
      ),
    )
  }

  const toggleGroup = (groupId: string) => {
    setTargetGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    )
  }

  const changeRuleType = (ruleId: string, recurrenceType: RecurrenceType) => {
    setRules((currentRules) =>
      currentRules.map((rule) => {
        if (rule.id !== ruleId) return rule
        if (recurrenceType === 'WEEKLY') {
          return { ...rule, recurrenceType, dayOfWeek: rule.dayOfWeek ?? 1, intervalDays: undefined, dayOfMonth: undefined }
        }
        if (recurrenceType === 'EVERY_N_DAYS') {
          return { ...rule, recurrenceType, intervalDays: rule.intervalDays ?? 7, dayOfWeek: undefined, dayOfMonth: undefined }
        }
        return { ...rule, recurrenceType, dayOfMonth: rule.dayOfMonth ?? 1, dayOfWeek: undefined, intervalDays: undefined }
      }),
    )
  }

  const isEditing = editingId !== null
  const formMutation = isEditing ? updateMutation : createMutation
  const submitLabel = isEditing
    ? updateMutation.isPending
      ? 'Guardando...'
      : 'Guardar cambios'
    : createMutation.isPending
      ? 'Creando...'
      : 'Crear serie'

  return (
    <div className="space-y-6">
      <ResponsiveSection
        title={isEditing ? 'Editar serie' : 'Crear serie recurrente'}
        description={
          isEditing
            ? 'Actualiza los datos y reglas de la serie. Los partidos ya generados no se modifican.'
            : 'Configura reglas semanales, cada N dias o mensual por dia del mes'
        }
      >
        <form className="mt-4 space-y-5" onSubmit={onSubmit}>
          <div className="ui-section-card space-y-3">
            <div className="ui-section-header">
              <h3>Datos de la serie</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="ui-text-muted mb-1 block text-xs">Nombre de la serie</label>
                <input className="ui-input" placeholder="Ej: Liga domingo maniana" value={defaultTitle} onChange={(e) => setDefaultTitle(e.target.value)} required />
              </div>
              <div>
                <label className="ui-text-muted mb-1 block text-xs">Zona horaria</label>
                <select className="ui-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} required>
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="ui-section-card space-y-3">
            <div className="ui-section-header">
              <h3>Configuracion de plantilla</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="ui-text-muted mb-1 block text-xs">Ubicacion</label>
                <input
                  className="ui-input"
                  placeholder="Cancha principal"
                  value={configLocation}
                  onChange={(e) => setConfigLocation(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="ui-text-muted mb-1 block text-xs">Plantilla objetivo</label>
                <input
                  className="ui-input"
                  type="number"
                  min={1}
                  value={configTargetPlayers}
                  onChange={(e) => setConfigTargetPlayers(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                  required
                />
              </div>
              <div>
                <label className="ui-text-muted mb-1 block text-xs">Duracion (minutos)</label>
                <input
                  className="ui-input"
                  type="number"
                  min={1}
                  value={configDurationMinutes}
                  onChange={(e) => setConfigDurationMinutes(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                  required
                />
              </div>
              <div>
                <label className="ui-text-muted mb-1 block text-xs">Zona horaria de config</label>
                <select className="ui-input" value={configTimezone} onChange={(e) => setConfigTimezone(e.target.value)} required>
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="ui-section-card space-y-3">
            <div className="ui-section-header">
              <h3>Grupos objetivo</h3>
              <p>Opcional</p>
            </div>
            <GroupSelector
              selectedGroupIds={targetGroupIds}
              onToggleGroup={toggleGroup}
            />
            <p className="ui-text-muted text-xs">
              Si no seleccionas grupos, los partidos generados notificaran a todos los jugadores activos.
            </p>
          </div>

          <div className="ui-section-card space-y-3">
            <div className="ui-section-header">
              <h3>Reglas de recurrencia</h3>
              <p>{rules.length} regla{rules.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={rule.id} className="ui-muted-surface grid grid-cols-1 gap-2 p-3 md:grid-cols-6">
                  <div>
                    <label className="ui-text-muted mb-1 block text-xs">Tipo</label>
                    <select
                      className="ui-input"
                      value={rule.recurrenceType}
                      onChange={(e) => changeRuleType(rule.id, e.target.value as RecurrenceType)}
                    >
                      <option value="WEEKLY">Semanal</option>
                      <option value="EVERY_N_DAYS">Cada N dias</option>
                      <option value="MONTHLY_DAY_OF_MONTH">Mensual por dia</option>
                    </select>
                  </div>

                  {rule.recurrenceType === 'WEEKLY' && (
                    <div>
                      <label className="ui-text-muted mb-1 block text-xs">Dia</label>
                      <select
                        className="ui-input"
                        value={rule.dayOfWeek ?? 1}
                        onChange={(e) => updateRule(rule.id, { dayOfWeek: Number(e.target.value) })}
                      >
                        {weekdays.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {rule.recurrenceType === 'EVERY_N_DAYS' && (
                    <div>
                      <label className="ui-text-muted mb-1 block text-xs">Cada N dias</label>
                      <input
                        className="ui-input"
                        type="number"
                        min={1}
                        value={rule.intervalDays ?? 7}
                        onChange={(e) => updateRule(rule.id, { intervalDays: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  {rule.recurrenceType === 'MONTHLY_DAY_OF_MONTH' && (
                    <div>
                      <label className="ui-text-muted mb-1 block text-xs">Dia del mes</label>
                      <input
                        className="ui-input"
                        type="number"
                        min={1}
                        max={31}
                        value={rule.dayOfMonth ?? 1}
                        onChange={(e) => updateRule(rule.id, { dayOfMonth: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  <div>
                    <label className="ui-text-muted mb-1 block text-xs">Hora</label>
                    <DateTimeField
                      type="time"
                      value={rule.startTime}
                      onChange={(e) => updateRule(rule.id, { startTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ui-muted-surface flex items-center rounded-lg px-3 py-2 md:col-span-1">
                    <div>
                      <p className="text-xs font-medium">Regla #{index + 1}</p>
                      <p className="ui-text-muted text-xs">{describeDraftRule(rule)}</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-end md:col-span-1">
                    <button
                      className="ui-button-muted"
                      type="button"
                      disabled={rules.length === 1}
                      onClick={() =>
                        setRules((currentRules) => currentRules.filter((existingRule) => existingRule.id !== rule.id))
                      }
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="ui-button-muted"
              type="button"
              onClick={() => setRules((currentRules) => [...currentRules, createWeeklyRule()])}
            >
              + Agregar regla
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="ui-button" type="submit" disabled={formMutation.isPending}>
              {submitLabel}
            </button>
            {isEditing && (
              <button className="ui-button-muted" type="button" onClick={resetForm} disabled={updateMutation.isPending}>
                Cancelar edicion
              </button>
            )}
          </div>
          {formMutation.isError && (
            <p className="text-sm text-[var(--danger)]">
              {getApiErrorMessage(
                formMutation.error,
                isEditing ? 'No se pudo actualizar la serie.' : 'No se pudo crear la serie.',
              )}
            </p>
          )}
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Series creadas">
        {seriesQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando series...</p>}
        {seriesQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar las series.</p>}
        {seriesQuery.data && (
          <ResponsiveTable
            data={seriesQuery.data}
            rowKey={(series) => series.id}
            emptyMessage="No hay series registradas."
            columns={[
              { key: 'name', label: 'Nombre', render: (series) => series.defaultTitle },
              {
                key: 'period',
                label: 'Periodo',
                render: (series) => `${series.startDate} - ${series.endDate ?? 'En curso'}`,
              },
              {
                key: 'groups',
                label: 'Grupos',
                render: (series) =>
                  series.targetGroups && series.targetGroups.length > 0
                    ? series.targetGroups.map((group) => group.name).join(', ')
                    : 'Todos',
              },
              { key: 'creator', label: 'Creado por', render: (series) => series.createdByName ?? '-' },
              {
                key: 'rule',
                label: 'Reglas',
                render: (series) => series.rules.map((rule) => describeRule(rule)).join(' | '),
              },
              { key: 'status', label: 'Estado', render: (series) => (series.active ? 'Activa' : 'Inactiva') },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (series) => (
                  <div className="space-x-2">
                    <button className="ui-button-muted" onClick={() => startEditing(series)}>
                      Editar
                    </button>
                    {series.active ? (
                      <button
                        className="ui-button-muted"
                        onClick={() => deactivateMutation.mutate(series.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        {deactivateMutation.isPending ? 'Desactivando...' : 'Desactivar'}
                      </button>
                    ) : (
                      <button
                        className="ui-button-muted"
                        onClick={() => reactivateSeries(series)}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Reactivando...' : 'Reactivar'}
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            renderMobileCard={(series) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{series.defaultTitle}</p>
                <p className="ui-text-muted">
                  {series.startDate} - {series.endDate ?? 'En curso'}
                </p>
                <p className="ui-text-muted">
                  Grupos objetivo: {series.targetGroups && series.targetGroups.length > 0 ? series.targetGroups.map((group) => group.name).join(', ') : 'Todos'}
                </p>
                <div className="ui-card p-2 text-sm">
                  {series.rules.map((rule, i) => (
                    <p key={`${series.id}-${i}`}>
                      {describeRule(rule)}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="ui-button-muted" onClick={() => startEditing(series)}>
                    Editar
                  </button>
                  {series.active ? (
                    <button className="ui-button-muted" onClick={() => deactivateMutation.mutate(series.id)}>
                      Desactivar
                    </button>
                  ) : (
                    <button className="ui-button-muted" onClick={() => reactivateSeries(series)}>
                      Reactivar
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>
      {(deactivateMutation.isError || updateMutation.isError) && (
        <p className="text-sm text-[var(--danger)]">
          {getApiErrorMessage(
            deactivateMutation.error ?? updateMutation.error,
            'No se pudo completar la accion sobre la serie.',
          )}
        </p>
      )}
    </div>
  )
}