'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { NegocioSelector } from './NegocioSelector'
import type { NegMin } from '../lib/negocioActivo'
import { getPlanActivo } from '../lib/negocio-activo'
import { useTheme } from '../components/ThemeProvider'
import { useTranslations } from 'next-intl'
import KhepriaLogo from '../components/KhepriaLogo'
import { LanguageSelector } from '../components/LanguageSelector'
import { tieneAcceso, HREF_KEY, PLANES } from '../lib/planes'

const NAV_GROUPS = [
  {
    emoji: '📊',
    label: 'Inicio',
    items: [
      { icon: '🏠', label: 'Dashboard',   href: '/dashboard' },
      { icon: '📋', label: 'Reservas',    href: '/dashboard/reservas' },
      { icon: '🤖', label: 'Chatbot IA',  href: '/dashboard/chatbot' },
    ],
  },
  {
    emoji: '👥',
    label: 'Clientes',
    items: [
      { icon: '👤', label: 'Clientes', href: '/dashboard/clientes' },
      { icon: '⭐', label: 'Reseñas',  href: '/dashboard/resenas' },
    ],
  },
  {
    emoji: '🏪',
    label: 'Mi negocio',
    items: [
      { icon: '🏪', label: 'Mi negocio', href: '/dashboard/mi-negocio' },
      { icon: '🔧', label: 'Servicios',  href: '/dashboard/servicios' },
      { icon: '⏰', label: 'Horarios',   href: '/dashboard/horarios' },
      { icon: '👥', label: 'Equipo',     href: '/dashboard/equipo' },
      { icon: '🛍️', label: 'Productos',  href: '/dashboard/productos' },
    ],
  },
  {
    emoji: '💰',
    label: 'Finanzas',
    items: [
      { icon: '💰', label: 'Caja',        href: '/dashboard/caja' },
      { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion' },
      { icon: '💸', label: 'Nóminas',     href: '/dashboard/nominas' },
    ],
  },
  {
    emoji: '📈',
    label: 'Crecimiento',
    items: [
      { icon: '📸', label: 'Marketing', href: '/dashboard/marketing' },
      { icon: '📊', label: 'Analytics', href: '/dashboard/analytics' },
    ],
  },
  {
    emoji: '⚙️',
    label: 'Configuración',
    items: [
      { icon: '⚙️', label: 'Ajustes',       href: '/dashboard/ajustes' },
      { icon: '🔌', label: 'Integraciones', href: '/dashboard/integraciones' },
      { icon: '⚡', label: 'Créditos',      href: '/dashboard/creditos' },
      { icon: '🚀', label: 'Upgrade plan',  href: '/upgrade' },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/mi-negocio': 'Mi negocio',
  '/dashboard/reservas': 'Reservas',
  '/dashboard/clientes': 'Clientes',
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
  '/dashboard/analytics': 'Analytics',
  '/dashboard/ajustes': 'Ajustes',
  '/dashboard/integraciones': 'Integraciones',
  '/dashboard/agenda': 'Agenda',
}

const PLAN_CFG: Record<string, { label: string; color: string; bg: string }> = {
  starter: { label: 'Starter', color: '#2E8A5E', bg: 'rgba(46,138,94,0.1)' },
  basico:  { label: 'Básico',  color: '#1D4ED8', bg: 'rgba(29,78,216,0.1)' },
  pro:     { label: 'Pro',     color: '#6B4FD8', bg: 'rgba(107,79,216,0.1)' },
  plus:    { label: 'Plus',    color: '#C4860A', bg: 'rgba(196,134,10,0.1)' },
  beta:    { label: 'Beta',    color: '#4F46E5', bg: 'rgba(79,70,229,0.1)' },
  agencia: { label: 'Plus',    color: '#C4860A', bg: 'rgba(196,134,10,0.1)' },
}

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <KhepriaLogo size={32} />
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
  const [planFromStorage, setPlanFromStorage] = useState<string>('starter')
  const pathname = usePathname() ?? ''
  const { theme, toggle: toggleTheme } = useTheme()
  const t = useTranslations('dashboard')

  // Leer plan de localStorage una sola vez (evita query Supabase en cada subpágina)
  useEffect(() => {
    setPlanFromStorage(getPlanActivo())
  }, [])

  // Translated nav labels keyed by href
  const NAV_LABELS: Record<string, string> = {
    '/dashboard':              t('nav.dashboard'),
    '/dashboard/agenda':       t('nav.agenda'),
    '/dashboard/reservas':     t('nav.reservations'),
    '/dashboard/clientes':     t('nav.clients'),
    '/dashboard/resenas':      t('nav.reviews'),
    '/dashboard/mi-negocio':   t('nav.myBusiness'),
    '/dashboard/servicios':    t('nav.services'),
    '/dashboard/horarios':     t('nav.schedules'),
    '/dashboard/equipo':       t('nav.team'),
    '/dashboard/productos':    t('nav.products'),
    '/dashboard/caja':         t('nav.cash'),
    '/dashboard/facturacion':  t('nav.invoicing'),
    '/dashboard/nominas':      t('nav.payroll'),
    '/dashboard/chatbot':      t('nav.chatbot'),
    '/dashboard/marketing':    t('nav.marketing'),
    '/dashboard/analytics':    t('nav.analytics'),
    '/dashboard/ajustes':      t('nav.settings'),
    '/dashboard/integraciones':t('nav.integrations'),
    '/dashboard/creditos':     t('nav.credits'),
    '/upgrade':                t('nav.upgrade'),
  }

  const GROUP_LABELS: Record<string, string> = {
    'Inicio':        t('groups.inicio'),
    'Clientes':      t('groups.clientes'),
    'Mi negocio':    t('groups.miNegocio'),
    'Finanzas':      t('groups.finanzas'),
    'Crecimiento':   t('groups.crecimiento'),
    'Configuración': t('groups.configuracion'),
  }

  const PAGE_TITLES_I18N: Record<string, string> = {
    '/dashboard':              t('titles.dashboard'),
    '/dashboard/agenda':       t('titles.agenda'),
    '/dashboard/mi-negocio':   t('titles.myBusiness'),
    '/dashboard/reservas':     t('titles.reservations'),
    '/dashboard/clientes':     t('titles.clients'),
    '/dashboard/servicios':    t('titles.services'),
    '/dashboard/horarios':     t('titles.schedules'),
    '/dashboard/productos':    t('titles.products'),
    '/dashboard/equipo':       t('titles.team'),
    '/dashboard/facturacion':  t('titles.invoicing'),
    '/dashboard/chatbot':      t('titles.chatbot'),
    '/dashboard/marketing':    t('titles.marketing'),
    '/dashboard/resenas':      t('titles.reviews'),
    '/dashboard/caja':         t('titles.cash'),
    '/dashboard/nominas':      t('titles.payroll'),
    '/dashboard/analytics':    t('titles.analytics'),
    '/dashboard/ajustes':      t('titles.settings'),
    '/dashboard/integraciones':t('titles.integrations'),
    '/dashboard/creditos':     t('titles.credits'),
  }

  const router = useRouter()
  const esTodos = negocio === null && todosNegocios.length > 1

  // Brand color: prefer new color/color_secundario, fall back to color_principal
  const navActiveColor    = negocio?.color           || negocio?.color_principal || '#4F46E5'
  const navSecondaryColor = negocio?.color_secundario || navActiveColor
  const navActiveBg       = navActiveColor + '1f'  // ~12% opacity via 8-char hex
  // Usar el plan del negocio activo; en modo "todos" usar localStorage para no perder accesos
  const planActual = (negocio?.plan?.toLowerCase()) ?? planFromStorage ?? 'starter'
  const planCfg = PLAN_CFG[planActual] ?? PLAN_CFG.basico

  function navClick(e: React.MouseEvent, href: string) {
    const key = HREF_KEY[href]
    if (key && !tieneAcceso(planActual, key)) {
      e.preventDefault()
      setSidebarOpen(false)
      router.push('/upgrade')
    }
  }

  // Is the current route blocked for this plan?
  const currentKey = HREF_KEY[pathname]
  const rutaBloqueada = currentKey ? !tieneAcceso(planActual, currentKey) : false
  const pageTitle = PAGE_TITLES_I18N[pathname] ?? PAGE_TITLES[pathname] ?? 'Dashboard'

  // Breadcrumb: find which group the current route belongs to
  const breadcrumbGroup = pathname !== '/dashboard'
    ? NAV_GROUPS.find(g => g.items.some(i => i.href === pathname))
    : null
  const initials = esTodos
    ? '🏢'
    : negocio?.nombre
      ? negocio.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
      : '?'
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const brandVars = {
    '--ds-active':        navActiveColor,
    '--ds-active-bg':     navActiveBg,
    '--color-primary':    navActiveColor,
    '--color-secondary':  navSecondaryColor,
  } as React.CSSProperties

  return (
    <div style={brandVars}>
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
        .ds-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 40; backdrop-filter: blur(3px); opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
        .ds-overlay.open { opacity: 1; pointer-events: auto; }

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
        .ds-nav-item.ds-active { background: var(--ds-active-bg); color: var(--ds-active); font-weight: 700; }
        .ds-nav-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; opacity: 0.85; }
        .ds-nav-item.ds-active .ds-nav-icon { opacity: 1; }
        .ds-nav-locked { opacity: 0.7; }
        .ds-nav-locked:hover { background: rgba(212,197,249,0.15); color: #6B4FD8; }
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

        /* ── DARK MODE ── */
        html.dark {
          --ds-bg: #0d0d0d; --ds-white: #1a1a1a; --ds-border: rgba(255,255,255,0.08); --ds-border2: rgba(255,255,255,0.05);
          --ds-text: #f9fafb; --ds-text2: #9CA3AF; --ds-muted: #6B7280;
          --ds-active-bg: rgba(79,70,229,0.18); --ds-active: #818CF8; --ds-hover: rgba(255,255,255,0.05);
          --bg: #0d0d0d; --white: #1a1a1a; --border: rgba(255,255,255,0.08);
          --text: #f9fafb; --text2: #9CA3AF; --muted: #6B7280;
          --blue-soft: rgba(184,216,248,0.12); --lila-soft: rgba(212,197,249,0.12); --green-soft: rgba(184,237,212,0.12);
          --yellow: rgba(253,233,162,0.2); --pink: rgba(251,207,232,0.2);
          --blue-dark: #93C5FD; --lila-dark: #A78BFA; --green-dark: #6EE7B7; --yellow-dark: #FCD34D;
        }
        html.dark .ds-logout:hover { background: rgba(220,38,38,0.15); color: #F87171; border-color: rgba(248,113,113,0.3); }
        html.dark .ds-biz-card:hover { background: rgba(79,70,229,0.1); }

        /* ── BREADCRUMB ── */
        .ds-breadcrumb { display: flex; align-items: center; gap: 5px; }
        .ds-bc-link { font-size: 13px; color: var(--ds-text2); text-decoration: none; font-weight: 500; transition: color 0.12s; }
        .ds-bc-link:hover { color: var(--ds-active); }
        .ds-bc-sep { font-size: 13px; color: var(--ds-muted); line-height: 1; }
        .ds-bc-section { font-size: 13px; color: var(--ds-text2); font-weight: 500; }
        .ds-bc-current { font-size: 13px; color: var(--ds-text); font-weight: 700; }

        /* ── BOTTOM NAV (mobile) ── */
        .ds-bottom-nav {
          display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 45;
          background: var(--ds-white); border-top: 1px solid var(--ds-border);
          height: 64px; padding: 0 4px;
          align-items: center; justify-content: space-around;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
        }
        .ds-bn-item {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px; flex: 1; padding: 4px 2px;
          text-decoration: none; color: var(--ds-muted);
          font-family: inherit; background: none; border: none; cursor: pointer;
          border-radius: 10px; transition: color 0.15s; -webkit-tap-highlight-color: transparent;
          min-height: 44px;
        }
        .ds-bn-item.ds-bn-active { color: var(--ds-active); }
        .ds-bn-icon { font-size: 20px; line-height: 1; }
        .ds-bn-label { font-size: 10px; font-weight: 600; letter-spacing: -0.2px; white-space: nowrap; }
        /* Center (home) button */
        .ds-bn-center { margin-top: -18px; flex: 1.2; }
        .ds-bn-center-bubble {
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--ds-active); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; box-shadow: 0 4px 16px rgba(0,0,0,0.22);
          border: 3px solid var(--ds-white); margin: 0 auto 2px;
          transition: transform 0.15s;
        }
        .ds-bn-center:active .ds-bn-center-bubble { transform: scale(0.93); }
        .ds-bn-center.ds-bn-active .ds-bn-center-bubble { box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .ds-bn-center .ds-bn-label { color: var(--ds-active); font-weight: 700; }

        /* ── MOBILE TOPBAR ── */
        .ds-breadcrumb-wrap { display: flex; align-items: center; }
        .ds-topbar-title-mobile {
          display: none; position: absolute; left: 50%; transform: translateX(-50%);
          font-size: 15px; font-weight: 700; color: var(--ds-text);
          white-space: nowrap; overflow: hidden; max-width: 42%; text-overflow: ellipsis;
          pointer-events: none;
        }
        .ds-negsel-mobile-btn {
          display: none; align-items: center; gap: 6px;
          padding: 5px 9px 5px 5px; border-radius: 10px;
          border: 1px solid var(--ds-border); background: var(--ds-bg);
          cursor: pointer; font-family: inherit;
          -webkit-tap-highlight-color: transparent; transition: background 0.12s;
        }
        .ds-negsel-mobile-btn:active { background: var(--ds-hover); }
        .ds-negsel-mob-av {
          width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
          background: linear-gradient(135deg,#B8D8F8,#D4C5F9);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; color: #4F46E5;
        }
        .ds-negsel-mob-name {
          font-size: 12px; font-weight: 700; color: var(--ds-text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px;
        }
        /* Bottom sheet negocio selector */
        .ds-neg-sheet-overlay {
          position: fixed; inset: 0; z-index: 70;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
          display: flex; align-items: flex-end;
        }
        .ds-neg-sheet {
          background: var(--ds-white); width: 100%;
          border-radius: 20px 20px 0 0;
          padding-bottom: max(16px,env(safe-area-inset-bottom));
          animation: ds-slide-up 0.22s cubic-bezier(.4,0,.2,1);
        }
        @keyframes ds-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .ds-neg-sheet-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: var(--ds-border); margin: 12px auto 16px;
        }
        .ds-neg-sheet-title {
          font-size: 11px; font-weight: 700; color: var(--ds-text2);
          padding: 0 20px 12px; border-bottom: 1px solid var(--ds-border);
          text-transform: uppercase; letter-spacing: 0.8px;
        }
        .ds-neg-sheet-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 14px 20px; text-align: left;
          background: none; border: none; border-bottom: 1px solid var(--ds-border);
          font-family: inherit; cursor: pointer; transition: background 0.12s;
        }
        .ds-neg-sheet-item:last-child { border-bottom: none; }
        .ds-neg-sheet-item:active { background: var(--ds-hover); }
        .ds-neg-sheet-item-av {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg,#B8D8F8,#D4C5F9);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #4F46E5;
        }
        .ds-neg-sheet-item-name { font-size: 14px; font-weight: 700; color: var(--ds-text); }
        .ds-neg-sheet-item-badge { font-size: 10px; color: var(--ds-text2); margin-top: 2px; }
        .ds-neg-sheet-item-check { margin-left: auto; color: var(--ds-active); font-size: 18px; font-weight: 700; }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .ds-sidebar { transform: translateX(-100%); }
          .ds-sidebar.open { transform: translateX(0); }
          .ds-hamburger { display: flex; }
          .ds-main { margin-left: 0; padding-bottom: 74px; }
          .ds-content { padding: 16px; }
          .content { padding: 16px; }
          .ds-notif-btn { display: none; }
          .ds-user-av { display: none; }
          .ds-main, .ds-content { overflow-x: hidden; max-width: 100vw; }
          .ds-bottom-nav { display: flex; }

          /* Topbar móvil: 2 líneas para evitar solapamiento título/negocio */
          .ds-topbar {
            height: auto;
            padding: 8px 12px 6px;
            flex-direction: column;
            align-items: stretch;
            gap: 2px;
            position: sticky;
          }
          /* Línea 1: hamburger + título de sección (pequeño, secundario) */
          .ds-topbar-left { width: 100%; gap: 8px; }
          .ds-breadcrumb-wrap { display: flex; align-items: center; min-width: 0; flex: 1; overflow: hidden; }
          .ds-topbar-title-mobile { display: none; }
          /* En móvil solo mostramos el nodo actual, sin breadcrumb completo */
          .ds-bc-link, .ds-bc-section, .ds-bc-sep { display: none; }
          .ds-page-title, .ds-bc-current {
            font-size: 12px;
            color: var(--ds-text2);
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }
          /* Línea 2: selector de negocio + controles (contenido principal) */
          .ds-topbar-right {
            width: 100%;
            justify-content: flex-start;
            padding-left: 28px;
          }
          .ds-negsel-wrap { flex: 1; min-width: 0; }
        }
        @media (max-width: 480px) {
          .ds-content { padding: 12px; }
          .content { padding: 12px; }
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
          <Link href={esTodos ? '/dashboard' : '/dashboard/mi-negocio'} className="ds-biz-card" onClick={() => setSidebarOpen(false)}>
            <div className="ds-biz-av" style={esTodos ? { fontSize: '18px', background: 'linear-gradient(135deg,#B8EDD4,#B8D8F8)' } : {}}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ds-biz-name">{esTodos ? 'Todos los negocios' : (negocio?.nombre ?? 'Mi negocio')}</div>
              {!esTodos && (
                <span className="ds-biz-badge" style={{ color: planCfg.color, background: planCfg.bg }}>
                  {planCfg.label}
                </span>
              )}
              {esTodos && (
                <span className="ds-biz-badge" style={{ color: '#6B7280', background: '#F3F4F6' }}>
                  {todosNegocios.length} negocios
                </span>
              )}
            </div>
          </Link>

          <div className="ds-divider" />

          {/* Nav */}
          <nav className="ds-nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="ds-nav-section">{group.emoji} {GROUP_LABELS[group.label] ?? group.label}</div>
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  const key = HREF_KEY[item.href]
                  const bloqueado = key ? !tieneAcceso(planActual, key) : false
                  return (
                    <Link
                      key={item.href}
                      href={bloqueado ? '/upgrade' : item.href}
                      className={`ds-nav-item${isActive ? ' ds-active' : ''}${bloqueado ? ' ds-nav-locked' : ''}`}
                      onClick={(e) => navClick(e, item.href)}
                      title={bloqueado ? `Disponible desde plan ${
                        Object.entries(PLANES).find(([, v]) => v.sidebar.includes('todo') || v.sidebar.includes(key ?? ''))?.
                        [1].nombre ?? ''
                      }` : undefined}
                    >
                      <span className="ds-nav-icon">{bloqueado ? '🔒' : item.icon}</span>
                      <span style={bloqueado ? { opacity: 0.5 } : {}}>{NAV_LABELS[item.href] ?? item.label}</span>
                      {bloqueado && (
                        <span style={{
                          marginLeft: 'auto', fontSize: '9px', fontWeight: 700,
                          background: 'linear-gradient(135deg,#D4C5F9,#B8D8F8)',
                          color: '#4F46E5', padding: '2px 6px', borderRadius: '100px',
                          whiteSpace: 'nowrap',
                        }}>Upgrade</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Logout + legal */}
          <div className="ds-footer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
              <LanguageSelector style={{ flex: 1 }} />
            </div>
            <button className="ds-logout" onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('logout')}
            </button>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', paddingLeft: '4px' }}>
              <Link href="/legal/privacidad" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Privacidad</Link>
              <Link href="/legal/terminos" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Términos</Link>
              <Link href="/legal/cookies" style={{ fontSize: '11px', color: 'var(--ds-muted)', textDecoration: 'none' }}>Cookies</Link>
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
              <div className="ds-breadcrumb-wrap">
                {breadcrumbGroup ? (
                  <nav className="ds-breadcrumb" aria-label="Breadcrumb">
                    <Link href="/dashboard" className="ds-bc-link">Dashboard</Link>
                    <span className="ds-bc-sep">›</span>
                    {pageTitle !== breadcrumbGroup.label && (
                      <>
                        <span className="ds-bc-section">{breadcrumbGroup.emoji} {breadcrumbGroup.label}</span>
                        <span className="ds-bc-sep">›</span>
                      </>
                    )}
                    <span className="ds-bc-current">{pageTitle}</span>
                  </nav>
                ) : (
                  <span className="ds-page-title">{pageTitle}</span>
                )}
              </div>
            </div>
            {/* Mobile: centered page title */}
            <span className="ds-topbar-title-mobile">{pageTitle}</span>
            <div className="ds-topbar-right">
              <div className="ds-negsel-wrap">
                <NegocioSelector negocios={todosNegocios} activoId={esTodos ? 'todos' : (negocio?.id ?? (todosNegocios[0]?.id ?? ''))} />
              </div>
              <button
                onClick={toggleTheme}
                className="ds-bell"
                aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
              <button className="ds-bell ds-notif-btn" aria-label="Notificaciones">
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
            {rutaBloqueada ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '60vh', gap: '20px', textAlign: 'center',
              }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '20px',
                  background: 'linear-gradient(135deg,#D4C5F9,#B8D8F8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '36px',
                }}>🔒</div>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ds-text)', marginBottom: '8px' }}>
                    Función no disponible en tu plan
                  </h2>
                  <p style={{ color: 'var(--ds-text2)', fontSize: '14px', maxWidth: '340px' }}>
                    Tu plan actual <strong>{PLANES[planActual]?.nombre ?? planActual}</strong> no incluye esta sección. Mejora tu plan para desbloquearla.
                  </p>
                </div>
                <Link href="/upgrade" style={{
                  background: 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                  color: 'white', textDecoration: 'none',
                  padding: '12px 28px', borderRadius: '100px',
                  fontWeight: 700, fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                }}>
                  Ver planes y precios →
                </Link>
              </div>
            ) : children}
          </main>
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile only) ── */}
      <nav className="ds-bottom-nav">
        <Link href="/dashboard/analytics" className={`ds-bn-item${pathname === '/dashboard/analytics' ? ' ds-bn-active' : ''}`}>
          <span className="ds-bn-icon">📊</span>
          <span className="ds-bn-label">Analytics</span>
        </Link>
        <Link href="/dashboard/marketing" className={`ds-bn-item${pathname === '/dashboard/marketing' ? ' ds-bn-active' : ''}`}>
          <span className="ds-bn-icon">📸</span>
          <span className="ds-bn-label">Marketing</span>
        </Link>
        <Link href="/dashboard" className={`ds-bn-item ds-bn-center${pathname === '/dashboard' ? ' ds-bn-active' : ''}`}>
          <div className="ds-bn-center-bubble">🏠</div>
          <span className="ds-bn-label">Inicio</span>
        </Link>
        <Link href="/dashboard/clientes" className={`ds-bn-item${pathname === '/dashboard/clientes' ? ' ds-bn-active' : ''}`}>
          <span className="ds-bn-icon">👥</span>
          <span className="ds-bn-label">Clientes</span>
        </Link>
        <Link href="/dashboard/reservas" className={`ds-bn-item${pathname === '/dashboard/reservas' ? ' ds-bn-active' : ''}`}>
          <span className="ds-bn-icon">📅</span>
          <span className="ds-bn-label">Reservas</span>
        </Link>
      </nav>

    </div>
  )
}
