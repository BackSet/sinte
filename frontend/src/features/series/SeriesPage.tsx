import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { StatusBadge } from '../../components/ui/StatusBadge'

type RecurrenceType = 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY_DAY_OF_MONTH'

type SeriesItem = {
  id: string
  createdByName?: string
  name: string
  timezone: string
  location?: string
  targetPlayers?: number
  targetGroupIds?: string[]
  targetGroups?: Array<{ id: string; name: string }>
  active: boolean
  startDate: string
  endDate?: string
  rules: Array<{
    recurrenceType: RecurrenceType
    dayOfWeek?: number
    intervalDays?: number
    dayOfMonth?: number
    startTime: string
  }>
}

type GroupItem = {
  id: string
  name: string
  active: boolean
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

function createWeeklyRule(): RuleFormItem {
  return {
    id: crypto.randomUUID(),
    recurrenceType: 'WEEKLY',
    dayOfWeek: 7,
    startTime: '09:00',
  }
}

function describeRule(rule: SeriesItem['rules'][number]) {
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
    return `Se repetira cada ${label} a las ${rule.startTime}`
  }
  if (rule.recurrenceType === 'EVERY_N_DAYS') {
    return `Se repetira cada ${rule.intervalDays ?? '?'} dias a las ${rule.startTime}`
  }
  return `Se repetira el dia ${rule.dayOfMonth ?? '?'} de cada mes a las ${rule.startTime}`
}

