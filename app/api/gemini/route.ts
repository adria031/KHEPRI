import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../lib/gemini'
import { registrarErrorIA } from '../../lib/ia-errores'

export async function GET() {
  const KEY = process.env.GEMINI_API_KEY ?? ''
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const names = (data.models ?? []).map((m: any) => m.name)
  return NextResponse.json({ key_prefix: KEY.slice(0, 10), models: names })
}

export async function POST(req: NextRequest) {
  const KEY = process.env.GEMINI_API_KEY
  if (!KEY) {
    await registrarErrorIA({ endpoint: 'api/gemini', error: new Error('API key no configurada') })
    return NextResponse.json({ error: { message: 'Servicio no disponible' } }, { status: 500 })
  }

  const body = await req.json()
  const { ok, data, model, triedModels } = await geminiGenerate(body, KEY)

  if (!ok) {
    console.error('[gemini/route] All models failed. Tried:', triedModels)
    await registrarErrorIA({ endpoint: 'api/gemini', error: data })
    return NextResponse.json({ error: { message: 'Servicio temporalmente no disponible' } }, { status: 503 })
  }

  if (triedModels.length > 1) {
    console.info(`[gemini/route] Responded with fallback model: ${model}`)
  }

  return NextResponse.json(data)
}
