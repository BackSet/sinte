import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ResponsiveColumn<T> = {
  key: string
  label: string
  className?: string
  render: (item: T) => ReactNode
}

type ResponsiveTableProps<T> = {
  data: T[]
  columns: Array<ResponsiveColumn<T>>
  rowKey: (item: T) => string
  emptyMessage: string
  renderMobileCard: (item: T) => ReactNode
}

export function ResponsiveTable<T>({
  data,
  columns,
  rowKey,
  emptyMessage,
  renderMobileCard,
}: ResponsiveTableProps<T>) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Icon name="search" size="lg" className="ui-text-muted mb-2" />
        <p className="ui-text-muted text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <article key={rowKey(item)} className="ui-muted-surface p-3">
            {renderMobileCard(item)}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Tabla de resultados</caption>
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[var(--text-secondary)]">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`py-2.5 pr-4 font-medium ${column.className ?? ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={rowKey(item)} className="border-b border-[var(--border-soft)] align-top transition-colors hover:bg-[var(--bg-hover)]">
                {columns.map((column) => (
                  <td key={column.key} className={`py-2.5 pr-4 ${column.className ?? ''}`}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}