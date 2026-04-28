import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from './supabase'

export const CREDITOS_POR_PLAN: Record<string, number> = {
  starter: 100,
  basico:  300,
  pro:     1000,
  plus:    5000,
  beta:    2000,
}

export const CREDITOS_ACCION = {
  chatbot_respuesta: 1,
  chatbot_reserva:   3,
  post_marketing:    5,
  analisis_resena:   3,
  consulta_fiscal:   5,
  prediccion:        10,
} as const

/**
 * Descuenta créditos de un negocio y registra el historial.
 * @param negocio_id UUID del negocio
 * @param cantidad   Número de créditos a descontar
 * @param concepto   Descripción de la acción (e.g. 'chatbot_respuesta')
 * @param sb         Cliente Supabase (usa el cliente browser por defecto;
 *                   pasa un cliente service-role en API routes)
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
    .select('creditos_totales, creditos_usados')
    .eq('id', negocio_id)
    .single()

  if (!negocio) return false

  const totales    = negocio.creditos_totales ?? 100
  const usados     = negocio.creditos_usados  ?? 0
  const disponibles = totales - usados

  if (disponibles < cantidad) return false

  await Promise.all([
    sb.from('negocios')
      .update({ creditos_usados: usados + cantidad })
      .eq('id', negocio_id),
    sb.from('historial_creditos')
      .insert({ negocio_id, cantidad, concepto }),
  ])

  return true
}

/**
 * Obtiene el estado de créditos de un negocio.
 */
export async function obtenerCreditos(
  negocio_id: string,
  sb: SupabaseClient = defaultClient,
): Promise<{ totales: number; usados: number; disponibles: number; pct: number } | null> {
  const { data } = await sb
    .from('negocios')
    .select('creditos_totales, creditos_usados')
    .eq('id', negocio_id)
    .single()

  if (!data) return null

  const totales     = data.creditos_totales ?? 100
  const usados      = data.creditos_usados  ?? 0
  const disponibles = Math.max(0, totales - usados)
  const pct         = totales > 0 ? Math.round((disponibles / totales) * 100) : 0

  return { totales, usados, disponibles, pct }
}
