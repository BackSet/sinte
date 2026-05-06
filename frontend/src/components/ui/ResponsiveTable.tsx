import type { ReactNode } from 'react'

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
      <div className="ui-empty-state" role="status">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <article key={rowKey(item)} className="ui-muted-surface p-3 shadow-sm">
            {renderMobileCard(item)}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Tabla de resultados</caption>
          <thead className="bg-[var(--bg-muted)]">
            <tr className="border-b text-[var(--text-secondary)]">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`px-3 py-2.5 text-xs font-semibold uppercase ${column.className ?? ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={rowKey(item)} className="border-b align-top transition hover:bg-[var(--bg-muted)]/70">
                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-3 ${column.className ?? ''}`}>
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
