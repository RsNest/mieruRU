import { Suspense } from 'react'
import { LoginRoute } from '@/components/LoginRoute'

function ShellFallback() {
  return (
    <div className="login-page" style={{ minHeight: '100dvh' }}>
      <div className="login-backdrop" aria-hidden />
    </div>
  )
}

export default function LoginPageRoute() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <LoginRoute />
    </Suspense>
  )
}
