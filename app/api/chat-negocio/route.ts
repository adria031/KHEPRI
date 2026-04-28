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
    const { messages, negocioId } = await req.json()
    if (!negocioId) return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 })

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

    const systemPrompt = `Eres el asistente virtual de ${neg?.nombre ?? 'este negocio'}, un negocio de ${neg?.tipo ?? 'servicios'} en Khepria.

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${neg?.nombre ?? ''}
- Tipo: ${neg?.tipo ?? ''}
- Descripción: ${neg?.descripcion ?? 'No disponible'}
- Dirección: ${[neg?.direccion, neg?.ciudad].filter(Boolean).join(', ') || 'No disponible'}
- Teléfono: ${neg?.telefono ?? 'No disponible'}
- WhatsApp: ${neg?.whatsapp ?? 'No disponible'}

SERVICIOS Y PRECIOS:
${serviciosTexto}

HORARIO DE APERTURA:
${horariosTexto}

EQUIPO:
${equipoTexto}

POLÍTICA DE CANCELACIÓN: Las cancelaciones deben realizarse con al menos 24 horas de antelación.

INSTRUCCIONES IMPORTANTES:
- Responde SIEMPRE en español, de forma amable, breve y profesional.
- Cuando el cliente exprese intención de reservar (palabras: reservar, cita, quiero una cita, disponible, hora, día, turno, agendar, pedir hora), incluye exactamente [MOSTRAR_OPCIONES] al final de tu respuesta y nada más después de eso.
- Si el cliente elige que tú gestiones la reserva, pide los datos UNO A UNO en este orden exacto hasta tener TODOS: 1) nombre completo, 2) teléfono, 3) servicio deseado (elige de la lista), 4) trabajador preferido o "cualquiera", 5) fecha (DD/MM/YYYY), 6) hora preferida.
- Si falta CUALQUIERA de los 6 datos, pídelo explícitamente antes de continuar. NUNCA generes el bloque RESERVA si falta algún dato.
- Cuando tengas los 6 datos completos (nombre, teléfono, servicio, trabajador, fecha, hora), muestra un resumen claro y añade AL FINAL exactamente este bloque en una sola línea (sin markdown, sin backticks, sin espacios extra):
[RESERVA:{"nombre":"...","telefono":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]
- Convierte siempre la fecha al formato YYYY-MM-DD y la hora a HH:MM de 24h.
- Para "cualquiera" o "no tengo preferencia" en trabajador, usa el valor "cualquiera".
- El bloque [RESERVA:...] debe estar en una sola línea continua, el JSON no debe tener saltos de línea.
- URL alternativa para reservar online: ${reservarUrl}
- No inventes datos que no se te hayan dado.`

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
