'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

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

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function formatFecha(fecha: string, hora: string) {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]} de ${y} a las ${(hora ?? '').slice(0, 5)}`
}

type Reserva = {
  id: string
  fecha: string
  hora: string
  estado: string
  confirmada_cliente: boolean | null
  cliente_nombre: string
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
  negocios: { id: string; nombre: string; direccion: string | null; ciudad: string | null } | null
}

type Estado = 'cargando' | 'ok' | 'ya_confirmada' | 'cancelada' | 'error' | 'no_encontrada'

export default function ConfirmarAsistencia() {
  const params    = useParams()
  const reservaId = params?.id as string

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [estado, setEstado]   = useState<Estado>('cargando')

  useEffect(() => {
    if (!reservaId) return

    ;(async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select('id, fecha, hora, estado, confirmada_cliente, cliente_nombre, servicios(nombre), trabajadores(nombre), negocios(id, nombre, direccion, ciudad)')
        .eq('id', reservaId)
        .single()

      if (error || !data) { setEstado('no_encontrada'); return }
      const r = data as unknown as Reserva
      setReserva(r)

      if (r.estado === 'cancelada') { setEstado('cancelada'); return }
      if (r.confirmada_cliente)     { setEstado('ya_confirmada'); return }

      // Marcar como confirmada por el cliente
      const { error: updErr } = await supabase
        .from('reservas')
        .update({ confirmada_cliente: true })
        .eq('id', reservaId)

      if (updErr) { setEstado('error'); return }
      setEstado('ok')
    })()
  }, [reservaId])

  return (
    <>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#F7F9FC !important; font-family:'Plus Jakarta Sans',sans-serif; color:#111827; }
        .topnav { position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.95); backdrop-filter:blur(16px); border-bottom:1px solid rgba(0,0,0,0.08); padding:12px 24px; }
        .page { max-width:480px; margin:0 auto; padding:48px 16px 80px; }
        .card { background:white; border:1px solid rgba(0,0,0,0.08); border-radius:20px; overflow:hidden; }
        .card-inner { padding:32px; }
        .detail-row { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid rgba(0,0,0,0.06); font-size:14px; }
        .detail-row:last-child { border-bottom:none; }
        .detail-label { color:#6B7280; font-weight:500; flex-shrink:0; }
        .detail-val { color:#111827; font-weight:700; text-align:right; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav className="topnav"><KhepriLogo /></nav>

      <div className="page">

        {/* Cargando */}
        {estado === 'cargando' && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
        )}

        {/* No encontrada */}
        {estado === 'no_encontrada' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Reserva no encontrada</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>El enlace puede haber expirado o ser incorrecto.</div>
          </div>
        )}

        {/* Cancelada */}
        {estado === 'cancelada' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Esta cita fue cancelada</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>No es posible confirmar una cita cancelada.</div>
          </div>
        )}

        {/* Error */}
        {estado === 'error' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Error al confirmar</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>No pudimos registrar tu confirmación. Inténtalo de nuevo.</div>
          </div>
        )}

        {/* Ya confirmada */}
        {estado === 'ya_confirmada' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: '8px' }}>Ya confirmaste tu asistencia</div>
            <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>
              Registramos tu confirmación anteriormente. ¡Te esperamos!
            </div>
            {reserva?.negocios?.id && (
              <Link href={`/negocio/${reserva.negocios.id}`} style={{ display: 'inline-block', marginTop: '28px', padding: '13px 28px', background: '#111827', color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                Ver negocio
              </Link>
            )}
          </div>
        )}

        {/* Confirmada correctamente */}
        {estado === 'ok' && reserva && (
          <div className="card">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', padding: '28px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: '4px' }}>¡Perfecto! Te esperamos</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>{reserva.negocios?.nombre}</div>
            </div>

            <div className="card-inner">
              <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, marginBottom: '20px' }}>
                Hola <strong style={{ color: '#111827' }}>{reserva.cliente_nombre}</strong>, hemos registrado tu confirmación de asistencia. ¡Hasta pronto!
              </p>

              <div style={{ marginBottom: '28px' }}>
                {reserva.servicios?.nombre && (
                  <div className="detail-row">
                    <span className="detail-label">Servicio</span>
                    <span className="detail-val">{reserva.servicios.nombre}</span>
                  </div>
                )}
                {reserva.trabajadores?.nombre && (
                  <div className="detail-row">
                    <span className="detail-label">Profesional</span>
                    <span className="detail-val">{reserva.trabajadores.nombre}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Fecha y hora</span>
                  <span className="detail-val">{formatFecha(reserva.fecha, reserva.hora)}</span>
                </div>
                {reserva.negocios?.direccion && (
                  <div className="detail-row">
                    <span className="detail-label">Dirección</span>
                    <span className="detail-val">{[reserva.negocios.direccion, reserva.negocios.ciudad].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {reserva.negocios?.id && (
                <Link
                  href={`/negocio/${reserva.negocios.id}/reservar`}
                  style={{ display: 'block', width: '100%', padding: '13px', background: 'transparent', color: '#111827', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
                >
                  Volver al negocio
                </Link>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
