'use client'
import { useState } from 'react'
import type { NegMin } from '../lib/negocioActivo'

const PLAN_COLOR: Record<string, string> = {
  basico: '#1D4ED8',
  pro: '#6B4FD8',
  agencia: '#2E8A5E',
}

/**
 * Dropdown selector shown in the topbar when the user owns >1 negocio.
 * On selection it writes to localStorage and reloads so the page re-fetches.
 */
export function NegocioSelector({
  negocios,
  activoId,
}: {
  negocios: NegMin[]
  activoId: string
}) {
  const [open, setOpen] = useState(false)

  if (negocios.length <= 1) return null

  const activo = negocios.find(n => n.id === activoId) ?? negocios[0]

  function cambiar(id: string) {
    if (id === activoId) { setOpen(false); return }
    localStorage.setItem('negocio_activo_id', id)
    window.location.reload()
  }

  return (
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
          whiteSpace: 'nowrap', maxWidth: '180px', transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: PLAN_COLOR[activo.plan] ?? '#9CA3AF', flexShrink: 0,
        }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          {activo.nombre}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
          background: 'white', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '14px', boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          minWidth: '220px', padding: '6px', overflow: 'hidden',
        }}>
          <p style={{
            padding: '6px 10px 8px', fontSize: '11px', fontWeight: 700,
            color: '#9CA3AF', letterSpacing: '0.5px', textTransform: 'uppercase',
            margin: 0,
          }}>
            Mis negocios
          </p>

          {negocios.map(n => (
            <button
              key={n.id}
              onClick={() => cambiar(n.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '9px', border: 'none',
                background: n.id === activoId ? 'rgba(184,216,248,0.2)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: PLAN_COLOR[n.plan] ?? '#9CA3AF', flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: '#111827',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {n.nombre}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'capitalize' }}>
                  Plan {n.plan}
                </div>
              </div>
              {n.id === activoId && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
