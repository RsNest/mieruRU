import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function readBooleanFlag(raw: string | undefined, defaultValue = false): boolean {
  if (typeof raw !== 'string') return defaultValue
  const normalized = raw.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const uiV2 = readBooleanFlag(process.env.NEXT_PUBLIC_UI_V2, false)
  const isV2Route = pathname === '/users' || pathname === '/server' || pathname === '/logs'

  if (!uiV2) {
    if (isV2Route) {
      return NextResponse.redirect(new URL('/', request.url), 308)
    }
    return NextResponse.next()
  }

  if (pathname !== '/') return NextResponse.next()

  const tab = request.nextUrl.searchParams.get('tab')
  let target = '/users'
  if (tab === 'server') target = '/server'
  if (tab === 'logs') target = '/logs'
  const url = new URL(target, request.url)
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: ['/', '/users', '/server', '/logs'],
}
