'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NegMin } from '../lib/negocioActivo'

const PLAN_COLOR: Record<string, string> = {
  basico: '#1D4ED8',
  pro:    '#6B4FD8',
  agencia:'#2E8A5E',
  plus:   '#2E8A5E',
}

const PLAN_LABEL: Record<string, string> = {
  basico: 'Básico',
  pro:    'Pro',
  agencia:'Plus',
  plus:   'Plus',
}

const TIPOS_NEGOCIO = [
  '💈 Peluquería / Barbería', '💅 Estética', '💆 Spa / Masajes', '🏥 Clínica', '🦷 Dentista',
  '👁️ Óptica', '🐾 Veterinaria', '🧘 Yoga / Pilates', '🏋️ Gimnasio', '📸 Fotografía',
  '🎨 Tatuajes', '👗 Moda / Ropa', '🍕 Restaurante', '☕ Cafetería', '🔧 Reparaciones', '📦 Otro',
]

export const TODOS_ID = 'todos'

type CopyOptions = {
  servicios: boolean
  productos: boolean
  horarios: boolean
  logo: boolean
}

export function NegocioSelector({
  negocios,
  activoId,
}: {
  negocios: NegMin[]
  activoId: string
}) {
  const [open, setOpen]             = useState(false)
  const [modal, setModal]           = useState(false)
  const [paso, setPaso]             = useState<1 | 2>(1)

  // Paso 1
  const [nombre, setNombre]         = useState('')
  const [tipo, setTipo]             = useState('')

  // Paso 2
  const [fuenteId, setFuenteId]     = useState<string | null>(null)
  const [copyOpts, setCopyOpts]     = useState<CopyOptions>({ servicios: true, productos: true, horarios: true, logo: true })

  const [guardando, setGuardando]   = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')

  if (negocios.length === 0) return null

  const esTodos  = activoId === TODOS_ID
  const activo   = negocios.find(n => n.id === activoId) ?? negocios[0]

  const nombreCount: Record<string, number> = {}
  negocios.forEach(n => { nombreCount[n.nombre] = (nombreCount[n.nombre] ?? 0) + 1 })
  const tieneNombreDuplicado = (n: NegMin) => (nombreCount[n.nombre] ?? 0) > 1

  function cambiar(id: string) {
    if (id === activoId) { setOpen(false); return }
    localStorage.setItem('negocio_activo_id', id)
    window.location.reload()
  }

  function abrirModal() {
    setOpen(false)
    setNombre('')
    setTipo('')
    setPaso(1)
    setFuenteId(null)
    setCopyOpts({ servicios: true, productos: true, horarios: true, logo: true })
    setErrorMsg('')
    setModal(true)
  }

  function cerrarModal() {
    if (guardando) return
    setModal(false)
    setPaso(1)
  }

  async function irAPaso2() {
    if (!nombre.trim()) { setErrorMsg('El nombre es obligatorio'); return }
    if (!tipo)          { setErrorMsg('Selecciona un tipo de negocio'); return }
    setErrorMsg('')
    setPaso(2)
  }

  async function crearNegocio() {
    setGuardando(true); setErrorMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setErrorMsg('Sin sesión'); setGuardando(false); return }

    // Crear el negocio
    const { data: neg, error } = await supabase.from('negocios').insert({
      user_id: session.user.id,
      nombre: nombre.trim(),
      tipo,
      plan: 'basico',
      visible: true,
    }).select('id').single()

    if (error || !neg) {
      setErrorMsg(error?.message ?? 'Error al crear el negocio')
      setGuardando(false)
      return
    }

    const newId = neg.id

    // Añadir propietario como trabajador automáticamente
    await supabase.from('trabajadores').insert({
      negocio_id: newId,
      user_id: session.user.id,
      nombre: session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'Propietario',
      email: session.user.email,
      rol: 'propietario',
      activo: true,
    })

    // Copiar información si el usuario eligió una fuente
    if (fuenteId) {
      await copiarNegocio(fuenteId, newId)
    }

    localStorage.setItem('negocio_activo_id', newId)
    window.location.reload()
  }

  async function copiarNegocio(sourceId: string, destId: string) {
    const ops: Promise<unknown>[] = []

    if (copyOpts.servicios) {
      ops.push((async () => {
        const { data } = await supabase.from('servicios').select('*').eq('negocio_id', sourceId)
        if (!data?.length) return
        const rows = data.map(({ id: _id, negocio_id: _n, ...rest }: Record<string, unknown>) => ({ ...rest, negocio_id: destId }))
        await supabase.from('servicios').insert(rows)
      })())
    }

    if (copyOpts.productos) {
      ops.push((async () => {
        const { data } = await supabase.from('productos').select('*').eq('negocio_id', sourceId)
        if (!data?.length) return
        const rows = data.map(({ id: _id, negocio_id: _n, ...rest }: Record<string, unknown>) => ({ ...rest, negocio_id: destId }))
        await supabase.from('productos').insert(rows)
      })())
    }

    if (copyOpts.horarios) {
      ops.push((async () => {
        const { data } = await supabase.from('horarios').select('*').eq('negocio_id', sourceId)
        if (!data?.length) return
        const rows = data.map(({ id: _id, negocio_id: _n, ...rest }: Record<string, unknown>) => ({ ...rest, negocio_id: destId }))
        await supabase.from('horarios').insert(rows)
      })())
    }

    if (copyOpts.logo) {
      ops.push((async () => {
        const { data } = await supabase.from('negocios').select('logo_url, descripcion').eq('id', sourceId).single()
        if (!data) return
        const update: Record<string, unknown> = {}
        if (data.logo_url) update.logo_url = data.logo_url
        if ((data as Record<string, unknown>).descripcion) update.descripcion = (data as Record<string, unknown>).descripcion
        if (Object.keys(update).length) await supabase.from('negocios').update(update).eq('id', destId)
      })())
    }

    await Promise.allSettled(ops)
  }

  const activoDuplicado = !esTodos && tieneNombreDuplicado(activo)
  const triggerLabel = esTodos
    ? 'Todos los negocios'
    : activoDuplicado
      ? `${activo.nombre} · ${activo.tipo ?? activo.ciudad ?? activo.id.slice(0, 6)}`
      : activo.nombre
  const triggerColor = esTodos ? '#9CA3AF' : (PLAN_COLOR[activo.plan] ?? '#9CA3AF')

  return (
    <>
      <div style={{ position: 'relative', zIndex: 50 }}>
        {/* Trigger */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '7px 11px 7px 9px',
            background: open ? '#EDF2F8' : '#F7F9FC',
            border: `1px solid ${open ? 'rgba(29,78,216,0.25)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: '10px', fontFamily: 'inherit', fontSize: '13px',
            fontWeight: 600, color: '#111827', cursor: 'pointer',
            whiteSpace: 'nowrap', maxWidth: '200px', transition: 'all 0.15s',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: triggerColor, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{triggerLabel}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
            <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {open && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />}

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            background: 'white', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '14px', boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
            minWidth: '230px', padding: '6px',
          }}>
            <p style={{ padding: '6px 10px 8px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
              Mis negocios
            </p>

            {negocios.length > 1 && (
              <button onClick={() => cambiar(TODOS_ID)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '9px', border: 'none', background: esTodos ? 'rgba(184,216,248,0.2)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>🏢</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Todos los negocios</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Vista consolidada</div>
                </div>
                {esTodos && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            )}

            {negocios.map(n => {
              const duplicado = tieneNombreDuplicado(n)
              const subtitulo = duplicado
                ? [n.tipo, n.ciudad].filter(Boolean).join(' · ') || `ID: ${n.id.slice(0, 6)}`
                : `Plan ${PLAN_LABEL[n.plan] ?? n.plan}`
              return (
                <button key={n.id} onClick={() => cambiar(n.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '9px', border: 'none', background: !esTodos && n.id === activoId ? 'rgba(184,216,248,0.2)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PLAN_COLOR[n.plan] ?? '#9CA3AF', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nombre}</div>
                    <div style={{ fontSize: '11px', color: duplicado ? '#F59E0B' : '#9CA3AF', textTransform: 'capitalize' }}>{subtitulo}</div>
                  </div>
                  {!esTodos && n.id === activoId && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              )
            })}

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)', margin: '6px 0' }} />
            <button
              onClick={abrirModal}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '9px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: '#4F46E5', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#4F46E5', flexShrink: 0 }}>+</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Añadir negocio</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modal nuevo negocio ── */}
      {modal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, backdropFilter: 'blur(4px)' }}
            onClick={cerrarModal}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'white', borderRadius: '22px', padding: '0',
            width: '100%', maxWidth: '460px', zIndex: 101,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Header con paso */}
            <div style={{ padding: '24px 26px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
                    {paso === 1 ? 'Nuevo negocio' : '¿Copiar información?'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                    Paso {paso} de {negocios.length > 0 ? '2' : '1'}
                  </div>
                </div>
                {/* Indicador pasos */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2].map(p => (
                    <div key={p} style={{ width: p === paso ? 20 : 8, height: 8, borderRadius: 4, background: p === paso ? '#4F46E5' : p < paso ? '#A5B4FC' : '#E5E7EB', transition: 'all 0.2s' }} />
                  ))}
                </div>
              </div>

              {/* ── PASO 1: nombre + tipo ── */}
              {paso === 1 && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                      Nombre del negocio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Peluquería Marta"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && irAPaso2()}
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                      autoFocus
                    />
                  </div>

                  <div style={{ marginBottom: '6px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                      Tipo de negocio
                    </label>
                    <select
                      value={tipo}
                      onChange={e => setTipo(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                    >
                      <option value="">Selecciona un tipo...</option>
                      {TIPOS_NEGOCIO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* ── PASO 2: copiar info ── */}
              {paso === 2 && (
                <>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
                    Si <strong style={{ color: '#111827' }}>{nombre}</strong> pertenece a la misma cadena, puedes copiar la configuración de otro negocio para no empezar desde cero.
                  </p>

                  {/* Tarjetas de negocios para seleccionar fuente */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Copiar de...
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {negocios.map(n => (
                        <button
                          key={n.id}
                          onClick={() => setFuenteId(fuenteId === n.id ? null : n.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '11px 14px', borderRadius: '12px', border: '2px solid',
                            borderColor: fuenteId === n.id ? '#4F46E5' : '#E5E7EB',
                            background: fuenteId === n.id ? '#EEF2FF' : 'white',
                            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: '#4F46E5',
                          }}>
                            {n.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nombre}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{n.tipo ?? `Plan ${PLAN_LABEL[n.plan] ?? n.plan}`}</div>
                          </div>
                          {fuenteId === n.id && (
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <circle cx="9" cy="9" r="9" fill="#4F46E5"/>
                              <path d="M4.5 9l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Opciones de copia */}
                  {fuenteId && (
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', marginBottom: '10px' }}>¿Qué copiar?</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {([
                          { key: 'servicios', icon: '🔧', label: 'Servicios' },
                          { key: 'productos',  icon: '🛍️', label: 'Productos' },
                          { key: 'horarios',  icon: '⏰', label: 'Horarios' },
                          { key: 'logo',      icon: '🖼️', label: 'Logo y descripción' },
                        ] as const).map(({ key, icon, label }) => (
                          <label key={key} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '9px 11px', borderRadius: '9px', border: '1.5px solid',
                            borderColor: copyOpts[key] ? '#C7D2FE' : '#E5E7EB',
                            background: copyOpts[key] ? '#EEF2FF' : 'white',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}>
                            <input
                              type="checkbox"
                              checked={copyOpts[key]}
                              onChange={e => setCopyOpts(prev => ({ ...prev, [key]: e.target.checked }))}
                              style={{ accentColor: '#4F46E5', width: 14, height: 14, flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '14px' }}>{icon}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {!fuenteId && (
                    <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '12px 14px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>
                        Selecciona un negocio para copiar su configuración, o crea el negocio en blanco.
                      </div>
                    </div>
                  )}
                </>
              )}

              {errorMsg && (
                <p style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '13px', padding: '10px 12px', borderRadius: '10px', marginBottom: '4px', marginTop: '8px' }}>
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Footer con botones */}
            <div style={{ padding: '16px 26px 24px', display: 'flex', gap: '10px', marginTop: '8px' }}>
              {paso === 1 ? (
                <>
                  <button
                    onClick={cerrarModal}
                    style={{ flex: 1, padding: '12px', background: '#F3F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={negocios.length > 0 ? irAPaso2 : crearNegocio}
                    disabled={guardando}
                    style={{ flex: 2, padding: '12px', background: '#111827', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {negocios.length > 0 ? 'Continuar →' : (guardando ? 'Creando...' : 'Crear negocio')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setPaso(1); setErrorMsg('') }}
                    disabled={guardando}
                    style={{ flex: 1, padding: '12px', background: '#F3F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={crearNegocio}
                    disabled={guardando}
                    style={{
                      flex: 2, padding: '12px',
                      background: fuenteId ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#111827',
                      border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                      color: 'white', cursor: guardando ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', opacity: guardando ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {guardando
                      ? 'Creando...'
                      : fuenteId
                        ? '✨ Copiar y crear'
                        : 'Crear en blanco'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
