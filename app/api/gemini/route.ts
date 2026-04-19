import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
const MODEL = 'gemini-1.5-flash-latest'

export async function POST(req: NextRequest) {
  if (!KEY) {
    console.error('[gemini] NEXT_PUBLIC_GEMINI_API_KEY no configurada')
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const body = await req.json()

  // AQ. keys → Bearer header + v1beta sin ?key=
  // AIzaSy keys → ?key= querystring
  const isBearer = KEY.startsWith('AQ.')
  const url = isBearer
    ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isBearer) headers['Authorization'] = `Bearer ${KEY}`

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json()

  if (!res.ok) console.error('[gemini] error:', JSON.stringify(data).slice(0, 300))

  return NextResponse.json(data, { status: res.status })
}
