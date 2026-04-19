'use client'
import Link from 'next/link'

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
      <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; color: #111827; -webkit-font-smoothing: antialiased; }
        .lg-nav { background: white; border-bottom: 1px solid rgba(0,0,0,0.07); padding: 16px 48px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .lg-back { font-size: 13px; font-weight: 600; color: #4B5563; text-decoration: none; display: flex; align-items: center; gap: 6px; }
        .lg-back:hover { color: #111827; }
        .lg-wrap { max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }
        .lg-badge { display: inline-block; background: rgba(212,197,249,0.3); color: #6B4FD8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 100px; margin-bottom: 16px; letter-spacing: 0.3px; }
        .lg-title { font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.8px; margin-bottom: 8px; line-height: 1.2; }
        .lg-updated { font-size: 13px; color: #9CA3AF; margin-bottom: 40px; }
        .lg-section { margin-bottom: 36px; }
        .lg-section h2 { font-size: 18px; font-weight: 800; color: #111827; margin-bottom: 12px; letter-spacing: -0.3px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.07); }
        .lg-section h3 { font-size: 15px; font-weight: 700; color: #111827; margin: 16px 0 8px; }
        .lg-section p { font-size: 14px; color: #4B5563; line-height: 1.75; margin-bottom: 10px; }
        .lg-section ul, .lg-section ol { padding-left: 20px; margin-bottom: 10px; }
        .lg-section li { font-size: 14px; color: #4B5563; line-height: 1.75; margin-bottom: 4px; }
        .lg-section a { color: #4F46E5; text-decoration: none; }
        .lg-section a:hover { text-decoration: underline; }
        .lg-box { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; }
        .lg-box-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .lg-box p { font-size: 13px; color: #4B5563; margin: 0; line-height: 1.6; }
        .lg-footer { border-top: 1px solid rgba(0,0,0,0.07); padding-top: 32px; margin-top: 48px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; }
        .lg-footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
        .lg-footer-links a { font-size: 13px; color: #9CA3AF; text-decoration: none; font-weight: 500; }
        .lg-footer-links a:hover { color: #111827; }
        .lg-footer p { font-size: 13px; color: #9CA3AF; }
        @media (max-width: 600px) { .lg-nav { padding: 14px 20px; } .lg-title { font-size: 24px; } }
      `}</style>

      <nav className="lg-nav">
        <Link href="/" style={{ textDecoration: 'none' }}><KhepriLogo /></Link>
        <Link href="/" className="lg-back">← Volver al inicio</Link>
      </nav>

      <div className="lg-wrap">
        <div className="lg-badge">Legal</div>
        <h1 className="lg-title">{title}</h1>
        <p className="lg-updated">Última actualización: {updated}</p>

        {children}

        <div className="lg-footer">
          <p>© 2025 Khepria · Hecho en España 🇪🇸</p>
          <div className="lg-footer-links">
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/aviso-legal">Aviso Legal</Link>
          </div>
        </div>
      </div>
    </>
  )
}
