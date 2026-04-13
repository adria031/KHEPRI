import { supabase } from './supabase'

const diasNombre = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']

function generarSlots(apertura: string, cierre: string, duracion: number): string[] {
  if (!apertura || !cierre || duracion <= 0) return []
  const [ah, am] = apertura.split(':').map(Number)
  const [ch, cm] = cierre.split(':').map(Number)
  let mins = ah * 60 + am
  const finMins = ch * 60 + cm
  const slots: string[] = []
  while (mins + duracion <= finMins) {
    slots.push(`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`)
    mins += duracion
  }
  return slots
}

export async function verificarDisponibilidad(params: {
  negocio_id: string
  fecha: string
  hora: string
  servicio_id: string
  trabajador_id?: string | null
}): Promise<{ disponible: boolean; razon?: string; slots_sugeridos?: string[] }> {
  const { negocio_id, fecha, hora, servicio_id, trabajador_id } = params

  const { data: servicio } = await supabase
    .from('servicios').select('duracion').eq('id', servicio_id).single()
  if (!servicio) return { disponible: false, razon: 'Servicio no encontrado' }

  const [y, m, d] = fecha.split('-').map(Number)
  const diaNombre = diasNombre[new Date(y, m - 1, d).getDay()]
  const { data: horario } = await supabase
    .from('horarios').select('*').eq('negocio_id', negocio_id).eq('dia', diaNombre).single()
  if (!horario || !horario.abierto) {
    return { disponible: false, razon: `El negocio no abre el ${diaNombre}` }
  }

  const s1 = generarSlots(horario.hora_apertura, horario.hora_cierre, servicio.duracion)
  const s2 = horario.hora_apertura2
    ? generarSlots(horario.hora_apertura2, horario.hora_cierre2, servicio.duracion)
    : []
  const todosSlots = [...s1, ...s2]

  if (!todosSlots.includes(hora)) {
    return {
      disponible: false,
      razon: `La hora ${hora} no es válida para ese servicio`,
      slots_sugeridos: todosSlots.slice(0, 8),
    }
  }

  let query = supabase
    .from('reservas')
    .select('id')
    .eq('negocio_id', negocio_id)
    .eq('fecha', fecha)
    .eq('hora', hora)
    .in('estado', ['pendiente', 'confirmada'])

  if (trabajador_id) {
    query = query.eq('trabajador_id', trabajador_id)
  }

  const { data: existentes } = await query
  if (existentes && existentes.length > 0) {
    const otras = todosSlots.filter(s => s !== hora)
    return {
      disponible: false,
      razon: `Ya hay una reserva a las ${hora}${trabajador_id ? ' con ese profesional' : ''}`,
      slots_sugeridos: otras.slice(0, 6),
    }
  }

  return { disponible: true }
}

export async function crearReserva(params: {
  negocio_id: string
  servicio_id: string
  trabajador_id?: string | null
  fecha: string
  hora: string
  cliente_nombre: string
  cliente_telefono: string
  cliente_email?: string | null
}): Promise<{ ok: boolean; mensaje: string; reserva_id?: string }> {
  const check = await verificarDisponibilidad({
    negocio_id: params.negocio_id,
    fecha: params.fecha,
    hora: params.hora,
    servicio_id: params.servicio_id,
    trabajador_id: params.trabajador_id,
  })
  if (!check.disponible) {
    const sugerencia = check.slots_sugeridos?.length
      ? ` Horas disponibles: ${check.slots_sugeridos.join(', ')}.`
      : ''
    return { ok: false, mensaje: `No disponible: ${check.razon}.${sugerencia}` }
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      negocio_id: params.negocio_id,
      servicio_id: params.servicio_id || null,
      trabajador_id: params.trabajador_id || null,
      cliente_nombre: params.cliente_nombre,
      cliente_telefono: params.cliente_telefono,
      cliente_email: params.cliente_email || null,
      fecha: params.fecha,
      hora: params.hora,
      estado: 'confirmada',
    })
    .select('id')
    .single()

  if (error) return { ok: false, mensaje: `Error al guardar: ${error.message}` }

  // Fire confirmation email (non-blocking)
  if (data?.id) {
    supabase.functions.invoke('send-reservation-email', {
      body: { reserva_id: data.id },
    }).catch(() => {})
  }

  return { ok: true, mensaje: `Reserva confirmada para el ${params.fecha} a las ${params.hora}.`, reserva_id: data?.id }
}

