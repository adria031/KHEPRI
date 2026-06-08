'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NegMin } from '../lib/negocioActivo'
import { setNegocioActivo } from '../lib/negocio-activo'
import { PLANES } from '../lib/planes'

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
const PLAN_BG: Record<string, string> = {
  basico: '#EFF6FF',
  pro:    '#EEF2FF',
  agencia:'#ECFDF5',
  plus:   '#ECFDF5',
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

function NegInitials({ nombre, size = 32 }: { nombre: string; size?: number }) {
  const ini = nombre.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 800, color: '#4F46E5',
      flexShrink: 0, userSelect: 'none',
    }}>
      {ini || '?'}
    </div>
  )
}

function Checkmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="8" fill="#4F46E5"/>
      <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function NegocioSelector({
  negocios,
  activoId,
}: {
  negocios: NegMin[]
  activoId: string
}) {
  const [open, setOpen]               = useState(false)
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [sheetVis, setSheetVis]       = useState(false)
  const [modal, setModal]             = useState(false)
  const [paso, setPaso]               = useState<1 | 2>(1)

  const [nombre, setNombre]           = useState('')
  const [tipo, setTipo]               = useState('')

  const [fuenteId, setFuenteId]       = useState<string | null>(null)
  const [copyOpts, setCopyOpts]       = useState<CopyOptions>({ servicios: true, productos: true, horarios: true, logo: true })

  const [guardando, setGuardando]     = useState(false)
  const [errorMsg, setErrorMsg]       = useState('')

  if (negocios.length === 0) return null

  if (negocios.length === 1) {
    const n = negocios[0]
    const pColor = PLAN_COLOR[n.plan] ?? '#9CA3AF'
    const pBg    = PLAN_BG[n.plan] ?? '#F3F4F6'
    const pLabel = PLAN_LABEL[n.plan]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 7px', background: '#F7F9FC', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 11 }}>
        <NegInitials nombre={n.nombre} size={26} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nombre}</span>
        {pLabel && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: pBg, color: pColor, flexShrink: 0 }}>{pLabel}</span>}
      </div>
    )
  }

  const esTodos = activoId === TODOS_ID
  const activo  = negocios.find(n => n.id === activoId) ?? negocios[0]

  const nombreCount: Record<string, number> = {}
  negocios.forEach(n => { nombreCount[n.nombre] = (nombreCount[n.nombre] ?? 0) + 1 })
  const tieneNombreDuplicado = (n: NegMin) => (nombreCount[n.nombre] ?? 0) > 1

  function openSheet() {
    setSheetOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVis(true)))
  }

  function closeSheet(then?: () => void) {
    setSheetVis(false)
    setTimeout(() => {
      setSheetOpen(false)
      then?.()
    }, 300)
  }

  function cambiar(id: string) {
    if (id === activoId) { setOpen(false); closeSheet(); return }
    if (id === TODOS_ID) {
      localStorage.setItem('negocio_activo_id', TODOS_ID)
    } else {
      const neg = negocios.find(n => n.id === id)
      if (neg) setNegocioActivo(neg.id, neg.plan ?? 'starter', neg.nombre)
      else localStorage.setItem('negocio_activo_id', id)
    }
    setOpen(false)
    document.body.style.transition = 'opacity 0.18s ease'
    document.body.style.opacity = '0'
    if (sheetOpen) {
      closeSheet(() => setTimeout(() => window.location.reload(), 50))
    } else {
      setTimeout(() => window.location.reload(), 200)
    }
  }

  function abrirModal() {
    setOpen(false)
    setNombre('')
    setTipo('')
    setPaso(1)
    setFuenteId(null)
    setCopyOpts({ servicios: true, productos: true, horarios: true, logo: true })
    setErrorMsg('')
    if (sheetOpen) {
      closeSheet(() => setModal(true))
    } else {
      setModal(true)
    }
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

    const planActualSelector = negocios[0]?.plan ?? 'starter'
    const planCfg = PLANES[planActualSelector] ?? PLANES.starter
    if (planCfg.negocios !== -1 && negocios.length >= planCfg.negocios) {
      setErrorMsg(`Tu plan ${planCfg.nombre} permite hasta ${planCfg.negocios} negocio${planCfg.negocios > 1 ? 's' : ''}. Actualiza a un plan superior para añadir más.`)
      setGuardando(false)
      return
    }

    const planNuevo = negocios[0]?.plan ?? 'starter'
    const creditosPorPlan: Record<string, number> = { starter: 100, basico: 300, pro: 1000, plus: 5000, beta: 2000 }

    const { data: neg, error } = await supabase.from('negocios').insert({
      user_id:          session.user.id,
      nombre:           nombre.trim(),
      tipo,
      plan:             planNuevo,
      visible:          true,
      creditos_totales: creditosPorPlan[planNuevo] ?? 100,
      creditos_usados:  0,
    }).select('id').single()

    if (error || !neg) {
      const msg = error?.message ?? 'Error al crear el negocio'
      const hint = (error as { hint?: string } | null)?.hint ?? ''
      alert(`Error al crear el negocio:\n${msg}${hint ? '\nHint: ' + hint : ''}`)
      setErrorMsg(msg)
      setGuardando(false)
      return
    }

    const newId = neg.id

    await supabase.from('trabajadores').insert({
      negocio_id: newId,
      user_id: session.user.id,
      nombre: session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'Propietario',
      email: session.user.email,
      rol: 'propietario',
      activo: true,
    })

    if (fuenteId) {
      await copiarNegocio(fuenteId, newId)
    }

    setNegocioActivo(newId, planNuevo, nombre.trim())
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
        await supabase.from('horarios').upsert(rows, { onConflict: 'negocio_id,dia' })
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
    ? 'Todos mis negocios'
    : activoDuplicado
      ? `${activo.nombre} · ${activo.tipo ?? activo.ciudad ?? activo.id.slice(0, 6)}`
      : activo.nombre

  const planColor = PLAN_COLOR[activo?.plan] ?? '#9CA3AF'
  const planBg    = PLAN_BG[activo?.plan] ?? '#F3F4F6'
  const planLabel = PLAN_LABEL[activo?.plan] ?? (activo?.plan ?? 'starter')

  // ── Shared business list (dropdown + bottom sheet) ──────────────────────
  function NegList({ variant }: { variant: 'dropdown' | 'sheet' }) {
    const pad = variant === 'sheet' ? '0 8px' : '6px'
    const itemPad = variant === 'sheet' ? '13px 12px' : '9px 10px'
    const radius = variant === 'sheet' ? 12 : 9

    return (
      <div style={{ padding: pad }}>
        <p style={{ padding: '6px 10px 8px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
          Mis negocios
        </p>

        {/* Todos los negocios — solo cuando hay más de uno */}
        {negocios.length > 1 && (
          <button
            onClick={() => cambiar(TODOS_ID)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: itemPad, borderRadius: radius, border: 'none',
              background: esTodos ? 'rgba(79,70,229,0.08)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'background 0.12s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#B8EDD4,#B8D8F8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>📊</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>Todos mis negocios</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: 1 }}>Vista consolidada</div>
            </div>
            {esTodos && <Checkmark />}
          </button>
        )}

        {negocios.length > 1 && (
          <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '5px 4px' }} />
        )}

        {negocios.map(n => {
          const dup      = tieneNombreDuplicado(n)
          const isActive = !esTodos && n.id === activoId
          const pColor   = PLAN_COLOR[n.plan] ?? '#9CA3AF'
          const pBg      = PLAN_BG[n.plan] ?? '#F3F4F6'
          const pLabel   = PLAN_LABEL[n.plan] ?? (n.plan ?? 'starter')
          const subTxt   = dup ? ([n.tipo, n.ciudad].filter(Boolean).join(' · ') || `ID: ${n.id.slice(0, 6)}`) : null
          return (
            <button
              key={n.id}
              onClick={() => cambiar(n.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: itemPad, borderRadius: radius, border: 'none',
                background: isActive ? 'rgba(79,70,229,0.07)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.12s',
              }}
            >
              <NegInitials nombre={n.nombre} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.nombre}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: pBg, color: pColor }}>
                    {pLabel}
                  </span>
                  {dup && subTxt && (
                    <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>{subTxt}</span>
                  )}
                </div>
              </div>
              {isActive && <Checkmark />}
            </button>
          )
        })}

        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '6px 4px' }} />
        <button
          onClick={abrirModal}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: itemPad, borderRadius: radius, border: 'none',
            background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left', transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#EEF2FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#4F46E5', flexShrink: 0,
          }}>+</div>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#4F46E5' }}>Añadir negocio</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        /* Desktop selector — only shown ≥769px */
        .ns-dt { display: none; position: relative; z-index: 50; }
        @media (min-width: 769px) { .ns-dt { display: block; } }

        /* Mobile trigger — only shown ≤768px */
        .ns-mb { display: none; align-items: center; gap: 7px; padding: 6px 10px 6px 8px; background: #F7F9FC; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; transition: all 0.15s; max-width: 160px; }
        @media (max-width: 768px) { .ns-mb { display: flex; } }

        @keyframes ns-in { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        /* Bottom sheet */
        .ns-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .ns-ov.vis { opacity: 1; pointer-events: auto; }
        .ns-panel {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 101;
          background: #fff; border-radius: 22px 22px 0 0;
          max-height: 88vh; overflow-y: auto;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(.4,0,.2,1);
          padding-bottom: env(safe-area-inset-bottom, 16px);
          box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
        }
        .ns-panel.vis { transform: translateY(0); }

        html.dark .ns-mb { background: #1a1a1a; border-color: rgba(255,255,255,0.1); color: #f9fafb; }
        html.dark .ns-panel { background: #1a1a1a; }
      `}</style>

      {/* ── Desktop dropdown ── */}
      <div className="ns-dt">
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px 6px 7px',
            background: open ? '#EDF2F8' : '#F7F9FC',
            border: `1px solid ${open ? 'rgba(29,78,216,0.25)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 11, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            color: '#111827', cursor: 'pointer', whiteSpace: 'nowrap',
            maxWidth: 230, transition: 'all 0.15s',
          }}
        >
          {esTodos
            ? <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#B8EDD4,#B8D8F8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📊</div>
            : <NegInitials nombre={activo.nombre} size={26} />
          }
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
            {triggerLabel}
          </span>
          {!esTodos && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: planBg, color: planColor, flexShrink: 0 }}>
              {planLabel}
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
            <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {open && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />}

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
            background: 'white', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            minWidth: 258, overflow: 'hidden',
            animation: 'ns-in 0.15s cubic-bezier(.4,0,.2,1)',
          }}>
            <NegList variant="dropdown" />
          </div>
        )}
      </div>

      {/* ── Mobile trigger ── */}
      <button className="ns-mb" onClick={openSheet}>
        {esTodos
          ? <span style={{ fontSize: 16 }}>📊</span>
          : <NegInitials nombre={activo.nombre} size={22} />
        }
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
          {esTodos ? 'Todos' : activo.nombre}
        </span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Bottom sheet ── */}
      {sheetOpen && (
        <>
          <div className={`ns-ov${sheetVis ? ' vis' : ''}`} onClick={() => closeSheet()} />
          <div className={`ns-panel${sheetVis ? ' vis' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>
            <div style={{ padding: '4px 16px 12px', borderBottom: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Cambiar negocio</span>
              <button onClick={() => closeSheet()} style={{ background: '#F3F4F6', border: 'none', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', fontSize: 16 }}>×</button>
            </div>
            <NegList variant="sheet" />
            <div style={{ height: 8 }} />
          </div>
        </>
      )}

      {/* ── Modal nuevo negocio ── */}
      {modal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 110, backdropFilter: 'blur(4px)' }}
            onClick={cerrarModal}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'white', borderRadius: 22, padding: 0,
            width: '100%', maxWidth: 460, zIndex: 111,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden',
          }}>
            <div style={{ padding: '24px 26px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
                    {paso === 1 ? 'Nuevo negocio' : '¿Copiar información?'}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    Paso {paso} de {negocios.length > 0 ? '2' : '1'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2].map(p => (
                    <div key={p} style={{ width: p === paso ? 20 : 8, height: 8, borderRadius: 4, background: p === paso ? '#4F46E5' : p < paso ? '#A5B4FC' : '#E5E7EB', transition: 'all 0.2s' }} />
                  ))}
                </div>
              </div>

              {paso === 1 && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                      Nombre del negocio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Peluquería Marta"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && irAPaso2()}
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 12, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                      autoFocus
                    />
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                      Tipo de negocio
                    </label>
                    <select
                      value={tipo}
                      onChange={e => setTipo(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                    >
                      <option value="">Selecciona un tipo...</option>
                      {TIPOS_NEGOCIO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}

              {paso === 2 && (
                <>
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>
                    Si <strong style={{ color: '#111827' }}>{nombre}</strong> pertenece a la misma cadena, puedes copiar la configuración de otro negocio para no empezar desde cero.
                  </p>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Copiar de...
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {negocios.map(n => (
                        <button
                          key={n.id}
                          onClick={() => setFuenteId(fuenteId === n.id ? null : n.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', borderRadius: 12, border: '2px solid',
                            borderColor: fuenteId === n.id ? '#4F46E5' : '#E5E7EB',
                            background: fuenteId === n.id ? '#EEF2FF' : 'white',
                            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <NegInitials nombre={n.nombre} size={36} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.nombre}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{n.tipo ?? `Plan ${PLAN_LABEL[n.plan] ?? n.plan}`}</div>
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

                  {fuenteId && (
                    <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 10 }}>¿Qué copiar?</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {([
                          { key: 'servicios', icon: '🔧', label: 'Servicios' },
                          { key: 'productos',  icon: '🛍️', label: 'Productos' },
                          { key: 'horarios',  icon: '⏰', label: 'Horarios' },
                          { key: 'logo',      icon: '🖼️', label: 'Logo y descripción' },
                        ] as const).map(({ key, icon, label }) => (
                          <label key={key} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '9px 11px', borderRadius: 9, border: '1.5px solid',
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
                            <span style={{ fontSize: 14 }}>{icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {!fuenteId && (
                    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                        Selecciona un negocio para copiar su configuración, o crea el negocio en blanco.
                      </div>
                    </div>
                  )}
                </>
              )}

              {errorMsg && (
                <p style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 13, padding: '10px 12px', borderRadius: 10, marginBottom: 4, marginTop: 8 }}>
                  {errorMsg}
                </p>
              )}
            </div>

            <div style={{ padding: '16px 26px 24px', display: 'flex', gap: 10, marginTop: 8 }}>
              {paso === 1 ? (
                <>
                  <button
                    onClick={cerrarModal}
                    style={{ flex: 1, padding: 12, background: '#F3F4F6', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={negocios.length > 0 ? irAPaso2 : crearNegocio}
                    disabled={guardando}
                    style={{ flex: 2, padding: 12, background: '#111827', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {negocios.length > 0 ? 'Continuar →' : (guardando ? 'Creando...' : 'Crear negocio')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setPaso(1); setErrorMsg('') }}
                    disabled={guardando}
                    style={{ flex: 1, padding: 12, background: '#F3F4F6', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={crearNegocio}
                    disabled={guardando}
                    style={{
                      flex: 2, padding: 12,
                      background: fuenteId ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#111827',
                      border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                      color: 'white', cursor: guardando ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', opacity: guardando ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {guardando ? 'Creando...' : fuenteId ? '✨ Copiar y crear' : 'Crear en blanco'}
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
