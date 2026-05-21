import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await props.params
  const { data: neg } = await serverSupabase()
    .from('negocios')
    .select('nombre, descripcion, logo_url, tipo, ciudad')
    .eq('id', id)
    .single()

  if (!neg) return { title: 'Negocio — Khepria' }

  const title = `${neg.nombre} — Reservar cita en Khepria`
  const description = (neg.descripcion as string | null)
    ?? `Reserva tu cita en ${neg.nombre}${neg.ciudad ? ` · ${neg.ciudad}` : ''}. Agenda online fácil y rápida con Khepria.`

  return {
    title,
    description,
    openGraph: {
      title: `${neg.nombre} — Reservar cita`,
      description,
      images: neg.logo_url ? [{ url: neg.logo_url as string }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function NegocioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
