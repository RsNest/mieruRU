'use client'

import { I18nextProvider } from 'react-i18next'
import type { PropsWithChildren } from 'react'
import i18n from '@/i18n'

export function Providers({ children }: PropsWithChildren) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
