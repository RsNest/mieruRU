'use client'

import { Suspense } from 'react'
import { DashboardPage } from '@/components/DashboardPage'
import { HomeGate } from '@/components/HomeGate'
import { Layout } from '@/components/Layout'

function ShellFallback() {
  return (
    <div className="login-page" style={{ minHeight: '100dvh' }}>
      <div className="login-backdrop" aria-hidden />
    </div>
  )
}

export default function Page() {
  return (
    <HomeGate>
      <Suspense fallback={<ShellFallback />}>
        <Layout>
          <DashboardPage />
        </Layout>
      </Suspense>
    </HomeGate>
  )
}
