'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Reserva = {
  id: string
  fecha: string
  hora: string
  cliente_nombre: string
  cliente_telefono: string | null
  estado: string
  servicios: { nombre: string; precio: number; duracion: number } | null
}

type Trabajador = {
  id: string
  nombre: string
  especialidad: string | null
  email: string | null
  negocio_id: string
  foto_url: string | null
}

type Stats = {
  total: number
  completadas: number
  servicioTop: string
}

const COLORES_ESTADO: Record<string, { bg: string; color: string; label: string }> = {
  pendiente:  { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
  confirmada: { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmada' },
  completada: { bg: '#D1FAE5', color: '#065F46', label: 'Completada' },
  cancelada:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada' },
}

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}
function enXDias(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function formatFecha(f: string) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function EmpleadoPage() {
  const [cargando, setCargando] = useState(true)
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [reservasHoy, setReservasHoy] = useState<Reserva[]>([])
  const [reservasProximas, setReservasProximas] = useState<Reserva[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, completadas: 0, servicioTop: '—' })
  const [actualizando, setActualizando] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/auth'; return }

      const email = session.user.email ?? ''
      setUserEmail(email)

      const { data: trab } = await supabase
        .from('trabajadores')
        .select('id, nombre, especialidad, email, negocio_id, foto_url')
        .eq('email', email)
        .eq('activo', true)
        .single()

      if (!trab) { window.location.href = '/auth'; return }
      setTrabajador(trab)

      const hoy = hoyISO()
      const en7 = enXDias(7)
      const inicioMes = hoy.slice(0, 8) + '01'

      const [{ data: rHoy }, { data: rProx }, { data: rMes }] = await Promise.all([
        supabase.from('reservas')
          .select('id, fecha, hora, cliente_nombre, cliente_telefono, estado, servicios(nombre, precio, duracion)')
          .eq('trabajador_id', trab.id)
          .eq('fecha', hoy)
          .neq('estado', 'cancelada')
          .order('hora'),
        supabase.from('reservas')
          .select('id, fecha, hora, cliente_nombre, cliente_telefono, estado, servicios(nombre, precio, duracion)')
          .eq('trabajador_id', trab.id)
          .gt('fecha', hoy)
          .lte('fecha', en7)
          .neq('estado', 'cancelada')
          .order('fecha').order('hora'),
        supabase.from('reservas')
          .select('id, estado, servicios(nombre)')
          .eq('trabajador_id', trab.id)
          .gte('fecha', inicioMes)
          .lte('fecha', hoy),
      ])

      setReservasHoy((rHoy ?? []) as unknown as Reserva[])
      setReservasProximas((rProx ?? []) as unknown as Reserva[])

      if (rMes) {
        const completadas = rMes.filter(r => r.estado === 'completada').length
        const conteo: Record<string, number> = {}
        rMes.forEach(r => {
          const nombre = (r.servicios as any)?.nombre
          if (nombre) conteo[nombre] = (conteo[nombre] ?? 0) + 1
        })
        const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
        setStats({ total: rMes.length, completadas, servicioTop: top })
      }

      setCargando(false)
    })()
  }, [])

  async function completarReserva(id: string) {
    setActualizando(id)
    await supabase.from('reservas').update({ estado: 'completada' }).eq('id', id)
    setReservasHoy(prev => prev.map(r => r.id === id ? { ...r, estado: 'completada' } : r))
    setActualizando(null)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Cargando...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', padding: '24px', ...style }}>
      {children}
    </div>
  )

  const sectionTitle = (txt: string) => (
    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px', letterSpacing: '-0.3px' }}>{txt}</h2>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
            <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', marginLeft: '4px' }}>Empleado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>{trabajador?.nombre}</span>
            <button onClick={cerrarSesion} style={{ padding: '7px 14px', background: '#F3F4F6', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Bienvenida */}
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Hola, {trabajador?.nombre?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            {trabajador?.especialidad && ` · ${trabajador.especialidad}`}
          </p>
        </div>

        {/* Stats del mes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Citas este mes', value: stats.total, bg: '#EFF6FF', color: '#1D4ED8' },
            { label: 'Completadas', value: stats.completadas, bg: '#F0FDF4', color: '#16A34A' },
            { label: 'Servicio top', value: stats.servicioTop, bg: '#FAF5FF', color: '#7C3AED', small: true },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: '16px', padding: '18px', border: '1px solid rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</p>
              <p style={{ fontSize: s.small ? '16px' : '28px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Agenda hoy */}
        {card(
          <>
            {sectionTitle(`Agenda de hoy · ${reservasHoy.length} cita${reservasHoy.length !== 1 ? 's' : ''}`)}
            {reservasHoy.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>No tienes citas hoy</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {reservasHoy.map(r => {
                  const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#F9FAFB', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ textAlign: 'center', minWidth: '48px' }}>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{r.hora?.slice(0, 5)}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{r.cliente_nombre}</p>
                        <p style={{ fontSize: '12px', color: '#6B7280' }}>
                          {(r.servicios as any)?.nombre ?? 'Servicio'}
                          {r.cliente_telefono && ` · ${r.cliente_telefono}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ background: est.bg, color: est.color, fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>{est.label}</span>
                        {r.estado !== 'completada' && r.estado !== 'cancelada' && (
                          <button
                            onClick={() => completarReserva(r.id)}
                            disabled={actualizando === r.id}
                            style={{ padding: '6px 12px', background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {actualizando === r.id ? '...' : 'Completar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Próximas reservas */}
        {reservasProximas.length > 0 && card(
          <>
            {sectionTitle('Próximos 7 días')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reservasProximas.map(r => {
                const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#F9FAFB', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ minWidth: '80px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{formatFecha(r.fecha)}</p>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>{r.hora?.slice(0, 5)}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{r.cliente_nombre}</p>
                      <p style={{ fontSize: '12px', color: '#6B7280' }}>{(r.servicios as any)?.nombre ?? 'Servicio'}</p>
                    </div>
                    <span style={{ background: est.bg, color: est.color, fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>{est.label}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Mi perfil */}
        {card(
          <>
            {sectionTitle('Mi perfil')}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0, overflow: 'hidden' }}>
                {trabajador?.foto_url
                  ? <img src={trabajador.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '👤'
                }
              </div>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{trabajador?.nombre}</p>
                {trabajador?.especialidad && <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{trabajador.especialidad}</p>}
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{userEmail}</p>
              </div>
            </div>
            <button
              onClick={cerrarSesion}
              style={{ width: '100%', padding: '13px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar sesión
            </button>
          </>
        )}

      </div>
    </div>
  )
}
