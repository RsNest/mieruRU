'use client'

import { useMemo } from 'react'

export function useDirty<T>(initialValues: T, currentValues: T): boolean {
  return useMemo(
    () => JSON.stringify(initialValues) !== JSON.stringify(currentValues),
    [initialValues, currentValues],
  )
}
