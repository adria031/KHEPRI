'use client'
import { useState, useEffect } from 'react'
import { getAdminWaitlist, type WaitlistAdmin } from '../actions'

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const CSS = `
  .wl-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .wl-search { padding:8px 12px; background:white; border:1.5px solid #E5E7EB; border-radius:10px; font-family:inherit; font-size:13px; color:#111827; outline:none; width:240px; }
  .wl-search:focus { border-color:#6366F1; }
  .act-btn { padding:7px 13px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:700; color:#374151; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
  .act-btn:hover { border-color:#6366F1; color:#4F46E5; background:rgba(99,102,241,0.04); }
  .tbl-wrap { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,0.04); overflow-x:auto; }
  table { width:100%; border-collapse:collapse; min-width:500px; }
  thead th { padding:10px 14px; font-size:11px; font-weight:700; color:#9CA3AF; text-align:left; text-transform:uppercase; letter-spacing:0.4px; background:#FAFAFA; border-bottom:1px solid rgba(0,0,0,0.06); white-space:nowrap; }
  tbody td { padding:11px 14px; font-size:13px; color:#374151; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover td { background:#F9F9FF; }
  .cell-name { font-weight:600; color:#111827; }
`

export default function WaitlistPage() {
  const [cargando,      setCargando]      = useState(true)
  const [waitlist,      setWaitlist]      = useState<WaitlistAdmin[]>([])
  const [waitlistError, setWaitlistError] = useState(false)
  const [busq,          setBusq]          = useState('')

  const cargar = () => {
    getAdminWaitlist()
      .then(({ data, error }) => { setWaitlist(data); setWaitlistError(error); setCargando(false) })
      .catch(() => { setWaitlistError(true); setCargando(false) })
  }

  useEffect(() => { cargar() }, [])

  const filtrados = waitlist.filter(w =>
    !busq ||
    (w.nombre ?? '').toLowerCase().includes(busq.toLowerCase()) ||
    w.email.toLowerCase().includes(busq.toLowerCase()) ||
    (w.tipo_negocio ?? '').toLowerCase().includes(busq.toLowerCase()) ||
    (w.ciudad ?? '').toLowerCase().includes(busq.toLowerCase())
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="admin-content">
        <div className="page-title">Waitlist</div>
        <div className="page-sub">{waitlist.length} personas en lista de espera</div>

        {waitlistError ? (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '20px 24px', maxWidth: 600 }}>
            <div style={{ fontWeight: 700, color: '#B45309', marginBottom: 6 }}>⚠ Error al cargar la waitlist</div>
            <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
              Puede que la tabla <code>waitlist</code> tenga RLS restrictivo. Aplica en SQL Editor:
            </p>
            <pre style={{ marginTop: 12, fontSize: 12, background: '#FEF9C3', padding: '10px 14px', borderRadius: 8, overflowX: 'auto' }}>
              {`CREATE POLICY "admin_read_waitlist" ON waitlist\nFOR SELECT USING (true);`}
            </pre>
          </div>
        ) : (
          <>
            <div className="wl-header">
              <input className="wl-search" placeholder="🔍 Nombre, email o tipo…" value={busq} onChange={e => setBusq(e.target.value)}/>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="act-btn" onClick={cargar}>🔄 Actualizar</button>
                <button className="act-btn" onClick={() => exportCSV(
                  filtrados.map(w => ({ nombre: w.nombre, email: w.email, tipo_negocio: w.tipo_negocio, ciudad: w.ciudad, fecha: w.created_at })),
                  'waitlist.csv')}>
                  📥 Exportar CSV
                </button>
              </div>
            </div>

            {cargando ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>Cargando waitlist…</div>
            ) : waitlist.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                <p style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>Waitlist vacía</p>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr><th>Nombre</th><th>Email</th><th>Tipo negocio</th><th>Ciudad</th><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {filtrados.map(w => (
                      <tr key={w.id}>
                        <td className="cell-name">{w.nombre || '—'}</td>
                        <td style={{ color: '#6B7280', fontSize: 12 }}>{w.email}</td>
                        <td style={{ color: '#6B7280' }}>{w.tipo_negocio || '—'}</td>
                        <td style={{ color: '#6B7280' }}>{w.ciudad || '—'}</td>
                        <td style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtFecha(w.created_at)}</td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && busq && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Sin resultados para &quot;{busq}&quot;</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
