'use client'

import { Suspense } from 'react'
import { DashboardPage } from '@/components/DashboardPage'
import { HomeGate } from '@/components/HomeGate'
import { LayoutV2 } from '@/components/LayoutV2'
import type { DashboardTab } from '@/lib/dashboardTab'

type V2RoutePageProps = {
  tab: DashboardTab
}

export function V2RoutePage({ tab }: V2RoutePageProps) {
  return (
    <HomeGate>
      <LayoutV2>
        <Suspense fallback={null}>
          <DashboardPage forcedTab={tab} />
        </Suspense>
      </LayoutV2>
    </HomeGate>
  )
}
