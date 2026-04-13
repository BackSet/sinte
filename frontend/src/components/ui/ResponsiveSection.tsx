import type { PropsWithChildren, ReactNode } from 'react'

type ResponsiveSectionProps = PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
}>

export function ResponsiveSection({ title, description, action, children }: ResponsiveSectionProps) {
  return (
    <section className="ui-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
          {description ? <p className="ui-text-muted mt-1 text-sm">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
