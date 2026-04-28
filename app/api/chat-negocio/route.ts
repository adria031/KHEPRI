import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiGenerate } from '../../lib/gemini'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const diasLabels: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

export async function POST(req: NextRequest) {
  try {
    const { messages, negocioId, idioma = 'es' } = await req.json()
    if (!negocioId) return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 })
    const lang: 'es' | 'ca' | 'en' = idioma === 'ca' ? 'ca' : idioma === 'en' ? 'en' : 'es'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khepria.vercel.app'

    const [{ data: neg }, { data: servicios }, { data: horarios }, { data: trabajadores }] = await Promise.all([
      sb.from('negocios').select('nombre,tipo,descripcion,direccion,ciudad,telefono,whatsapp').eq('id', negocioId).single(),
      sb.from('servicios').select('nombre,precio,duracion,categoria').eq('negocio_id', negocioId).eq('activo', true),
      sb.from('horarios').select('dia,abierto,hora_apertura,hora_cierre').eq('negocio_id', negocioId),
      sb.from('trabajadores').select('id,nombre,especialidad').eq('negocio_id', negocioId).eq('activo', true),
    ])

    const reservarUrl = `${appUrl}/negocio/${negocioId}/reservar`

    const horariosTexto = horarios?.map(h => {
      if (!h.abierto) return `${diasLabels[h.dia] ?? h.dia}: Cerrado`
      return `${diasLabels[h.dia] ?? h.dia}: ${h.hora_apertura?.slice(0, 5)} - ${h.hora_cierre?.slice(0, 5)}`
    }).join('\n') ?? 'No disponible'

    const serviciosTexto = servicios?.map(s =>
      `- ${s.nombre} | ${s.duracion} min | €${s.precio}${s.categoria ? ` [${s.categoria}]` : ''}`
    ).join('\n') ?? 'No disponible'

    const equipoTexto = trabajadores?.length
      ? trabajadores.map(t => `- ${t.nombre}${t.especialidad ? ` (${t.especialidad})` : ''}`).join('\n')
      : 'No especificado'

    const LANG_INSTRUCTIONS: Record<string, string> = {
      es: `- Responde SIEMPRE en español, de forma amable, breve y profesional.
- Cuando el cliente exprese intención de reservar (palabras: reservar, cita, quiero una cita, disponible, hora, día, turno, agendar, pedir hora), incluye exactamente [MOSTRAR_OPCIONES] al final de tu respuesta.
- Si el cliente elige gestión por bot, pide UNO A UNO: 1) nombre completo, 2) teléfono, 3) servicio, 4) trabajador o "cualquiera", 5) fecha (DD/MM/YYYY), 6) hora.`,
      ca: `- Respon SEMPRE en català, de forma amable, breu i professional.
- Quan el client expressi intenció de reservar (paraules: reservar, cita, hora, torn, agenda), inclou exactament [MOSTRAR_OPCIONES] al final de la teva resposta.
- Si el client tria gestió pel bot, demana UN A UN: 1) nom complet, 2) telèfon, 3) servei, 4) treballador o "qualsevol", 5) data (DD/MM/YYYY), 6) hora.`,
      en: `- ALWAYS respond in English, in a friendly, brief and professional manner.
- When the client expresses intent to book (words: book, appointment, available, slot, schedule, reserve), include exactly [MOSTRAR_OPCIONES] at the end of your response.
- If the client chooses bot-managed booking, ask ONE BY ONE: 1) full name, 2) phone number, 3) desired service, 4) preferred worker or "any", 5) date (DD/MM/YYYY), 6) preferred time.`,
    }

    const CANCEL_POLICY: Record<string, string> = {
      es: 'Las cancelaciones deben realizarse con al menos 24 horas de antelación.',
      ca: 'Les cancel·lacions s\'han de fer amb almenys 24 hores d\'antelació.',
      en: 'Cancellations must be made at least 24 hours in advance.',
    }

    const systemPrompt = `You are the virtual assistant of ${neg?.nombre ?? 'this business'}, a ${neg?.tipo ?? 'services'} business on Khepria.

BUSINESS INFORMATION:
- Name: ${neg?.nombre ?? ''}
- Type: ${neg?.tipo ?? ''}
- Description: ${neg?.descripcion ?? 'N/A'}
- Address: ${[neg?.direccion, neg?.ciudad].filter(Boolean).join(', ') || 'N/A'}
- Phone: ${neg?.telefono ?? 'N/A'}
- WhatsApp: ${neg?.whatsapp ?? 'N/A'}

SERVICES & PRICES:
${serviciosTexto}

OPENING HOURS:
${horariosTexto}

TEAM:
${equipoTexto}

CANCELLATION POLICY: ${CANCEL_POLICY[lang]}

IMPORTANT INSTRUCTIONS:
${LANG_INSTRUCTIONS[lang]}
- If ANY of the 6 data points are missing, ask for them explicitly before continuing. NEVER generate the RESERVA block if any data is missing.
- When you have ALL 6 data points (name, phone, service, worker, date, time), show a clear summary and add AT THE END exactly this block in a single line (no markdown, no backticks):
[RESERVA:{"nombre":"...","telefono":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]
- Always convert date to YYYY-MM-DD and time to HH:MM (24h).
- For "any"/"cualquiera"/"qualsevol" worker preference, use the value "cualquiera".
- The [RESERVA:...] block must be a single continuous line, the JSON must not have line breaks.
- Alternative booking URL: ${reservarUrl}
- Do not invent data that has not been provided.`

    const contents = (messages as Array<{ rol: string; texto: string }>).map(m => ({
      role: m.rol === 'usuario' ? 'user' : 'model',
      parts: [{ text: m.texto }],
    }))

    const result = await geminiGenerate(
      {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 800, temperature: 0.75 },
      },
      process.env.NEXT_PUBLIC_GEMINI_API_KEY!
    )

    if (!result.ok) {
      return NextResponse.json({ error: 'Error de IA' }, { status: 502 })
    }

    const d = result.data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const respuesta = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Lo siento, no pude procesar tu mensaje.'

    return NextResponse.json({ respuesta })
  } catch (e) {
    console.error('[chat-negocio]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
