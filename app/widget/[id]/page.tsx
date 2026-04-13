'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Servicio  = { id: string; nombre: string; duracion: number; precio: number }
type Trabajador = { id: string; nombre: string }
type Horario   = { dia: string; abierto: boolean; hora_apertura: string; hora_cierre: string }

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const DIAS_NOMBRE  = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
const MESES_NOMBRE = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS_SEMANA  = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function generarSlots(apertura: string, cierre: string, duracion: number): string[] {
  if (!apertura || !cierre || duracion <= 0) return []
  const [ah, am] = apertura.split(':').map(Number)
  const [ch, cm] = cierre.split(':').map(Number)
  let mins = ah * 60 + am
  const fin  = ch * 60 + cm
  const slots: string[] = []
  while (mins + duracion <= fin) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`)
    mins += duracion
  }
  return slots
}

function isoFecha(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ─── Step progress labels ──────────────────────────────────────────────────────
// Internal pasos: 0 servicio · 1 trabajador · 2 fecha · 3 hora · 4 datos · 5 éxito
// Visual steps (for progress bar): 0 Servicio · 1 Fecha · 2 Hora · 3 Confirmar
const STEP_LABELS = ['Servicio', 'Fecha', 'Hora', 'Confirmar']

function visualStep(paso: number): number {
  if (paso === 0 || paso === 1) return 0
  if (paso === 2) return 1
  if (paso === 3) return 2
  return 3
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Widget() {
  const params = useParams()
  const negocioId = params?.id as string

  // Negocio data
  const [negocioNombre, setNegocioNombre] = useState('')
  const [servicios,     setServicios]     = useState<Servicio[]>([])
  const [trabajadores,  setTrabajadores]  = useState<Trabajador[]>([])
  const [horarios,      setHorarios]      = useState<Horario[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [noEncontrado,  setNoEncontrado]  = useState(false)

  // Booking flow
  const [paso,      setPaso]      = useState(0)
  const [servicio,  setServicio]  = useState<Servicio | null>(null)
  const [trabajador,setTrabajador]= useState<Trabajador | null>(null)
  const [fecha,     setFecha]     = useState('')
  const [hora,      setHora]      = useState('')
  const [nombre,    setNombre]    = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [email,     setEmail]     = useState('')
  const [enviando,  setEnviando]  = useState(false)
  const [error,     setError]     = useState('')
  const [reservaId, setReservaId] = useState<string | null>(null)

  // Calendar
  const hoy = new Date()
  const [calMes,  setCalMes]  = useState(hoy.getMonth())
  const [calAnio, setCalAnio] = useState(hoy.getFullYear())

  // ── Load data ──
  useEffect(() => {
    if (!negocioId) return
    Promise.all([
      supabase.from('negocios').select('nombre').eq('id', negocioId).single(),
      supabase.from('servicios').select('id,nombre,duracion,precio').eq('negocio_id', negocioId).eq('activo', true).order('nombre'),
      supabase.from('trabajadores').select('id,nombre').eq('negocio_id', negocioId).eq('activo', true).order('nombre'),
      supabase.from('horarios').select('*').eq('negocio_id', negocioId),
    ]).then(([{ data: neg }, { data: svcs }, { data: trabs }, { data: hors }]) => {
      if (!neg) { setNoEncontrado(true); setCargando(false); return }
      setNegocioNombre(neg.nombre)
      setServicios(svcs || [])
      setTrabajadores(trabs || [])
      setHorarios(hors || [])
      setCargando(false)
    })
  }, [negocioId])

  // ── Time slots ──
  const slots = useCallback((): string[] => {
    if (!fecha || !servicio) return []
    const [y, m, d] = fecha.split('-').map(Number)
    const diaNombre = DIAS_NOMBRE[new Date(y, m - 1, d).getDay()]
    const h = horarios.find(h => h.dia === diaNombre)
    if (!h || !h.abierto) return []
    const s1 = generarSlots(h.hora_apertura, h.hora_cierre, servicio.duracion)
    const s2: string[] = []
    return [...s1, ...s2]
  }, [fecha, servicio, horarios])

  // ── Day availability ──
  function diaDisponible(y: number, m: number, d: number): boolean {
    const f = new Date(y, m, d)
    const h2 = new Date(); h2.setHours(0, 0, 0, 0)
    if (f < h2) return false
    const diaNombre = DIAS_NOMBRE[f.getDay()]
    return !!horarios.find(h => h.dia === diaNombre)?.abierto
  }

  function diasEnMes(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }
  function primerDia(y: number, m: number)   { return (new Date(y, m, 1).getDay() + 6) % 7 }

  // ── Select service ──
  function elegirServicio(s: Servicio) {
    setServicio(s)
    if (trabajadores.length <= 1) {
      setTrabajador(trabajadores[0] || null)
      setPaso(2)
    } else {
      setPaso(1)
    }
  }

  // ── Confirm booking ──
  async function confirmar() {
    if (!nombre.trim())   { setError('Introduce tu nombre');   return }
    if (!telefono.trim()) { setError('Introduce tu teléfono'); return }
    if (!servicio)        { setError('Selecciona un servicio'); return }
    setError(''); setEnviando(true)

    const { data: nueva, error: err } = await supabase
      .from('reservas')
      .insert({
        negocio_id:       negocioId,
        servicio_id:      servicio.id,
        trabajador_id:    trabajador?.id || null,
        cliente_nombre:   nombre.trim(),
        cliente_telefono: telefono.trim(),
        cliente_email:    email.trim() || null,
        fecha, hora,
        estado: 'confirmada',
      })
      .select('id')
      .single()

    if (err) { setError('Error al guardar la reserva. Inténtalo de nuevo.'); setEnviando(false); return }

    setReservaId(nueva?.id ?? null)

    // Fire email (non-blocking)
    if (nueva?.id) {
      supabase.functions.invoke('send-reservation-email', { body: { reserva_id: nueva.id } }).catch(() => {})
    }

    setPaso(5)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const vStep = visualStep(paso)

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --accent:      #111827;
          --accent-soft: rgba(17,24,39,0.06);
          --bg:          #ffffff;
          --bg2:         #F9FAFB;
          --border:      rgba(0,0,0,0.1);
          --border2:     rgba(0,0,0,0.06);
          --text:        #111827;
          --text2:       #4B5563;
          --muted:       #9CA3AF;
          --radius:      10px;
          --radius-lg:   16px;
          --green:       #16A34A;
        }
        html, body {
          background: var(--bg);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: var(--text);
          font-size: 14px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Layout ── */
        .w-wrap { max-width: 480px; margin: 0 auto; padding: 20px 16px 40px; }

        /* ── Progress ── */
        .progress { margin-bottom: 24px; }
        .progress-steps { display: flex; align-items: center; gap: 0; margin-bottom: 10px; }
        .p-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
        .p-step:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 11px; left: 50%;
          width: 100%; height: 2px;
          background: var(--border);
          z-index: 0;
        }
        .p-step:not(:last-child).done::after { background: var(--accent); }
        .p-dot {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid var(--border);
          background: var(--bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: var(--muted);
          position: relative; z-index: 1;
          transition: all 0.2s;
        }
        .p-step.done .p-dot   { background: var(--accent); border-color: var(--accent); color: white; }
        .p-step.active .p-dot { border-color: var(--accent); color: var(--accent); background: white; }
        .p-label { font-size: 10px; font-weight: 600; color: var(--muted); margin-top: 4px; white-space: nowrap; }
        .p-step.active .p-label { color: var(--accent); font-weight: 700; }
        .p-step.done .p-label   { color: var(--text2); }

        /* ── Step header ── */
        .step-title { font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
        .step-sub   { font-size: 13px; color: var(--muted); margin-bottom: 18px; }

        /* ── Back button ── */
        .btn-back {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 600; color: var(--muted);
          background: none; border: none; cursor: pointer;
          padding: 0; margin-bottom: 16px;
          font-family: inherit;
        }
        .btn-back:hover { color: var(--text); }

        /* ── Service cards ── */
        .svc-list { display: flex; flex-direction: column; gap: 8px; }
        .svc-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.15s;
          background: var(--bg);
        }
        .svc-card:hover  { border-color: var(--accent); background: var(--accent-soft); }
        .svc-card.sel    { border-color: var(--accent); background: var(--accent-soft); }
        .svc-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--bg2);
          border: 1px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .svc-info { flex: 1; min-width: 0; }
        .svc-nombre { font-size: 14px; font-weight: 700; color: var(--text); }
        .svc-meta   { font-size: 12px; color: var(--muted); margin-top: 1px; }
        .svc-precio { font-size: 15px; font-weight: 800; color: var(--text); flex-shrink: 0; }
        .svc-check  { color: var(--accent); flex-shrink: 0; }

        /* ── Worker cards ── */
        .trb-list { display: flex; flex-direction: column; gap: 8px; }
        .trb-card {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 16px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.15s;
          background: var(--bg);
        }
        .trb-card:hover { border-color: var(--accent); background: var(--accent-soft); }
        .trb-card.sel   { border-color: var(--accent); background: var(--accent-soft); }
        .trb-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--bg2); border: 1px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0;
        }
        .trb-nombre { font-size: 14px; font-weight: 600; color: var(--text); }

        /* ── Calendar ── */
        .cal { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
        .cal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border2);
        }
        .cal-mes  { font-size: 14px; font-weight: 700; color: var(--text); text-transform: capitalize; }
        .cal-nav  {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--bg);
          cursor: pointer; font-size: 15px; color: var(--text2);
          display: flex; align-items: center; justify-content: center;
        }
        .cal-nav:hover:not(:disabled) { background: var(--bg2); }
        .cal-nav:disabled { opacity: 0.3; cursor: default; }
        .cal-body { padding: 10px; }
        .cal-dow  { display: grid; grid-template-columns: repeat(7,1fr); margin-bottom: 4px; }
        .cal-dow span { text-align: center; font-size: 10px; font-weight: 700; color: var(--muted); padding: 3px 0; }
        .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
        .cal-d {
          aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 500; border-radius: 8px;
          color: var(--muted); cursor: default;
        }
        .cal-d.disp { color: var(--text); cursor: pointer; }
        .cal-d.disp:hover { background: var(--accent-soft); }
        .cal-d.hoy  { font-weight: 800; }
        .cal-d.sel  { background: var(--accent) !important; color: white !important; font-weight: 700; }

        /* ── Time slots ── */
        .slots { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        @media (max-width: 360px) { .slots { grid-template-columns: repeat(3,1fr); } }
        .slot {
          padding: 10px 4px; text-align: center;
          font-size: 13px; font-weight: 600; color: var(--text);
          border: 1.5px solid var(--border); border-radius: var(--radius);
          cursor: pointer; transition: all 0.12s; background: var(--bg);
        }
        .slot:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
        .slot.sel   { background: var(--accent); color: white; border-color: var(--accent); }

        /* ── Form ── */
        .field { margin-bottom: 12px; }
        .field label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); margin-bottom: 5px; }
        .field input {
          width: 100%; padding: 11px 13px;
          border: 1.5px solid var(--border); border-radius: var(--radius);
          font-family: inherit; font-size: 15px; color: var(--text);
          background: var(--bg); outline: none;
          -webkit-appearance: none;
        }
        .field input:focus { border-color: var(--accent); }

        /* ── Summary card ── */
        .summary {
          background: var(--bg2); border: 1px solid var(--border2);
          border-radius: var(--radius-lg); padding: 14px 16px;
          margin-bottom: 16px;
        }
        .sum-row {
          display: flex; justify-content: space-between; gap: 8px;
          padding: 6px 0; font-size: 13px;
          border-bottom: 1px solid var(--border2);
        }
        .sum-row:last-child { border-bottom: none; }
        .sum-label { color: var(--muted); font-weight: 500; }
        .sum-val   { color: var(--text);  font-weight: 700; text-align: right; }

        /* ── Error ── */
        .err { background: #FEF2F2; color: #DC2626; font-size: 12px; font-weight: 600; padding: 9px 12px; border-radius: 8px; margin-top: 10px; }

        /* ── CTA button ── */
        .btn-cta {
          width: 100%; padding: 14px;
          background: var(--accent); color: white;
          border: none; border-radius: var(--radius-lg);
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer; margin-top: 16px;
          transition: opacity 0.15s;
        }
        .btn-cta:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-cta:hover:not(:disabled) { opacity: 0.88; }

        /* ── Empty / loading states ── */
        .state-center { text-align: center; padding: 48px 16px; color: var(--muted); }
        .state-center .big { font-size: 36px; margin-bottom: 10px; }
        .state-center .msg { font-size: 14px; font-weight: 500; }

        /* ── Success ── */
        .success { text-align: center; padding: 32px 0; }
        .success-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: #DCFCE7; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .success-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 6px; }
        .success-sub   { font-size: 13px; color: var(--muted); margin-bottom: 28px; line-height: 1.6; }
        .success-card  { background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius-lg); padding: 16px; text-align: left; }
        .sc-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border2); }
        .sc-row:last-child { border-bottom: none; }
      `}</style>

      <div className="w-wrap">

        {/* ── Loading ── */}
        {cargando && (
          <div className="state-center">
            <div className="big" style={{ fontSize: '24px', color: 'var(--muted)', letterSpacing: '4px', animation: 'none' }}>···</div>
          </div>
        )}

        {/* ── Not found ── */}
        {!cargando && noEncontrado && (
          <div className="state-center">
            <div className="big">🔍</div>
            <div className="msg">Negocio no encontrado</div>
          </div>
        )}

        {/* ── No services ── */}
        {!cargando && !noEncontrado && servicios.length === 0 && (
          <div className="state-center">
            <div className="big">📭</div>
            <div className="msg">Este negocio no tiene servicios configurados</div>
          </div>
        )}

        {/* ── Booking flow ── */}
        {!cargando && !noEncontrado && servicios.length > 0 && paso < 5 && (
          <>
            {/* Progress */}
            <div className="progress">
              <div className="progress-steps">
                {STEP_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className={`p-step ${i < vStep ? 'done' : i === vStep ? 'active' : ''}`}
                  >
                    <div className="p-dot">
                      {i < vStep ? (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="p-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Step 0: Servicio ── */}
            {paso === 0 && (
              <>
                <div className="step-title">¿Qué servicio necesitas?</div>
                <div className="step-sub">{negocioNombre}</div>
                <div className="svc-list">
                  {servicios.map(s => (
                    <div
                      key={s.id}
                      className={`svc-card ${servicio?.id === s.id ? 'sel' : ''}`}
                      onClick={() => elegirServicio(s)}
                    >
                      <div className="svc-icon">🔧</div>
                      <div className="svc-info">
                        <div className="svc-nombre">{s.nombre}</div>
                        <div className="svc-meta">⏱ {s.duracion} min</div>
                      </div>
                      <div className="svc-precio">{s.precio > 0 ? `${s.precio.toFixed(2)} €` : 'Gratis'}</div>
                      {servicio?.id === s.id && (
                        <span className="svc-check">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill="currentColor"/>
                            <path d="M4.5 8l2.5 2.5 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 1: Trabajador ── */}
            {paso === 1 && (
              <>
                <button className="btn-back" onClick={() => setPaso(0)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Atrás
                </button>
                <div className="step-title">¿Con quién quieres ir?</div>
                <div className="step-sub">Elige tu profesional de confianza</div>
                <div className="trb-list">
                  <div
                    className={`trb-card ${!trabajador ? 'sel' : ''}`}
                    onClick={() => { setTrabajador(null); setPaso(2) }}
                  >
                    <div className="trb-avatar">🎲</div>
                    <div>
                      <div className="trb-nombre">Sin preferencia</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Asignación automática</div>
                    </div>
                  </div>
                  {trabajadores.map(t => (
                    <div
                      key={t.id}
                      className={`trb-card ${trabajador?.id === t.id ? 'sel' : ''}`}
                      onClick={() => { setTrabajador(t); setPaso(2) }}
                    >
                      <div className="trb-avatar">👤</div>
                      <div className="trb-nombre">{t.nombre}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Step 2: Fecha ── */}
            {paso === 2 && (
              <>
                <button className="btn-back" onClick={() => setPaso(trabajadores.length > 1 ? 1 : 0)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Atrás
                </button>
                <div className="step-title">Elige un día</div>
                <div className="step-sub">Los días en gris no tienen disponibilidad</div>
                <div className="cal">
                  <div className="cal-head">
                    <button
                      className="cal-nav"
                      disabled={calAnio === hoy.getFullYear() && calMes === hoy.getMonth()}
                      onClick={() => { if (calMes === 0) { setCalMes(11); setCalAnio(y => y - 1) } else setCalMes(m => m - 1) }}
                    >‹</button>
                    <span className="cal-mes">{MESES_NOMBRE[calMes]} {calAnio}</span>
                    <button
                      className="cal-nav"
                      onClick={() => { if (calMes === 11) { setCalMes(0); setCalAnio(y => y + 1) } else setCalMes(m => m + 1) }}
                    >›</button>
                  </div>
                  <div className="cal-body">
                    <div className="cal-dow">
                      {DIAS_SEMANA.map(d => <span key={d}>{d}</span>)}
                    </div>
                    <div className="cal-grid">
                      {Array.from({ length: primerDia(calAnio, calMes) }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: diasEnMes(calAnio, calMes) }).map((_, i) => {
                        const d    = i + 1
                        const disp = diaDisponible(calAnio, calMes, d)
                        const iso  = isoFecha(calAnio, calMes, d)
                        const esHoy = iso === isoFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
                        return (
                          <div
                            key={d}
                            className={`cal-d ${disp ? 'disp' : ''} ${esHoy ? 'hoy' : ''} ${fecha === iso ? 'sel' : ''}`}
                            onClick={() => {
                              if (!disp) return
                              setFecha(iso); setHora(''); setPaso(3)
                            }}
                          >{d}</div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 3: Hora ── */}
            {paso === 3 && (
              <>
                <button className="btn-back" onClick={() => { setHora(''); setPaso(2) }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Atrás
                </button>
                <div className="step-title">Elige una hora</div>
                <div className="step-sub">
                  {fecha && new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {slots().length === 0 ? (
                  <div className="state-center" style={{ padding: '28px 0' }}>
                    <div className="msg">No hay horas disponibles este día</div>
                  </div>
                ) : (
                  <div className="slots">
                    {slots().map(s => (
                      <div
                        key={s}
                        className={`slot ${hora === s ? 'sel' : ''}`}
                        onClick={() => { setHora(s); setPaso(4) }}
                      >{s}</div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Step 4: Datos + confirmar ── */}
            {paso === 4 && (
              <>
                <button className="btn-back" onClick={() => setPaso(3)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Atrás
                </button>
                <div className="step-title">Confirma tu reserva</div>
                <div className="step-sub">Revisa los detalles e introduce tus datos</div>

                <div className="summary">
                  <div className="sum-row">
                    <span className="sum-label">Negocio</span>
                    <span className="sum-val">{negocioNombre}</span>
                  </div>
                  <div className="sum-row">
                    <span className="sum-label">Servicio</span>
                    <span className="sum-val">{servicio?.nombre}</span>
                  </div>
                  {trabajador && (
                    <div className="sum-row">
                      <span className="sum-label">Profesional</span>
                      <span className="sum-val">{trabajador.nombre}</span>
                    </div>
                  )}
                  <div className="sum-row">
                    <span className="sum-label">Fecha</span>
                    <span className="sum-val">
                      {fecha && new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="sum-row">
                    <span className="sum-label">Hora</span>
                    <span className="sum-val">{hora}</span>
                  </div>
                  {servicio && servicio.precio > 0 && (
                    <div className="sum-row">
                      <span className="sum-label">Precio</span>
                      <span className="sum-val">{servicio.precio.toFixed(2)} €</span>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Nombre completo *</label>
                  <input type="text" placeholder="María García" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
                </div>
                <div className="field">
                  <label>Teléfono *</label>
                  <input type="tel" placeholder="612 345 678" value={telefono} onChange={e => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" />
                </div>
                <div className="field">
                  <label>
                    Email&nbsp;
                    <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(para recibir confirmación)</span>
                  </label>
                  <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
                </div>

                {error && <div className="err">{error}</div>}

                <button className="btn-cta" onClick={confirmar} disabled={enviando}>
                  {enviando ? 'Reservando...' : 'Confirmar reserva →'}
                </button>
              </>
            )}
          </>
        )}

        {/* ── Step 5: Success ── */}
        {!cargando && paso === 5 && (
          <div className="success">
            <div className="success-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l7 7 13-13" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="success-title">¡Reserva confirmada!</div>
            <div className="success-sub">
              Tu cita en <strong>{negocioNombre}</strong> ha sido registrada.
              {email && ' Recibirás una confirmación por email.'}
            </div>
            <div className="success-card">
              <div className="sc-row">
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Servicio</span>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{servicio?.nombre}</span>
              </div>
              {trabajador && (
                <div className="sc-row">
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Profesional</span>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{trabajador.nombre}</span>
                </div>
              )}
              <div className="sc-row">
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Fecha</span>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  {fecha && new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="sc-row">
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Hora</span>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{hora}</span>
              </div>
              <div className="sc-row">
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Nombre</span>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{nombre}</span>
              </div>
            </div>

            <button
              onClick={() => { setPaso(0); setServicio(null); setTrabajador(null); setFecha(''); setHora(''); setNombre(''); setTelefono(''); setEmail(''); setError('') }}
              style={{ marginTop: '20px', padding: '11px 24px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' }}
            >
              Nueva reserva
            </button>
          </div>
        )}

      </div>
    </>
  )
}
