import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname !== '/') return NextResponse.next()

  const tab = request.nextUrl.searchParams.get('tab')
  if (!tab) return NextResponse.next()
  let target = '/users'
  if (tab === 'server') target = '/server'
  if (tab === 'logs') target = '/logs'
  const url = new URL(target, request.url)
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: ['/'],
}
