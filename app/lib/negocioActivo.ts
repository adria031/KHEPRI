import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'

export type NegMin = { id: string; nombre: string; plan: string }

/**
 * Fetch all negocios for a user, pick the active one from localStorage.
 * Accepts an optional accessToken to pass auth explicitly (bypasses cookie issues).
 */
export async function getNegocioActivo(userId: string, accessToken?: string): Promise<{
  activo: NegMin | null
  todos: NegMin[]
}> {
  // If we have an explicit token, create a client with it to ensure auth works
  const client = accessToken
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      )
    : supabase

  const { data } = await client
    .from('negocios')
    .select('id, nombre, plan')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  const todos = (data as NegMin[]) || []
  if (todos.length === 0) return { activo: null, todos: [] }

  const saved = typeof window !== 'undefined'
    ? localStorage.getItem('negocio_activo_id')
    : null

  const activo = todos.find(n => n.id === saved) ?? todos[0]

  if (typeof window !== 'undefined') {
    localStorage.setItem('negocio_activo_id', activo.id)
  }

  return { activo, todos }
}
