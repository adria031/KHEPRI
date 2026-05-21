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

const COLORES_ESTADO: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  pendiente:  { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente',  dot: '#F59E0B' },
  confirmada: { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmada', dot: '#3B82F6' },
  completada: { bg: '#D1FAE5', color: '#065F46', label: 'Completada', dot: '#10B981' },
  cancelada:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada',  dot: '#EF4444' },
}

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}
function enXDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function formatFecha(f: string) {
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}
function avatarIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function EmpleadoPage() {
  const [cargando,         setCargando]         = useState(true)
  const [trabajador,       setTrabajador]       = useState<Trabajador | null>(null)
  const [nombreNegocio,    setNombreNegocio]    = useState<string | null>(null)
  const [userEmail,        setUserEmail]        = useState('')
  const [reservasHoy,      setReservasHoy]      = useState<Reserva[]>([])
  const [reservasProximas, setReservasProximas] = useState<Reserva[]>([])
  const [stats,            setStats]            = useState<Stats>({ total: 0, completadas: 0, servicioTop: '—' })
  const [actualizando,     setActualizando]     = useState<string | null>(null)

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

      // Fetch negocio name
      const { data: neg } = await supabase
        .from('negocios')
        .select('nombre')
        .eq('id', trab.negocio_id)
        .single()
      setNombreNegocio(neg?.nombre ?? null)

      const hoy     = hoyISO()
      const en7     = enXDias(7)
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
          const nom = (r.servicios as { nombre?: string } | null)?.nombre
          if (nom) conteo[nom] = (conteo[nom] ?? 0) + 1
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
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F9FC', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:'40px', height:'40px', border:'3px solid #E5E7EB', borderTopColor:'#6366F1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
          <p style={{ color:'#6B7280', fontSize:'14px' }}>Cargando agenda…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    )
  }

  const hoyLabel = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div style={{ minHeight:'100vh', background:'#F7F9FC', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing:border-box; }
        .emp-page { max-width:860px; margin:0 auto; padding:28px 24px 60px; display:flex; flex-direction:column; gap:18px; }
        .emp-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .emp-card { background:white; border-radius:20px; border:1px solid rgba(0,0,0,0.06); padding:22px; }
        .emp-card-title { font-size:15px; font-weight:700; color:#111827; margin-bottom:14px; letter-spacing:-0.2px; }
        .tl-wrap { position:relative; padding-left:4px; }
        .tl-line { position:absolute; left:22px; top:18px; bottom:18px; width:2px; background:linear-gradient(to bottom, rgba(99,102,241,0.2), rgba(99,102,241,0.05)); border-radius:2px; }
        .tl-row { display:flex; gap:0; margin-bottom:10px; }
        .tl-row:last-child { margin-bottom:0; }
        .tl-left { width:46px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:3px; padding-top:3px; }
        .tl-time { font-size:13px; font-weight:800; color:#111827; line-height:1; }
        .tl-dot { width:11px; height:11px; border-radius:50%; border:2px solid white; flex-shrink:0; position:relative; z-index:1; }
        .tl-card { flex:1; border-radius:14px; padding:12px 14px; border:1.5px solid; }
        .prox-row { display:flex; align-items:center; gap:12px; padding:11px 14px; background:#F9FAFB; border-radius:12px; border:1px solid rgba(0,0,0,0.05); margin-bottom:8px; }
        .prox-row:last-child { margin-bottom:0; }
        @media(max-width:640px){
          .emp-page { padding:16px 16px 80px; gap:14px; }
          .emp-stats { grid-template-columns:repeat(2,1fr); }
          .emp-stats > :last-child { grid-column:span 2; }
          .emp-card { padding:16px; border-radius:16px; }
          .nav-negocio { display:none !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <div style={{ background:'white', borderBottom:'1px solid rgba(0,0,0,0.06)', padding:'0 24px' }}>
        <div style={{ maxWidth:'860px', margin:'0 auto', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontWeight:800, fontSize:'15px', letterSpacing:'-0.5px', color:'#111827' }}>Khepria</span>
            <span style={{ background:'#F3F4F6', color:'#6B7280', fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'6px' }}>Empleado</span>
            {nombreNegocio && (
              <span className="nav-negocio" style={{ fontSize:'13px', color:'#6B7280', marginLeft:'4px' }}>· {nombreNegocio}</span>
            )}
          </div>
          <button onClick={cerrarSesion} style={{ padding:'8px 16px', background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.15)', borderRadius:'10px', fontSize:'13px', fontWeight:700, color:'#DC2626', cursor:'pointer', fontFamily:'inherit' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="emp-page">

        {/* ── BIENVENIDA ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:800, color:'#111827', letterSpacing:'-0.5px', marginBottom:'3px' }}>
              Hola, {trabajador?.nombre?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize:'13px', color:'#6B7280' }}>
              {hoyLabel}
              {trabajador?.especialidad && ` · ${trabajador.especialidad}`}
              {nombreNegocio && ` · ${nombreNegocio}`}
            </p>
          </div>
          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:800, color:'#1E3A5F', flexShrink:0, overflow:'hidden' }}>
            {trabajador?.foto_url
              ? <img src={trabajador.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : avatarIniciales(trabajador?.nombre ?? '?')
            }
          </div>
        </div>

        {/* ── STATS DEL MES ── */}
        <div className="emp-stats">
          {[
            { label:'Citas este mes',   value: stats.total,        bg:'#EFF6FF', color:'#1D4ED8', icon:'📅' },
            { label:'Completadas',      value: stats.completadas,  bg:'#F0FDF4', color:'#16A34A', icon:'✅' },
            { label:'Servicio top',     value: stats.servicioTop,  bg:'#FAF5FF', color:'#7C3AED', icon:'⭐', small:true },
          ].map((s, i) => (
            <div key={i} style={{ background:s.bg, borderRadius:'16px', padding:'16px 18px', border:'1px solid rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize:'11px', fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'5px' }}>
                <span>{s.icon}</span>{s.label}
              </p>
              <p style={{ fontSize:s.small ? '15px' : '26px', fontWeight:800, color:'#111827', lineHeight:1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── AGENDA DEL DÍA (TIMELINE) ── */}
        <div className="emp-card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <h2 className="emp-card-title" style={{ margin:0 }}>
              Agenda de hoy
              <span style={{ fontWeight:500, color:'#9CA3AF', marginLeft:'6px', fontSize:'13px' }}>
                {reservasHoy.length} cita{reservasHoy.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <span style={{ fontSize:'12px', fontWeight:600, color:'#6B7280', background:'#F3F4F6', padding:'4px 10px', borderRadius:'8px' }}>
              {new Date().toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
            </span>
          </div>

          {reservasHoy.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#9CA3AF' }}>
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎉</div>
              <p style={{ fontSize:'14px', fontWeight:600, color:'#374151' }}>Sin citas hoy</p>
              <p style={{ fontSize:'13px', marginTop:'4px' }}>¡Disfruta el día libre!</p>
            </div>
          ) : (
            <div className="tl-wrap">
              {reservasHoy.length > 1 && <div className="tl-line"/>}
              {reservasHoy.map((r, idx) => {
                const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
                const completada = r.estado === 'completada'
                const svc = r.servicios as { nombre?: string; duracion?: number; precio?: number } | null
                return (
                  <div key={r.id} className="tl-row">
                    <div className="tl-left">
                      <span className="tl-time" style={{ color: completada ? '#9CA3AF' : '#111827' }}>
                        {r.hora?.slice(0, 5)}
                      </span>
                      <div className="tl-dot" style={{ background: est.dot, boxShadow:`0 0 0 3px ${est.dot}22` }}/>
                      {svc?.duracion && (
                        <span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:500 }}>{svc.duracion}m</span>
                      )}
                    </div>
                    <div className="tl-card" style={{
                      background: completada ? '#F9FAFB' : 'white',
                      borderColor: completada ? 'rgba(0,0,0,0.05)' : `${est.dot}30`,
                      opacity: completada ? 0.75 : 1,
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'3px' }}>{r.cliente_nombre}</p>
                          <p style={{ fontSize:'12px', color:'#6B7280', marginBottom:'6px' }}>
                            {svc?.nombre ?? 'Servicio'}
                            {r.cliente_telefono && ` · ${r.cliente_telefono}`}
                            {svc?.precio ? ` · ${svc.precio}€` : ''}
                          </p>
                          <span style={{ display:'inline-flex', background:est.bg, color:est.color, fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'6px' }}>
                            {est.label}
                          </span>
                        </div>
                        {r.estado !== 'completada' && r.estado !== 'cancelada' && (
                          <button
                            onClick={() => completarReserva(r.id)}
                            disabled={actualizando === r.id}
                            style={{ padding:'7px 12px', background:'#D1FAE5', color:'#065F46', border:'none', borderRadius:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}
                          >
                            {actualizando === r.id ? '…' : '✓ Hecho'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── PRÓXIMAS DE LA SEMANA ── */}
        {reservasProximas.length > 0 && (
          <div className="emp-card">
            <h2 className="emp-card-title">Próximos 7 días
              <span style={{ fontWeight:500, color:'#9CA3AF', marginLeft:'6px', fontSize:'13px' }}>
                {reservasProximas.length} cita{reservasProximas.length !== 1 ? 's' : ''}
              </span>
            </h2>
            {reservasProximas.map(r => {
              const est = COLORES_ESTADO[r.estado] ?? COLORES_ESTADO.pendiente
              const svc = r.servicios as { nombre?: string } | null
              return (
                <div key={r.id} className="prox-row">
                  <div style={{ minWidth:'72px' }}>
                    <p style={{ fontSize:'11px', fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.3px' }}>{formatFecha(r.fecha)}</p>
                    <p style={{ fontSize:'14px', fontWeight:800, color:'#111827' }}>{r.hora?.slice(0, 5)}</p>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{r.cliente_nombre}</p>
                    <p style={{ fontSize:'12px', color:'#6B7280', marginTop:'1px' }}>{svc?.nombre ?? 'Servicio'}</p>
                  </div>
                  <span style={{ background:est.bg, color:est.color, fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'6px', flexShrink:0 }}>{est.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── MI PERFIL ── */}
        <div className="emp-card">
          <h2 className="emp-card-title">Mi perfil</h2>
          <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:'#1E3A5F', flexShrink:0, overflow:'hidden' }}>
              {trabajador?.foto_url
                ? <img src={trabajador.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : avatarIniciales(trabajador?.nombre ?? '?')
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:'16px', fontWeight:800, color:'#111827', letterSpacing:'-0.3px' }}>{trabajador?.nombre}</p>
              {trabajador?.especialidad && <p style={{ fontSize:'13px', color:'#6B7280', marginTop:'2px' }}>{trabajador.especialidad}</p>}
              {nombreNegocio && <p style={{ fontSize:'12px', color:'#9CA3AF', marginTop:'2px' }}>📍 {nombreNegocio}</p>}
              <p style={{ fontSize:'12px', color:'#9CA3AF', marginTop:'1px' }}>{userEmail}</p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(239,68,68,0.06))', color:'#DC2626', border:'1.5px solid rgba(239,68,68,0.18)', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
          >
            🚪 Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  )
}
