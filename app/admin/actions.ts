'use server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'adria.gaitan.sola@gmail.com'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  // getUser() hace round-trip al servidor — más fiable que getSession() en producción
  const { data: { user }, error } = await client.auth.getUser()
  console.log('[admin] verifyAdmin user:', user?.email, 'error:', error?.message)
  if (error || !user || user.email !== ADMIN_EMAIL) {
    throw new Error('No autorizado: ' + (error?.message ?? user?.email ?? 'sin sesión'))
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type NegocioAdmin = {
  id: string; nombre: string; tipo: string | null; ciudad: string | null
  updated_at: string; activo: boolean | null; user_id: string
  plan: string | null; creditos_totales: number | null; creditos_usados: number | null
  owner_email: string | null; owner_nombre: string | null
}

export type PerfilAdmin = {
  id: string; nombre?: string | null; email?: string | null; tipo?: string | null
  plan?: string | null; creditos_totales?: number | null; creditos_usados?: number | null
}

export type WaitlistAdmin = {
  id: string; nombre?: string | null; email: string
  tipo_negocio?: string | null; ciudad?: string | null; created_at: string
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getAdminNegocios(): Promise<{ data: NegocioAdmin[]; error: string | null }> {
  try {
    await verifyAdmin()
  } catch (e) {
    console.error('[admin] getAdminNegocios verifyAdmin failed:', e)
    return { data: [], error: String(e) }
  }

  const [{ data: negs, error: negError }, { data: profs, error: profError }] = await Promise.all([
    sb().from('negocios')
      .select('id, nombre, tipo, ciudad, updated_at, activo, user_id, plan, creditos_totales, creditos_usados')
      .order('updated_at', { ascending: false }),
    sb().from('profiles').select('id, email, nombre'),
  ])

  console.log('[admin] negocios error:', negError, 'count:', negs?.length)
  console.log('[admin] profiles error:', profError, 'count:', profs?.length)

  if (negError) return { data: [], error: `negocios: ${JSON.stringify(negError)}` }

  const pm = new Map((profs ?? []).map(p => [p.id as string, p as { email: string | null; nombre: string | null }]))
  return {
    data: (negs ?? []).map(n => ({
      ...n,
      activo: n.activo as boolean | null,
      plan: n.plan as string | null,
      creditos_totales: n.creditos_totales as number | null,
      creditos_usados: n.creditos_usados as number | null,
      owner_email:  pm.get(n.user_id)?.email  ?? null,
      owner_nombre: pm.get(n.user_id)?.nombre ?? null,
    })),
    error: null,
  }
}

export async function getAdminClientes(): Promise<{ data: PerfilAdmin[]; error: string | null }> {
  try {
    await verifyAdmin()
  } catch (e) {
    console.error('[admin] getAdminClientes verifyAdmin failed:', e)
    return { data: [], error: String(e) }
  }

  const { data, error } = await sb()
    .from('profiles')
    .select('id, nombre, email, tipo, plan, creditos_totales, creditos_usados')
    .limit(500)

  console.log('[admin] clientes error:', error, 'count:', data?.length)

  if (error) return { data: [], error: `profiles: ${JSON.stringify(error)}` }
  return { data: (data ?? []) as PerfilAdmin[], error: null }
}

export async function getAdminWaitlist(): Promise<{ data: WaitlistAdmin[]; error: boolean }> {
  try {
    await verifyAdmin()
  } catch {
    return { data: [], error: true }
  }
  const { data, error } = await sb()
    .from('waitlist')
    .select('id, nombre, email, tipo_negocio, ciudad, created_at')
    .order('created_at', { ascending: false })
  return { data: (data ?? []) as WaitlistAdmin[], error: !!error }
}

export async function getAdminDashboard() {
  try {
    await verifyAdmin()
  } catch (e) {
    console.error('[admin] getAdminDashboard verifyAdmin failed:', e)
    return { negocios: [], totalClientes: 0, totalWaitlist: 0, error: String(e) }
  }
  const [{ data: negs }, { count: cProfiles }, { count: cWaitlist }] = await Promise.all([
    sb().from('negocios').select('id, updated_at, plan, activo').order('updated_at', { ascending: false }),
    sb().from('profiles').select('*', { count: 'exact', head: true }),
    sb().from('waitlist').select('*', { count: 'exact', head: true }),
  ])
  console.log('[admin] dashboard negs:', negs?.length, 'profiles:', cProfiles, 'waitlist:', cWaitlist)
  return {
    negocios:     (negs ?? []) as { id: string; updated_at: string; plan: string | null; activo: boolean | null }[],
    totalClientes: cProfiles ?? 0,
    totalWaitlist: cWaitlist ?? 0,
    error: null,
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function adminCambiarPlan(negId: string, userId: string, plan: string, creditos: number) {
  await verifyAdmin()
  await Promise.all([
    sb().from('negocios').update({ plan, creditos_totales: creditos, creditos_usados: 0 }).eq('id', negId),
    sb().from('profiles').update({ plan, creditos_totales: creditos, creditos_usados: 0 }).eq('id', userId),
  ])
}

export async function adminAnadirCreditos(negId: string, userId: string, nuevoTotal: number) {
  await verifyAdmin()
  await Promise.all([
    sb().from('negocios').update({ creditos_totales: nuevoTotal }).eq('id', negId),
    sb().from('profiles').update({ creditos_totales: nuevoTotal }).eq('id', userId),
  ])
}

export async function adminToggleActivo(negId: string, activo: boolean) {
  await verifyAdmin()
  await sb().from('negocios').update({ activo }).eq('id', negId)
}
