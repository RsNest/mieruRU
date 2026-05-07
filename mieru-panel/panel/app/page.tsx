import { redirect } from 'next/navigation'
import { LegacyRootPage } from '@/components/LegacyRootPage'
import { featureFlags } from '@/lib/featureFlags'

export default function Page() {
  if (featureFlags.uiV2) {
    redirect('/users')
  }
  return <LegacyRootPage />
}
