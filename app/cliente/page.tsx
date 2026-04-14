'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Suspense } from 'react'

const MapaNegocios = dynamic(() => import('./MapaNegocios'), { ssr: false, loading: () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDF2F8', color: '#9CA3AF', fontSize: '14px', fontWeight: 600 }}>Cargando mapa...</div>
) })

const categorias = [
  { id: 'todos',       label: 'Todos',       emoji: '✨' },
  { id: 'peluqueria',  label: 'Peluquería',  emoji: '💈' },
  { id: 'estetica',    label: 'Estética',    emoji: '💅' },
  { id: 'spa',         label: 'Spa',         emoji: '💆' },
  { id: 'clinica',     label: 'Clínica',     emoji: '🏥' },
  { id: 'yoga',        label: 'Yoga',        emoji: '🧘' },
  { id: 'gimnasio',    label: 'Gimnasio',    emoji: '🏋️' },
  { id: 'dentista',    label: 'Dentista',    emoji: '🦷' },
  { id: 'veterinaria', label: 'Veterinaria', emoji: '🐾' },
  { id: 'restaurante', label: 'Restaurante', emoji: '🍕' },
]

const tipoConfig: Record<string, { emoji: string; bg: string; grad: string }> = {
  peluqueria:  { emoji: '💈', bg: 'rgba(184,216,248,0.35)', grad: 'linear-gradient(135deg,#B8D8F8,#93C5FD)' },
  barberia:    { emoji: '✂️', bg: 'rgba(184,216,248,0.35)', grad: 'linear-gradient(135deg,#B8D8F8,#93C5FD)' },
  estetica:    { emoji: '💅', bg: 'rgba(251,207,232,0.35)', grad: 'linear-gradient(135deg,#FBCFE8,#F9A8D4)' },
  spa:         { emoji: '💆', bg: 'rgba(212,197,249,0.35)', grad: 'linear-gradient(135deg,#D4C5F9,#C4B5FD)' },
  clinica:     { emoji: '🏥', bg: 'rgba(184,237,212,0.35)', grad: 'linear-gradient(135deg,#B8EDD4,#6EE7B7)' },
  yoga:        { emoji: '🧘', bg: 'rgba(184,237,212,0.35)', grad: 'linear-gradient(135deg,#B8EDD4,#6EE7B7)' },
  gimnasio:    { emoji: '🏋️', bg: 'rgba(253,233,162,0.35)', grad: 'linear-gradient(135deg,#FDE9A2,#FCD34D)' },
  dentista:    { emoji: '🦷', bg: 'rgba(253,233,162,0.35)', grad: 'linear-gradient(135deg,#FDE9A2,#FCD34D)' },
  veterinaria: { emoji: '🐾', bg: 'rgba(184,237,212,0.35)', grad: 'linear-gradient(135deg,#B8EDD4,#6EE7B7)' },
  restaurante: { emoji: '🍕', bg: 'rgba(251,207,232,0.35)', grad: 'linear-gradient(135deg,#FBCFE8,#F9A8D4)' },
}
const tipoDefault = { emoji: '🏪', bg: 'rgba(184,216,248,0.2)', grad: 'linear-gradient(135deg,#E5E7EB,#D1D5DB)' }

type Negocio = { id: string; nombre: string; tipo: string; ciudad: string; logo_url: string | null; fotos: string[] | null; lat: number | null; lng: number | null; descripcion: string | null; visible: boolean | null }
type ReservaCliente = { id: string; fecha: string; hora: string; estado: string; negocio_nombre: string; servicio_nombre: string; negocio_tipo: string }
type HorarioDB = { negocio_id: string; dia: string; abierto: boolean; hora_apertura: string; hora_cierre: string; hora_apertura2: string | null; hora_cierre2: string | null }
type Filtro = 'ninguno' | 'abierto' | 'valorados' | 'cercanos'

const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']

