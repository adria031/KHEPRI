import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '../../../lib/gemini'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY ?? ''
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })

  const formData = await req.formData()
  const archivo = formData.get('archivo') as File | null
  if (!archivo) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const bytes = await archivo.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = archivo.type || 'application/pdf'

  const prompt = `Analiza esta nómina española y extrae los datos en JSON puro sin explicaciones ni markdown:
{
  "trabajadorNombre": "nombre completo del trabajador o null",
  "dni": "DNI o NIE o null",
  "salarioBruto": "salario bruto mensual del periodo como número string o null",
  "salarioNeto": "salario neto mensual del periodo como número string o null",
  "irpf": "porcentaje de retención IRPF como número string (ej: '15.00') o null",
  "seguridadSocial": "porcentaje de SS del trabajador como número string (ej: '6.35') o null",
  "periodo": "periodo de la nómina en formato YYYY-MM o null",
  "numeroAfiliacion": "número de afiliación a la seguridad social o null"
}
Si algún dato no aparece en el documento, pon null.`

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
    return NextResponse.json(JSON.parse(clean))
  } catch {
    return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA', raw: text }, { status: 500 })
  }
}
