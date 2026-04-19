import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`)
  const data = await res.json()
  const names = (data.models ?? []).map((m: any) => m.name)
  return NextResponse.json({ key_prefix: KEY.slice(0, 10), models: names })
}

const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
const MODEL = 'gemini-1.5-flash-latest'

export async function POST(req: NextRequest) {
  if (!KEY) {
    console.error('[gemini] NEXT_PUBLIC_GEMINI_API_KEY no configurada')
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const body = await req.json()

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()

  if (!res.ok) console.error('[gemini] error:', JSON.stringify(data).slice(0, 300))

  return NextResponse.json(data, { status: res.status })
}
