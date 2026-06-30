import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../../lib/gemini'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY ?? ''
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })

  const form = await req.formData()
  const file = form.get('contrato') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'application/pdf'

  const prompt = `Extrae los datos laborales del siguiente documento y devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "nombre": "nombre completo del trabajador o null",
  "dni": "DNI/NIE o null",
  "direccion": "dirección completa o null",
  "email": "email o null",
  "telefono": "teléfono o null",
  "tipo_contrato": "indefinido|temporal|parcial|formacion o null",
  "fecha_inicio": "YYYY-MM-DD o null",
  "salario_anual": "número como string o null",
  "num_pagas": "12|14|16 o null"
}`

  const { ok, data } = await geminiGenerate({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 512 },
  }, apiKey)

  if (!ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? 'Error Gemini'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const text: string = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const datos = JSON.parse(clean)
    return NextResponse.json({ datos })
  } catch {
    return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA', raw: text }, { status: 500 })
  }
}
