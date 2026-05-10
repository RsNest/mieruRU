import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Keep redirects backward compatible with any bookmarked URLs from the
// pre-dashboard era. The sidebar/Topbar only link to /dashboard, /users
// and /settings; the legacy paths listed here all funnel into those.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    const tab = request.nextUrl.searchParams.get('tab')
    if (!tab) {
      return NextResponse.redirect(new URL('/dashboard', request.url), 308)
    }
    if (tab === 'server') return NextResponse.redirect(new URL('/settings', request.url), 308)
    if (tab === 'logs') return NextResponse.redirect(new URL('/dashboard?openLogs=1', request.url), 308)
    if (tab === 'users') return NextResponse.redirect(new URL('/users', request.url), 308)
    if (tab === 'dashboard') return NextResponse.redirect(new URL('/dashboard', request.url), 308)
    return NextResponse.redirect(new URL('/dashboard', request.url), 308)
  }

  if (pathname === '/server') {
    return NextResponse.redirect(new URL('/settings', request.url), 308)
  }

  if (pathname === '/logs') {
    return NextResponse.redirect(new URL('/dashboard?openLogs=1', request.url), 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/server', '/logs'],
}
