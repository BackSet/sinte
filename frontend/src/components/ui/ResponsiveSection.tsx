import type { PropsWithChildren, ReactNode } from 'react'

type ResponsiveSectionProps = PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
}>

export function ResponsiveSection({ title, description, action, children }: ResponsiveSectionProps) {
  return (
    <section className="ui-card overflow-hidden">
      <div className="border-b px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-5">
        <div>
          <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
          {description ? <p className="ui-text-muted mt-1 text-sm">{description}</p> : null}
        </div>
        {action ? <div className="mt-3 shrink-0 sm:mt-0">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  )
}
