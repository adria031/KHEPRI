import { supabase } from './supabase'

export type NegMin = { id: string; nombre: string; plan: string }

export async function getNegocioActivo(userId: string, _accessToken?: string): Promise<{
  activo: NegMin | null
  todos: NegMin[]
}> {
  const { data, error } = await supabase
    .from('negocios')
    .select('id, nombre, plan')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getNegocioActivo] error:', JSON.stringify(error))
    return { activo: null, todos: [] }
  }

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
