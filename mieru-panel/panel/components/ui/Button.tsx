'use client'

import type React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'default' | 'compact'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'secondary', size = 'default', className, ...props }: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-secondary'
  const sizeClass = size === 'compact' ? 'btn-compact' : ''
  const classes = [variantClass, sizeClass, className].filter(Boolean).join(' ')
  return <button {...props} className={classes} />
}
