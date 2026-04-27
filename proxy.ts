import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['es', 'ca', 'en']
const DEFAULT_LOCALE = 'es'

const PROTECTED = ['/dashboard', '/cliente', '/empleado', '/admin']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Auth: protect private routes ─────────────────────────────────────────
  const isProtected = PROTECTED.some(r => pathname.startsWith(r))
  if (isProtected) {
    // Supabase SSR stores the session in sb-{project_ref}-auth-token (may be chunked as .0, .1…)
    const hasSession = request.cookies.getAll().some(c =>
      c.name.startsWith('sb-fpotjljbukpbuehtjxvb-auth-token') ||
      c.name === 'sb-access-token'
    )
    if (!hasSession) {
      const loginUrl = new URL('/auth', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── i18n: detect locale from cookie or Accept-Language ───────────────────
  const response = NextResponse.next()

  const cookieLocale = request.cookies.get('locale')?.value
  if (cookieLocale && LOCALES.includes(cookieLocale)) {
    return response
  }

  const acceptLang = request.headers.get('accept-language') ?? ''
  const lang = acceptLang.split(',')[0].split(';')[0].trim().toLowerCase().split('-')[0]
  const detected = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE

  response.cookies.set('locale', detected, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icon-|sw\\.js|manifest\\.json|api/).*)',
  ],
}
