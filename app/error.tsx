'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Khepria error]', error)
  }, [error])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#F8FAFC; font-family:'Plus Jakarta Sans',sans-serif; color:#111827; min-height:100vh; }
        .err-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; position:relative; overflow:hidden; }
        .err-bg { position:absolute; inset:0; pointer-events:none; }
        .err-card { position:relative; z-index:1; text-align:center; max-width:440px; width:100%; }
        .err-logo { display:inline-flex; align-items:center; gap:10px; margin-bottom:40px; }
        .err-logo-icon { width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4); display:flex; align-items:center; justify-content:center; }
        .err-logo-text { font-weight:800; font-size:18px; letter-spacing:-0.5px; color:#111827; }
        .err-icon { font-size:72px; margin-bottom:20px; line-height:1; display:block; }
        .err-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:#111827; letter-spacing:-0.5px; margin-bottom:10px; }
        .err-sub { font-size:15px; color:#6B7280; line-height:1.65; margin-bottom:32px; }
        .err-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        .err-btn-primary { display:inline-flex; align-items:center; gap:8px; padding:13px 24px; background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border-radius:14px; font-family:inherit; font-size:15px; font-weight:700; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(99,102,241,0.3); transition:transform .15s; }
        .err-btn-primary:hover { transform:translateY(-1px); }
        .err-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:13px 24px; background:white; color:#374151; border-radius:14px; font-family:inherit; font-size:14px; font-weight:700; border:1.5px solid rgba(0,0,0,0.1); cursor:pointer; text-decoration:none; transition:border-color .15s; }
        .err-btn-ghost:hover { border-color:#6366F1; color:#6366F1; }
        .err-digest { margin-top:20px; font-size:11px; color:#D1D5DB; font-family:monospace; }
      `}</style>

      <div className="err-page">
        <div className="err-bg">
          <div style={{ position:'absolute', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle,rgba(254,202,202,0.3),transparent 70%)', top:'-100px', left:'-100px' }}/>
          <div style={{ position:'absolute', width:'360px', height:'360px', borderRadius:'50%', background:'radial-gradient(circle,rgba(212,197,249,0.3),transparent 70%)', bottom:'-80px', right:'-80px' }}/>
        </div>

        <div className="err-card">
          <div className="err-logo">
            <div className="err-logo-icon">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <span className="err-logo-text">Khepria</span>
          </div>

          <span className="err-icon">⚡</span>
          <h1 className="err-title">Algo salió mal</h1>
          <p className="err-sub">
            Ocurrió un error inesperado. Puedes intentarlo de<br/>
            nuevo o volver al inicio.
          </p>

          <div className="err-actions">
            <button className="err-btn-primary" onClick={reset}>
              🔄 Intentar de nuevo
            </button>
            <a href="/" className="err-btn-ghost">
              🏠 Volver al inicio
            </a>
          </div>

          {error.digest && (
            <p className="err-digest">Error ID: {error.digest}</p>
          )}
        </div>
      </div>
    </>
  )
}
