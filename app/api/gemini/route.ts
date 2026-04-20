import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../lib/gemini'

export async function GET() {
  const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const names = (data.models ?? []).map((m: any) => m.name)
  return NextResponse.json({ key_prefix: KEY.slice(0, 10), models: names })
}

export async function POST(req: NextRequest) {
  const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
  if (!KEY) {
    return NextResponse.json({ error: { message: 'API key no configurada en el servidor' } }, { status: 500 })
  }

  const body = await req.json()
  const { ok, data, model, triedModels } = await geminiGenerate(body, KEY)

  if (!ok) {
    console.error('[gemini/route] All models failed. Tried:', triedModels)
  } else if (triedModels.length > 1) {
    console.info(`[gemini/route] Responded with fallback model: ${model}`)
  }

  // Devolvemos la respuesta de Gemini tal cual — el cliente la interpreta
  return NextResponse.json(data, { status: ok ? 200 : 429 })
}
