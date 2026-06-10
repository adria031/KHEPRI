import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIP } from '../../../lib/rateLimit'

export async function POST(req: NextRequest) {
  const rl = rateLimit(getIP(req), 10)
  if (!rl.ok) return rl.response

  const { prompt } = await req.json()
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  )

  const data = await response.json()
  console.error('Respuesta Gemini imagen:', JSON.stringify(data).slice(0, 800))

  const parts: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }> =
    data.candidates?.[0]?.content?.parts ?? []

  const imagePart = parts.find(p => p.inlineData?.data)
  const textPart  = parts.find(p => p.text)

  if (!imagePart) {
    const errMsg = data.error?.message || 'No se generó imagen'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  const mimeType = imagePart.inlineData!.mimeType || 'image/png'
  const imagen = `data:${mimeType};base64,${imagePart.inlineData!.data}`

  let descripcion = ''
  let hashtags: string[] = []
  if (textPart?.text) {
    try {
      const clean = textPart.text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(clean)
      descripcion = parsed.descripcion || ''
      hashtags    = parsed.hashtags || []
    } catch {
      descripcion = textPart.text.slice(0, 400)
    }
  }

  return NextResponse.json({ imagen, descripcion, hashtags })
}
