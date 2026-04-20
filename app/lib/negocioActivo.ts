import { supabase } from './supabase'

export type NegMin = { id: string; nombre: string; plan: string; logo_url?: string | null }

export async function getNegocioActivo(userId: string, _accessToken?: string): Promise<{
  activo: NegMin | null
  todos: NegMin[]
}> {
  // Try with plan column first; fall back if column doesn't exist (400)
  let data: NegMin[] | null = null

  const { data: d1, error: e1 } = await supabase
    .from('negocios')
    .select('id, nombre, plan, logo_url')
    .eq('user_id', userId)
    .order('creado_en', { ascending: true })

  if (e1) {
    console.error('[getNegocioActivo] select error:', e1.code, e1.message, e1.hint)
    // If column "plan" doesn't exist (400), retry without it
    if (e1.code === 'PGRST204' || e1.code === '42703' || e1.message?.includes('plan') || e1.hint?.includes('plan') || String(e1).includes('400')) {
      const { data: d2, error: e2 } = await supabase
        .from('negocios')
        .select('id, nombre')
        .eq('user_id', userId)
        .order('creado_en', { ascending: true })
      if (e2) {
        console.error('[getNegocioActivo] fallback error:', e2.code, e2.message)
        return { activo: null, todos: [] }
      }
      data = ((d2 || []) as { id: string; nombre: string }[]).map(n => ({ ...n, plan: 'basico' }))
    } else {
      return { activo: null, todos: [] }
    }
  } else {
    data = (d1 as NegMin[]) || []
  }

  const todos = data || []
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
