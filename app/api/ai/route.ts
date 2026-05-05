import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../lib/gemini'

/**
 * Proxy server-side para llamadas a Gemini desde componentes client-side.
 * Los client components NO deben llamar a Gemini directamente — usan este endpoint.
 */
export async function POST(req: NextRequest) {
  const KEY = process.env.GEMINI_API_KEY
  if (!KEY) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
  }

  const body = await req.json()
  const { prompt, generationConfig } = body as { prompt: string; generationConfig?: object }

  if (!prompt) {
    return NextResponse.json({ error: 'prompt requerido' }, { status: 400 })
  }

  const { ok, data } = await geminiGenerate(
    {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: generationConfig ?? { maxOutputTokens: 600, temperature: 0.4 },
    },
    KEY,
  )

  if (!ok) {
    return NextResponse.json({ error: 'Error de IA' }, { status: 502 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return NextResponse.json({ text })
}
