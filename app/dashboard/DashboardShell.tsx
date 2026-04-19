'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { NegocioSelector } from './NegocioSelector'
import type { NegMin } from '../lib/negocioActivo'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { icon: '📊', label: 'Dashboard', href: '/dashboard' },
      { icon: '🏪', label: 'Mi negocio', href: '/dashboard/mi-negocio' },
      { icon: '📅', label: 'Reservas', href: '/dashboard/reservas' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { icon: '🔧', label: 'Servicios', href: '/dashboard/servicios' },
      { icon: '⏰', label: 'Horarios', href: '/dashboard/horarios' },
      { icon: '🛍️', label: 'Productos', href: '/dashboard/productos' },
      { icon: '👥', label: 'Equipo', href: '/dashboard/equipo' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { icon: '🤖', label: 'Chatbot IA', href: '/dashboard/chatbot' },
      { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion' },
      { icon: '📱', label: 'Marketing', href: '/dashboard/marketing' },
      { icon: '⭐', label: 'Reseñas', href: '/dashboard/resenas' },
      { icon: '💰', label: 'Caja', href: '/dashboard/caja' },
      { icon: '💸', label: 'Nóminas', href: '/dashboard/nominas' },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/mi-negocio': 'Mi negocio',
  '/dashboard/reservas': 'Reservas',
  '/dashboard/servicios': 'Servicios',
  '/dashboard/horarios': 'Horarios',
  '/dashboard/productos': 'Productos',
  '/dashboard/equipo': 'Equipo',
  '/dashboard/chatbot': 'Chatbot IA',
  '/dashboard/facturacion': 'Facturación',
  '/dashboard/marketing': 'Marketing',
  '/dashboard/resenas': 'Reseñas',
  '/dashboard/caja': 'Caja',
  '/dashboard/nominas': 'Nóminas',
}

const PLAN_CFG: Record<string, { label: string; color: string; bg: string }> = {
  basico:  { label: 'Básico',   color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  pro:     { label: 'Pro',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  agencia: { label: 'Agencia',  color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
}

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
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

export function DashboardShell({
  negocio,
  todosNegocios,
  children,
}: {
  negocio: NegMin | null
  todosNegocios: NegMin[]
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname() ?? ''

  const planCfg = PLAN_CFG[negocio?.plan ?? ''] ?? PLAN_CFG.basico
  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard'
  const initials = negocio?.nombre
    ? negocio.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --ds-bg: #F8FAFC; --ds-white: #FFFFFF; --ds-border: #E8ECF0; --ds-border2: rgba(0,0,0,0.06);
          --ds-text: #111827; --ds-text2: #4B5563; --ds-muted: #9CA3AF;
          --ds-active-bg: #EEF2FF; --ds-active: #4F46E5; --ds-hover: #F5F7FA;
          /* compat vars */
          --bg: #F8FAFC; --white: #FFFFFF;
          --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8; --lila-soft: rgba(212,197,249,0.2);
          --green: #B8EDD4; --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --yellow: #FDE9A2; --yellow-dark: #C4860A; --pink: #FBCFE8;
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--ds-bg); color: var(--ds-text); -webkit-font-smoothing: antialiased; }

        /* ── LAYOUT ── */
        .ds-layout { display: flex; min-height: 100vh; }
        .ds-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 40; backdrop-filter: blur(3px); }
        .ds-overlay.open { display: block; }

        /* ── SIDEBAR ── */
        .ds-sidebar {
          width: 260px; background: var(--ds-white);
          border-right: 1px solid var(--ds-border);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 50; transition: transform 0.25s cubic-bezier(.4,0,.2,1);
        }
        .ds-logo-area { padding: 18px 16px 14px; display: flex; align-items: center; gap: 0; border-bottom: 1px solid var(--ds-border); }
        .ds-biz-card {
          margin: 12px 10px 4px;
          padding: 10px 11px;
          background: var(--ds-bg);
          border: 1px solid var(--ds-border);
          border-radius: 12px;
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; text-decoration: none;
          transition: background 0.15s;
        }
        .ds-biz-card:hover { background: #F0F4FF; }
        .ds-biz-av {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #B8D8F8, #D4C5F9);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; color: #4F46E5; flex-shrink: 0;
        }
        .ds-biz-name { font-size: 13px; font-weight: 700; color: var(--ds-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3; }
        .ds-biz-badge {
          display: inline-flex; align-items: center;
          font-size: 10px; font-weight: 700; padding: 2px 7px;
          border-radius: 100px; text-transform: capitalize; line-height: 1.4;
          margin-top: 2px;
        }
        .ds-divider { height: 1px; background: var(--ds-border); margin: 10px 10px; }
        .ds-nav { flex: 1; overflow-y: auto; padding: 0 8px 8px; scrollbar-width: thin; scrollbar-color: var(--ds-border) transparent; }
        .ds-nav-section { padding: 10px 8px 4px; font-size: 10px; font-weight: 700; color: var(--ds-muted); letter-spacing: 0.9px; text-transform: uppercase; }
        .ds-nav-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 8px;
          font-size: 13.5px; font-weight: 500; color: var(--ds-text2);
          text-decoration: none; margin-bottom: 1px;
          transition: background 0.12s, color 0.12s;
        }
        .ds-nav-item:hover { background: var(--ds-hover); color: var(--ds-text); }
        .ds-nav-item.ds-active { background: var(--ds-active-bg); color: var(--ds-active); font-weight: 600; }
        .ds-nav-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; opacity: 0.85; }
        .ds-nav-item.ds-active .ds-nav-icon { opacity: 1; }
        .ds-footer { padding: 12px 10px; border-top: 1px solid var(--ds-border); }
        .ds-logout {
          width: 100%; padding: 9px 12px; background: transparent;
          border: 1px solid var(--ds-border); border-radius: 10px;
          font-family: inherit; font-size: 13px; font-weight: 600;
          color: var(--ds-text2); cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: all 0.15s;
        }
        .ds-logout:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }

        /* ── MAIN ── */
        .ds-main { margin-left: 260px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .ds-topbar {
          background: var(--ds-white); border-bottom: 1px solid var(--ds-border);
          padding: 0 28px; height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 30;
        }
        .ds-topbar-left { display: flex; align-items: center; gap: 14px; }
        .ds-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 7px; border-radius: 8px; color: var(--ds-text2); align-items: center; }
        .ds-hamburger:hover { background: var(--ds-bg); }
        .ds-page-title { font-size: 15px; font-weight: 700; color: var(--ds-text); }
        .ds-topbar-right { display: flex; align-items: center; gap: 6px; }
        .ds-bell {
          position: relative; width: 36px; height: 36px; border-radius: 9px;
          background: var(--ds-bg); border: 1px solid var(--ds-border);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--ds-text2); transition: background 0.15s;
        }
        .ds-bell:hover { background: #F0F2F5; }
        .ds-bell-dot { position: absolute; top: 7px; right: 7px; width: 6px; height: 6px; background: #EF4444; border-radius: 50%; border: 1.5px solid white; }
        .ds-user-av {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #B8D8F8, #D4C5F9);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #4F46E5; flex-shrink: 0; cursor: pointer;
        }
        .ds-content { padding: 28px; flex: 1; }

        /* ── COMPAT: keep old class names working in sub-pages ── */
        .sidebar { display: none !important; }
        .sidebar-overlay { display: none !important; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .notif-btn { position: relative; background: var(--ds-bg); border: 1px solid var(--ds-border); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; }
        .notif-badge { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; background: #EF4444; border-radius: 50%; border: 1.5px solid white; }
        .btn-nuevo { background: var(--ds-text); color: white; border: none; padding: 8px 16px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .content { padding: 28px; flex: 1; }
        .main { display: contents; }
        .layout { display: contents; }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .ds-sidebar { transform: translateX(-100%); }
          .ds-sidebar.open { transform: translateX(0); }
          .ds-hamburger { display: flex; }
          .ds-main { margin-left: 0; }
          .ds-topbar { padding: 0 16px; }
          .ds-content { padding: 16px; }
          .content { padding: 16px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="ds-layout">
        {/* Mobile overlay */}
        <div className={`ds-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* ── SIDEBAR ── */}
        <aside className={`ds-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Logo */}
          <div className="ds-logo-area">
            <Link href="/" style={{ textDecoration: 'none' }}><KhepriLogo /></Link>
          </div>

          {/* Business card */}
          <Link href="/dashboard/mi-negocio" className="ds-biz-card" onClick={() => setSidebarOpen(false)}>
            <div className="ds-biz-av">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ds-biz-name">{negocio?.nombre ?? 'Mi negocio'}</div>
              <span className="ds-biz-badge" style={{ color: planCfg.color, background: planCfg.bg }}>
                {planCfg.label}
              </span>
            </div>
          </Link>

          <div className="ds-divider" />

          {/* Nav */}
          <nav className="ds-nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="ds-nav-section">{group.label}</div>
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`ds-nav-item${isActive ? ' ds-active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="ds-nav-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Logout + legal */}
          <div className="ds-footer">
            <button className="ds-logout" onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', paddingLeft: '4px' }}>
              <Link href="/privacidad" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Privacidad</Link>
              <Link href="/terminos" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Términos</Link>
              <Link href="/cookies" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Cookies</Link>
              <Link href="/aviso-legal" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Aviso Legal</Link>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ds-main">
          {/* Topbar */}
          <header className="ds-topbar">
            <div className="ds-topbar-left">
              <button className="ds-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span className="ds-page-title">{pageTitle}</span>
            </div>
            <div className="ds-topbar-right">
              <NegocioSelector negocios={todosNegocios} activoId={negocio?.id ?? ''} />
              <button className="ds-bell" aria-label="Notificaciones">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className="ds-bell-dot" />
              </button>
              <div className="ds-user-av" title={negocio?.nombre}>{initials}</div>
            </div>
          </header>

          {/* Content */}
          <main className="ds-content">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
