import type { PropsWithChildren, ReactNode } from 'react'

type ResponsiveSectionProps = PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
}>

export function ResponsiveSection({ title, description, action, children }: ResponsiveSectionProps) {
  return (
    <section className="ui-card p-4 sm:p-6">
      <div className="ui-toolbar mb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight sm:text-xl">{title}</h2>
          {description ? <p className="ui-text-muted mt-1 text-sm">{description}</p> : null}
        </div>
        {action ? <div className="ui-toolbar-actions">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}