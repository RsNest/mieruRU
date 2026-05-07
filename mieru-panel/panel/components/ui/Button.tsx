'use client'

import type React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cta'
type ButtonSize = 'sm' | 'md' | 'lg' | 'compact'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'ghost'
        ? 'btn-ghost'
        : variant === 'danger'
          ? 'btn-danger'
          : variant === 'cta'
            ? 'btn-cta'
            : 'btn-secondary'
  const sizeClass =
    size === 'compact'
      ? 'btn-compact'
      : size === 'sm'
        ? 'btn-size-sm'
        : size === 'lg'
          ? 'btn-size-lg'
          : 'btn-size-md'
  const classes = [variantClass, sizeClass, className].filter(Boolean).join(' ')
  return <button {...props} className={classes} />
}
