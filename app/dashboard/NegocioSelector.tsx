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

export function NegocioSelector({
  negocios,
  activoId,
}: {
  negocios: NegMin[]
  activoId: string
}) {
  const [open, setOpen]         = useState(false)
  const [modal, setModal]       = useState(false)
  const [nombre, setNombre]     = useState('')
  const [tipo, setTipo]         = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (negocios.length === 0) return null

  const esTodos = activoId === TODOS_ID
  const activo  = negocios.find(n => n.id === activoId) ?? negocios[0]

  // Detectar nombres duplicados para mostrar info extra
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
    setErrorMsg('')
    setModal(true)
  }

  async function crearNegocio() {
    if (!nombre.trim()) { setErrorMsg('El nombre es obligatorio'); return }
    if (!tipo) { setErrorMsg('Selecciona un tipo de negocio'); return }
    setGuardando(true)
    setErrorMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setErrorMsg('Sin sesión'); setGuardando(false); return }

    const { data, error } = await supabase.from('negocios').insert({
      user_id: session.user.id,
      nombre: nombre.trim(),
      tipo,
      plan: 'basico',
      visible: true,
    }).select('id').single()

    if (error || !data) {
      setErrorMsg(error?.message ?? 'Error al crear el negocio')
      setGuardando(false)
      return
    }

    localStorage.setItem('negocio_activo_id', data.id)
    window.location.reload()
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

        {/* Backdrop */}
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

      {/* Modal nuevo negocio */}
      {modal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, backdropFilter: 'blur(4px)' }}
            onClick={() => !guardando && setModal(false)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'white', borderRadius: '20px', padding: '28px',
            width: '100%', maxWidth: '420px', zIndex: 101,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '4px', letterSpacing: '-0.3px' }}>Nuevo negocio</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>Se añadirá a tu cuenta y podrás gestionarlo desde el selector.</p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Nombre del negocio</label>
              <input
                type="text"
                placeholder="Ej: Peluquería Marta"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Tipo de negocio</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', background: 'white', boxSizing: 'border-box' }}
              >
                <option value="">Selecciona un tipo...</option>
                {TIPOS_NEGOCIO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {errorMsg && (
              <p style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '13px', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px' }}>{errorMsg}</p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setModal(false)}
                disabled={guardando}
                style={{ flex: 1, padding: '12px', background: '#F3F4F6', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancelar
              </button>
              <button
                onClick={crearNegocio}
                disabled={guardando}
                style={{ flex: 2, padding: '12px', background: '#111827', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: 'white', cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: guardando ? 0.7 : 1 }}
              >
                {guardando ? 'Creando...' : 'Crear negocio'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
