'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export function HomeGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const authReady = useAuthStore((s) => s.authReady)
  const isAuthed = useAuthStore((s) => s.isAuthed)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (!authReady) return
    if (!isAuthed) router.replace('/login')
  }, [authReady, isAuthed, router])

  if (!authReady || !isAuthed) {
    return (
      <div className="login-page" style={{ minHeight: '100dvh' }}>
        <div className="login-backdrop" aria-hidden />
        <p className="text-secondary" style={{ margin: 'auto', position: 'relative', zIndex: 1 }}>
          {t('app_loading')}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
