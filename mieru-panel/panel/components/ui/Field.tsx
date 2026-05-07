'use client'

import type React from 'react'

type FieldProps = {
  label: string
  description?: string
  error?: string
  htmlFor?: string
  monospace?: boolean
  children: React.ReactNode
}

export function Field({ label, description, error, htmlFor, monospace = false, children }: FieldProps) {
  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className={monospace ? 'field-control field-mono' : 'field-control'}>{children}</div>
      {error ? (
        <p className="field-error-text">{error}</p>
      ) : description ? (
        <p className="field-desc">{description}</p>
      ) : null}
    </div>
  )
}
