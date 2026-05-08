import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, hint, required, children }: FormFieldProps) {
  return (
    <div className="ui-form-group">
      <label className="ui-form-label">
        {label}
        {required ? <span className="ml-1 text-[var(--danger)]">*</span> : null}
      </label>
      {children}
      {hint && <p className="ui-form-hint">{hint}</p>}
    </div>
  )
}