export async function buscarReservas(params: {
  negocio_id: string
  telefono: string
}): Promise<{ reservas: Array<{ id: string; fecha: string; hora: string; servicio: string; estado: string }> }> {
  const { data } = await supabase
    .from('reservas')
    .select('id, fecha, hora, estado, servicios(nombre)')
    .eq('negocio_id', params.negocio_id)
    .eq('cliente_telefono', params.telefono)
    .in('estado', ['pendiente', 'confirmada'])
    .order('fecha', { ascending: true })

  const reservas = (data as any[] || []).map(r => ({
    id: r.id,
    fecha: r.fecha,
    hora: r.hora,
    servicio: r.servicios?.nombre || 'Servicio',
    estado: r.estado,
  }))
  return { reservas }
}

export async function cancelarReserva(params: {
  reserva_id: string
}): Promise<{ ok: boolean; mensaje: string }> {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', params.reserva_id)
  if (error) return { ok: false, mensaje: `Error: ${error.message}` }
  return { ok: true, mensaje: 'Reserva cancelada correctamente.' }
}

export const FUNCTION_DECLARATIONS = [
  {
    name: 'verificarDisponibilidad',
    description: 'Verifica si un horario concreto está disponible antes de crear una reserva. OBLIGATORIO llamar a esta función antes de crearReserva.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fecha: { type: 'STRING', description: 'Fecha en formato YYYY-MM-DD' },
        hora: { type: 'STRING', description: 'Hora en formato HH:MM' },
        servicio_id: { type: 'STRING', description: 'ID del servicio seleccionado' },
        trabajador_id: { type: 'STRING', description: 'ID del trabajador (opcional, omitir si sin preferencia)' },
      },
      required: ['fecha', 'hora', 'servicio_id'],
    },
  },
  {
    name: 'crearReserva',
    description: 'Crea una reserva en el sistema. Solo llamar tras confirmar disponibilidad con verificarDisponibilidad.',
    parameters: {
      type: 'OBJECT',
      properties: {
        servicio_id: { type: 'STRING', description: 'ID del servicio' },
        trabajador_id: { type: 'STRING', description: 'ID del trabajador (opcional)' },
        fecha: { type: 'STRING', description: 'Fecha YYYY-MM-DD' },
        hora: { type: 'STRING', description: 'Hora HH:MM' },
        cliente_nombre: { type: 'STRING', description: 'Nombre completo del cliente' },
        cliente_telefono: { type: 'STRING', description: 'Teléfono del cliente' },
        cliente_email: { type: 'STRING', description: 'Email del cliente para enviar confirmación (opcional)' },
      },
      required: ['servicio_id', 'fecha', 'hora', 'cliente_nombre', 'cliente_telefono'],
    },
  },
  {
    name: 'buscarReservas',
    description: 'Busca reservas activas de un cliente por su número de teléfono',
    parameters: {
      type: 'OBJECT',
      properties: {
        telefono: { type: 'STRING', description: 'Teléfono del cliente' },
      },
      required: ['telefono'],
    },
  },
  {
    name: 'cancelarReserva',
    description: 'Cancela una reserva existente. Requiere el ID de la reserva (obtenible con buscarReservas).',
    parameters: {
      type: 'OBJECT',
      properties: {
        reserva_id: { type: 'STRING', description: 'ID de la reserva a cancelar' },
      },
      required: ['reserva_id'],
    },
  },
]
