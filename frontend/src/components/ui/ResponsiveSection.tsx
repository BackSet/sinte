import type { PropsWithChildren, ReactNode } from 'react'

type ResponsiveSectionProps = PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
}>

export function ResponsiveSection({ title, description, action, children }: ResponsiveSectionProps) {
  return (
    <section className="ui-card overflow-hidden p-4 sm:p-6">
      <div className="ui-toolbar mb-4 border-b border-[var(--border-soft)] pb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
          {description ? <p className="ui-text-muted mt-1 text-sm">{description}</p> : null}
        </div>
        {action ? <div className="ui-toolbar-actions shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}