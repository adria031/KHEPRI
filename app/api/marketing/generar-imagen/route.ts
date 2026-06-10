import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIP } from '../../../lib/rateLimit'

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return rl.response

  const { prompt } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'block_few',
          personGeneration: 'allow_adult',
        },
      }),
    }
  )

  const data = await response.json()
  const base64 = data.predictions?.[0]?.bytesBase64Encoded

  if (!base64) {
    console.error('Respuesta completa imagen-3.0:', JSON.stringify(data).slice(0, 800))
    return NextResponse.json({ error: data.error?.message || 'No se generó imagen' }, { status: 500 })
  }

  return NextResponse.json({ imagen: `data:image/png;base64,${base64}` })
}
