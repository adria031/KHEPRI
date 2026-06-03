'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

// Cliente anon — sin sesión requerida
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function KhepriLogo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight:800, fontSize:'17px', letterSpacing:'-0.5px', color:'#111827' }}>Khepria</span>
    </div>
  )
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function formatFecha(fecha: string, hora: string) {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]} de ${y} a las ${(hora ?? '').slice(0,5)}`
}

type Reserva = {
  id: string; fecha: string; hora: string; estado: string; cliente_nombre: string; cliente_email: string | null
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
  negocios: {
    id: string; nombre: string; email?: string | null
    direccion: string | null; ciudad: string | null
    horas_cancelacion: number | null; mensaje_cancelacion: string | null
  } | null
}
type Estado = 'cargando' | 'pendiente' | 'cancelada' | 'ya_cancelada' | 'no_encontrada' | 'error'

function Pantalla({ emoji, titulo, sub, children }: { emoji: string; titulo: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign:'center', padding:'72px 24px' }}>
      <div style={{ fontSize:'52px', marginBottom:'16px' }}>{emoji}</div>
      <div style={{ fontSize:'21px', fontWeight:800, color:'#111827', letterSpacing:'-0.3px', marginBottom:'8px' }}>{titulo}</div>
      {sub && <div style={{ fontSize:'14px', color:'#6B7280', lineHeight:1.7, marginBottom:'24px' }}>{sub}</div>}
      {children}
      <div style={{ marginTop:'20px' }}>
        <a href="https://khepria.app" style={{ fontSize:'13px', color:'#9CA3AF', textDecoration:'none' }}>Ir a khepria.app →</a>
      </div>
    </div>
  )
}

export default function CancelarReserva() {
  const params    = useParams()
  const reservaId = params?.id as string

  const [reserva,   setReserva]   = useState<Reserva | null>(null)
  const [estado,    setEstado]    = useState<Estado>('cargando')
  const [cancelando, setCancelando] = useState(false)

  useEffect(() => {
    if (!reservaId) { setEstado('no_encontrada'); return }
    sb.from('reservas')
      .select('id,fecha,hora,estado,cliente_nombre,cliente_email,servicios(nombre),trabajadores(nombre),negocios(id,nombre,email,direccion,ciudad,horas_cancelacion,mensaje_cancelacion)')
      .eq('id', reservaId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setEstado('no_encontrada'); return }
        const r = data as unknown as Reserva
        setReserva(r)
        setEstado(r.estado === 'cancelada' ? 'ya_cancelada' : 'pendiente')
      })
  }, [reservaId])

  async function confirmarCancelacion() {
    if (!reservaId || cancelando) return
    setCancelando(true)

    const { error } = await sb
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', reservaId)

    if (error) { setCancelando(false); setEstado('error'); return }

    // Notificar al negocio por email (non-blocking)
    if (reserva) {
      fetch('/api/alertas-creditos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'cancelacion_cliente',
          reserva_id: reservaId,
          negocio_id: reserva.negocios?.id,
          cliente_nombre: reserva.cliente_nombre,
          servicio: reserva.servicios?.nombre,
          fecha: reserva.fecha,
          hora: reserva.hora,
        }),
      }).catch(() => {})

      // Notificar lista de espera
      fetch('/api/notificar-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserva_id: reservaId }),
      }).catch(() => {})
    }

    setCancelando(false)
    setEstado('cancelada')
  }

  const wrap = (content: React.ReactNode) => (
    <>
      <style>{`*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}html,body{background:#F7F9FC!important;font-family:'Plus Jakarta Sans',sans-serif;color:#111827}.topnav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border-bottom:1px solid rgba(0,0,0,0.08);padding:12px 24px}.page{max-width:480px;margin:0 auto;padding:48px 16px 80px}.card{background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:20px;overflow:hidden}.detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px}.detail-row:last-child{border-bottom:none}.detail-label{color:#6B7280;font-weight:500;flex-shrink:0}.detail-val{color:#111827;font-weight:700;text-align:right}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <nav className="topnav"><KhepriLogo /></nav>
      <div className="page">{content}</div>
    </>
  )

  if (estado === 'cargando') return wrap(<div style={{textAlign:'center',padding:'80px 0',color:'#9CA3AF',fontSize:'14px'}}>Cargando...</div>)

  if (estado === 'no_encontrada') return wrap(
    <Pantalla emoji="🔍" titulo="Reserva no encontrada" sub="El enlace puede haber expirado o ser incorrecto. Contacta con el negocio para cancelar." />
  )

  if (estado === 'ya_cancelada') return wrap(
    <Pantalla emoji="✅" titulo="Cita ya cancelada" sub="Esta cita ya fue cancelada anteriormente.">
      {reserva?.negocios?.id && (
        <Link href={`/negocio/${reserva.negocios.id}/reservar`} style={{display:'inline-block',padding:'12px 24px',background:'#111827',color:'#fff',borderRadius:'12px',fontSize:'14px',fontWeight:700,textDecoration:'none'}}>
          Reservar nueva cita
        </Link>
      )}
    </Pantalla>
  )

  if (estado === 'cancelada') return wrap(
    <Pantalla emoji="✅" titulo="Cita cancelada" sub="Tu reserva ha sido cancelada correctamente. Esperamos verte pronto.">
      {reserva?.negocios?.id && (
        <Link href={`/negocio/${reserva.negocios.id}/reservar`} style={{display:'inline-block',padding:'12px 24px',background:'#111827',color:'#fff',borderRadius:'12px',fontSize:'14px',fontWeight:700,textDecoration:'none'}}>
          Reservar nueva cita
        </Link>
      )}
    </Pantalla>
  )

  if (estado === 'error') return wrap(
    <Pantalla emoji="⚠️" titulo="Error al cancelar" sub="No pudimos cancelar tu cita. Inténtalo de nuevo o contacta con el negocio directamente." />
  )

  // Estado 'pendiente'
  if (!reserva) return wrap(null)

  const horas           = reserva.negocios?.horas_cancelacion ?? 24
  const reservaDateTime = new Date(reserva.fecha + 'T' + (reserva.hora?.slice(0,5) ?? '00:00'))
  const diffHoras       = (reservaDateTime.getTime() - Date.now()) / 3600000
  const fueraPlazo      = diffHoras > 0 && diffHoras < horas

  // BLOQUEADO: fuera del plazo de cancelación
  if (fueraPlazo) return wrap(
    <div className="card">
      <div style={{background:'linear-gradient(135deg,rgba(254,202,202,0.4),rgba(252,165,165,0.2))',padding:'24px 32px',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:'13px',fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>
          {reserva.negocios?.nombre}
        </div>
        <div style={{fontSize:'20px',fontWeight:800,color:'#991B1B',letterSpacing:'-0.5px'}}>No se puede cancelar</div>
        <div style={{fontSize:'13px',color:'#B91C1C',marginTop:'4px'}}>Estás fuera del plazo de cancelación</div>
      </div>
      <div style={{padding:'28px 32px'}}>
        <div style={{marginBottom:'24px',padding:'16px 18px',background:'rgba(254,202,202,0.25)',border:'1px solid rgba(252,165,165,0.5)',borderRadius:'14px',fontSize:'14px',color:'#7F1D1D',lineHeight:1.7}}>
          <strong>⚠️ Plazo superado:</strong> Este negocio requiere cancelar con al menos <strong>{horas === 1 ? '1 hora' : `${horas} horas`}</strong> de antelación. Tu cita es el <strong>{formatFecha(reserva.fecha, reserva.hora)}</strong>, por lo que ya no es posible cancelarla desde aquí.
          {reserva.negocios?.mensaje_cancelacion && (
            <div style={{marginTop:'10px',padding:'10px 14px',background:'rgba(127,29,29,0.06)',borderRadius:'10px',fontStyle:'italic',color:'#991B1B',fontSize:'13px'}}>
              "{reserva.negocios.mensaje_cancelacion}"
            </div>
          )}
        </div>
        <div style={{marginBottom:'24px'}}>
          {reserva.servicios?.nombre && (
            <div className="detail-row"><span className="detail-label">Servicio</span><span className="detail-val">{reserva.servicios.nombre}</span></div>
          )}
          {reserva.trabajadores?.nombre && (
            <div className="detail-row"><span className="detail-label">Profesional</span><span className="detail-val">{reserva.trabajadores.nombre}</span></div>
          )}
          <div className="detail-row"><span className="detail-label">Fecha y hora</span><span className="detail-val">{formatFecha(reserva.fecha, reserva.hora)}</span></div>
        </div>
        <p style={{fontSize:'13px',color:'#6B7280',marginBottom:'18px',lineHeight:1.6}}>Si necesitas cancelar, contacta directamente con el negocio.</p>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {reserva.negocios?.email && (
            <a href={`mailto:${reserva.negocios.email}`}
              style={{display:'block',width:'100%',padding:'14px',background:'#111827',color:'#fff',borderRadius:'12px',fontSize:'15px',fontWeight:700,textAlign:'center',textDecoration:'none'}}>
              Contactar al negocio →
            </a>
          )}
          {reserva.negocios?.id && (
            <Link href={`/negocio/${reserva.negocios.id}/reservar`}
              style={{display:'block',width:'100%',padding:'14px',background:'transparent',color:'#111827',border:'1.5px solid rgba(0,0,0,0.1)',borderRadius:'12px',fontSize:'15px',fontWeight:700,textAlign:'center',textDecoration:'none'}}>
              Volver al negocio
            </Link>
          )}
        </div>
      </div>
    </div>
  )

  return wrap(
    <div className="card">
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,rgba(184,216,248,0.3),rgba(212,197,249,0.3))',padding:'24px 32px',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:'13px',fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>
          {reserva.negocios?.nombre}
        </div>
        <div style={{fontSize:'20px',fontWeight:800,color:'#111827',letterSpacing:'-0.5px'}}>Cancelar cita</div>
        <div style={{fontSize:'13px',color:'#6B7280',marginTop:'4px'}}>¿Seguro que quieres cancelar esta reserva?</div>
      </div>

      <div style={{padding:'28px 32px'}}>
        {/* Detalles */}
        <div style={{marginBottom:'28px'}}>
          {reserva.servicios?.nombre && (
            <div className="detail-row"><span className="detail-label">Servicio</span><span className="detail-val">{reserva.servicios.nombre}</span></div>
          )}
          {reserva.trabajadores?.nombre && (
            <div className="detail-row"><span className="detail-label">Profesional</span><span className="detail-val">{reserva.trabajadores.nombre}</span></div>
          )}
          <div className="detail-row"><span className="detail-label">Fecha y hora</span><span className="detail-val">{formatFecha(reserva.fecha, reserva.hora)}</span></div>
          {reserva.negocios?.direccion && (
            <div className="detail-row"><span className="detail-label">Dirección</span><span className="detail-val">{[reserva.negocios.direccion, reserva.negocios.ciudad].filter(Boolean).join(', ')}</span></div>
          )}
        </div>

        {/* Botones */}
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <button
            onClick={confirmarCancelacion}
            disabled={cancelando}
            style={{width:'100%',padding:'14px',background:'#DC2626',color:'#fff',border:'none',borderRadius:'12px',fontFamily:'inherit',fontSize:'15px',fontWeight:700,cursor:cancelando?'not-allowed':'pointer',opacity:cancelando?0.7:1,transition:'opacity .15s'}}
          >
            {cancelando ? 'Cancelando...' : 'Sí, cancelar mi cita'}
          </button>
          {reserva.negocios?.id && (
            <Link href={`/negocio/${reserva.negocios.id}/reservar`}
              style={{display:'block',width:'100%',padding:'14px',background:'transparent',color:'#111827',border:'1.5px solid rgba(0,0,0,0.1)',borderRadius:'12px',fontSize:'15px',fontWeight:700,textAlign:'center',textDecoration:'none'}}>
              No, mantener la cita
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
