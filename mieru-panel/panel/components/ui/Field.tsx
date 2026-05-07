'use client'

import React, { cloneElement, isValidElement, useId } from 'react'

type FieldProps = {
  label: string
  description?: string
  error?: string
  htmlFor?: string
  monospace?: boolean
  children: React.ReactNode
}

export function Field({ label, description, error, htmlFor, monospace = false, children }: FieldProps) {
  const generatedId = useId()
  const controlId = htmlFor || `field-${generatedId}`
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: controlId,
        'aria-label': label,
      })
    : children
  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={controlId}>
        {label}
      </label>
      <div className={monospace ? 'field-control field-mono' : 'field-control'}>{control}</div>
      {error ? (
        <p className="field-error-text">{error}</p>
      ) : description ? (
        <p className="field-desc">{description}</p>
      ) : null}
    </div>
  )
}
