'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type Cita = {
  id: string
  hora_inicio: string
  cliente_nombre: string | null
  cliente_telefono: string | null
  cliente_email: string | null
  estado: string
  precio_total: number | null
  servicios: { nombre: string; duracion: number | null; precio: number | null } | null
  trabajadores: { nombre: string } | null
}

const DIAS_L  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES_S = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const SVC_COLORS = ['#7C3AED','#16A34A','#F59E0B','#EC4899','#0EA5E9','#EF4444','#8B5CF6','#14B8A6','#F97316','#06B6D4']
function svcColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFFFF
  return SVC_COLORS[Math.abs(h) % SVC_COLORS.length]
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDur(min: number | null) {
  if (!min) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}
function fmtEstado(e: string) {
  if (e === 'completada') return '✓ Completada'
  if (e === 'cancelada')  return '✕ Cancelada'
  if (e === 'confirmada') return '● Confirmada'
  return `● ${e}`
}

export default function Agenda() {
  const [negocio,       setNegocio]       = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId,     setNegocioId]     = useState<string | null>(null)
  const [citas,         setCitas]         = useState<Cita[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [fecha,         setFecha]         = useState(new Date())
  const [modal,         setModal]         = useState<Cita | null>(null)
  const [cambiando,     setCambiando]     = useState<string | null>(null)

  // Init: auth + negocio
  useEffect(() => {
    ;(async () => {
      const { session } = await getSessionClient()
      if (!session) return
      const { activo, todos } = await getNegocioActivo(session.user.id)
      setTodosNegocios(todos)
      if (!activo) { setCargando(false); return }
      setNegocio(activo)
      setNegocioId(activo.id)
    })()
  }, [])

  // Reload citas when negocioId or fecha changes
  useEffect(() => {
    if (!negocioId) return
    setCargando(true)
    const fs = toISO(fecha)
    supabase
      .from('reservas')
      .select('id, hora_inicio, cliente_nombre, cliente_telefono, cliente_email, estado, precio_total, servicios(nombre, duracion, precio), trabajadores(nombre)')
      .eq('negocio_id', negocioId)
      .gte('hora_inicio', `${fs}T00:00:00`)
      .lte('hora_inicio', `${fs}T23:59:59`)
      .order('hora_inicio', { ascending: true })
      .then(({ data }) => {
        setCitas((data ?? []) as unknown as Cita[])
        setCargando(false)
      })
  }, [negocioId, fecha])

  async function cambiarEstado(id: string, estado: string) {
    setCambiando(id)
    await supabase.from('reservas').update({ estado }).eq('id', id)
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
    if (modal?.id === id) setModal(prev => prev ? { ...prev, estado } : null)
    setCambiando(null)
  }

  function navFecha(delta: number) {
    const d = new Date(fecha); d.setDate(d.getDate() + delta); setFecha(d)
  }

  const eHoy       = toISO(fecha) === toISO(new Date())
  const completadas = citas.filter(c => c.estado === 'completada').length
  const pendientes  = citas.filter(c => c.estado === 'confirmada' || c.estado === 'pendiente').length
  const ingresos    = citas.filter(c => c.estado === 'completada')
    .reduce((s, c) => s + (c.precio_total ?? c.servicios?.precio ?? 0), 0)

  // Build timeline with gap slots between citas separated by >=60 min
  const timeline: Array<{ type: 'cita'; data: Cita } | { type: 'gap' }> = []
  for (let i = 0; i < citas.length; i++) {
    if (i > 0) {
      const gapMs = new Date(citas[i].hora_inicio).getTime() - new Date(citas[i-1].hora_inicio).getTime()
      if (gapMs / 60000 >= 60) timeline.push({ type: 'gap' })
    }
    timeline.push({ type: 'cita', data: citas[i] })
  }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        .ag2-wrap { max-width: 720px; }

        /* ── Header ── */
        .ag2-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
        .ag2-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:900; color:var(--ds-text); letter-spacing:-0.5px; }
        .ag2-subtitle { font-size:12px; color:var(--ds-text2); margin-top:2px; }
        .ag2-nav { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .ag2-nav-btn { width:36px; height:36px; border-radius:10px; border:1px solid var(--ds-border); background:var(--ds-white); color:var(--ds-text); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; line-height:1; }
        .ag2-nav-btn:hover { background:#F0EEFF; border-color:#7C3AED; color:#7C3AED; }
        .ag2-fecha-pill { background:#F0EEFF; color:#7C3AED; border-radius:20px; padding:6px 16px; font-size:13px; font-weight:700; white-space:nowrap; }
        .ag2-hoy-btn { padding:6px 14px; border-radius:20px; border:1.5px solid #7C3AED; background:transparent; color:#7C3AED; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
        .ag2-btn-new { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:12px; background:linear-gradient(135deg,#7C3AED,#4F46E5); color:white; text-decoration:none; font-size:13px; font-weight:700; box-shadow:0 4px 12px rgba(124,58,237,0.25); white-space:nowrap; }

        /* ── Summary ── */
        .ag2-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .ag2-stat { background:var(--ds-white); border:1px solid var(--ds-border); border-radius:14px; padding:14px 16px; }
        .ag2-stat-val { font-size:22px; font-weight:800; line-height:1; margin-bottom:3px; }
        .ag2-stat-lbl { font-size:11px; color:var(--ds-text2); font-weight:600; }

        /* ── Timeline ── */
        .ag2-list { display:flex; flex-direction:column; gap:8px; }

        /* ── Card ── */
        .ag2-card { display:flex; align-items:stretch; background:var(--ds-white); border:1px solid var(--ds-border); border-radius:16px; overflow:hidden; box-shadow:0 1px 8px rgba(0,0,0,0.04); transition:box-shadow .15s; cursor:pointer; }
        .ag2-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.08); }
        .ag2-card.completada { background:rgba(22,163,74,0.03); border-color:rgba(22,163,74,0.15); }
        .ag2-card.cancelada  { opacity:0.55; }
        .ag2-card-bar  { width:4px; flex-shrink:0; }
        .ag2-card-body { flex:1; display:flex; align-items:center; gap:14px; padding:14px 16px; min-width:0; }
        .ag2-hora  { font-size:15px; font-weight:800; color:var(--ds-text); min-width:44px; flex-shrink:0; }
        .ag2-info  { flex:1; min-width:0; }
        .ag2-cli-name { font-size:14px; font-weight:700; color:var(--ds-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ag2-cli-sub  { font-size:12px; color:var(--ds-text2); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ag2-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
        .ag2-precio { font-size:14px; font-weight:800; color:var(--ds-text); }
        .ag2-dur    { font-size:11px; color:var(--ds-text2); }
        .ag2-estado { font-size:11px; font-weight:700; padding:3px 9px; border-radius:100px; white-space:nowrap; }
        .ag2-estado.pendiente,.ag2-estado.confirmada { background:rgba(124,58,237,0.1); color:#7C3AED; }
        .ag2-estado.completada { background:rgba(22,163,74,0.1); color:#16A34A; }
        .ag2-estado.cancelada  { background:rgba(107,114,128,0.1); color:#6B7280; }
        .ag2-actions { display:flex; flex-direction:column; gap:5px; padding:10px 12px 10px 0; justify-content:center; }
        .ag2-act-btn { padding:5px 10px; border-radius:8px; border:none; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; white-space:nowrap; }
        .ag2-act-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .ag2-act-ok  { background:rgba(22,163,74,0.12); color:#16A34A; }
        .ag2-act-ok:hover:not(:disabled)  { background:rgba(22,163,74,0.22); }
        .ag2-act-ko  { background:rgba(239,68,68,0.08); color:#DC2626; }
        .ag2-act-ko:hover:not(:disabled)  { background:rgba(239,68,68,0.16); }

        /* ── Gap slot ── */
        .ag2-gap { display:flex; align-items:center; gap:10px; padding:10px 16px; border:1.5px dashed var(--ds-border); border-radius:14px; color:var(--ds-text2); font-size:13px; cursor:pointer; transition:all .15s; text-decoration:none; }
        .ag2-gap:hover { border-color:#7C3AED; color:#7C3AED; background:rgba(124,58,237,0.03); }

        /* ── Empty ── */
        .ag2-empty { text-align:center; padding:60px 20px; background:var(--ds-white); border-radius:18px; border:1px solid var(--ds-border); }

        /* ── Modal ── */
        .ag2-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .ag2-modal { background:var(--ds-white); border-radius:24px; max-width:460px; width:100%; padding:28px; box-shadow:0 24px 60px rgba(0,0,0,0.18); }
        .ag2-modal-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
        .ag2-modal-title { font-size:18px; font-weight:800; color:var(--ds-text); }
        .ag2-modal-meta  { font-size:12px; color:var(--ds-text2); margin-top:3px; }
        .ag2-modal-close { width:32px; height:32px; border-radius:8px; border:none; background:var(--ds-bg); color:var(--ds-text2); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ag2-modal-row   { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--ds-border); font-size:13px; }
        .ag2-modal-row:last-child { border-bottom:none; }
        .ag2-modal-label { color:var(--ds-text2); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; min-width:80px; }
        .ag2-modal-val   { color:var(--ds-text); font-weight:600; }
        .ag2-modal-btns  { display:flex; gap:8px; margin-top:20px; flex-wrap:wrap; }
        .ag2-modal-btn   { flex:1; min-width:120px; padding:11px; border-radius:12px; border:none; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .15s; }
        .ag2-modal-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .ag2-modal-ok  { background:linear-gradient(135deg,#16A34A,#15803D); color:white; }
        .ag2-modal-ko  { background:rgba(239,68,68,0.1); color:#DC2626; }

        @media (max-width:640px) {
          .ag2-summary { grid-template-columns:repeat(2,1fr); }
          .ag2-actions { flex-direction:row; padding:10px; gap:4px; }
          .ag2-act-btn { font-size:10px; padding:4px 8px; }
          .ag2-head { flex-direction:column; align-items:flex-start; }
          .ag2-nav { width:100%; }
        }
      `}</style>

      <div className="ag2-wrap">

        {/* ── HEADER ── */}
        <div className="ag2-head">
          <div>
            <div className="ag2-title">Agenda</div>
            {negocio && <div className="ag2-subtitle">{negocio.nombre}</div>}
          </div>
          <div className="ag2-nav">
            <button className="ag2-nav-btn" onClick={() => navFecha(-1)}>‹</button>
            <span className="ag2-fecha-pill">
              {DIAS_L[fecha.getDay()]} {fecha.getDate()} {MESES_S[fecha.getMonth()]}
            </span>
            <button className="ag2-nav-btn" onClick={() => navFecha(1)}>›</button>
            {!eHoy && (
              <button className="ag2-hoy-btn" onClick={() => setFecha(new Date())}>Hoy</button>
            )}
            <Link href="/dashboard/reservas" className="ag2-btn-new">+ Nueva</Link>
          </div>
        </div>

        {/* ── SUMMARY ── */}
        <div className="ag2-summary">
          <div className="ag2-stat">
            <div className="ag2-stat-val" style={{ color:'#7C3AED' }}>{citas.length}</div>
            <div className="ag2-stat-lbl">Citas</div>
          </div>
          <div className="ag2-stat">
            <div className="ag2-stat-val" style={{ color:'#16A34A' }}>{completadas}</div>
            <div className="ag2-stat-lbl">Completadas</div>
          </div>
          <div className="ag2-stat">
            <div className="ag2-stat-val" style={{ color:'#F59E0B' }}>{pendientes}</div>
            <div className="ag2-stat-lbl">Pendientes</div>
          </div>
          <div className="ag2-stat">
            <div className="ag2-stat-val" style={{ color:'#0EA5E9' }}>
              {ingresos > 0 ? `${ingresos.toFixed(0)}€` : '—'}
            </div>
            <div className="ag2-stat-lbl">Ingresos</div>
          </div>
        </div>

        {/* ── TIMELINE ── */}
        {cargando ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ds-text2)', fontSize:14 }}>
            Cargando agenda…
          </div>
        ) : citas.length === 0 ? (
          <div className="ag2-empty">
            <div style={{ fontSize:52, marginBottom:14 }}>📅</div>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--ds-text)', marginBottom:6 }}>
              Sin citas {eHoy ? 'hoy' : 'este día'}
            </div>
            <div style={{ fontSize:13, color:'var(--ds-text2)', marginBottom:20 }}>
              No hay reservas para el {DIAS_L[fecha.getDay()].toLowerCase()} {fecha.getDate()} de {MESES_S[fecha.getMonth()]}
            </div>
            <Link href="/dashboard/reservas" className="ag2-btn-new" style={{ display:'inline-flex' }}>
              + Añadir reserva
            </Link>
          </div>
        ) : (
          <div className="ag2-list">
            {timeline.map((item, idx) => {
              if (item.type === 'gap') {
                return (
                  <Link key={`gap-${idx}`} href="/dashboard/reservas" className="ag2-gap">
                    <span style={{ fontSize:18, lineHeight:1 }}>＋</span>
                    <span>Hueco libre — añadir cita</span>
                  </Link>
                )
              }

              const c      = item.data
              const hora   = c.hora_inicio?.slice(11, 16) ?? '—'
              const color  = c.estado === 'cancelada' ? '#D1D5DB' : c.estado === 'completada' ? '#16A34A' : svcColor(c.servicios?.nombre ?? '')
              const precio  = c.precio_total ?? c.servicios?.precio
              const dur    = fmtDur(c.servicios?.duracion ?? null)
              const sub    = [c.servicios?.nombre, c.trabajadores?.nombre].filter(Boolean).join(' · ')
              const busy   = cambiando === c.id

              return (
                <div key={c.id} className={`ag2-card ${c.estado}`} onClick={() => setModal(c)}>
                  <div className="ag2-card-bar" style={{ background: color }} />
                  <div className="ag2-card-body">
                    <div className="ag2-hora">{hora}</div>
                    <div className="ag2-info">
                      <div className="ag2-cli-name" style={{ textDecoration: c.estado === 'cancelada' ? 'line-through' : 'none' }}>
                        {c.cliente_nombre ?? c.cliente_email ?? 'Cliente'}
                      </div>
                      {sub && <div className="ag2-cli-sub">{sub}</div>}
                    </div>
                    <div className="ag2-right">
                      {precio != null && <div className="ag2-precio">{precio.toFixed(0)}€</div>}
                      {dur && <div className="ag2-dur">{dur}</div>}
                      <div className={`ag2-estado ${c.estado}`}>{fmtEstado(c.estado)}</div>
                    </div>
                  </div>
                  {c.estado !== 'cancelada' && (
                    <div className="ag2-actions" onClick={e => e.stopPropagation()}>
                      {c.estado !== 'completada' && (
                        <button
                          className="ag2-act-btn ag2-act-ok"
                          disabled={busy}
                          onClick={() => cambiarEstado(c.id, 'completada')}
                          title="Marcar completada"
                        >
                          {busy ? '…' : '✓ Listo'}
                        </button>
                      )}
                      <button
                        className="ag2-act-btn ag2-act-ko"
                        disabled={busy}
                        onClick={() => { if (confirm('¿Cancelar esta cita?')) cambiarEstado(c.id, 'cancelada') }}
                        title="Cancelar cita"
                      >
                        {busy ? '…' : '✕ Cancelar'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── MODAL DETALLE ── */}
      {modal && (
        <div className="ag2-overlay" onClick={() => setModal(null)}>
          <div className="ag2-modal" onClick={e => e.stopPropagation()}>
            <div className="ag2-modal-head">
              <div>
                <div className="ag2-modal-title">{modal.cliente_nombre ?? 'Cliente'}</div>
                <div className="ag2-modal-meta">
                  {modal.hora_inicio?.slice(11,16)} · {DIAS_L[fecha.getDay()]} {fecha.getDate()} {MESES_S[fecha.getMonth()]}
                </div>
              </div>
              <button className="ag2-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>

            {[
              ['Servicio',   modal.servicios?.nombre ?? '—'],
              ['Trabajador', modal.trabajadores?.nombre ?? '—'],
              ['Teléfono',   modal.cliente_telefono ?? '—'],
              ['Email',      modal.cliente_email ?? '—'],
              ['Precio',     modal.precio_total != null ? `${modal.precio_total}€` : modal.servicios?.precio != null ? `${modal.servicios.precio}€` : '—'],
              ['Duración',   fmtDur(modal.servicios?.duracion ?? null) || '—'],
              ['Estado',     fmtEstado(modal.estado)],
            ].map(([label, val]) => (
              <div key={label} className="ag2-modal-row">
                <span className="ag2-modal-label">{label}</span>
                <span className="ag2-modal-val">{val}</span>
              </div>
            ))}

            {modal.estado !== 'cancelada' && (
              <div className="ag2-modal-btns">
                {modal.estado !== 'completada' && (
                  <button
                    className="ag2-modal-btn ag2-modal-ok"
                    disabled={cambiando === modal.id}
                    onClick={() => cambiarEstado(modal.id, 'completada')}
                  >
                    {cambiando === modal.id ? 'Actualizando…' : '✓ Marcar completada'}
                  </button>
                )}
                <button
                  className="ag2-modal-btn ag2-modal-ko"
                  disabled={cambiando === modal.id}
                  onClick={() => { if (confirm('¿Cancelar esta cita?')) cambiarEstado(modal.id, 'cancelada') }}
                >
                  Cancelar cita
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
