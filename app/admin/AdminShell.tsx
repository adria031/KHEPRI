'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/admin',          icon: '📊', label: 'Dashboard'  },
  { href: '/admin/negocios', icon: '🏢', label: 'Negocios'   },
  { href: '/admin/clientes', icon: '👥', label: 'Clientes'   },
  { href: '/admin/waitlist', icon: '📋', label: 'Waitlist'   },
]

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: #F7F9FF; color: #111827; }
.admin-layout { display: flex; min-height: 100vh; }
.admin-sidebar {
  width: 220px; background: white; border-right: 1px solid rgba(0,0,0,0.07);
  display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0;
  z-index: 50; transition: transform 0.25s ease;
}
.admin-main { margin-left: 220px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
.admin-topbar-mobile { display: none; background: white; border-bottom: 1px solid rgba(0,0,0,0.06); padding: 12px 16px; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 30; }
.sb-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
.sb-link {
  display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 11px;
  font-size: 13px; font-weight: 500; color: #6B7280; text-decoration: none;
  margin-bottom: 2px; transition: all 0.15s; background: none; border: none;
  width: 100%; text-align: left; font-family: inherit; cursor: pointer;
}
.sb-link:hover { background: #F3F4F6; color: #111827; }
.sb-link.active { background: rgba(99,102,241,0.08); color: #4F46E5; font-weight: 700; }
.sb-icon { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
.admin-content { padding: 24px; flex: 1; }
.page-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 4px; }
.page-sub { font-size: 13px; color: #9CA3AF; margin-bottom: 24px; }
@media (max-width: 768px) {
  .admin-sidebar { transform: translateX(-100%); }
  .admin-sidebar.open { transform: translateX(0); }
  .sb-overlay.open { display: block; }
  .admin-topbar-mobile { display: flex; }
  .admin-main { margin-left: 0; }
  .admin-content { padding: 16px; }
}
`

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pin,      setPin]      = useState('')
  const [pinOk,    setPinOk]    = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_pin_ok') === 'true') setPinOk(true)
  }, [])

  function verificarPin() {
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
      sessionStorage.setItem('admin_pin_ok', 'true')
      setPinOk(true)
    } else {
      alert('PIN incorrecto')
      setPin('')
    }
  }

  if (!pinOk) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FF', fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 320, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#111827' }}>Panel Admin</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Introduce el PIN de acceso</p>
          <input
            type="password" value={pin} onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verificarPin()}
            placeholder="••••" maxLength={6} autoFocus
            style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 20, textAlign: 'center', letterSpacing: 8, marginBottom: 16, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={verificarPin}
            style={{ width: '100%', padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Acceder →
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{CSS}</style>

      <div className="admin-layout">
        {/* Mobile overlay */}
        <div className={`sb-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

        {/* Sidebar */}
        <aside className={`admin-sidebar ${menuOpen ? 'open' : ''}`}>
          {/* Logo */}
          <div style={{ padding: '16px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#111827' }}>Khepria</div>
              <span style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                Admin
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
            {NAV.map(item => {
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} className={`sb-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                  <span className="sb-icon">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <a href="/cliente" target="_blank" rel="noopener noreferrer" className="sb-link">
              <span className="sb-icon">👁️</span> Ver HUB ↗
            </a>
            <Link href="/dashboard" className="sb-link">
              <span className="sb-icon">↩</span> Dashboard
            </Link>
            <button
              className="sb-link"
              style={{ color: '#DC2626' }}
              onClick={async () => {
                const { createBrowserClient } = await import('@supabase/ssr')
                const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                await sb.auth.signOut()
                sessionStorage.removeItem('admin_pin_ok')
                window.location.href = '/'
              }}
            >
              <span className="sb-icon">🚪</span> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="admin-main">
          {/* Mobile topbar */}
          <div className="admin-topbar-mobile">
            <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280', padding: 4 }}>☰</button>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: '#111827' }}>Khepria Admin</span>
          </div>

          {children}
        </div>
      </div>
    </>
  )
}
