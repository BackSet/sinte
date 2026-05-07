import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  hint?: string
  children: ReactNode
}

export function FormField({ label, hint, children }: FormFieldProps) {
  return (
    <div className="ui-form-group">
      <label className="ui-form-label">{label}</label>
      {children}
      {hint && <p className="ui-form-hint">{hint}</p>}
    </div>
  )
}