export function SeriesPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('America/Bogota')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [targetPlayers, setTargetPlayers] = useState(14)
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([])
  const [rules, setRules] = useState<RuleFormItem[]>([createWeeklyRule()])
  const [generateFrom, setGenerateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [generateTo, setGenerateTo] = useState(() => {
    const toDate = new Date()
    toDate.setDate(toDate.getDate() + 30)
    return toDate.toISOString().slice(0, 10)
  })

  const seriesQuery = useQuery({
    queryKey: ['series'],
    queryFn: async () => (await apiClient.get<SeriesItem[]>('/api/v1/series')).data,
  })

  const groupsQuery = useQuery({
    queryKey: ['groups-for-series'],
    queryFn: async () => (await apiClient.get<GroupItem[]>('/api/v1/groups')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/series', {
        name,
        timezone,
        location: location || null,
        targetPlayers,
        targetGroupIds,
        startDate,
        endDate: endDate || null,
        rules: rules.map((rule) => ({
          recurrenceType: rule.recurrenceType,
          dayOfWeek: rule.recurrenceType === 'WEEKLY' ? rule.dayOfWeek : null,
          intervalDays: rule.recurrenceType === 'EVERY_N_DAYS' ? rule.intervalDays : null,
          dayOfMonth: rule.recurrenceType === 'MONTHLY_DAY_OF_MONTH' ? rule.dayOfMonth : null,
          startTime: rule.startTime,
        })),
      })
    },
    onSuccess: () => {
      setName('')
      setLocation('')
      setStartDate('')
      setEndDate('')
      setTargetPlayers(14)
      setTargetGroupIds([])
      setRules([createWeeklyRule()])
      queryClient.invalidateQueries({ queryKey: ['series'] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      await apiClient.post(
        `/api/v1/series/${seriesId}/generate?from=${generateFrom}&to=${generateTo}`,
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }),
  })

  const deactivateMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      await apiClient.delete(`/api/v1/series/${seriesId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }),
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const onTargetPlayersChange = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      setTargetPlayers(1)
      return
    }
    setTargetPlayers(Math.max(1, Math.trunc(parsed)))
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

  return (
    <div className="space-y-6">
      <ResponsiveSection title="Crear serie recurrente" description="Configura reglas semanales, cada N dias o mensual por dia del mes">
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <div className="ui-muted-surface grid grid-cols-1 gap-3 p-3 md:col-span-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="ui-text-muted mb-1 block text-xs">Nombre de la serie</label>
              <input className="ui-input" placeholder="Ej: Liga domingo maniana" value={name} onChange={(e) => setName(e.target.value)} required />
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
            <div>
              <label className="ui-text-muted mb-1 block text-xs">Ubicacion del encuentro</label>
              <input className="ui-input" placeholder="Cancha principal" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="ui-muted-surface grid grid-cols-1 gap-3 p-3 md:col-span-3 md:grid-cols-3">
            <div>
              <label className="ui-text-muted mb-1 block text-xs">Fecha inicio</label>
              <DateTimeField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="ui-text-muted mb-1 block text-xs">Fecha fin (opcional)</label>
              <DateTimeField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="ui-text-muted mb-1 block text-xs">Objetivo de plantilla</label>
              <input
                className="ui-input"
                type="number"
                min={1}
                placeholder="14"
                value={targetPlayers}
                onChange={(e) => onTargetPlayersChange(e.target.value)}
                required
              />
            </div>
            <p className="ui-text-muted md:col-span-3 text-xs">
              Deja fecha fin vacia para una serie indefinida. La asistencia de cada partido se cierra al llegar al objetivo.
            </p>
            <div className="md:col-span-3">
              <p className="mb-2 text-sm font-medium">Grupos objetivo (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {(groupsQuery.data ?? [])
                  .filter((group) => group.active)
                  .map((group) => (
                    <label key={group.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={targetGroupIds.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                      />
                      <span>{group.name}</span>
                    </label>
                  ))}
              </div>
              <p className="ui-text-muted mt-2 text-xs">
                Si no seleccionas grupos, los partidos generados notificaran a todos los jugadores activos.
              </p>
            </div>
          </div>

          <div className="ui-muted-surface space-y-3 p-3 md:col-span-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Reglas de recurrencia</p>
              <button
                className="ui-button-muted"
                type="button"
                onClick={() => setRules((currentRules) => [...currentRules, createWeeklyRule()])}
              >
                Agregar regla
              </button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={rule.id} className="ui-card grid grid-cols-1 gap-2 p-3 md:grid-cols-8">
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

                  <div className="ui-muted-surface flex items-center rounded-lg px-3 py-2 md:col-span-3">
                    <div>
                      <p className="text-xs font-medium">Regla #{index + 1}</p>
                      <p className="ui-text-muted text-xs">{describeDraftRule(rule)}</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-end md:col-span-2">
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
          </div>

          <button className="ui-button md:col-span-3" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear serie'}
          </button>
          {createMutation.isError && (
            <p className="md:col-span-3 text-sm text-red-600">
              {getApiErrorMessage(createMutation.error, 'No se pudo crear la serie.')}
            </p>
          )}
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Series creadas">
        <div className="ui-muted-surface mb-4 grid grid-cols-1 gap-2 p-3 md:grid-cols-4">
          <div>
            <label className="ui-text-muted mb-1 block text-xs">Generar desde</label>
            <DateTimeField type="date" value={generateFrom} onChange={(e) => setGenerateFrom(e.target.value)} />
          </div>
          <div>
            <label className="ui-text-muted mb-1 block text-xs">Generar hasta</label>
            <DateTimeField type="date" value={generateTo} onChange={(e) => setGenerateTo(e.target.value)} />
          </div>
          <p className="ui-text-muted md:col-span-2 self-center text-xs">
            Rango manual para generar partidos. El scheduler tambien genera automaticamente una ventana futura.
          </p>
        </div>
        {seriesQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando series...</p>}
        {seriesQuery.isError && <p className="mt-3 text-sm text-red-600">No se pudieron cargar las series.</p>}
        {seriesQuery.data && (
          <ResponsiveTable
            data={seriesQuery.data}
            rowKey={(series) => series.id}
            emptyMessage="No hay series registradas."
            columns={[
              { key: 'name', label: 'Nombre', render: (series) => series.name },
              {
                key: 'period',
                label: 'Periodo',
                render: (series) => `${series.startDate} - ${series.endDate ?? 'sin fin'}`,
              },
              {
                key: 'target',
                label: 'Plantilla objetivo',
                render: (series) => series.targetPlayers ?? '-',
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
                key: 'location',
                label: 'Ubicacion',
                render: (series) => series.location ?? '-',
              },
              {
                key: 'rule',
                label: 'Regla',
                render: (series) => series.rules.map((rule) => describeRule(rule)).join(' | '),
              },
              {
                key: 'status',
                label: 'Estado',
                render: (series) => (
                  <StatusBadge label={series.active ? 'Activa' : 'Inactiva'} tone={series.active ? 'success' : 'neutral'} />
                ),
              },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (series) => (
                  <div className="space-x-2">
                    <button className="ui-button-muted" onClick={() => generateMutation.mutate(series.id)} disabled={generateMutation.isPending}>
                      {generateMutation.isPending ? 'Generando...' : 'Generar'}
                    </button>
                    <button
                      className="ui-button-muted"
                      onClick={() => deactivateMutation.mutate(series.id)}
                      disabled={!series.active || deactivateMutation.isPending}
                    >
                      {deactivateMutation.isPending ? 'Desactivando...' : 'Desactivar'}
                    </button>
                  </div>
                ),
              },
            ]}
            renderMobileCard={(series) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{series.name}</p>
                <p className="ui-text-muted">
                  {series.startDate} - {series.endDate ?? 'sin fin'}
                </p>
                <p className="ui-text-muted">Ubicacion: {series.location ?? '-'}</p>
                <p className="ui-text-muted">Objetivo plantilla: {series.targetPlayers ?? '-'}</p>
                <p className="ui-text-muted">
                  Grupos objetivo: {series.targetGroups && series.targetGroups.length > 0 ? series.targetGroups.map((group) => group.name).join(', ') : 'Todos'}
                </p>
                <div className="ui-card p-2 text-sm">
                  {series.rules.map((rule) => (
                    <p key={`${series.id}-${rule.recurrenceType}-${rule.dayOfWeek}-${rule.intervalDays}-${rule.dayOfMonth}-${rule.startTime}`}>
                      {describeRule(rule)}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="ui-button-muted" onClick={() => generateMutation.mutate(series.id)}>
                    Generar partidos
                  </button>
                  <button className="ui-button-muted" onClick={() => deactivateMutation.mutate(series.id)} disabled={!series.active}>
                    Desactivar
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>
      {(generateMutation.isError || deactivateMutation.isError) && (
        <p className="text-sm text-red-600">
          {getApiErrorMessage(
            generateMutation.error ?? deactivateMutation.error,
            'No se pudo completar la accion sobre la serie.',
          )}
        </p>
      )}
    </div>
  )
}
