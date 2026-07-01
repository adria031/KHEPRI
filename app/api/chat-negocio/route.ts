import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiGenerate } from '../../lib/gemini'
import { descontarCreditos } from '../../lib/creditos'
import { registrarErrorIA } from '../../lib/ia-errores'

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
    const registroUrl = `${appUrl}/auth?modo=registro`

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
      es: `FLUJO PARA RESERVAR (sigue este orden exacto):

Paso 1 - Elegir servicio: Pregunta qué servicio quiere y muéstrale las opciones disponibles.
Paso 2 - Elegir profesional (opcional): Si hay varios, pregunta si tiene preferencia o si quiere cualquiera.
Paso 3 - Elegir fecha: Pregunta la fecha deseada (DD/MM/YYYY). Informa los días disponibles según el horario.
Paso 4 - Elegir hora: Pregunta la hora deseada dentro del horario de apertura.
Paso 5 - Pedir datos personales: Pregunta NOMBRE completo y EMAIL del cliente (no teléfono).
Paso 6 - Confirmar: Muestra resumen completo y pide confirmación explícita.
Paso 7 - Cuando el cliente confirme: escribe un mensaje amable de confirmación y añade AL FINAL en una sola línea sin saltos de línea:
[RESERVA:{"nombre":"...","email":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

Para "cualquiera"/"sin preferencia" en trabajador, usa el valor "cualquiera".
El bloque [RESERVA:{...}] lo procesa el sistema automáticamente, el cliente no lo verá.`,

      ca: `FLUX PER RESERVAR (segueix aquest ordre exacte):

Pas 1 - Triar servei: Pregunta quin servei vol i mostra les opcions disponibles.
Pas 2 - Triar professional (opcional): Si n'hi ha diversos, pregunta preferència.
Pas 3 - Triar data (DD/MM/YYYY). Informa els dies disponibles.
Pas 4 - Triar hora dins l'horari d'obertura.
Pas 5 - Demanar dades: Pregunta NOM complet i EMAIL del client (no telèfon).
Pas 6 - Confirmar: Mostra resum i demana confirmació explícita.
Pas 7 - Quan confirmi: escriu missatge amable i afegeix AL FINAL en una sola línia:
[RESERVA:{"nombre":"...","email":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

Per a "qualsevol"/"sense preferència" en treballador, usa el valor "cualquiera".`,

      en: `BOOKING FLOW (follow this exact order):

Step 1 - Choose service: Ask what service they want and show available options.
Step 2 - Choose professional (optional): If several, ask for preference.
Step 3 - Choose date (DD/MM/YYYY). Inform available days from schedule.
Step 4 - Choose time within opening hours.
Step 5 - Get contact details: Ask for client's FULL NAME and EMAIL (not phone).
Step 6 - Confirm: Show full summary and ask for explicit confirmation.
Step 7 - When confirmed: write a friendly confirmation message and add AT THE END on a single line:
[RESERVA:{"nombre":"...","email":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

For "anyone"/"no preference" in professional, use the value "cualquiera".`,
    }

    const CANCEL_POLICY: Record<string, string> = {
      es: 'Las cancelaciones deben realizarse con al menos 24 horas de antelación.',
      ca: 'Les cancel·lacions s\'han de fer amb almenys 24 hores d\'antelació.',
      en: 'Cancellations must be made at least 24 hours in advance.',
    }

    const langNombres: Record<string, string> = { es: 'español', ca: 'catalán', en: 'inglés' }
    const idiomaNombre = langNombres[lang] ?? 'español'

    const ahora = new Date()
    const fechaHoyStr = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const fechaISO = ahora.toISOString().split('T')[0]

    const systemPrompt = `Eres el asistente de ${neg?.nombre ?? 'este negocio'}, un negocio de tipo ${neg?.tipo ?? 'servicios'} que usa Khepria.

FECHA ACTUAL: Hoy es ${fechaHoyStr} (${fechaISO}). Usa esto cuando el cliente diga "hoy", "mañana", "esta semana", etc.

IMPORTANTE: Responde siempre en ${idiomaNombre}. No cambies de idioma aunque el cliente escriba en otro idioma.

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${neg?.nombre ?? ''}
- Tipo: ${neg?.tipo ?? ''}
- Descripción: ${neg?.descripcion ?? 'N/A'}
- Dirección: ${[neg?.direccion, neg?.ciudad].filter(Boolean).join(', ') || 'N/A'}
- Teléfono: ${neg?.telefono ?? 'N/A'}
- WhatsApp: ${neg?.whatsapp ?? 'N/A'}

SERVICIOS Y PRECIOS:
${serviciosTexto}

HORARIOS:
${horariosTexto}

EQUIPO:
${equipoTexto}

POLÍTICA DE CANCELACIÓN: ${CANCEL_POLICY[lang]}

REGLAS IMPORTANTES:
- Escribe siempre en texto plano sin asteriscos, sin negritas, sin markdown, sin viñetas con *, sin almohadillas #. Solo texto conversacional natural.
- Sé natural y amigable como una persona real. Respuestas cortas y directas.
- Nunca inventes datos que no te hayan proporcionado.
- El bloque [RESERVA:{...}] debe ir en una sola línea continua, sin saltos de línea en el JSON.
- URL alternativa para reservar directamente: ${reservarUrl}

${LANG_INSTRUCTIONS[lang]}`

    const contents = (messages as Array<{ rol: string; texto: string }>).map(m => ({
      role: m.rol === 'usuario' ? 'user' : 'model',
      parts: [{ text: m.texto }],
    }))

    const result = await geminiGenerate(
      {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      },
      process.env.GEMINI_API_KEY!
    )

    if (!result.ok) {
      await registrarErrorIA({ endpoint: 'chat-negocio', error: result.data, negocioId })
      return NextResponse.json({ error: 'En este momento no puedo ayudarte. Inténtalo de nuevo en unos segundos.' }, { status: 502 })
    }

    const d = result.data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const textoRespuesta = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Lo siento, no pude procesar tu mensaje.'

    // Descontar 1 crédito por respuesta del chatbot (fire-and-forget)
    descontarCreditos(negocioId, 1, 'chatbot_respuesta', sb).catch(() => {})

    // Detectar y procesar bloque [RESERVA:{...}] antes de devolver la respuesta
    const reservaMatch = textoRespuesta.match(/\[RESERVA:(.*?)\]/s)
    if (reservaMatch) {
      try {
        const datosReserva = JSON.parse(reservaMatch[1])

        const { data: servicio } = await sb
          .from('servicios')
          .select('id')
          .eq('negocio_id', negocioId)
          .ilike('nombre', `%${datosReserva.servicio}%`)
          .single()

        const { error } = await sb
          .from('reservas')
          .insert({
            negocio_id: negocioId,
            cliente_nombre: datosReserva.nombre,
            cliente_email: datosReserva.email,
            fecha: datosReserva.fecha,
            hora: datosReserva.hora,
            servicio_id: servicio?.id || null,
            estado: 'pendiente',
            origen: 'chatbot',
          })

        if (error) {
          console.error('Error creando reserva:', error)
          await registrarErrorIA({ endpoint: 'chatbot-reserva', error, negocioId })
        }

        const mensajeLimpio = textoRespuesta.replace(/\[RESERVA:.*?\]/gs, '').trim()
        return NextResponse.json({
          mensaje: mensajeLimpio || '✅ ¡Reserva confirmada! Te hemos enviado un email de confirmación.',
        })
      } catch (e) {
        console.error('Error parseando reserva:', e)
      }
    }

    return NextResponse.json({ mensaje: textoRespuesta })
  } catch (e) {
    console.error('[chat-negocio]', e)
    await registrarErrorIA({ endpoint: 'chat-negocio', error: e })
    return NextResponse.json({ error: 'En este momento no puedo ayudarte. Inténtalo de nuevo en unos segundos.' }, { status: 500 })
  }
}
