import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Syne:wght@700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#F8FAFC; font-family:'Plus Jakarta Sans',sans-serif; color:#111827; min-height:100vh; }
        .nf-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; position:relative; overflow:hidden; }
        .nf-bg { position:absolute; inset:0; pointer-events:none; }
        .nf-card { position:relative; z-index:1; text-align:center; max-width:440px; width:100%; }
        .nf-logo { display:inline-flex; align-items:center; gap:10px; margin-bottom:40px; }
        .nf-logo-icon { width:38px; height:38px; border-radius:11px; background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4); display:flex; align-items:center; justify-content:center; }
        .nf-logo-text { font-weight:800; font-size:18px; letter-spacing:-0.5px; color:#111827; }
        .nf-code { font-family:'Syne',sans-serif; font-size:96px; font-weight:800; color:transparent; background:linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4); -webkit-background-clip:text; background-clip:text; line-height:1; letter-spacing:-4px; margin-bottom:16px; }
        .nf-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:#111827; letter-spacing:-0.5px; margin-bottom:10px; }
        .nf-sub { font-size:15px; color:#6B7280; line-height:1.65; margin-bottom:32px; }
        .nf-btn { display:inline-flex; align-items:center; gap:8px; padding:13px 28px; background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border-radius:14px; font-family:inherit; font-size:15px; font-weight:700; text-decoration:none; box-shadow:0 4px 16px rgba(99,102,241,0.3); transition:transform .15s,box-shadow .15s; }
        .nf-btn:hover { transform:translateY(-1px); box-shadow:0 6px 22px rgba(99,102,241,0.4); }
        .nf-link { display:block; margin-top:16px; font-size:13px; color:#9CA3AF; text-decoration:none; }
        .nf-link:hover { color:#6366F1; }
      `}</style>

      <div className="nf-page">
        {/* Background circles */}
        <div className="nf-bg">
          <div style={{ position:'absolute', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle,rgba(184,216,248,0.3),transparent 70%)', top:'-100px', left:'-100px' }}/>
          <div style={{ position:'absolute', width:'360px', height:'360px', borderRadius:'50%', background:'radial-gradient(circle,rgba(212,197,249,0.3),transparent 70%)', bottom:'-80px', right:'-80px' }}/>
          <div style={{ position:'absolute', width:'280px', height:'280px', borderRadius:'50%', background:'radial-gradient(circle,rgba(184,237,212,0.25),transparent 70%)', top:'30%', right:'10%' }}/>
        </div>

        <div className="nf-card">
          {/* Logo */}
          <div className="nf-logo">
            <div className="nf-logo-icon">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
                <circle cx="11" cy="11" r="2" fill="white"/>
              </svg>
            </div>
            <span className="nf-logo-text">Khepria</span>
          </div>

          <div className="nf-code">404</div>
          <h1 className="nf-title">Esta página no existe</h1>
          <p className="nf-sub">
            El enlace que seguiste puede estar roto o la página<br/>
            puede haber sido eliminada o movida.
          </p>

          <Link href="/" className="nf-btn">
            🏠 Volver al inicio
          </Link>
          <Link href="/cliente" className="nf-link">
            O busca negocios en Khepria →
          </Link>
        </div>
      </div>
    </>
  )
}
