import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
const MODEL = 'gemini-2.0-flash'

export async function POST(req: NextRequest) {
  if (!KEY) {
    console.error('[gemini] NEXT_PUBLIC_GEMINI_API_KEY no configurada')
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const body = await req.json()

  const isBearer = KEY.startsWith('AQ.')
  console.log('[gemini] key type:', isBearer ? 'Bearer (AQ.)' : 'API key', '| model:', MODEL)

  // AQ. → Bearer header; intentar v1 primero, si falla v1beta
  // AIzaSy → ?key= querystring + v1beta
  const versions = isBearer ? ['v1', 'v1beta'] : ['v1beta']

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isBearer) headers['Authorization'] = `Bearer ${KEY}`

  for (const version of versions) {
    const url = isBearer
      ? `https://generativelanguage.googleapis.com/${version}/models/${MODEL}:generateContent`
      : `https://generativelanguage.googleapis.com/${version}/models/${MODEL}:generateContent?key=${KEY}`

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const data = await res.json()

    if (!res.ok) {
      console.error(`[gemini] error con ${version}:`, JSON.stringify(data).slice(0, 300))
      if (versions.length > 1 && version !== versions[versions.length - 1]) {
        console.log('[gemini] reintentando con siguiente versión...')
        continue
      }
    }

    return NextResponse.json(data, { status: res.status })
  }

  return NextResponse.json({ error: 'Error de Gemini' }, { status: 500 })
}
