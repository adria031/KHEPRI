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
  cliente_email: string | null
  estado: string
  servicios: { nombre: string } | null
  trabajadores: { nombre: string } | null
}

function estadoBadge(estado: string) {
  if (estado === 'confirmada') return { bg: '#ECFDF5', color: '#059669' }
  if (estado === 'pendiente')  return { bg: '#FFF7ED', color: '#D97706' }
  if (estado === 'cancelada')  return { bg: '#FEF2F2', color: '#DC2626' }
  return { bg: '#F3F4F6', color: '#6B7280' }
}

const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function Agenda() {
  const [negocio,       setNegocio]       = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [citas,         setCitas]         = useState<Cita[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [hoy]                             = useState(new Date())

  useEffect(() => {
    async function init() {
      const { session } = await getSessionClient()
      if (!session) return
      const { activo, todos } = await getNegocioActivo(session.user.id)
      setTodosNegocios(todos)
      if (!activo) { setCargando(false); return }
      setNegocio(activo)

      const fecha = hoy.toISOString().split('T')[0]
      const { data } = await supabase
        .from('reservas')
        .select('id, hora_inicio, cliente_nombre, cliente_email, estado, servicios(nombre), trabajadores(nombre)')
        .eq('negocio_id', activo.id)
        .gte('hora_inicio', `${fecha}T00:00:00`)
        .lte('hora_inicio', `${fecha}T23:59:59`)
        .order('hora_inicio', { ascending: true })

      setCitas((data ?? []) as unknown as Cita[])
      setCargando(false)
    }
    init()
  }, [hoy])

  const fechaLabel = `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        .ag-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .ag-title  { font-size:22px; font-weight:800; color:var(--ds-text); letter-spacing:-0.5px; }
        .ag-date   { font-size:13px; color:var(--ds-text2); margin-top:3px; text-transform:capitalize; }
        .ag-btn-new {
          display:inline-flex; align-items:center; gap:6px;
          padding:10px 20px; border-radius:12px;
          background:linear-gradient(135deg,#6B4FD8,#4F46E5);
          color:white; text-decoration:none; font-size:13px; font-weight:700;
          box-shadow:0 4px 12px rgba(79,70,229,0.25); white-space:nowrap;
        }
        .ag-empty  { text-align:center; padding:60px 20px; background:var(--ds-white); border-radius:18px; border:1px solid var(--ds-border); }
        .ag-empty-icon { font-size:52px; margin-bottom:14px; }
        .ag-empty-title { font-size:17px; font-weight:700; color:var(--ds-text); margin-bottom:6px; }
        .ag-empty-sub   { font-size:13px; color:var(--ds-text2); }
        .ag-list  { display:flex; flex-direction:column; gap:10px; }
        .ag-card  {
          display:flex; align-items:center; gap:16px;
          background:var(--ds-white); border:1px solid var(--ds-border);
          border-radius:14px; padding:16px 20px;
          transition:box-shadow 0.15s;
        }
        .ag-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.06); }
        .ag-time  { text-align:center; min-width:48px; flex-shrink:0; }
        .ag-time-h { font-size:19px; font-weight:800; color:var(--ds-active); line-height:1; }
        .ag-time-u { font-size:10px; color:var(--ds-muted); font-weight:600; margin-top:1px; }
        .ag-info  { flex:1; min-width:0; }
        .ag-name  { font-size:14px; font-weight:700; color:var(--ds-text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ag-sub   { font-size:12px; color:var(--ds-text2); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ag-badge { padding:4px 11px; border-radius:100px; font-size:11px; font-weight:700; flex-shrink:0; text-transform:capitalize; }
      `}</style>

      <div style={{ maxWidth: 700 }}>
        <div className="ag-header">
          <div>
            <div className="ag-title">Agenda del día</div>
            <div className="ag-date">{fechaLabel}</div>
          </div>
          <Link href="/dashboard/reservas" className="ag-btn-new">+ Nueva reserva</Link>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ds-text2)', fontSize: 14 }}>
            Cargando agenda…
          </div>
        ) : citas.length === 0 ? (
          <div className="ag-empty">
            <div className="ag-empty-icon">📅</div>
            <div className="ag-empty-title">Sin citas hoy</div>
            <div className="ag-empty-sub">No tienes reservas programadas para hoy</div>
          </div>
        ) : (
          <div className="ag-list">
            {citas.map(cita => {
              const hora = cita.hora_inicio?.slice(11, 16) ?? '—'
              const { bg, color } = estadoBadge(cita.estado)
              const subtitulo = [cita.servicios?.nombre, cita.trabajadores?.nombre].filter(Boolean).join(' · ')
              return (
                <div key={cita.id} className="ag-card">
                  <div className="ag-time">
                    <div className="ag-time-h">{hora}</div>
                    <div className="ag-time-u">h</div>
                  </div>
                  <div className="ag-info">
                    <div className="ag-name">{cita.cliente_nombre ?? cita.cliente_email ?? 'Cliente'}</div>
                    {subtitulo && <div className="ag-sub">{subtitulo}</div>}
                  </div>
                  <div className="ag-badge" style={{ background: bg, color }}>{cita.estado}</div>
                </div>
              )
            })}
          </div>
        )}

        {!cargando && citas.length > 0 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link href="/dashboard/reservas" style={{ fontSize: 13, color: 'var(--ds-active)', fontWeight: 600, textDecoration: 'none' }}>
              Ver todas las reservas →
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
