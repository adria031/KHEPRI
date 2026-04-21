'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

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
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function formatFecha(fecha: string, hora: string) {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]} de ${y} a las ${hora}`
}

type Reserva = {
  id: string
  fecha: string
  hora: string
  estado: string
  cliente_nombre: string
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
  negocios: { id: string; nombre: string; direccion: string | null; ciudad: string | null; horas_cancelacion: number | null; mensaje_cancelacion: string | null } | null
}

export default function CancelarReserva() {
  const params = useParams()
  const reservaId = params?.id as string

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [estado, setEstado] = useState<'pendiente' | 'confirmando' | 'cancelada' | 'error' | 'ya_cancelada' | 'no_encontrada'>('pendiente')

  useEffect(() => {
    if (!reservaId) return
    supabase
      .from('reservas')
      .select(`
        id, fecha, hora, estado, cliente_nombre,
        servicios (nombre),
        trabajadores (nombre),
        negocios (id, nombre, direccion, ciudad, horas_cancelacion, mensaje_cancelacion)
      `)
      .eq('id', reservaId)
      .single()
      .then(({ data, error }) => {
        setCargando(false)
        if (error || !data) { setEstado('no_encontrada'); return }
        setReserva(data as unknown as Reserva)
        if (data.estado === 'cancelada') setEstado('ya_cancelada')
      })
  }, [reservaId])

  async function confirmarCancelacion() {
    if (!reservaId) return
    setCancelando(true)
    setEstado('confirmando')
    const { error } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', reservaId)
    if (error) { setCancelando(false); setEstado('error'); return }
    // Notify first person on wait list (non-blocking)
    fetch('/api/notificar-espera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reserva_id: reservaId }),
    }).catch(() => {})
    setCancelando(false)
    setEstado('cancelada')
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #F7F9FC !important; font-family: 'Plus Jakarta Sans', sans-serif; color: #111827; }
        .topnav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 12px 24px; }
        .page { max-width: 480px; margin: 0 auto; padding: 48px 16px 80px; }
        .card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; overflow: hidden; }
        .card-inner { padding: 32px; }
        .detail-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 14px; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6B7280; font-weight: 500; flex-shrink: 0; }
        .detail-val { color: #111827; font-weight: 700; text-align: right; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav className="topnav">
        <KhepriLogo />
      </nav>

      <div className="page">

        {cargando && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '14px' }}>
            Cargando...
          </div>
        )}

        {!cargando && estado === 'no_encontrada' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Reserva no encontrada</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>El enlace puede haber expirado o ser incorrecto.</div>
          </div>
        )}

        {!cargando && estado === 'ya_cancelada' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Reserva ya cancelada</div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>Esta cita ya fue cancelada anteriormente.</div>
          </div>
        )}

        {!cargando && estado === 'cancelada' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: '8px' }}>Cita cancelada</div>
            <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, marginBottom: '32px' }}>
              Tu reserva ha sido cancelada correctamente. Esperamos verte pronto.
            </div>
            {reserva?.negocios?.id && (
              <Link
                href={`/negocio/${reserva.negocios.id}`}
                style={{ display: 'inline-block', padding: '13px 28px', background: '#111827', color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}
              >
                Volver al negocio
              </Link>
            )}
          </div>
        )}

        {!cargando && estado === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Error al cancelar</div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>No pudimos cancelar tu cita. Inténtalo de nuevo.</div>
            <button
              onClick={confirmarCancelacion}
              style={{ padding: '13px 28px', background: '#111827', color: 'white', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando && reserva && (estado === 'pendiente' || estado === 'confirmando') && (
          <div className="card">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, rgba(184,216,248,0.3), rgba(212,197,249,0.3))', padding: '24px 32px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {reserva.negocios?.nombre}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                Cancelar cita
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                ¿Seguro que quieres cancelar esta reserva?
              </div>
            </div>

            <div className="card-inner">
              {/* Aviso de política de cancelación */}
              {(() => {
                const horas = reserva.negocios?.horas_cancelacion ?? 24
                const reservaDateTime = new Date(reserva.fecha + 'T' + (reserva.hora?.slice(0,5) ?? '00:00'))
                const diffHoras = (reservaDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
                const fueraDePlazo = diffHoras < horas && diffHoras > 0
                if (!fueraDePlazo) return null
                return (
                  <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(254,202,202,0.3)', border: '1px solid rgba(252,165,165,0.5)', borderRadius: '12px', fontSize: '13px', color: '#991B1B', lineHeight: 1.6 }}>
                    <strong>⚠️ Fuera del plazo de cancelación:</strong> Este negocio requiere cancelar con al menos <strong>{horas === 1 ? '1 hora' : `${horas} horas`}</strong> de antelación. Puedes cancelar igualmente, pero te recomendamos contactar directamente.
                    {reserva.negocios?.mensaje_cancelacion && (
                      <div style={{ marginTop: '6px', color: '#7F1D1D', fontStyle: 'italic' }}>"{reserva.negocios.mensaje_cancelacion}"</div>
                    )}
                  </div>
                )
              })()}

              {/* Details */}
              <div style={{ marginBottom: '28px' }}>
                <div className="detail-row">
                  <span className="detail-label">Servicio</span>
                  <span className="detail-val">{reserva.servicios?.nombre ?? '—'}</span>
                </div>
                {reserva.trabajadores && (
                  <div className="detail-row">
                    <span className="detail-label">Profesional</span>
                    <span className="detail-val">{reserva.trabajadores.nombre}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Fecha</span>
                  <span className="detail-val">{formatFecha(reserva.fecha, reserva.hora)}</span>
                </div>
                {reserva.negocios?.direccion && (
                  <div className="detail-row">
                    <span className="detail-label">Dirección</span>
                    <span className="detail-val">{[reserva.negocios.direccion, reserva.negocios.ciudad].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={confirmarCancelacion}
                  disabled={cancelando}
                  style={{ width: '100%', padding: '14px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, cursor: cancelando ? 'not-allowed' : 'pointer', opacity: cancelando ? 0.7 : 1 }}
                >
                  {cancelando ? 'Cancelando...' : 'Sí, cancelar mi cita'}
                </button>
                {reserva.negocios?.id && (
                  <Link
                    href={`/negocio/${reserva.negocios.id}/reservar`}
                    style={{ display: 'block', width: '100%', padding: '14px', background: 'transparent', color: '#111827', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
                  >
                    No, mantener la cita
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
