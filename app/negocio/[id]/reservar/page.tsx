'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepri</span>
    </div>
  )
}

type Servicio = { id: string; nombre: string; duracion: number; precio: number }
type Trabajador = { id: string; nombre: string }
type Horario = { dia: string; abierto: boolean; hora_apertura: string; hora_cierre: string; hora_apertura2: string; hora_cierre2: string }

const diasNombre = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
const mesesNombre = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const diasSemana = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function generarSlots(apertura: string, cierre: string, duracion: number): string[] {
  if (!apertura || !cierre || duracion <= 0) return []
  const [ah, am] = apertura.split(':').map(Number)
  const [ch, cm] = cierre.split(':').map(Number)
  let mins = ah * 60 + am
  const finMins = ch * 60 + cm
  const slots: string[] = []
  while (mins + duracion <= finMins) {
    slots.push(`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`)
    mins += duracion
  }
  return slots
}

function formatFecha(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function Reservar() {
  const params = useParams()
  const id = params?.id as string

  const [paso, setPaso] = useState(0)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [cargandoInit, setCargandoInit] = useState(true)

  // Selecciones
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null)
  const [fecha, setFecha] = useState<string>('')
  const [hora, setHora] = useState<string>('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  // Calendario
  const hoy = new Date()
  const [calMes, setCalMes] = useState(hoy.getMonth())
  const [calAnio, setCalAnio] = useState(hoy.getFullYear())

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('negocios').select('nombre').eq('id', id).single(),
      supabase.from('servicios').select('id,nombre,duracion,precio').eq('negocio_id', id).eq('activo', true).order('nombre'),
      supabase.from('trabajadores').select('id,nombre').eq('negocio_id', id).eq('activo', true).order('nombre'),
      supabase.from('horarios').select('*').eq('negocio_id', id),
    ]).then(([{data: neg}, {data: ser}, {data: tra}, {data: hor}]) => {
      if (neg) setNegocioNombre(neg.nombre)
      if (ser) setServicios(ser)
      if (tra) setTrabajadores(tra)
      if (hor) setHorarios(hor)
      setCargandoInit(false)
    })
  }, [id])

  // Generar slots para la fecha y servicio seleccionados
  const slots = useCallback((): string[] => {
    if (!fecha || !servicio) return []
    const [y, m, d] = fecha.split('-').map(Number)
    const diaNombre = diasNombre[new Date(y, m-1, d).getDay()]
    const horario = horarios.find(h => h.dia === diaNombre)
    if (!horario || !horario.abierto) return []
    const s1 = generarSlots(horario.hora_apertura, horario.hora_cierre, servicio.duracion)
    const s2 = horario.hora_apertura2 ? generarSlots(horario.hora_apertura2, horario.hora_cierre2, servicio.duracion) : []
    return [...s1, ...s2]
  }, [fecha, servicio, horarios])

  function diaDisponible(y: number, m: number, d: number): boolean {
    const f = new Date(y, m, d)
    const h = new Date(); h.setHours(0,0,0,0)
    if (f < h) return false
    const diaNombre = diasNombre[f.getDay()]
    const horario = horarios.find(h => h.dia === diaNombre)
    return !!(horario?.abierto)
  }

  function diasEnMes(y: number, m: number) { return new Date(y, m+1, 0).getDate() }
  function primerDiaMes(y: number, m: number) {
    // Ajustar para que la semana empiece en Lunes (0=Lu, 6=Do)
    return (new Date(y, m, 1).getDay() + 6) % 7
  }

  async function confirmar() {
    if (!nombre.trim()) { setError('Introduce tu nombre'); return }
    if (!telefono.trim()) { setError('Introduce tu teléfono'); return }
    setError(''); setEnviando(true)

    const { error: err } = await supabase.from('reservas').insert({
      negocio_id: id,
      servicio_id: servicio!.id,
      trabajador_id: trabajador?.id || null,
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim(),
      fecha,
      hora,
      estado: 'confirmada',
    })

    if (err) { setError('Error al guardar la reserva. Inténtalo de nuevo.'); setEnviando(false); return }
    setPaso(5)
  }

  function avanzarServicio(s: Servicio) {
    setServicio(s)
    // Si no hay trabajadores o solo hay uno, saltar ese paso
    if (trabajadores.length <= 1) {
      setTrabajador(trabajadores[0] || null)
      setPaso(2)
    } else {
      setPaso(1)
    }
  }

  if (cargandoInit) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #F7F9FC !important; font-family: 'Plus Jakarta Sans', sans-serif; color: #111827; }
        .topnav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
        .page { max-width: 520px; margin: 0 auto; padding: 24px 16px 48px; }
        .progress-bar { display: flex; gap: 4px; margin-bottom: 28px; }
        .progress-step { flex: 1; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.08); transition: background 0.3s; }
        .progress-step.done { background: #1D4ED8; }
        .step-header { margin-bottom: 22px; }
        .step-header h2 { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 4px; }
        .step-header p { font-size: 14px; color: #6B7280; }
        .opcion-lista { display: flex; flex-direction: column; gap: 10px; }
        .opcion { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: white; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 14px; cursor: pointer; transition: all 0.15s; }
        .opcion:hover { border-color: #1D4ED8; box-shadow: 0 0 0 3px rgba(29,78,216,0.07); }
        .opcion.selected { border-color: #1D4ED8; background: rgba(184,216,248,0.1); }
        .opcion-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(184,216,248,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .opcion-nombre { font-size: 15px; font-weight: 700; color: #111827; }
        .opcion-sub { font-size: 13px; color: #6B7280; margin-top: 2px; }
        .opcion-precio { font-size: 16px; font-weight: 800; color: #111827; margin-left: auto; flex-shrink: 0; }
        /* Calendario */
        .cal { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden; }
        .cal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .cal-mes { font-size: 15px; font-weight: 700; color: #111827; text-transform: capitalize; }
        .cal-nav { background: none; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: #4B5563; }
        .cal-body { padding: 12px; }
        .cal-dias-semana { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; }
        .cal-dia-nombre { text-align: center; font-size: 11px; font-weight: 700; color: #9CA3AF; padding: 4px 0; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .cal-dia { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; border-radius: 8px; cursor: default; color: #9CA3AF; }
        .cal-dia.disponible { color: #111827; cursor: pointer; }
        .cal-dia.disponible:hover { background: rgba(184,216,248,0.3); color: #1D4ED8; }
        .cal-dia.hoy { font-weight: 800; }
        .cal-dia.seleccionado { background: #1D4ED8 !important; color: white !important; font-weight: 700; }
        /* Slots */
        .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .slot { padding: 11px 8px; background: white; border: 1.5px solid rgba(0,0,0,0.08); border-radius: 10px; text-align: center; font-size: 14px; font-weight: 600; color: #111827; cursor: pointer; transition: all 0.15s; }
        .slot:hover { border-color: #1D4ED8; color: #1D4ED8; background: rgba(184,216,248,0.1); }
        .slot.selected { background: #1D4ED8; color: white; border-color: #1D4ED8; }
        /* Formulario */
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        .field input { width: 100%; padding: 13px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 16px; color: #111827; outline: none; background: white; -webkit-appearance: none; }
        .field input:focus { border-color: #1D4ED8; }
        /* Resumen */
        .resumen { background: rgba(184,216,248,0.1); border: 1.5px solid rgba(184,216,248,0.4); border-radius: 14px; padding: 16px 18px; margin-bottom: 20px; }
        .resumen-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; }
        .resumen-row:not(:last-child) { border-bottom: 1px solid rgba(0,0,0,0.06); }
        .resumen-label { color: #6B7280; font-weight: 500; }
        .resumen-val { color: #111827; font-weight: 700; }
        /* Botones nav */
        .btn-primary { width: 100%; padding: 15px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 20px; }
        .btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; }
        .btn-back { background: none; border: none; font-family: inherit; font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; padding: 4px 0; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
        .error-msg { background: rgba(251,207,232,0.3); color: #B5467A; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; margin-top: 12px; }
        /* Éxito */
        .exito { text-align: center; padding: 40px 20px; }
        .exito-icon { font-size: 64px; margin-bottom: 16px; }
        .exito-titulo { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 8px; }
        .exito-sub { font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 28px; }
        .exito-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 18px; text-align: left; margin-bottom: 20px; }
        .exito-card-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .exito-card-row:last-child { border-bottom: none; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav className="topnav">
        <Link href={`/negocio/${id}`} style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <span style={{fontSize:'13px', color:'#6B7280', fontWeight:600}}>{negocioNombre}</span>
      </nav>

      <div className="page">

        {/* PASO 5: ÉXITO */}
        {paso === 5 && (
          <div className="exito">
            <div className="exito-icon">🎉</div>
            <div className="exito-titulo">¡Cita confirmada!</div>
            <div className="exito-sub">Tu reserva ha sido registrada correctamente. Te esperamos.</div>
            <div className="exito-card">
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Servicio</span><span style={{fontWeight:700}}>{servicio?.nombre}</span></div>
              {trabajador && <div className="exito-card-row"><span style={{color:'#6B7280'}}>Profesional</span><span style={{fontWeight:700}}>{trabajador.nombre}</span></div>}
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Fecha</span><span style={{fontWeight:700}}>{fecha && new Date(fecha+'T00:00:00').toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</span></div>
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Hora</span><span style={{fontWeight:700}}>{hora}</span></div>
              <div className="exito-card-row"><span style={{color:'#6B7280'}}>Nombre</span><span style={{fontWeight:700}}>{nombre}</span></div>
            </div>
            <Link href={`/negocio/${id}`} style={{display:'block', width:'100%', padding:'14px', background:'#111827', color:'white', border:'none', borderRadius:'12px', fontFamily:'inherit', fontSize:'15px', fontWeight:700, textAlign:'center', textDecoration:'none'}}>
              Volver al negocio
            </Link>
          </div>
        )}

        {paso < 5 && (
          <>
            {/* Barra de progreso: pasos 0–4 */}
            <div className="progress-bar">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`progress-step ${i < paso ? 'done' : i === paso ? 'done' : ''}`}
                  style={i < paso ? {background:'#1D4ED8'} : i === paso ? {background:'rgba(29,78,216,0.35)'} : {}}
                />
              ))}
            </div>

            {/* PASO 0: SERVICIO */}
            {paso === 0 && (
              <>
                <div className="step-header">
                  <h2>¿Qué servicio necesitas?</h2>
                  <p>Selecciona el servicio que quieres reservar</p>
                </div>
                {servicios.length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px', color:'#9CA3AF', fontSize:'14px'}}>Este negocio aún no tiene servicios configurados.</div>
                ) : (
                  <div className="opcion-lista">
                    {servicios.map(s => (
                      <div key={s.id} className={`opcion ${servicio?.id === s.id ? 'selected' : ''}`} onClick={() => avanzarServicio(s)}>
                        <div className="opcion-icon">🔧</div>
                        <div>
                          <div className="opcion-nombre">{s.nombre}</div>
                          <div className="opcion-sub">⏱ {s.duracion} min</div>
                        </div>
                        <div className="opcion-precio">€{s.precio.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* PASO 1: TRABAJADOR */}
            {paso === 1 && (
              <>
                <button className="btn-back" onClick={() => setPaso(0)}>← Atrás</button>
                <div className="step-header">
                  <h2>¿Con quién quieres ir?</h2>
                  <p>Elige tu profesional de confianza</p>
                </div>
                <div className="opcion-lista">
                  <div className={`opcion ${!trabajador ? 'selected' : ''}`} onClick={() => { setTrabajador(null); setPaso(2) }}>
                    <div className="opcion-icon">🎲</div>
                    <div>
                      <div className="opcion-nombre">Sin preferencia</div>
                      <div className="opcion-sub">Asignar automáticamente</div>
                    </div>
                  </div>
                  {trabajadores.map(t => (
                    <div key={t.id} className={`opcion ${trabajador?.id === t.id ? 'selected' : ''}`} onClick={() => { setTrabajador(t); setPaso(2) }}>
                      <div className="opcion-icon" style={{background:'rgba(212,197,249,0.3)'}}>👤</div>
                      <div>
                        <div className="opcion-nombre">{t.nombre}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* PASO 2: FECHA */}
            {paso === 2 && (
              <>
                <button className="btn-back" onClick={() => setPaso(trabajadores.length > 1 ? 1 : 0)}>← Atrás</button>
                <div className="step-header">
                  <h2>¿Qué día te viene bien?</h2>
                  <p>Los días en gris no están disponibles</p>
                </div>
                <div className="cal">
                  <div className="cal-header">
                    <button
                      className="cal-nav"
                      disabled={calAnio === hoy.getFullYear() && calMes === hoy.getMonth()}
                      style={{opacity: calAnio === hoy.getFullYear() && calMes === hoy.getMonth() ? 0.25 : 1}}
                      onClick={() => {
                        if (calMes === 0) { setCalMes(11); setCalAnio(y => y-1) } else setCalMes(m => m-1)
                      }}
                    >‹</button>
                    <span className="cal-mes">{mesesNombre[calMes]} {calAnio}</span>
                    <button className="cal-nav" onClick={() => {
                      if (calMes === 11) { setCalMes(0); setCalAnio(y => y+1) } else setCalMes(m => m+1)
                    }}>›</button>
                  </div>
                  <div className="cal-body">
                    <div className="cal-dias-semana">
                      {diasSemana.map(d => <div key={d} className="cal-dia-nombre">{d}</div>)}
                    </div>
                    <div className="cal-grid">
                      {Array.from({length: primerDiaMes(calAnio, calMes)}).map((_, i) => <div key={`empty-${i}`} />)}
                      {Array.from({length: diasEnMes(calAnio, calMes)}).map((_, i) => {
                        const d = i + 1
                        const disp = diaDisponible(calAnio, calMes, d)
                        const fechaISO = formatFecha(calAnio, calMes, d)
                        const esHoy = fechaISO === formatFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
                        const selec = fecha === fechaISO
                        return (
                          <div
                            key={d}
                            className={`cal-dia ${disp ? 'disponible' : ''} ${esHoy ? 'hoy' : ''} ${selec ? 'seleccionado' : ''}`}
                            onClick={() => {
                              if (!disp) return
                              setFecha(fechaISO)
                              setHora('')
                              setPaso(3)
                            }}
                          >
                            {d}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* PASO 3: HORA */}
            {paso === 3 && (
              <>
                <button className="btn-back" onClick={() => { setHora(''); setPaso(2) }}>← Atrás</button>
                <div className="step-header">
                  <h2>¿A qué hora?</h2>
                  <p>{fecha && new Date(fecha+'T00:00:00').toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'})}</p>
                </div>
                {slots().length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px', color:'#9CA3AF', fontSize:'14px'}}>No hay horas disponibles este día</div>
                ) : (
                  <div className="slots-grid">
                    {slots().map(s => (
                      <div key={s} className={`slot ${hora === s ? 'selected' : ''}`} onClick={() => { setHora(s); setPaso(4) }}>{s}</div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* PASO 4: DATOS + CONFIRMAR */}
            {paso === 4 && (
              <>
                <button className="btn-back" onClick={() => setPaso(3)}>← Atrás</button>
                <div className="step-header">
                  <h2>Confirma tu cita</h2>
                  <p>Introduce tus datos para finalizar</p>
                </div>

                <div className="resumen">
                  <div className="resumen-row"><span className="resumen-label">Negocio</span><span className="resumen-val">{negocioNombre}</span></div>
                  <div className="resumen-row"><span className="resumen-label">Servicio</span><span className="resumen-val">{servicio?.nombre}</span></div>
                  {trabajador && <div className="resumen-row"><span className="resumen-label">Profesional</span><span className="resumen-val">{trabajador.nombre}</span></div>}
                  <div className="resumen-row"><span className="resumen-label">Fecha</span><span className="resumen-val">{new Date(fecha+'T00:00:00').toLocaleDateString('es-ES', {weekday:'short', day:'numeric', month:'short'})}</span></div>
                  <div className="resumen-row"><span className="resumen-label">Hora</span><span className="resumen-val">{hora}</span></div>
                  <div className="resumen-row"><span className="resumen-label">Precio</span><span className="resumen-val">€{servicio?.precio.toFixed(2)}</span></div>
                  {nombre && <div className="resumen-row"><span className="resumen-label">Nombre</span><span className="resumen-val">{nombre}</span></div>}
                  {telefono && <div className="resumen-row"><span className="resumen-label">Teléfono</span><span className="resumen-val">{telefono}</span></div>}
                </div>

                <div className="field">
                  <label>Tu nombre</label>
                  <input type="text" placeholder="María García" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input type="tel" placeholder="612 345 678" value={telefono} onChange={e => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" />
                </div>

                {error && <div className="error-msg">{error}</div>}

                <button className="btn-primary" onClick={confirmar} disabled={enviando}>
                  {enviando ? 'Confirmando...' : '✓ Confirmar reserva'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
