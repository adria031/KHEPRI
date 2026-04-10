import { supabase, createAuthClient } from './supabase'

export type NegMin = { id: string; nombre: string; plan: string }

/**
 * Fetch all negocios for a user, pick the active one from localStorage.
 * Always uses an explicit auth token to bypass cookie issues in production.
 */
export async function getNegocioActivo(userId: string, accessToken?: string): Promise<{
  activo: NegMin | null
  todos: NegMin[]
}> {
  let token = accessToken
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  }

  const client = token ? createAuthClient(token) : supabase

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
