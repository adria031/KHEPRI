import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// El intercambio de código PKCE necesita el code_verifier guardado en el
// localStorage del browser — no puede hacerse server-side con el anon client.
// Redirigimos al cliente para que lo haga él mismo y luego enrute según perfil.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code  = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}`, request.url))
  }

  if (code) {
    return NextResponse.redirect(new URL(`/auth/confirm?code=${encodeURIComponent(code)}`, request.url))
  }

  return NextResponse.redirect(new URL('/auth', request.url))
}