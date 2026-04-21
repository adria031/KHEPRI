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
  negocios: { id: string; nombre: string; tipo: string; logo_url: string | null } | null
  servicios: { nombre: string } | null
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

const estadoStyle: Record<string, { label: string; bg: string; color: string }> = {
  confirmada: { label: 'Confirmada', bg: 'rgba(184,237,212,0.4)', color: '#166534' },
  pendiente:  { label: 'Pendiente',  bg: 'rgba(253,233,162,0.4)', color: '#92400E' },
  cancelada:  { label: 'Cancelada',  bg: 'rgba(254,202,202,0.4)', color: '#991B1B' },
  completada: { label: 'Completada', bg: 'rgba(184,216,248,0.4)', color: '#1E40AF' },
}

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilCliente() {
  const avatarRef = useRef<HTMLInputElement>(null)

  // User
  const [userId,     setUserId]     = useState('')
  const [cargando,   setCargando]   = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [guardado,   setGuardado]   = useState(false)
  const [subiendo,   setSubiendo]   = useState(false)
  const [error,      setError]      = useState('')

  const [form, setForm] = useState({ nombre: '', email: '', ciudad: '', avatar_url: '' })

  // Sección activa
  const [seccion, setSeccion] = useState<'datos' | 'reservas' | 'favoritos'>('datos')

  // Reservas
  const [reservas,          setReservas]          = useState<Reserva[]>([])
  const [cargandoReservas,  setCargandoReservas]  = useState(false)

  // Favoritos
  const [favIds,    setFavIds]    = useState<string[]>([])
  const [negsFavs,  setNegsFavs] = useState<NegFav[]>([])
  const [cargandoFavs, setCargandoFavs] = useState(false)

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      setUserId(user.id)
      setForm({
        nombre:     user.user_metadata?.nombre || '',
        email:      user.email || '',
        ciudad:     user.user_metadata?.ciudad || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      })
      setCargando(false)
    })
  }, [])

  // Cargar reservas cuando se activa esa sección
  useEffect(() => {
    if (seccion !== 'reservas' || !form.email) return
    setCargandoReservas(true)
    supabase
      .from('reservas')
      .select('id, fecha, hora, estado, negocio_id, negocios(id, nombre, tipo, logo_url), servicios(nombre), trabajadores(nombre)')
      .eq('cliente_email', form.email)
      .order('fecha', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setReservas((data as unknown as Reserva[]) || [])
        setCargandoReservas(false)
      })
  }, [seccion, form.email])

  // Cargar favoritos cuando se activa esa sección
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
    const { error: err } = await supabase.auth.updateUser({
      data: { nombre: form.nombre.trim(), ciudad: form.ciudad.trim() },
    })
    setGuardando(false)
    if (err) { setError(err.message); return }
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
    if (userId) {
      await supabase.from('favoritos').delete().eq('user_id', userId).eq('negocio_id', negocioId)
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ color: '#9CA3AF', fontSize: '15px' }}>Cargando perfil...</div>
      </div>
    )
  }

  const iniciales = form.nombre ? form.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : form.email[0]?.toUpperCase() || '?'

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; color: #111827; }

        .topbar   { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.07); padding: 14px 20px; display: flex; align-items: center; gap: 12px; }
        .btn-back { background: #F3F4F6; border: none; border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; flex-shrink: 0; }
        .page-wrap { max-width: 560px; margin: 0 auto; padding: 20px 16px 100px; }

        /* Perfil header */
        .avatar-wrap  { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
        .avatar-img   { width: 84px; height: 84px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); display: block; }
        .avatar-init  { width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg,#B8D8F8,#D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #1D4ED8; border: 3px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
        .avatar-edit  { position: absolute; bottom: 0; right: 0; width: 26px; height: 26px; background: #111827; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; }

        /* Sección tabs */
        .sec-tabs { display: flex; background: #F3F4F6; border-radius: 12px; padding: 3px; margin-bottom: 20px; }
        .sec-tab  { flex: 1; padding: 9px 8px; background: none; border: none; border-radius: 9px; font-family: inherit; font-size: 13px; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.15s; }
        .sec-tab.active { background: white; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        /* Form */
        .field       { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .field input { width: 100%; padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 12px; font-family: inherit; font-size: 14px; color: #111827; outline: none; background: white; }
        .field input:focus { border-color: #111827; }
        .field input:disabled { background: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }
        .field-hint  { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

        /* Reservas */
        .res-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; }
        .res-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; }
        .estado-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 100px; }
        .btn-repetir { padding: 7px 14px; background: #111827; color: white; border: none; border-radius: 9px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; display: inline-block; }
        .btn-repetir:hover { opacity: 0.85; }

        /* Favoritos */
        .fav-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; }
        .fav-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; background: rgba(184,216,248,0.25); }

        /* Botones */
        .btn-primary { width: 100%; padding: 13px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary.ok { background: #166534; }
        .btn-logout { width: 100%; padding: 13px; background: rgba(239,68,68,0.08); color: #DC2626; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 10px; }
        .btn-logout:hover { background: rgba(239,68,68,0.14); }

        /* Empty */
        .empty { text-align: center; padding: 52px 20px; }
        .empty-emoji { font-size: 44px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 6px; }
        .empty-sub   { font-size: 13px; color: #9CA3AF; }

        /* Bottom nav */
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
        <Link href="/cliente" className="btn-back" style={{ textDecoration: 'none', color: '#111827' }}>‹</Link>
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
            {form.ciudad && (
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>📍 {form.ciudad}</div>
            )}
          </div>
        </div>

        {/* ── Sección tabs ── */}
        <div className="sec-tabs">
          {([
            { key: 'datos',     label: '👤 Datos' },
            { key: 'reservas',  label: '📅 Reservas' },
            { key: 'favoritos', label: '❤️ Favoritos' },
          ] as const).map(t => (
            <button key={t.key} className={`sec-tab ${seccion === t.key ? 'active' : ''}`} onClick={() => setSeccion(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DATOS ── */}
        {seccion === 'datos' && (
          <>
            <div style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Información personal</div>

              <div className="field">
                <label>Nombre completo</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="field">
                <label>Correo electrónico</label>
                <input type="email" value={form.email} disabled />
                <div className="field-hint">El email no se puede cambiar desde aquí.</div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Ciudad</label>
                <input
                  type="text"
                  value={form.ciudad}
                  onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))}
                  placeholder="Ej: Madrid"
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '13px', color: '#DC2626', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <button
              className={`btn-primary ${guardado ? 'ok' : ''}`}
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar cambios'}
            </button>

            <button className="btn-logout" onClick={cerrarSesion}>
              🚪 Cerrar sesión
            </button>
          </>
        )}

        {/* ── RESERVAS ── */}
        {seccion === 'reservas' && (
          <>
            <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '14px' }}>
              Tus últimas {reservas.length > 0 ? reservas.length : ''} citas
            </div>

            {cargandoReservas ? (
              <div style={{ textAlign: 'center', padding: '52px 20px', color: '#9CA3AF', fontSize: '14px' }}>Cargando reservas...</div>
            ) : !form.email ? (
              <div className="empty">
                <div className="empty-emoji">📧</div>
                <div className="empty-title">Sin email registrado</div>
                <div className="empty-sub">Añade tu email para ver el historial.</div>
              </div>
            ) : reservas.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">📅</div>
                <div className="empty-title">Sin reservas todavía</div>
                <div className="empty-sub">Reserva en cualquier negocio y aparecerá aquí.</div>
              </div>
            ) : (
              <>
                {reservas.map(r => {
                  const est  = estadoStyle[r.estado] ?? estadoStyle['pendiente']
                  const neg  = r.negocios
                  const emoji = tipoEmoji[neg?.tipo?.toLowerCase() ?? ''] ?? '🏪'
                  const imagen = neg?.logo_url

                  return (
                    <div key={r.id} className="res-card">
                      <div className="res-icon" style={{ background: 'rgba(184,216,248,0.25)' }}>
                        {imagen
                          ? <img src={imagen} alt={neg?.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : emoji
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {neg?.nombre ?? 'Negocio'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>
                          {r.servicios?.nombre ?? '—'}{r.trabajadores?.nombre ? ` · ${r.trabajadores.nombre}` : ''} · {formatFecha(r.fecha)} {r.hora?.slice(0,5)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="estado-badge" style={{ background: est.bg, color: est.color }}>
                            {est.label}
                          </span>
                          {r.estado !== 'cancelada' && neg?.id && (
                            <Link href={`/negocio/${neg.id}/reservar`} className="btn-repetir">
                              Repetir →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* ── FAVORITOS ── */}
        {seccion === 'favoritos' && (
          <>
            <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '14px' }}>
              {favIds.length > 0 ? `${favIds.length} negocio${favIds.length > 1 ? 's' : ''} guardado${favIds.length > 1 ? 's' : ''}` : 'Negocios guardados'}
            </div>

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
                      {n.ciudad && (
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>📍 {n.ciudad}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <Link
                        href={`/negocio/${n.id}`}
                        style={{ padding: '7px 13px', background: '#111827', color: 'white', borderRadius: '9px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
                      >
                        Ver →
                      </Link>
                      <button
                        onClick={() => quitarFav(n.id)}
                        style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: 'none', borderRadius: '9px', fontSize: '13px', cursor: 'pointer' }}
                        title="Quitar de favoritos"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div className="botnav">
        <div className="botnav-inner">
          {([
            { href: '/cliente?tab=inicio',    icon: '🏠', label: 'Inicio' },
            { href: '/cliente?tab=mapa',      icon: '🗺️', label: 'Mapa' },
            { href: '/cliente?tab=reservas',  icon: '📅', label: 'Reservas' },
            { href: '/cliente?tab=favoritos', icon: '❤️', label: 'Favoritos' },
            { href: '/cliente/perfil',        icon: '👤', label: 'Perfil',  active: true },
          ]).map(t => (
            <Link key={t.href} href={t.href} className={`botnav-item ${t.active ? 'active' : ''}`}>
              <span className="botnav-icon">{t.icon}</span>
              <span className="botnav-label">{t.label}</span>
              {t.active && <div className="botnav-dot" />}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
