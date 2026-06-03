'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Reserva = {
  id: string
  fecha: string
  hora: string
  estado: string
  negocio_id: string
  puntos_ganados: number | null
  precio_total: number | null
  resena_enviada: boolean | null
  negocios: { id: string; nombre: string; tipo: string; logo_url: string | null; horas_cancelacion: number | null } | null
  servicios: { nombre: string; precio: number | null } | null
  trabajadores: { nombre: string } | null
}

type NegFav = {
  id: string
  nombre: string
  tipo: string
  ciudad: string
  logo_url: string | null
  fotos: string[] | null
}

const tipoEmoji: Record<string, string> = {
  peluqueria: '💈', barberia: '✂️', estetica: '💅', spa: '💆',
  clinica: '🏥', yoga: '🧘', gimnasio: '🏋️', dentista: '🦷',
  veterinaria: '🐾', restaurante: '🍕',
}

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPrecio(r: Reserva) {
  const p = r.precio_total ?? r.servicios?.precio ?? null
  if (p == null || p === 0) return null
  return `${p.toFixed(2)} €`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilCliente() {
  const avatarRef = useRef<HTMLInputElement>(null)

  // User
  const [userId,    setUserId]    = useState('')
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado,  setGuardado]  = useState(false)
  const [subiendo,  setSubiendo]  = useState(false)
  const [error,     setError]     = useState('')

  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', ciudad: '', avatar_url: '' })

  // Sección activa
  const [seccion, setSeccion] = useState<'datos' | 'reservas' | 'favoritos' | 'puntos' | 'notifs'>('datos')

  // Tab dentro de reservas
  const [tabReservas, setTabReservas] = useState<'proximas' | 'pasadas' | 'canceladas'>('proximas')

  // Puntos
  const [puntosTotales,     setPuntosTotales]     = useState<number | null>(null)
  const [reservasConPuntos, setReservasConPuntos] = useState<Reserva[]>([])

  // Reservas
  const [reservas,         setReservas]         = useState<Reserva[]>([])
  const [cargandoReservas, setCargandoReservas] = useState(false)
  const [telefonoPerfil,   setTelefonoPerfil]   = useState('')
  const [resenasHechas,    setResenasHechas]    = useState<Set<string>>(new Set())

  // Favoritos
  const [favIds,       setFavIds]       = useState<string[]>([])
  const [negsFavs,     setNegsFavs]     = useState<NegFav[]>([])
  const [cargandoFavs, setCargandoFavs] = useState(false)

  // Notificaciones
  const [notifRecordatorios, setNotifRecordatorios] = useState(true)
  const [notifNovedades,     setNotifNovedades]     = useState(true)
  const [guardandoNotifs,    setGuardandoNotifs]    = useState(false)
  const [notifGuardado,      setNotifGuardado]      = useState(false)

  // Logout
  const [confirmCierre, setConfirmCierre] = useState(false)

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('telefono, notif_recordatorios, notif_novedades')
        .eq('id', user.id)
        .single()
      setForm({
        nombre:     user.user_metadata?.nombre    || '',
        email:      user.email                    || '',
        telefono:   profile?.telefono             || '',
        ciudad:     user.user_metadata?.ciudad    || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      })
      setTelefonoPerfil(profile?.telefono || '')
      setNotifRecordatorios(profile?.notif_recordatorios ?? true)
      setNotifNovedades(profile?.notif_novedades ?? true)
      setCargando(false)
    })
  }, [])

  // Cargar reservas
  useEffect(() => {
    if ((seccion !== 'reservas' && seccion !== 'puntos') || (!userId && !form.email)) return
    setCargandoReservas(true)
    let filter = `cliente_email.eq.${form.email}`
    if (userId) filter = `user_id.eq.${userId},${filter}`
    if (telefonoPerfil) filter += `,cliente_telefono.eq.${telefonoPerfil}`
    supabase
      .from('reservas')
      .select('id, fecha, hora, estado, negocio_id, puntos_ganados, precio_total, resena_enviada, negocios(id, nombre, tipo, logo_url, horas_cancelacion), servicios(nombre, precio), trabajadores(nombre)')
      .or(filter)
      .order('fecha', { ascending: false })
      .limit(100)
      .then(async ({ data }) => {
        const seen = new Set<string>()
        const lista = ((data as unknown as Reserva[]) || []).filter(r => {
          if (seen.has(r.id)) return false
          seen.add(r.id); return true
        })
        setReservas(lista)
        setReservasConPuntos(lista.filter(r => r.puntos_ganados && r.puntos_ganados > 0))

        const completadasIds = lista.filter(r => r.estado === 'completada').map(r => r.id)
        if (completadasIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: rd } = await supabase.from('resenas').select('reserva_id').in('reserva_id', completadasIds)
          setResenasHechas(new Set<string>((rd || []).map((x: any) => x.reserva_id)))
        }
        setCargandoReservas(false)
      })
  }, [seccion, userId, form.email, telefonoPerfil])

  // Cargar puntos
  useEffect(() => {
    if (seccion !== 'puntos' || !userId) return
    supabase.from('profiles').select('puntos').eq('id', userId).maybeSingle()
      .then(({ data }) => setPuntosTotales((data as { puntos: number | null } | null)?.puntos ?? 0))
  }, [seccion, userId])

  // Cargar favoritos
  useEffect(() => {
    if (seccion !== 'favoritos' || !userId) return
    setCargandoFavs(true)
    supabase
      .from('favoritos')
      .select('negocio_id, negocios(id, nombre, tipo, ciudad, logo_url, fotos)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const negs = (data || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((row: any) => (Array.isArray(row.negocios) ? row.negocios[0] : row.negocios))
          .filter(Boolean) as NegFav[]
        setNegsFavs(negs)
        setFavIds(negs.map(n => n.id))
        setCargandoFavs(false)
      })
  }, [seccion, userId])

  // ── Acciones ──────────────────────────────────────────────────────────────

  async function guardar() {
    setError(''); setGuardando(true)
    const [{ error: err }] = await Promise.all([
      supabase.auth.updateUser({ data: { nombre: form.nombre.trim(), ciudad: form.ciudad.trim() } }),
      supabase.from('profiles').update({ telefono: form.telefono.trim() || null }).eq('id', userId),
    ])
    setGuardando(false)
    if (err) { setError(err.message); return }
    setTelefonoPerfil(form.telefono.trim())
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  async function subirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setSubiendo(true)
    const ext  = file.name.split('.').pop()
    const path = `avatars/${userId}/avatar.${ext}`
    await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    setForm(prev => ({ ...prev, avatar_url: publicUrl }))
    setSubiendo(false)
    if (avatarRef.current) avatarRef.current.value = ''
  }

  async function quitarFav(negocioId: string) {
    setNegsFavs(prev => prev.filter(n => n.id !== negocioId))
    setFavIds(prev => prev.filter(f => f !== negocioId))
    if (userId) await supabase.from('favoritos').delete().eq('user_id', userId).eq('negocio_id', negocioId)
  }

  async function guardarNotifs() {
    if (!userId) return
    setGuardandoNotifs(true)
    await supabase.from('profiles').update({
      notif_recordatorios: notifRecordatorios,
      notif_novedades:     notifNovedades,
    }).eq('id', userId)
    setGuardandoNotifs(false)
    setNotifGuardado(true)
    setTimeout(() => setNotifGuardado(false), 2500)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function nivelCliente(pts: number) {
    if (pts >= 1000) return { label: 'Cliente Premium', stars: '⭐⭐⭐', color: '#92400E', bg: 'rgba(253,230,138,0.3)', next: null,  pct: 100 }
    if (pts >= 500)  return { label: 'Cliente VIP',     stars: '⭐⭐',   color: '#6D28D9', bg: 'rgba(212,197,249,0.3)', next: 1000, pct: Math.round((pts - 500) / 5) }
    if (pts >= 100)  return { label: 'Cliente habitual',stars: '⭐',    color: '#1D4ED8', bg: 'rgba(184,216,248,0.3)', next: 500,  pct: Math.round((pts - 100) / 4) }
    return                  { label: 'Nuevo cliente',   stars: '',      color: '#6B7280', bg: 'rgba(243,244,246,0.8)', next: 100,  pct: pts }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (cargando) return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ color: '#9CA3AF', fontSize: '15px' }}>Cargando perfil...</div>
    </div>
  )

  const iniciales = form.nombre
    ? form.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : form.email[0]?.toUpperCase() || '?'

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const proximas   = reservas.filter(r => r.estado !== 'cancelada' && new Date(r.fecha + 'T00:00:00') >= hoy)
  const pasadas    = reservas.filter(r => r.estado !== 'cancelada' && new Date(r.fecha + 'T00:00:00') < hoy)
  const canceladas = reservas.filter(r => r.estado === 'cancelada')
  const tabItems   = { proximas, pasadas, canceladas }
  const listaActiva: Reserva[] = tabItems[tabReservas]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; color: #111827; }

        .topbar   { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.07); padding: 14px 20px; display: flex; align-items: center; gap: 12px; }
        .btn-back { background: #F3F4F6; border: none; border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; flex-shrink: 0; text-decoration: none; color: #111827; }
        .page-wrap { max-width: 560px; margin: 0 auto; padding: 20px 16px 100px; }

        .avatar-wrap { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
        .avatar-img  { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); display: block; }
        .avatar-init { width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg,#B8D8F8,#D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #1D4ED8; border: 3px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
        .avatar-edit { position: absolute; bottom: 0; right: 0; width: 26px; height: 26px; background: #111827; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; }

        .sec-tabs { display: flex; background: #F3F4F6; border-radius: 12px; padding: 3px; margin-bottom: 20px; gap: 2px; }
        .sec-tab  { flex: 1; padding: 8px 4px; background: none; border: none; border-radius: 9px; font-family: inherit; font-size: 12px; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .sec-tab.active { background: white; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        .res-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
        .res-tab  { padding: 7px 14px; background: none; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 100px; font-family: inherit; font-size: 12px; font-weight: 700; color: #6B7280; cursor: pointer; transition: all 0.15s; }
        .res-tab.active { background: #111827; color: white; border-color: #111827; }

        .field       { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .field input { width: 100%; padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 12px; font-family: inherit; font-size: 14px; color: #111827; outline: none; background: white; transition: border-color 0.15s; }
        .field input:focus { border-color: #111827; }
        .field input:disabled { background: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }
        .field-hint  { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

        .res-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; }
        .res-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .res-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; overflow: hidden; background: rgba(184,216,248,0.25); }
        .res-actions { display: flex; flex-wrap: wrap; gap: 7px; }
        .estado-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 100px; }
        .btn-action { padding: 7px 13px; border: none; border-radius: 9px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; transition: opacity 0.15s; }
        .btn-action:hover { opacity: 0.8; }
        .btn-dark  { background: #111827; color: white; }
        .btn-red   { background: rgba(220,38,38,0.08); color: #DC2626; }
        .btn-green { background: rgba(5,150,105,0.1); color: #059669; }
        .btn-blue  { background: rgba(29,78,216,0.08); color: #1D4ED8; }

        .fav-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; }
        .fav-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; background: rgba(184,216,248,0.25); }

        .btn-primary  { width: 100%; padding: 13px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary.ok { background: #166534; }
        .btn-logout  { width: 100%; padding: 13px; background: rgba(239,68,68,0.08); color: #DC2626; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 10px; transition: background 0.15s; }
        .btn-logout:hover { background: rgba(239,68,68,0.14); }

        .toggle-row  { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-wrap { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
        .toggle-wrap input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-slider { position: absolute; inset: 0; border-radius: 100px; background: #E5E7EB; cursor: pointer; transition: background 0.2s; }
        .toggle-slider::after { content:''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 3px; left: 3px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .toggle-wrap input:checked + .toggle-slider { background: #111827; }
        .toggle-wrap input:checked + .toggle-slider::after { transform: translateX(20px); }

        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
        .modal-sheet { background: white; border-radius: 24px 24px 0 0; padding: 24px 20px 40px; width: 100%; max-width: 480px; }

        .empty { text-align: center; padding: 52px 20px; }
        .empty-emoji { font-size: 44px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 6px; }
        .empty-sub   { font-size: 13px; color: #9CA3AF; }

        .botnav { display: block; position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid rgba(0,0,0,0.07); z-index: 100; }
        .botnav-inner { display: flex; align-items: center; padding: 6px 0 max(6px, env(safe-area-inset-bottom)); }
        .botnav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; text-decoration: none; }
        .botnav-icon  { font-size: 22px; line-height: 1; }
        .botnav-label { font-size: 10px; font-weight: 600; color: #9CA3AF; }
        .botnav-item.active .botnav-label { color: #1D4ED8; }
        .botnav-dot { width: 4px; height: 4px; border-radius: 50%; background: #1D4ED8; margin: 1px auto 0; }

        @media (min-width: 640px) {
          .page-wrap { padding: 28px 24px 40px; }
          .botnav { display: none; }
        }
      `}</style>

      {/* TOP BAR */}
      <div className="topbar">
        <Link href="/cliente" className="btn-back">‹</Link>
        <span style={{ fontSize: '16px', fontWeight: 700 }}>Mi perfil</span>
      </div>

      <div className="page-wrap">

        {/* ── Avatar + nombre ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', background: 'white', borderRadius: '20px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="avatar-wrap">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="Avatar" className="avatar-img" />
              : <div className="avatar-init">{iniciales}</div>
            }
            <div className="avatar-edit" onClick={() => avatarRef.current?.click()}>
              {subiendo ? '⏳' : '✏️'}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={subirAvatar} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.nombre || 'Sin nombre'}
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.email}
            </div>
            {form.ciudad && <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>📍 {form.ciudad}</div>}
          </div>
        </div>

        {/* ── Sección tabs ── */}
        <div className="sec-tabs">
          {([
            { key: 'datos',     label: '👤 Datos' },
            { key: 'reservas',  label: '📅 Reservas' },
            { key: 'favoritos', label: '❤️ Favs' },
            { key: 'puntos',    label: '⭐ Puntos' },
            { key: 'notifs',    label: '🔔 Avisos' },
          ] as const).map(t => (
            <button key={t.key} className={`sec-tab ${seccion === t.key ? 'active' : ''}`} onClick={() => setSeccion(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ DATOS PERSONALES ══ */}
        {seccion === 'datos' && (
          <>
            <div style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Información personal</div>

              <div className="field">
                <label>Nombre completo</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Tu nombre" />
              </div>

              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" value={form.email} disabled />
                <div className="field-hint">El email no se puede cambiar desde aquí.</div>
              </div>

              <div className="field">
                <label>Teléfono</label>
                <input type="tel" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej: 612 345 678" />
                <div className="field-hint">Permite asociar reservas hechas sin cuenta.</div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Ciudad</label>
                <input type="text" value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} placeholder="Ej: Madrid" />
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '13px', color: '#DC2626', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <button className={`btn-primary ${guardado ? 'ok' : ''}`} onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar cambios'}
            </button>

            <button className="btn-logout" onClick={() => setConfirmCierre(true)}>
              🚪 Cerrar sesión
            </button>
          </>
        )}

        {/* ══ MIS RESERVAS ══ */}
        {seccion === 'reservas' && (
          <>
            {/* Tabs próximas/pasadas/canceladas */}
            <div className="res-tabs">
              {([
                { key: 'proximas',   label: `Próximas (${proximas.length})` },
                { key: 'pasadas',    label: `Pasadas (${pasadas.length})` },
                { key: 'canceladas', label: `Canceladas (${canceladas.length})` },
              ] as const).map(t => (
                <button key={t.key} className={`res-tab ${tabReservas === t.key ? 'active' : ''}`} onClick={() => setTabReservas(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {cargandoReservas ? (
              <div style={{ textAlign: 'center', padding: '52px 20px', color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
            ) : listaActiva.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">{tabReservas === 'proximas' ? '📅' : tabReservas === 'pasadas' ? '🕐' : '❌'}</div>
                <div className="empty-title">
                  {tabReservas === 'proximas' ? 'No tienes citas próximas' : tabReservas === 'pasadas' ? 'Sin reservas pasadas' : 'Sin cancelaciones'}
                </div>
                <div className="empty-sub">
                  {tabReservas === 'proximas' ? 'Reserva en cualquier negocio y aparecerá aquí.' : ''}
                </div>
              </div>
            ) : (
              listaActiva.map(r => {
                const neg   = r.negocios
                const emoji = tipoEmoji[neg?.tipo?.toLowerCase() ?? ''] ?? '🏪'
                const precio = formatPrecio(r)
                const esProxima  = tabReservas === 'proximas'
                const esPasada   = tabReservas === 'pasadas'
                const esComplet  = r.estado === 'completada'
                const sinResena  = esComplet && !resenasHechas.has(r.id)
                return (
                  <div key={r.id} className="res-card">
                    <div className="res-header">
                      <div className="res-icon">
                        {neg?.logo_url
                          ? <img src={neg.logo_url} alt={neg.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : emoji
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {neg?.nombre ?? 'Negocio'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                          {r.servicios?.nombre ?? '—'}
                          {r.trabajadores?.nombre ? ` · ${r.trabajadores.nombre}` : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '1px' }}>
                          {formatFecha(r.fecha)} · {r.hora?.slice(0, 5)}
                          {precio ? ` · ${precio}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', flexShrink: 0,
                        background: r.estado === 'confirmada' ? 'rgba(184,237,212,0.4)' : r.estado === 'completada' ? 'rgba(184,216,248,0.4)' : r.estado === 'cancelada' ? 'rgba(254,202,202,0.4)' : 'rgba(253,233,162,0.4)',
                        color:      r.estado === 'confirmada' ? '#166534'              : r.estado === 'completada' ? '#1E40AF'              : r.estado === 'cancelada' ? '#991B1B'              : '#92400E',
                      }}>
                        {r.estado === 'confirmada' ? 'Confirmada' : r.estado === 'completada' ? 'Completada' : r.estado === 'cancelada' ? 'Cancelada' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="res-actions">
                      {esProxima && (
                        <Link href={`/reserva/${r.id}/cancelar`} className="btn-action btn-red">
                          Cancelar
                        </Link>
                      )}
                      {(esPasada || esComplet) && neg?.id && (
                        <Link href={`/negocio/${neg.id}/reservar`} className="btn-action btn-dark">
                          Reservar de nuevo →
                        </Link>
                      )}
                      {sinResena && neg?.id && (
                        <Link href={`/negocio/${neg.id}/resena?reserva_id=${r.id}`} className="btn-action btn-green">
                          ⭐ Dejar reseña
                        </Link>
                      )}
                      {tabReservas === 'canceladas' && neg?.id && (
                        <Link href={`/negocio/${neg.id}/reservar`} className="btn-action btn-blue">
                          Volver a reservar →
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ══ MIS FAVORITOS ══ */}
        {seccion === 'favoritos' && (
          <>
            {favIds.length > 0 && (
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '14px' }}>
                {favIds.length} negocio{favIds.length > 1 ? 's' : ''} guardado{favIds.length > 1 ? 's' : ''}
              </div>
            )}
            {(cargandoFavs || !userId) ? (
              <div style={{ textAlign: 'center', padding: '52px 20px', color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
            ) : favIds.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">❤️</div>
                <div className="empty-title">Sin favoritos</div>
                <div className="empty-sub">Pulsa el corazón en cualquier negocio para guardarlo aquí.</div>
              </div>
            ) : (
              negsFavs.map(n => {
                const emoji  = tipoEmoji[n.tipo?.toLowerCase() ?? ''] ?? '🏪'
                const imagen = n.logo_url || n.fotos?.[0] || null
                return (
                  <div key={n.id} className="fav-card">
                    <div className="fav-icon">
                      {imagen
                        ? <img src={imagen} alt={n.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                        : <span>{emoji}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.nombre}
                      </div>
                      {n.ciudad && <div style={{ fontSize: '12px', color: '#9CA3AF' }}>📍 {n.ciudad}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <Link href={`/negocio/${n.id}/reservar`}
                        style={{ padding: '7px 13px', background: '#111827', color: 'white', borderRadius: '9px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                        Reservar →
                      </Link>
                      <button onClick={() => quitarFav(n.id)}
                        style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: 'none', borderRadius: '9px', fontSize: '13px', cursor: 'pointer' }}
                        title="Quitar de favoritos">
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ══ MIS PUNTOS ══ */}
        {seccion === 'puntos' && (() => {
          const pts = puntosTotales ?? 0
          const nivel = nivelCliente(pts)
          return (
            <>
              <div style={{ background: 'white', borderRadius: '20px', padding: '24px 20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '56px', fontWeight: 800, color: '#111827', letterSpacing: '-2px', lineHeight: 1 }}>
                  {puntosTotales === null ? '…' : pts}
                </div>
                <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 600, marginTop: '4px', marginBottom: '16px' }}>puntos acumulados</div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: nivel.bg, padding: '8px 18px', borderRadius: '100px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: nivel.color }}>{nivel.label}</span>
                  {nivel.stars && <span style={{ fontSize: '14px' }}>{nivel.stars}</span>}
                </div>

                {nivel.next && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                      <span>{pts} pts</span>
                      <span>Próximo nivel: {nivel.next} pts</span>
                    </div>
                    <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, nivel.pct)}%`, background: 'linear-gradient(90deg,#B8D8F8,#D4C5F9)', borderRadius: '100px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Niveles */}
              <div style={{ background: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>Niveles de fidelización</div>
                {[
                  { label: 'Nuevo cliente',    min: 0,    max: 99,   stars: '🌱', color: '#6B7280', bg: 'rgba(243,244,246,0.8)' },
                  { label: 'Cliente habitual', min: 100,  max: 499,  stars: '⭐',  color: '#1D4ED8', bg: 'rgba(184,216,248,0.3)' },
                  { label: 'Cliente VIP',      min: 500,  max: 999,  stars: '⭐⭐', color: '#6D28D9', bg: 'rgba(212,197,249,0.3)' },
                  { label: 'Cliente Premium',  min: 1000, max: null, stars: '⭐⭐⭐',color: '#92400E', bg: 'rgba(253,230,138,0.3)' },
                ].map(n => {
                  const activo = pts >= n.min && (n.max === null || pts <= n.max)
                  return (
                    <div key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', background: activo ? n.bg : 'transparent', border: `1px solid ${activo ? n.color + '20' : 'transparent'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>{n.stars}</span>
                        <span style={{ fontSize: '13px', fontWeight: activo ? 700 : 500, color: activo ? n.color : '#9CA3AF' }}>{n.label}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                        {n.max !== null ? `${n.min}–${n.max} pts` : `${n.min}+ pts`}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Historial */}
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '10px', fontWeight: 600 }}>Historial de puntos</div>
              {cargandoReservas ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
              ) : reservasConPuntos.length === 0 ? (
                <div className="empty">
                  <div className="empty-emoji">⭐</div>
                  <div className="empty-title">Sin puntos todavía</div>
                  <div className="empty-sub">Ganas 1 punto por cada euro gastado en una reserva completada.</div>
                </div>
              ) : (
                reservasConPuntos.map(r => {
                  const neg   = r.negocios
                  const emoji = tipoEmoji[neg?.tipo?.toLowerCase() ?? ''] ?? '🏪'
                  return (
                    <div key={r.id} className="res-card">
                      <div className="res-header" style={{ marginBottom: 0 }}>
                        <div className="res-icon" style={{ background: 'rgba(253,230,138,0.25)' }}>
                          {neg?.logo_url
                            ? <img src={neg.logo_url} alt={neg?.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : emoji
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{neg?.nombre ?? 'Negocio'}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{r.servicios?.nombre ?? '—'} · {formatFecha(r.fecha)}</div>
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#92400E', flexShrink: 0 }}>+{r.puntos_ganados} ⭐</div>
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )
        })()}

        {/* ══ NOTIFICACIONES ══ */}
        {seccion === 'notifs' && (
          <>
            <div style={{ background: 'white', borderRadius: '18px', padding: '4px 20px 8px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', padding: '14px 0 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                Preferencias de comunicación
              </div>

              <div className="toggle-row">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Recordatorios de cita</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Recordatorio por email antes de tu cita</div>
                </div>
                <label className="toggle-wrap">
                  <input type="checkbox" checked={notifRecordatorios} onChange={e => setNotifRecordatorios(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="toggle-row">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Novedades y ofertas</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Promociones y descuentos de negocios favoritos</div>
                </div>
                <label className="toggle-wrap">
                  <input type="checkbox" checked={notifNovedades} onChange={e => setNotifNovedades(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            <button
              className={`btn-primary ${notifGuardado ? 'ok' : ''}`}
              onClick={guardarNotifs}
              disabled={guardandoNotifs}
            >
              {guardandoNotifs ? 'Guardando...' : notifGuardado ? '✓ Preferencias guardadas' : 'Guardar preferencias'}
            </button>

            <div style={{ marginTop: '28px', padding: '14px', background: 'rgba(184,216,248,0.15)', borderRadius: '12px', fontSize: '12px', color: '#6B7280', lineHeight: 1.6 }}>
              ℹ️ Los emails transaccionales (confirmaciones de reserva, cancelaciones) siempre se envían independientemente de estas preferencias.
            </div>
          </>
        )}

      </div>

      {/* ── Modal confirmación cierre de sesión ── */}
      {confirmCierre && (
        <div className="modal-bg" onClick={() => setConfirmCierre(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚪</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>¿Cerrar sesión?</div>
              <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>Se cerrará tu sesión en este dispositivo.</div>
            </div>
            <button
              onClick={cerrarSesion}
              style={{ width: '100%', padding: '14px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}
            >
              Sí, cerrar sesión
            </button>
            <button
              onClick={() => setConfirmCierre(false)}
              style={{ width: '100%', padding: '14px', background: '#F3F4F6', color: '#111827', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="botnav">
        <div className="botnav-inner">
          {([
            { href: '/cliente?tab=inicio',    icon: '🏠', label: 'Inicio' },
            { href: '/cliente?tab=mapa',      icon: '🗺️', label: 'Mapa' },
            { href: '/cliente?tab=reservas',  icon: '📅', label: 'Reservas' },
            { href: '/cliente?tab=favoritos', icon: '❤️', label: 'Favoritos' },
            { href: '/cliente/perfil',        icon: '👤', label: 'Perfil', active: true },
          ]).map(t => (
            <Link key={t.href} href={t.href} className={`botnav-item ${'active' in t && t.active ? 'active' : ''}`}>
              <span className="botnav-icon">{t.icon}</span>
              <span className="botnav-label">{t.label}</span>
              {'active' in t && t.active && <div className="botnav-dot" />}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