function norm(s: string) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
function normTipo(tipo: string): string {
  const t = norm(tipo)
  if (t.includes('peluq') || t.includes('barber')) return 'peluqueria'
  if (t.includes('estet') || t.includes('beauty')) return 'estetica'
  if (t.includes('spa')   || t.includes('masaj'))  return 'spa'
  if (t.includes('clinic')|| t.includes('medic'))  return 'clinica'
  if (t.includes('yoga')  || t.includes('pilates'))return 'yoga'
  if (t.includes('gimnas'))                         return 'gimnasio'
  if (t.includes('dentis')|| t.includes('dental')) return 'dentista'
  if (t.includes('veterin'))                        return 'veterinaria'
  if (t.includes('restaur')|| t.includes('cafet')) return 'restaurante'
  return t
}
function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function estaAbierto(horarios: HorarioDB[]): boolean {
  const ahora = new Date()
  const diaHoy = DIAS[ahora.getDay()]
  const minActual = ahora.getHours() * 60 + ahora.getMinutes()
  const h = horarios.find(h => h.dia === diaHoy && h.abierto)
  if (!h) return false
  const t1 = h.hora_apertura && h.hora_cierre && minActual >= toMins(h.hora_apertura) && minActual < toMins(h.hora_cierre)
  const t2 = h.hora_apertura2 && h.hora_cierre2 && minActual >= toMins(h.hora_apertura2) && minActual < toMins(h.hora_cierre2)
  return !!(t1 || t2)
}
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = (x: number) => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const tabs = [
  { id: 'inicio',   icon: '🏠', label: 'Inicio' },
  { id: 'mapa',     icon: '🗺️', label: 'Mapa' },
  { id: 'reservas', icon: '📅', label: 'Reservas' },
  { id: 'favoritos',icon: '❤️', label: 'Favoritos' },
  { id: 'perfil',   icon: '👤', label: 'Perfil' },
]

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

function ClienteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabActiva = (searchParams?.get('tab') || 'inicio') as string
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('Usuario')
  const [favs, setFavs] = useState<string[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [cargandoNegocios, setCargandoNegocios] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('ninguno')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [horariosPorNeg, setHorariosPorNeg] = useState<Record<string, HorarioDB[]>>({})
  const [valPorNeg, setValPorNeg] = useState<Record<string, number>>({})
  const [reservas, setReservas] = useState<ReservaCliente[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      if (user.user_metadata?.nombre) setNombreUsuario(user.user_metadata.nombre.split(' ')[0])
      const { data: resData } = await supabase
        .from('reservas')
        .select('id,fecha,hora,estado,negocios(nombre,tipo),servicios(nombre)')
        .eq('cliente_email', user.email)
        .in('estado', ['pendiente','confirmada'])
        .gte('fecha', new Date().toISOString().slice(0,10))
        .order('fecha', { ascending: true })
        .limit(10)
      if (resData) {
        setReservas((resData as any[]).map(r => ({
          id: r.id, fecha: r.fecha, hora: r.hora, estado: r.estado,
          negocio_nombre: r.negocios?.nombre || 'Negocio',
          servicio_nombre: r.servicios?.nombre || 'Servicio',
          negocio_tipo: r.negocios?.tipo || '',
        })))
      }
    })
    Promise.all([
      supabase.from('negocios').select('id,nombre,tipo,ciudad,logo_url,fotos,lat,lng,descripcion,visible'),
      supabase.from('horarios').select('negocio_id,dia,abierto,hora_apertura,hora_cierre,hora_apertura2,hora_cierre2'),
      supabase.from('resenas').select('negocio_id,valoracion'),
    ]).then(([{ data: negs }, { data: hors }, { data: ress }]) => {
      if (negs) setNegocios(negs.filter((n: any) => n.visible !== false))
      if (hors) {
        const map: Record<string, HorarioDB[]> = {}
        for (const h of hors as HorarioDB[]) {
          if (!map[h.negocio_id]) map[h.negocio_id] = []
          map[h.negocio_id].push(h)
        }
        setHorariosPorNeg(map)
      }
      if (ress) {
        const sums: Record<string, { total: number; count: number }> = {}
        for (const r of ress as { negocio_id: string; valoracion: number }[]) {
          if (!sums[r.negocio_id]) sums[r.negocio_id] = { total: 0, count: 0 }
          sums[r.negocio_id].total += r.valoracion
          sums[r.negocio_id].count++
        }
        const avg: Record<string, number> = {}
        for (const [id, s] of Object.entries(sums)) avg[id] = Math.round((s.total / s.count) * 10) / 10
        setValPorNeg(avg)
      }
      setCargandoNegocios(false)
    })
  }, [])

  const irTab = useCallback((tab: string) => { router.push(`/cliente?tab=${tab}`) }, [router])

  let negociosFiltrados = negocios.filter(n => {
    const matchCat  = categoriaActiva === 'todos' || normTipo(n.tipo || '') === categoriaActiva
    const q = norm(busqueda)
    const matchBusq = !q || norm(n.nombre).includes(q)
    return matchCat && matchBusq
  })
  if (filtro === 'abierto') {
    negociosFiltrados = negociosFiltrados.filter(n => estaAbierto(horariosPorNeg[n.id] || []))
  } else if (filtro === 'valorados') {
    negociosFiltrados = [...negociosFiltrados].sort((a, b) => (valPorNeg[b.id] ?? 0) - (valPorNeg[a.id] ?? 0))
  } else if (filtro === 'cercanos' && userPos) {
    negociosFiltrados = [...negociosFiltrados]
      .filter(n => n.lat != null && n.lng != null)
      .sort((a, b) => haversineKm(userPos.lat, userPos.lng, a.lat!, a.lng!) - haversineKm(userPos.lat, userPos.lng, b.lat!, b.lng!))
  }

  function handleFiltro(f: Filtro) {
    if (filtro === f) { setFiltro('ninguno'); return }
    if (f === 'cercanos') {
      if (userPos) { setFiltro('cercanos'); return }
      navigator.geolocation?.getCurrentPosition(
        pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setFiltro('cercanos') },
        ()  => { setGeoError(true); setTimeout(() => setGeoError(false), 3000) },
        { timeout: 8000 }
      )
      return
    }
    setFiltro(f)
  }

  const toggleFav = (id: string) => setFavs(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#111827' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #F7F9FC !important; color: #111827 !important; color-scheme: light only !important; }

        /* NAV */
        .topnav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 14px 48px; background: rgba(255,255,255,0.96); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.07); }
        .topnav-links { display: flex; gap: 28px; }
        .topnav-links a { color: #6B7280; text-decoration: none; font-size: 14px; font-weight: 600; transition: color 0.15s; }
        .topnav-links a:hover, .topnav-links a.active { color: #111827; }
        .topnav-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #1D4ED8; text-decoration: none; }

        /* HERO */
        .hero { background: linear-gradient(160deg, #EFF6FF 0%, #F5F3FF 50%, #ECFDF5 100%); padding: 36px 48px 32px; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -60px; right: -60px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(184,216,248,0.5) 0%, transparent 70%); pointer-events: none; }
        .hero::after  { content: ''; position: absolute; bottom: -40px; left: 10%; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(212,197,249,0.4) 0%, transparent 70%); pointer-events: none; }
        .greeting { font-size: 13px; color: #6B7280; font-weight: 600; margin-bottom: 6px; letter-spacing: 0.2px; }
        .htitle { font-size: clamp(22px, 3vw, 32px); font-weight: 800; color: #111827; letter-spacing: -0.8px; line-height: 1.2; margin-bottom: 22px; }
        .htitle span { background: linear-gradient(135deg, #1D4ED8, #7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* SEARCH */
        .searchbar { display: flex; align-items: center; gap: 10px; background: white; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 14px 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 600px; transition: box-shadow 0.2s, border-color 0.2s; }
        .searchbar:focus-within { border-color: #1D4ED8; box-shadow: 0 4px 24px rgba(29,78,216,0.12); }
        .searchbar input { flex: 1; border: none; background: transparent; font-family: inherit; font-size: 15px; color: #111827; outline: none; font-weight: 500; }
        .searchbar input::placeholder { color: #9CA3AF; font-weight: 400; }

        /* CATEGORIES */
        .cats-wrap { background: white; border-bottom: 1px solid rgba(0,0,0,0.07); padding: 0 48px; }
        .cats { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 14px 0; }
        .cats::-webkit-scrollbar { display: none; }
        .cat { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 16px; border-radius: 14px; border: 1.5px solid transparent; background: transparent; font-family: inherit; font-size: 11px; font-weight: 700; color: #6B7280; white-space: nowrap; flex-shrink: 0; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.3px; }
        .cat-emoji { font-size: 22px; line-height: 1; }
        .cat:hover { background: #F7F9FC; color: #111827; }
        .cat.active { background: #111827; color: white; border-color: #111827; }
        .cat.active .cat-emoji { filter: grayscale(0); }

        /* FILTERS */
        .filtros-wrap { padding: 12px 48px; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; background: #F7F9FC; }
        .filtros-wrap::-webkit-scrollbar { display: none; }
        .filtro-chip { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 100px; border: 1.5px solid rgba(0,0,0,0.1); background: white; font-family: inherit; font-size: 12px; font-weight: 700; color: #4B5563; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
        .filtro-chip:hover { border-color: #111827; color: #111827; }
        .filtro-chip.active { background: #111827; border-color: #111827; color: white; }

        /* CONTENT */
        .content { padding: 24px 48px 120px; }

        /* CITAS SCROLL */
        .citas-scroll { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; margin-bottom: 32px; }
        .citas-scroll::-webkit-scrollbar { display: none; }
        .cita-card { background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 18px; padding: 16px; min-width: 190px; flex-shrink: 0; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }

        /* NEG GRID */
        .neg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

        /* NEG CARD */
        .neg-card { background: white; border-radius: 20px; overflow: hidden; border: 1px solid rgba(0,0,0,0.07); box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; display: block; text-decoration: none; color: inherit; }
        .neg-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.12); }
        .neg-cover { position: relative; width: 100%; aspect-ratio: 4/3; overflow: hidden; }
        .neg-cover-img { width: 100%; height: 100%; object-fit: cover; }
        .neg-cover-grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%); }
        .neg-cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 52px; }
        .neg-badge-open  { position: absolute; top: 12px; left: 12px; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px; background: rgba(34,197,94,0.92); color: white; backdrop-filter: blur(4px); }
        .neg-badge-closed{ position: absolute; top: 12px; left: 12px; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px; background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.8); backdrop-filter: blur(4px); }
        .neg-fav { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; font-size: 16px; border: none; cursor: pointer; transition: transform 0.15s; }
        .neg-fav:hover { transform: scale(1.15); }
        .neg-logo { position: absolute; bottom: -18px; left: 14px; width: 40px; height: 40px; border-radius: 12px; border: 3px solid white; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .neg-body { padding: 26px 14px 14px; }
        .neg-nombre { font-size: 15px; font-weight: 800; color: #111827; margin-bottom: 4px; line-height: 1.3; }
        .neg-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .neg-tipo-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 100px; }
        .neg-ciudad { font-size: 12px; color: #9CA3AF; font-weight: 500; }
        .neg-rating { font-size: 12px; font-weight: 700; color: #92400E; }
        .neg-dist { font-size: 12px; color: #9CA3AF; font-weight: 500; }
        .neg-btn { display: block; width: 100%; padding: 10px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; transition: background 0.15s; }
        .neg-btn:hover { background: #1D4ED8; }

        /* SECTION HEADER */
        .sec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .sec-title { font-size: 19px; font-weight: 800; color: #111827; letter-spacing: -0.4px; }
        .sec-link { font-size: 13px; color: #1D4ED8; font-weight: 700; text-decoration: none; }

        /* RES FULL */
        .res-full { background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 18px; padding: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

        /* PERFIL */
        .perfil-head { display: flex; align-items: center; gap: 16px; background: linear-gradient(135deg,#EFF6FF,#F5F3FF); border: 1px solid rgba(0,0,0,0.07); border-radius: 20px; padding: 24px; margin-bottom: 16px; }
        .perfil-av { width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg,#B8D8F8,#D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #1D4ED8; flex-shrink: 0; box-shadow: 0 4px 12px rgba(29,78,216,0.2); }
        .perfil-menu { background: white; border: 1px solid rgba(0,0,0,0.07); border-radius: 18px; overflow: hidden; margin-bottom: 12px; }
        .perfil-item { display: flex; align-items: center; gap: 14px; padding: 15px 18px; border-bottom: 1px solid rgba(0,0,0,0.06); text-decoration: none; transition: background 0.12s; }
        .perfil-item:last-child { border-bottom: none; }
        .perfil-item:hover { background: #F9FAFB; }

        /* BOTTOM NAV */
        .botnav { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.97); border-top: 1px solid rgba(0,0,0,0.08); z-index: 100; backdrop-filter: blur(20px); }
        .botnav-inner { display: flex; align-items: center; padding: 6px 0 max(8px, env(safe-area-inset-bottom)); }
        .botnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 4px; text-decoration: none; }
        .botnav-icon { font-size: 22px; line-height: 1; }
        .botnav-label { font-size: 10px; font-weight: 700; color: #9CA3AF; letter-spacing: 0.2px; }
        .botnav-item.active .botnav-label { color: #111827; }
        .botnav-dot { width: 4px; height: 4px; border-radius: 50%; background: #111827; margin: 1px auto 0; }

        /* GEO TOAST */
        .geo-toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: #1F2937; color: white; padding: 10px 20px; border-radius: 100px; font-size: 13px; font-weight: 700; z-index: 200; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

        /* RESPONSIVE */
        @media (max-width: 1024px) { .neg-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 768px) {
          .topnav { padding: 12px 20px; }
          .topnav-links { display: none; }
          .hero { padding: 24px 20px 24px; }
          .cats-wrap { padding: 0 20px; }
          .filtros-wrap { padding: 10px 20px; }
          .content { padding: 20px 20px 110px; }
          .neg-grid { grid-template-columns: repeat(2,1fr); gap: 12px; }
          .botnav { display: block; }
        }
        @media (max-width: 480px) {
          .neg-grid { grid-template-columns: 1fr; }
          .searchbar input { font-size: 16px; }
        }
      `}</style>

      {/* TOP NAV */}
      <div className="topnav">
        <Link href="/" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <div className="topnav-links">
          {tabs.slice(0,4).map(t => (
            <Link key={t.id} href={`/cliente?tab=${t.id}`} className={tabActiva === t.id ? 'active' : ''}>{t.label}</Link>
          ))}
        </div>
        <Link href="/cliente?tab=perfil" className="topnav-avatar">{nombreUsuario.charAt(0).toUpperCase()}</Link>
      </div>

      <div style={{paddingTop:'62px', minHeight:'100vh'}}>

        {/* ─────────── INICIO ─────────── */}
        {tabActiva === 'inicio' && (
          <>
            {/* HERO */}
            <div className="hero">
              <div className="greeting">{saludo} 👋</div>
              <div className="htitle">Hola, <span>{nombreUsuario}</span>.<br/>¿Qué buscas hoy?</div>
              <div className="searchbar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  placeholder="Buscar negocios..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',fontSize:'16px',lineHeight:1,padding:0}}>✕</button>
                )}
              </div>
            </div>

            {/* CATEGORIES */}
            <div className="cats-wrap">
              <div className="cats">
                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    className={`cat ${categoriaActiva === cat.id ? 'active' : ''}`}
                    onClick={() => setCategoriaActiva(cat.id)}
                  >
                    <span className="cat-emoji">{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FILTERS */}
            <div className="filtros-wrap">
              <button className={`filtro-chip ${filtro==='abierto'  ?'active':''}`} onClick={()=>handleFiltro('abierto')}>🟢 Abierto ahora</button>
              <button className={`filtro-chip ${filtro==='valorados'?'active':''}`} onClick={()=>handleFiltro('valorados')}>⭐ Mejor valorados</button>
              <button className={`filtro-chip ${filtro==='cercanos' ?'active':''}`} onClick={()=>handleFiltro('cercanos')}>📍 Más cercanos</button>
              {filtro !== 'ninguno' && (
                <button className="filtro-chip" style={{color:'#DC2626',borderColor:'rgba(220,38,38,0.2)'}} onClick={()=>setFiltro('ninguno')}>✕ Limpiar</button>
              )}
            </div>
            {geoError && <div className="geo-toast">📍 Activa la ubicación para ver los más cercanos</div>}

            <div className="content">

              {/* CITAS */}
              {reservas.length > 0 && !busqueda && categoriaActiva === 'todos' && (
                <>
                  <div className="sec-header">
                    <span className="sec-title">Tus próximas citas</span>
                    <Link href="/cliente?tab=reservas" className="sec-link">Ver todas →</Link>
                  </div>
                  <div className="citas-scroll">
                    {reservas.slice(0,5).map(r => {
                      const cfg = tipoConfig[normTipo(r.negocio_tipo||'')] || tipoDefault
                      return (
                        <div key={r.id} className="cita-card">
                          <div style={{width:'38px',height:'38px',borderRadius:'12px',background:cfg.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',marginBottom:'10px'}}>{cfg.emoji}</div>
                          <div style={{fontSize:'13px',fontWeight:800,color:'#111827',marginBottom:'2px'}}>{r.negocio_nombre}</div>
                          <div style={{fontSize:'12px',color:'#9CA3AF',marginBottom:'10px'}}>{r.servicio_nombre}</div>
                          <div style={{fontSize:'11px',fontWeight:700,padding:'5px 10px',borderRadius:'8px',background:cfg.bg,color:'#374151',display:'inline-flex',alignItems:'center',gap:'4px'}}>📅 {r.fecha} · {r.hora}</div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* NEGOCIOS */}
              <div className="sec-header">
                <span className="sec-title">
                  {busqueda ? `"${busqueda}"` : categoriaActiva === 'todos' ? 'Descubre negocios' : categorias.find(c=>c.id===categoriaActiva)?.label}
                </span>
                <Link href="/cliente?tab=mapa" className="sec-link">Ver en mapa →</Link>
              </div>

              {cargandoNegocios ? (
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px'}}>
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} style={{borderRadius:'20px',overflow:'hidden',background:'white',border:'1px solid rgba(0,0,0,0.07)'}}>
                      <div style={{width:'100%',aspectRatio:'4/3',background:'linear-gradient(90deg,#F3F4F6 25%,#E9EAEC 50%,#F3F4F6 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite'}} />
                      <div style={{padding:'24px 14px 14px'}}>
                        <div style={{height:'14px',borderRadius:'8px',background:'#F3F4F6',marginBottom:'8px',width:'70%'}} />
                        <div style={{height:'12px',borderRadius:'8px',background:'#F3F4F6',width:'50%'}} />
                      </div>
                    </div>
                  ))}
                  <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                </div>
              ) : negocios.length === 0 ? (
                <div style={{textAlign:'center',padding:'80px 20px'}}>
                  <div style={{width:'96px',height:'96px',borderRadius:'28px',background:'linear-gradient(135deg,#EFF6FF,#F5F3FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'48px',margin:'0 auto 20px'}}>🏙️</div>
                  <div style={{fontSize:'20px',fontWeight:800,color:'#111827',marginBottom:'8px',letterSpacing:'-0.4px'}}>Descubre negocios cerca de ti</div>
                  <div style={{fontSize:'14px',color:'#9CA3AF',maxWidth:'260px',margin:'0 auto',lineHeight:1.6}}>Pronto habrá más negocios disponibles en tu zona</div>
                </div>
              ) : negociosFiltrados.length === 0 ? (
                <div style={{textAlign:'center',padding:'80px 20px'}}>
                  <div style={{width:'80px',height:'80px',borderRadius:'24px',background:'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'40px',margin:'0 auto 20px'}}>🔍</div>
                  <div style={{fontSize:'18px',fontWeight:800,color:'#111827',marginBottom:'8px'}}>Sin resultados</div>
                  <div style={{fontSize:'14px',color:'#9CA3AF'}}>Prueba con otro nombre o categoría</div>
                </div>
              ) : (
                <div className="neg-grid">
                  {negociosFiltrados.map(n => {
                    const cfg      = tipoConfig[normTipo(n.tipo||'')] || tipoDefault
                    const portada  = (n.fotos && n.fotos[0]) || null
                    const logo     = n.logo_url
                    const abierto  = estaAbierto(horariosPorNeg[n.id] || [])
                    const rating   = valPorNeg[n.id]
                    const dist     = userPos && n.lat && n.lng ? haversineKm(userPos.lat, userPos.lng, n.lat, n.lng) : null
                    const horsTiene = (horariosPorNeg[n.id]||[]).length > 0
                    return (
                      <Link key={n.id} href={`/negocio/${n.id}`} className="neg-card">
                        {/* COVER */}
                        <div className="neg-cover">
                          {portada
                            ? <img src={portada} alt={n.nombre} className="neg-cover-img" />
                            : <div className="neg-cover-placeholder" style={{background:cfg.grad}}>{cfg.emoji}</div>
                          }
                          {portada && <div className="neg-cover-grad" />}

                          {/* badge abierto/cerrado */}
                          {horsTiene && (
                            <span className={abierto ? 'neg-badge-open' : 'neg-badge-closed'}>
                              {abierto ? '● Abierto' : '● Cerrado'}
                            </span>
                          )}

                          {/* favorito */}
                          <button
                            className="neg-fav"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(n.id) }}
                          >
                            {favs.includes(n.id) ? '❤️' : '🤍'}
                          </button>

                          {/* logo superpuesto */}
                          <div className="neg-logo" style={{background: logo ? 'white' : cfg.bg}}>
                            {logo
                              ? <img src={logo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                              : cfg.emoji}
                          </div>
                        </div>

                        {/* BODY */}
                        <div className="neg-body">
                          <div className="neg-nombre">{n.nombre}</div>
                          <div className="neg-meta">
                            <span className="neg-tipo-badge" style={{background:cfg.bg,color:'#374151'}}>{n.tipo?.replace(/^[^\w\s]*\s*/,'')}</span>
                            {n.ciudad && <span className="neg-ciudad">📍 {n.ciudad}</span>}
                            {rating != null && <span className="neg-rating">⭐ {rating}</span>}
                            {dist != null && <span className="neg-dist">{dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}</span>}
                          </div>
                          <Link href={`/negocio/${n.id}`} className="neg-btn" onClick={e=>e.stopPropagation()}>Reservar →</Link>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ─────────── MAPA ─────────── */}
        {tabActiva === 'mapa' && (
          <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 62px)'}}>
            <MapaNegocios
              negocios={negocios.filter(n=>n.lat!=null&&n.lng!=null).map(n=>({id:n.id,nombre:n.nombre,tipo:n.tipo,ciudad:n.ciudad,logo_url:n.logo_url,lat:n.lat!,lng:n.lng!}))}
              valPorNeg={valPorNeg}
              userPos={userPos}
            />
          </div>
        )}

        {/* ─────────── RESERVAS ─────────── */}
        {tabActiva === 'reservas' && (
          <div className="content">
            <div style={{fontSize:'24px',fontWeight:800,color:'#111827',marginBottom:'4px',letterSpacing:'-0.5px'}}>Mis reservas</div>
            <div style={{fontSize:'14px',color:'#9CA3AF',marginBottom:'20px'}}>Tus próximas citas</div>
            {reservas.length === 0 ? (
              <div style={{textAlign:'center',padding:'80px 20px'}}>
                <div style={{width:'88px',height:'88px',borderRadius:'26px',background:'linear-gradient(135deg,#EFF6FF,#F5F3FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'42px',margin:'0 auto 20px'}}>📅</div>
                <div style={{fontSize:'20px',fontWeight:800,color:'#111827',marginBottom:'8px'}}>Sin reservas próximas</div>
                <div style={{fontSize:'14px',color:'#9CA3AF',marginBottom:'24px'}}>Reserva una cita en cualquier negocio</div>
                <Link href="/cliente?tab=inicio" style={{display:'inline-block',padding:'14px 28px',background:'#111827',color:'white',borderRadius:'14px',textDecoration:'none',fontSize:'14px',fontWeight:700}}>Explorar negocios</Link>
              </div>
            ) : reservas.map(r => {
              const cfg = tipoConfig[normTipo(r.negocio_tipo||'')] || tipoDefault
              return (
                <div key={r.id} className="res-full">
                  <div style={{width:'50px',height:'50px',borderRadius:'14px',background:cfg.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>{cfg.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'15px',fontWeight:800,color:'#111827',marginBottom:'2px'}}>{r.negocio_nombre}</div>
                    <div style={{fontSize:'13px',color:'#9CA3AF',marginBottom:'4px'}}>{r.servicio_nombre}</div>
                    <div style={{fontSize:'12px',fontWeight:700,color:'#1D4ED8'}}>📅 {r.fecha} · {r.hora}</div>
                  </div>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'4px 10px',borderRadius:'100px',background:r.estado==='confirmada'?'rgba(34,197,94,0.12)':'rgba(253,233,162,0.6)',color:r.estado==='confirmada'?'#166534':'#92400E',flexShrink:0}}>{r.estado}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ─────────── FAVORITOS ─────────── */}
        {tabActiva === 'favoritos' && (
          <div className="content">
            <div style={{fontSize:'24px',fontWeight:800,color:'#111827',marginBottom:'4px',letterSpacing:'-0.5px'}}>Mis favoritos</div>
            <div style={{fontSize:'14px',color:'#9CA3AF',marginBottom:'20px'}}>Negocios guardados</div>
            {favs.length === 0 ? (
              <div style={{textAlign:'center',padding:'80px 20px'}}>
                <div style={{width:'88px',height:'88px',borderRadius:'26px',background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'42px',margin:'0 auto 20px'}}>❤️</div>
                <div style={{fontSize:'20px',fontWeight:800,color:'#111827',marginBottom:'8px'}}>Sin favoritos aún</div>
                <div style={{fontSize:'14px',color:'#9CA3AF'}}>Pulsa 🤍 en cualquier negocio para guardarlo</div>
              </div>
            ) : (
              <div className="neg-grid">
                {negocios.filter(n=>favs.includes(n.id)).map(n => {
                  const cfg = tipoConfig[normTipo(n.tipo||'')] || tipoDefault
                  const portada = (n.fotos && n.fotos[0]) || null
                  return (
                    <Link key={n.id} href={`/negocio/${n.id}`} className="neg-card">
                      <div className="neg-cover">
                        {portada
                          ? <img src={portada} alt={n.nombre} className="neg-cover-img" />
                          : <div className="neg-cover-placeholder" style={{background:cfg.grad}}>{cfg.emoji}</div>}
                        {portada && <div className="neg-cover-grad" />}
                        <button className="neg-fav" onClick={e=>{e.preventDefault();e.stopPropagation();toggleFav(n.id)}}>❤️</button>
                        <div className="neg-logo" style={{background:n.logo_url?'white':cfg.bg}}>
                          {n.logo_url ? <img src={n.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : cfg.emoji}
                        </div>
                      </div>
                      <div className="neg-body">
                        <div className="neg-nombre">{n.nombre}</div>
                        <div className="neg-meta">
                          <span className="neg-tipo-badge" style={{background:cfg.bg,color:'#374151'}}>{n.tipo?.replace(/^[^\w\s]*\s*/,'')}</span>
                          {n.ciudad && <span className="neg-ciudad">📍 {n.ciudad}</span>}
                        </div>
                        <Link href={`/negocio/${n.id}`} className="neg-btn" onClick={e=>e.stopPropagation()}>Reservar →</Link>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────── PERFIL ─────────── */}
        {tabActiva === 'perfil' && (
          <div className="content">
            <div className="perfil-head">
              <div className="perfil-av">{nombreUsuario.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{fontSize:'20px',fontWeight:800,color:'#111827',marginBottom:'3px',letterSpacing:'-0.3px'}}>{nombreUsuario}</div>
                <div style={{fontSize:'13px',color:'#6B7280',fontWeight:500}}>Cliente de Khepria</div>
              </div>
            </div>
            <div className="perfil-menu">
              {[
                {icon:'📅',label:'Mis reservas',bg:'rgba(184,216,248,0.3)',tab:'reservas'},
                {icon:'❤️',label:'Mis favoritos',bg:'rgba(251,207,232,0.3)',tab:'favoritos'},
                {icon:'⭐',label:'Mis reseñas',bg:'rgba(253,233,162,0.3)',tab:''},
                {icon:'🎁',label:'Mis puntos y cupones',bg:'rgba(184,237,212,0.3)',tab:''},
                {icon:'🔔',label:'Notificaciones',bg:'rgba(212,197,249,0.3)',tab:''},
                {icon:'⚙️',label:'Configuración',bg:'rgba(0,0,0,0.06)',tab:''},
              ].map((item,i) => (
                <Link key={i} href={item.tab?`/cliente?tab=${item.tab}`:'#'} className="perfil-item" style={{textDecoration:'none'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'10px',background:item.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{item.icon}</div>
                  <span style={{fontSize:'14px',fontWeight:600,color:'#111827',flex:1}}>{item.label}</span>
                  <span style={{color:'#D1D5DB',fontSize:'18px'}}>›</span>
                </Link>
              ))}
            </div>
            <button
              style={{display:'block',width:'100%',padding:'15px',background:'rgba(239,68,68,0.07)',color:'#DC2626',border:'none',borderRadius:'16px',fontSize:'15px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',letterSpacing:'-0.2px'}}
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="botnav">
        <div className="botnav-inner">
          {tabs.map(tab => (
            <Link key={tab.id} href={`/cliente?tab=${tab.id}`} className={`botnav-item ${tabActiva===tab.id?'active':''}`}>
              <span className="botnav-icon">{tab.icon}</span>
              <span className="botnav-label">{tab.label}</span>
              {tabActiva === tab.id && <div className="botnav-dot" />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ClientePage() {
  return (
    <Suspense>
      <ClienteContent />
    </Suspense>
  )
}
