import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!key) {
    console.error('[gemini] NEXT_PUBLIC_GEMINI_API_KEY no configurada')
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[gemini] error de API:', JSON.stringify(data))
  }
  return NextResponse.json(data, { status: res.status })
}
