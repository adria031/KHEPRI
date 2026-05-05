import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { geminiGenerate } from '../../lib/gemini'
import { descontarCreditos } from '../../lib/creditos'

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

Paso 1 - Verificar registro:
Cuando el cliente exprese intención de reservar, pregunta:
"Para reservar necesito verificar tu identidad. ¿Estás registrado en Khepria?"

Si dice NO o que no tiene cuenta:
Responde: "Puedes registrarte aquí: ${registroUrl}
Es rápido y solo necesitas email y teléfono. Una vez registrado vuelve y te gestiono la cita."
No sigas con el proceso de reserva hasta que confirme que está registrado.

Si dice SÍ o que tiene cuenta:
Pregunta: "¿Cuál es tu número de teléfono registrado?"
Usa este número para verificar su perfil en el sistema. El número es obligatorio.
Si el cliente no está en el sistema: "No encuentro ese teléfono en nuestro sistema. Por favor regístrate primero en: ${registroUrl}"

Paso 2 - Elegir servicio:
Pregunta qué servicio quiere y preséntale las opciones disponibles.

Paso 3 - Elegir profesional (opcional):
Si hay varios profesionales, pregunta si tiene preferencia o si quiere cualquiera.

Paso 4 - Elegir fecha:
Pregunta la fecha deseada (DD/MM/YYYY). Informa de los días disponibles según los horarios.

Paso 5 - Elegir hora:
Pregunta la hora deseada. Informa los horarios de apertura disponibles.

Paso 6 - Confirmar datos:
Muestra un resumen completo y pide confirmación al cliente.

Paso 7 - Ejecutar reserva:
Cuando el cliente confirme, muestra el mensaje de confirmación y añade al final en una sola línea sin saltos:
[RESERVA:{"nombre":"...","telefono":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

Para "cualquiera"/"sin preferencia" en trabajador, usa el valor "cualquiera".
Si el cliente NO está registrado, muestra [MOSTRAR_OPCIONES] para que pueda ir directamente a la web a reservar.
Cuando el cliente exprese intención de reservar sin pasar por el flujo, incluye [MOSTRAR_OPCIONES].`,

      ca: `FLUX PER RESERVAR (segueix aquest ordre exacte):

Pas 1 - Verificar registre:
Quan el client expressi intenció de reservar, pregunta:
"Per reservar necessito verificar la teva identitat. Estàs registrat a Khepria?"

Si diu NO:
Respon: "Pots registrar-te aquí: ${registroUrl}
És ràpid i només necessites email i telèfon. Un cop registrat torna i et gestiono la cita."

Si diu SÍ:
Pregunta: "Quin és el teu número de telèfon registrat?"

Pas 2 - Triar servei: Pregunta quin servei vol.
Pas 3 - Triar professional (opcional).
Pas 4 - Triar data (DD/MM/YYYY).
Pas 5 - Triar hora.
Pas 6 - Confirmar dades.
Pas 7 - Quan confirmi, afegeix al final en una línia:
[RESERVA:{"nombre":"...","telefono":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

Si no registrat: mostra [MOSTRAR_OPCIONES].
Quan expressi intenció de reservar: inclou [MOSTRAR_OPCIONES].`,

      en: `BOOKING FLOW (follow this exact order):

Step 1 - Verify registration:
When the client expresses intent to book, ask:
"To make a booking I need to verify your identity. Are you registered on Khepria?"

If they say NO:
Reply: "You can register here: ${registroUrl}
It's quick and only requires your email and phone number. Once registered, come back and I'll book your appointment."

If they say YES:
Ask: "What is your registered phone number?"

Step 2 - Choose service.
Step 3 - Choose professional (optional).
Step 4 - Choose date (DD/MM/YYYY).
Step 5 - Choose time.
Step 6 - Confirm details.
Step 7 - When confirmed, add at the end on a single line:
[RESERVA:{"nombre":"...","telefono":"...","servicio":"...","trabajador":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

If not registered: show [MOSTRAR_OPCIONES].
When booking intent detected: include [MOSTRAR_OPCIONES].`,
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
      process.env.NEXT_PUBLIC_GEMINI_API_KEY!
    )

    if (!result.ok) {
      return NextResponse.json({ error: 'Error de IA' }, { status: 502 })
    }

    const d = result.data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const respuesta = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Lo siento, no pude procesar tu mensaje.'

    // Descontar 1 crédito por respuesta del chatbot (fire-and-forget)
    descontarCreditos(negocioId, 1, 'chatbot_respuesta', sb).catch(() => {})

    return NextResponse.json({ respuesta })
  } catch (e) {
    console.error('[chat-negocio]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
