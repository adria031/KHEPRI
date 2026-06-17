'use client'
import { useState, useEffect } from 'react'
import { getAdminClientes, type PerfilAdmin } from '../actions'

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
  .cl-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
  .cl-search { padding:8px 12px; background:white; border:1.5px solid #E5E7EB; border-radius:10px; font-family:inherit; font-size:13px; color:#111827; outline:none; width:240px; }
  .cl-search:focus { border-color:#6366F1; }
  .f-btn { padding:6px 11px; border-radius:8px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:600; color:#6B7280; cursor:pointer; transition:all 0.15s; }
  .f-btn.act { background:rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.3); color:#4F46E5; }
  .act-btn { padding:7px 13px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-family:inherit; font-size:12px; font-weight:700; color:#374151; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
  .act-btn:hover { border-color:#6366F1; color:#4F46E5; background:rgba(99,102,241,0.04); }
  .tbl-wrap { background:white; border-radius:16px; border:1px solid rgba(0,0,0,0.06); overflow:hidden; box-shadow:0 1px 6px rgba(0,0,0,0.04); overflow-x:auto; }
  table { width:100%; border-collapse:collapse; min-width:600px; }
  thead th { padding:10px 14px; font-size:11px; font-weight:700; color:#9CA3AF; text-align:left; text-transform:uppercase; letter-spacing:0.4px; background:#FAFAFA; border-bottom:1px solid rgba(0,0,0,0.06); white-space:nowrap; }
  tbody td { padding:11px 14px; font-size:13px; color:#374151; border-bottom:1px solid rgba(0,0,0,0.04); vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover td { background:#F9F9FF; }
  .cell-name { font-weight:600; color:#111827; }
  .avatar { width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg,#B8D8F8,#D4C5F9); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#1E3A5F; flex-shrink:0; }
`

export default function ClientesPage() {
  const [cargando,   setCargando]   = useState(true)
  const [perfiles,   setPerfiles]   = useState<PerfilAdmin[]>([])
  const [debugError, setDebugError] = useState<string | null>(null)
  const [busq, setBusq] = useState('')

  useEffect(() => {
    getAdminClientes()
      .then(({ data, error }) => {
        if (error) setDebugError(error)
        setPerfiles(data)
        setCargando(false)
      })
      .catch(e => { setDebugError(String(e)); setCargando(false) })
  }, [])

  const filtrados = perfiles.filter(p =>
    !busq ||
    (p.nombre ?? '').toLowerCase().includes(busq.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(busq.toLowerCase())
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="admin-content">
        <div className="page-title">Clientes</div>
        <div className="page-sub">{filtrados.length} de {perfiles.length} perfiles registrados</div>

        {debugError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: 6, fontSize: 13 }}>⚠ Error al cargar (debug):</div>
            <pre style={{ fontSize: 11, color: '#991B1B', overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>{debugError}</pre>
          </div>
        )}

        <div className="cl-header">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="cl-search" placeholder="🔍 Nombre o email…" value={busq} onChange={e => setBusq(e.target.value)}/>
          </div>
          <button className="act-btn" onClick={() => exportCSV(
            filtrados.map(p => ({ nombre: p.nombre, email: p.email, tipo: p.tipo, plan: p.plan })),
            'clientes.csv')}>
            📥 Exportar CSV
          </button>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>Cargando perfiles…</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Usuario</th><th>Email</th><th>Tipo</th><th>Plan</th><th>Créditos</th></tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const cTot    = p.creditos_totales ?? 0
                  const cUsd    = p.creditos_usados  ?? 0
                  const inicial = (p.nombre ?? p.email ?? '?').charAt(0).toUpperCase()
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{inicial}</div>
                          <span className="cell-name">{p.nombre || '—'}</span>
                        </div>
                      </td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>{p.email || '—'}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 6 }}>
                          {p.tipo || 'sin tipo'}
                        </span>
                      </td>
                      <td>
                        {p.plan
                          ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: '#F5F3FF', color: '#7C3AED' }}>{p.plan}</span>
                          : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: '#6B7280' }}>
                        {cTot > 0 ? `${cTot - cUsd} / ${cTot}` : '—'}
                      </td>
                    </tr>
                  )
                })}
                {filtrados.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
