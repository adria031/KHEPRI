import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from './supabase'
import { PLANES } from './planes'

export const CREDITOS_POR_PLAN: Record<string, number> = Object.fromEntries(
  Object.entries(PLANES).map(([k, v]) => [k, v.creditos]),
)

export const CREDITOS_ACCION = {
  chatbot_respuesta: 1,
  chatbot_reserva:   3,
  post_marketing:    5,
  analisis_resena:   3,
  consulta_fiscal:   5,
  prediccion:        10,
} as const

/**
 * Descuenta créditos del perfil del usuario propietario del negocio y registra el historial.
 * Los créditos son compartidos entre todos los negocios de un mismo usuario.
 * @returns true si se descontó correctamente, false si no hay créditos suficientes
 */
export async function descontarCreditos(
  negocio_id: string,
  cantidad: number,
  concepto: string,
  sb: SupabaseClient = defaultClient,
): Promise<boolean> {
  const { data: negocio } = await sb
    .from('negocios')
    .select('user_id')
    .eq('id', negocio_id)
    .single()

  if (!negocio) return false

  const { data: profile } = await sb
    .from('profiles')
    .select('creditos_totales, creditos_usados')
    .eq('id', negocio.user_id)
    .single()

  if (!profile) return false

  const totales     = profile.creditos_totales ?? 100
  const usados      = profile.creditos_usados  ?? 0
  const disponibles = totales - usados

  if (disponibles < cantidad) return false

  await Promise.all([
    sb.from('profiles')
      .update({ creditos_usados: usados + cantidad })
      .eq('id', negocio.user_id),
    sb.from('historial_creditos')
      .insert({ negocio_id, cantidad, concepto }),
  ])

  return true
}

/**
 * Obtiene el estado de créditos compartidos del usuario propietario del negocio.
 */
export async function obtenerCreditos(
  negocio_id: string,
  sb: SupabaseClient = defaultClient,
): Promise<{ totales: number; usados: number; disponibles: number; pct: number } | null> {
  const { data: negocio } = await sb
    .from('negocios')
    .select('user_id')
    .eq('id', negocio_id)
    .single()

  if (!negocio) return null

  const { data } = await sb
    .from('profiles')
    .select('creditos_totales, creditos_usados')
    .eq('id', negocio.user_id)
    .single()

  if (!data) return null

  const totales     = data.creditos_totales ?? 100
  const usados      = data.creditos_usados  ?? 0
  const disponibles = Math.max(0, totales - usados)
  const pct         = totales > 0 ? Math.round((disponibles / totales) * 100) : 0

  return { totales, usados, disponibles, pct }
}
