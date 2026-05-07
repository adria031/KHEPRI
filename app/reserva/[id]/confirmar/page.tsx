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
  id: string; fecha: string; hora: string; estado: string; cliente_nombre: string
  confirmada_cliente: boolean | null
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
  negocios: { id: string; nombre: string; direccion: string | null; ciudad: string | null } | null
}
type Estado = 'cargando' | 'pendiente' | 'ok' | 'ya_confirmada' | 'cancelada' | 'no_encontrada' | 'error'

// ─── Pantalla genérica de estado ─────────────────────────────────────────────
function Pantalla({ emoji, titulo, sub, children }: { emoji: string; titulo: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ textAlign:'center', padding:'72px 24px' }}>
      <div style={{ fontSize:'52px', marginBottom:'16px' }}>{emoji}</div>
      <div style={{ fontSize:'21px', fontWeight:800, color:'#111827', letterSpacing:'-0.3px', marginBottom:'8px' }}>{titulo}</div>
      {sub && <div style={{ fontSize:'14px', color:'#6B7280', lineHeight:1.7, marginBottom:'24px' }}>{sub}</div>}
      {children}
      <a href="https://khepria.app" style={{ display:'inline-block', marginTop:'20px', fontSize:'13px', color:'#9CA3AF', textDecoration:'none' }}>
        Ir a khepria.app →
      </a>
    </div>
  )
}

export default function ConfirmarAsistencia() {
  const params    = useParams()
  const reservaId = params?.id as string

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [estado,  setEstado]  = useState<Estado>('cargando')

  useEffect(() => {
    if (!reservaId) { setEstado('no_encontrada'); return }
    ;(async () => {
      const { data, error } = await sb
        .from('reservas')
        .select('id,fecha,hora,estado,cliente_nombre,confirmada_cliente,servicios(nombre),trabajadores(nombre),negocios(id,nombre,direccion,ciudad)')
        .eq('id', reservaId)
        .single()

      if (error || !data) { setEstado('no_encontrada'); return }
      const r = data as unknown as Reserva
      setReserva(r)

      if (r.estado === 'cancelada')  { setEstado('cancelada');     return }
      if (r.confirmada_cliente)      { setEstado('ya_confirmada'); return }

      // Marcar confirmada
      const { error: updErr } = await sb
        .from('reservas')
        .update({ confirmada_cliente: true })
        .eq('id', reservaId)

      setEstado(updErr ? 'error' : 'ok')
    })()
  }, [reservaId])

  const page = (content: React.ReactNode) => (
    <>
      <style>{`*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}html,body{background:#F7F9FC!important;font-family:'Plus Jakarta Sans',sans-serif;color:#111827}.topnav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border-bottom:1px solid rgba(0,0,0,0.08);padding:12px 24px}.page{max-width:480px;margin:0 auto;padding:48px 16px 80px}.card{background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:20px;overflow:hidden}.detail-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px}.detail-row:last-child{border-bottom:none}.detail-label{color:#6B7280;font-weight:500;flex-shrink:0}.detail-val{color:#111827;font-weight:700;text-align:right}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <nav className="topnav"><KhepriLogo /></nav>
      <div className="page">{content}</div>
    </>
  )

  if (estado === 'cargando') return page(<div style={{textAlign:'center',padding:'80px 0',color:'#9CA3AF',fontSize:'14px'}}>Cargando...</div>)

  if (estado === 'no_encontrada') return page(
    <Pantalla emoji="🔍" titulo="Reserva no encontrada" sub="El enlace puede haber expirado o ser incorrecto. Contacta con el negocio." />
  )

  if (estado === 'cancelada') return page(
    <Pantalla emoji="❌" titulo="Esta cita fue cancelada" sub="No es posible confirmar una cita cancelada." />
  )

  if (estado === 'error') return page(
    <Pantalla emoji="⚠️" titulo="Error al confirmar" sub="No pudimos registrar tu confirmación. Inténtalo de nuevo o contacta con el negocio." />
  )

  if (estado === 'ya_confirmada') return page(
    <Pantalla emoji="✅" titulo="Ya confirmaste tu asistencia" sub="Registramos tu confirmación anteriormente. ¡Te esperamos!">
      {reserva?.negocios?.id && (
        <Link href={`/negocio/${reserva.negocios.id}`} style={{display:'inline-block',padding:'13px 28px',background:'#111827',color:'white',borderRadius:'12px',fontSize:'14px',fontWeight:700,textDecoration:'none'}}>
          Ver negocio
        </Link>
      )}
    </Pantalla>
  )

  // Estado 'ok' — confirmada correctamente
  return page(
    reserva && (
      <div className="card">
        <div style={{background:'linear-gradient(135deg,#22C55E,#16A34A)',padding:'28px 32px',textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'10px'}}>🎉</div>
          <div style={{fontSize:'22px',fontWeight:800,color:'#fff',letterSpacing:'-0.5px',marginBottom:'4px'}}>¡Perfecto! Te esperamos</div>
          <div style={{fontSize:'14px',color:'rgba(255,255,255,0.85)'}}>{reserva.negocios?.nombre}</div>
        </div>
        <div style={{padding:'28px 32px'}}>
          <p style={{fontSize:'15px',color:'#4B5563',lineHeight:1.6,marginBottom:'20px'}}>
            Hola <strong style={{color:'#111827'}}>{reserva.cliente_nombre}</strong>, hemos registrado tu confirmación. ¡Hasta pronto!
          </p>
          <div style={{marginBottom:'24px'}}>
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
          {reserva.negocios?.id && (
            <Link href={`/negocio/${reserva.negocios.id}/reservar`} style={{display:'block',width:'100%',padding:'13px',background:'transparent',color:'#111827',border:'1.5px solid rgba(0,0,0,0.1)',borderRadius:'12px',fontSize:'14px',fontWeight:700,textAlign:'center',textDecoration:'none'}}>
              Volver al negocio
            </Link>
          )}
        </div>
      </div>
    )
  )
}
