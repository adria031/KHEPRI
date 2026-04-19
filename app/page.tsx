import Link from 'next/link'

function KhepriLogo({ white = false }: { white?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '11px',
        background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', color: white ? '#ffffff' : '#111827' }}>Khepria</span>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #FFFFFF;
          --bg2: #F7F9FC;
          --blue: #B8D8F8;
          --blue-dark: #1D4ED8;
          --blue-soft: rgba(184,216,248,0.25);
          --lila: #D4C5F9;
          --lila-dark: #6B4FD8;
          --lila-soft: rgba(212,197,249,0.25);
          --green: #B8EDD4;
          --green-dark: #2E8A5E;
          --green-soft: rgba(184,237,212,0.25);
          --yellow: #FDE9A2;
          --pink: #FBCFE8;
          --text: #111827;
          --text2: #4B5563;
          --muted: #9CA3AF;
          --border: rgba(0,0,0,0.09);
        }
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); overflow-x: hidden; line-height: 1.6; }

        /* ── NAV ── */
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 14px 48px; background: rgba(255,255,255,0.93); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); }
        .nav-links { display: flex; gap: 28px; align-items: center; }
        .nav-links a { color: var(--text2); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.15s; }
        .nav-links a:hover { color: var(--text); }
        .nav-login { color: var(--text2) !important; font-size: 14px; font-weight: 600; text-decoration: none; }
        .nav-cta { background: var(--text); color: white !important; padding: 9px 20px; border-radius: 100px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; transition: background 0.2s; white-space: nowrap; }
        .nav-cta:hover { background: #374151; }
        .nav-menu-btn { display: none; background: none; border: none; cursor: pointer; padding: 4px; }

        /* ── HERO ── */
        .hero { padding: 110px 48px 64px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; overflow: hidden; }
        .blob { position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none; z-index: 0; }
        .blob1 { width: 500px; height: 500px; background: rgba(184,216,248,0.32); top: -80px; left: -100px; }
        .blob2 { width: 400px; height: 400px; background: rgba(212,197,249,0.28); top: 10px; right: -80px; }
        .blob3 { width: 320px; height: 320px; background: rgba(184,237,212,0.22); bottom: -20px; left: 38%; }
        .hero-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; width: 100%; }
        .badge { display: inline-flex; align-items: center; gap: 7px; background: var(--blue-soft); border: 1px solid rgba(184,216,248,0.5); color: var(--blue-dark); padding: 5px 14px; border-radius: 100px; font-size: 12px; font-weight: 600; margin-bottom: 22px; }
        .badge-dot { width: 6px; height: 6px; background: var(--blue-dark); border-radius: 50%; flex-shrink: 0; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        h1 { font-size: clamp(36px, 6vw, 72px); font-weight: 800; line-height: 1.08; letter-spacing: -2px; max-width: 820px; margin-bottom: 20px; color: var(--text); }
        .tag { display: inline-block; padding: 2px 14px; border-radius: 100px; }
        .tag.blue { background: var(--blue); color: var(--blue-dark); }
        .tag.lila { background: var(--lila); color: var(--lila-dark); }
        .hero-sub { font-size: 17px; color: var(--text2); max-width: 500px; margin-bottom: 32px; font-weight: 400; line-height: 1.6; }
        .hero-actions { display: flex; gap: 12px; margin-bottom: 44px; flex-wrap: wrap; justify-content: center; }
        .btn-p { background: var(--text); color: #ffffff; padding: 14px 30px; border-radius: 100px; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-block; transition: background 0.2s; white-space: nowrap; }
        .btn-p:hover { background: #374151; }
        .btn-s { background: #ffffff; color: var(--blue-dark); border: 2px solid var(--blue-dark); padding: 14px 30px; border-radius: 100px; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-block; transition: all 0.2s; white-space: nowrap; }
        .btn-s:hover { background: var(--blue-soft); }

        /* ── STATS ── */
        .stats { display: flex; gap: 36px; margin-bottom: 44px; flex-wrap: wrap; justify-content: center; align-items: center; }
        .stat { text-align: center; }
        .stat-n { font-size: 24px; font-weight: 800; letter-spacing: -1px; color: var(--text); }
        .stat-l { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
        .stat-div { width: 1px; height: 36px; background: var(--border); }

        /* ── DASHBOARD MOCKUP ── */
        .mockup { width: 100%; max-width: 820px; background: white; border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,0.09); }
        .mock-bar { background: var(--bg2); padding: 10px 16px; display: flex; gap: 7px; align-items: center; border-bottom: 1px solid var(--border); }
        .md { width: 9px; height: 9px; border-radius: 50%; }
        .md.r{background:#FF5F57;} .md.y{background:#FEBC2E;} .md.g{background:#28C840;}
        .mock-body { display: grid; grid-template-columns: 160px 1fr; min-height: 240px; }
        .mock-side { background: var(--bg2); border-right: 1px solid var(--border); padding: 14px 10px; display: flex; flex-direction: column; gap: 3px; }
        .mni { padding: 7px 9px; border-radius: 8px; font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 7px; font-weight: 500; }
        .mni.a { background: var(--blue-soft); color: var(--blue-dark); font-weight: 700; }
        .mni-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.6; flex-shrink: 0; }
        .mock-main { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .mc-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .mc { border-radius: 10px; padding: 12px; border: 1px solid var(--border); }
        .mc.b{background:var(--blue-soft);} .mc.l{background:var(--lila-soft);} .mc.gn{background:var(--green-soft);}
        .mc-l { font-size: 9px; color: var(--text2); font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .mc-v { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
        .chart { background: var(--bg2); border-radius: 10px; padding: 12px; border: 1px solid var(--border); }
        .chart-l { font-size: 10px; color: var(--text2); font-weight: 600; margin-bottom: 8px; }
        .bars { display: flex; align-items: flex-end; gap: 5px; height: 56px; }
        .bar { flex: 1; border-radius: 3px 3px 0 0; }
        .bar.b{background:var(--blue);} .bar.l{background:var(--lila);} .bar.g{background:var(--green);} .bar.y{background:var(--yellow);}

        /* ── SECTIONS ── */
        .sec { padding: 72px 48px; }
        .sec-center { text-align: center; }
        .sec-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
        .sec-label.b { color: var(--blue-dark); }
        .sec-label.l { color: var(--lila-dark); }
        .sec-label.g { color: var(--green-dark); }
        .sec-title { font-size: clamp(26px, 3.5vw, 44px); font-weight: 800; line-height: 1.12; letter-spacing: -1px; margin-bottom: 40px; color: var(--text); }
        .sec-title.center { text-align: center; max-width: 560px; margin-left: auto; margin-right: auto; }

        /* ── FEATURES ── */
        .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .feat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; padding: 24px 20px; transition: all 0.25s; }
        .feat-card:hover { background: white; box-shadow: 0 8px 28px rgba(0,0,0,0.07); transform: translateY(-3px); }
        .feat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 12px; }
        .fi-b{background:var(--blue);} .fi-l{background:var(--lila);} .fi-g{background:var(--green);} .fi-y{background:var(--yellow);} .fi-pk{background:var(--pink);}
        .feat-t { font-size: 14px; font-weight: 700; margin-bottom: 6px; color: var(--text); }
        .feat-d { font-size: 13px; color: var(--text2); line-height: 1.6; }

        /* ── VIEWS (negocios / clientes) ── */
        .views-bg { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .views-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
        .vc { border-radius: 18px; overflow: hidden; border: 1px solid var(--border); background: white; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
        .vc-head { padding: 14px 18px; display: flex; align-items: center; gap: 10px; }
        .vc-head.b { background: var(--blue-soft); border-bottom: 1px solid rgba(184,216,248,0.4); }
        .vc-head.l { background: var(--lila-soft); border-bottom: 1px solid rgba(212,197,249,0.4); }
        .vbadge { padding: 4px 11px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .vbadge.b { background: var(--blue); color: var(--blue-dark); }
        .vbadge.l { background: var(--lila); color: var(--lila-dark); }
        .vc-sub { font-size: 12px; color: var(--text2); font-weight: 500; }
        .vc-body { padding: 4px 14px; }
        .vi { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 500; color: var(--text); }
        .vi:last-child { border-bottom: none; }
        .vi-ic { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .vi-ic.b{background:var(--blue-soft);} .vi-ic.l{background:var(--lila-soft);}

        /* ── MAP MOCK ── */
        .map { margin-top: 14px; border-radius: 18px; overflow: hidden; border: 1px solid var(--border); height: 260px; position: relative; background: #EDF2F8; }
        .map-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px); background-size: 32px 32px; }
        .road-h { position: absolute; left: 0; right: 0; height: 12px; background: white; opacity: 0.75; }
        .road-v { position: absolute; top: 0; bottom: 0; width: 12px; background: white; opacity: 0.75; }
        .pin { position: absolute; display: flex; flex-direction: column; align-items: center; }
        .pin-c { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.15); }
        .pc-b{background:var(--blue);} .pc-l{background:var(--lila);} .pc-g{background:var(--green);} .pc-y{background:var(--yellow);}
        .pin-label { margin-top: 4px; background: white; border: 1px solid var(--border); padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; white-space: nowrap; color: var(--text); }
        .map-search { position: absolute; top: 12px; left: 12px; right: 12px; background: white; border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; font-size: 12px; color: var(--text); font-weight: 500; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
        .map-chips { position: absolute; top: 54px; left: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
        .chip { background: white; border: 1px solid var(--border); padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; color: var(--text); }
        .chip.a { background: var(--blue); border-color: rgba(184,216,248,0.5); color: var(--blue-dark); }

        /* ── PLANES ── */
        .planes-bg { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .planes-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; max-width: 960px; margin: 0 auto; }
        .plan-card { background: white; border: 1.5px solid var(--border); border-radius: 22px; padding: 28px 24px; display: flex; flex-direction: column; gap: 6px; position: relative; transition: all 0.25s; }
        .plan-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.08); transform: translateY(-4px); }
        .plan-card.popular { border-color: var(--lila-dark); box-shadow: 0 8px 32px rgba(107,79,216,0.12); }
        .plan-popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--lila-dark); color: white; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 100px; white-space: nowrap; }
        .plan-icon { font-size: 28px; margin-bottom: 6px; }
        .plan-nombre { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
        .plan-desc { font-size: 13px; color: var(--muted); margin-bottom: 10px; line-height: 1.5; }
        .plan-precio { font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 100px; display: inline-block; margin-bottom: 16px; }
        .plan-precio.b { background: var(--blue-soft); color: var(--blue-dark); }
        .plan-precio.l { background: var(--lila-soft); color: var(--lila-dark); }
        .plan-precio.g { background: var(--green-soft); color: var(--green-dark); }
        .plan-feats { display: flex; flex-direction: column; gap: 9px; flex: 1; }
        .plan-feat { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text2); line-height: 1.4; }
        .plan-check { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; margin-top: 1px; }
        .plan-check.b { background: var(--blue); color: var(--blue-dark); }
        .plan-check.l { background: var(--lila); color: var(--lila-dark); }
        .plan-check.g { background: var(--green); color: var(--green-dark); }
        .plan-divider { height: 1px; background: var(--border); margin: 16px 0; }
        .btn-plan { display: block; text-align: center; padding: 12px; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; text-decoration: none; margin-top: 20px; transition: all 0.2s; }
        .btn-plan.b { background: var(--blue-soft); color: var(--blue-dark); }
        .btn-plan.b:hover { background: var(--blue); }
        .btn-plan.l { background: var(--lila-dark); color: white; }
        .btn-plan.l:hover { background: #5B3FC8; }
        .btn-plan.g { background: var(--green-soft); color: var(--green-dark); }
        .btn-plan.g:hover { background: var(--green); }

        /* ── CTA FINAL ── */
        .cta { text-align: center; padding: 80px 48px; background: var(--bg); }
        .cta h2 { font-size: clamp(28px, 4.5vw, 52px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin-bottom: 14px; color: var(--text); }
        .cta p { color: var(--text2); font-size: 16px; margin-bottom: 32px; max-width: 460px; margin-left: auto; margin-right: auto; }
        .cta-btns { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }

        /* ── FOOTER ── */
        footer { border-top: 1px solid var(--border); padding: 24px 48px; display: flex; align-items: center; justify-content: space-between; color: var(--text2); font-size: 13px; background: var(--bg2); flex-wrap: wrap; gap: 16px; }
        footer a { color: var(--text2); text-decoration: none; font-weight: 500; }
        footer a:hover { color: var(--text); }

        /* ── RESPONSIVE — TABLET ── */
        @media (max-width: 768px) {
          nav { padding: 14px 20px; }
          .nav-links { display: none; }
          .nav-menu-btn { display: block; }
          .hero { padding: 88px 20px 52px; }
          h1 { letter-spacing: -1px; }
          .hero-sub { font-size: 15px; }
          .hero-actions { flex-direction: column; width: 100%; }
          .btn-p, .btn-s { width: 100%; text-align: center; padding: 16px 20px; font-size: 16px; }
          .stats { gap: 20px; }
          .stat-div { display: none; }
          .mock-body { grid-template-columns: 1fr; }
          .mock-side { display: none; }
          .sec { padding: 52px 20px; }
          .feat-grid { grid-template-columns: repeat(2,1fr); gap: 12px; }
          .views-grid { grid-template-columns: 1fr; gap: 20px; }
          .planes-grid { grid-template-columns: 1fr; max-width: 440px; }
          .plan-card.popular { margin-top: 8px; }
          .cta { padding: 60px 20px; }
          .cta-btns { flex-direction: column; align-items: center; }
          .cta-btns .btn-p, .cta-btns .btn-s { width: 100%; max-width: 320px; }
          footer { padding: 20px; justify-content: center; text-align: center; flex-direction: column; gap: 12px; }
        }
        /* ── RESPONSIVE — MÓVIL ── */
        @media (max-width: 480px) {
          .feat-grid { grid-template-columns: 1fr; }
          .stats { justify-content: center; gap: 16px; }
          .stat-n { font-size: 20px; }
          .map { height: 200px; }
          .map-chips { display: none; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── NAV ── */}
      <nav>
        <Link href="/" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <div className="nav-links">
          <a href="#funciones">Funciones</a>
          <a href="#para-quien">Para quién</a>
          <a href="#planes">Planes</a>
          <Link href="/cliente" style={{color:'var(--text2)', textDecoration:'none', fontWeight:500, fontSize:'14px'}}>App clientes</Link>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <Link href="/auth?modo=login" className="nav-login">Iniciar sesión</Link>
          <Link href="/auth?modo=registro" className="nav-cta">Registrarse</Link>
          <button className="nav-menu-btn" aria-label="Menú">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
        <div className="hero-inner">
          <div className="badge"><span className="badge-dot" />Plataforma todo-en-uno para negocios de servicios</div>
          <h1>Tu negocio, <span className="tag blue">automatizado</span><br/>y <span className="tag lila">potenciado con IA</span></h1>
          <p className="hero-sub">Gestiona reservas, vende productos, automatiza la atención al cliente y aparece en el mapa de nuevos clientes.</p>
          <div className="hero-actions">
            <Link href="/auth?modo=registro" className="btn-p">Registrarse</Link>
            <Link href="/auth?modo=login" className="btn-s">Iniciar sesión →</Link>
          </div>
          <div className="stats">
            <div className="stat"><div className="stat-n">3M+</div><div className="stat-l">Autónomos en España</div></div>
            <div className="stat-div" />
            <div className="stat"><div className="stat-n">24/7</div><div className="stat-l">Chatbot IA activo</div></div>
            <div className="stat-div" />
            <div className="stat"><div className="stat-n">10+</div><div className="stat-l">Módulos incluidos</div></div>
          </div>

          {/* Dashboard mockup */}
          <div className="mockup">
            <div className="mock-bar">
              <div className="md r" /><div className="md y" /><div className="md g" />
            </div>
            <div className="mock-body">
              <div className="mock-side">
                <div className="mni a"><span className="mni-dot" />Dashboard</div>
                <div className="mni"><span className="mni-dot" />Reservas</div>
                <div className="mni"><span className="mni-dot" />Servicios</div>
                <div className="mni"><span className="mni-dot" />Equipo</div>
                <div className="mni"><span className="mni-dot" />Chatbot IA</div>
                <div className="mni"><span className="mni-dot" />Facturación</div>
                <div className="mni"><span className="mni-dot" />Marketing</div>
              </div>
              <div className="mock-main">
                <div className="mc-row">
                  <div className="mc b"><div className="mc-l">Ingresos</div><div className="mc-v">€1.240</div></div>
                  <div className="mc l"><div className="mc-l">Reservas</div><div className="mc-v">18</div></div>
                  <div className="mc gn"><div className="mc-l">Clientes</div><div className="mc-v">+6</div></div>
                </div>
                <div className="chart">
                  <div className="chart-l">Ingresos esta semana</div>
                  <div className="bars">
                    <div className="bar g" style={{height:'38%'}} />
                    <div className="bar l" style={{height:'55%'}} />
                    <div className="bar b" style={{height:'46%'}} />
                    <div className="bar b" style={{height:'82%'}} />
                    <div className="bar l" style={{height:'60%'}} />
                    <div className="bar b" style={{height:'94%'}} />
                    <div className="bar y" style={{height:'32%'}} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FUNCIONES ── */}
      <div className="sec" id="funciones">
        <div className="sec-label b">Todo lo que necesitas</div>
        <div className="sec-title">Una plataforma.<br/>Diez módulos.</div>
        <div className="feat-grid">
          <div className="feat-card">
            <div className="feat-icon fi-b">🤖</div>
            <div className="feat-t">Chatbot IA automático</div>
            <div className="feat-d">Se configura solo al registrarte. Atiende preguntas, hace reservas y gestiona cancelaciones las 24h.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon fi-l">📅</div>
            <div className="feat-t">Reservas inteligentes</div>
            <div className="feat-d">Calendario en tiempo real, confirmaciones automáticas y gestión de equipo y servicios.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon fi-g">🛍️</div>
            <div className="feat-t">Productos y e-commerce</div>
            <div className="feat-d">Gestiona tu catálogo de productos con stock, precios y ventas integradas en el negocio.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon fi-y">🧾</div>
            <div className="feat-t">Facturación española</div>
            <div className="feat-d">IVA agrupado por tipo, facturas numeradas y resumen orientativo para los modelos 303 y 130.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon fi-pk">👥</div>
            <div className="feat-t">Gestión de equipo</div>
            <div className="feat-d">Añade trabajadores, sube fotos, asigna servicios y gestiona la disponibilidad de cada uno.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon fi-l">📱</div>
            <div className="feat-t">Marketing y QR</div>
            <div className="feat-d">Genera códigos QR de tu negocio, descárgalos e imprímelos para atraer clientes directamente.</div>
          </div>
        </div>
      </div>

      {/* ── PARA NEGOCIOS Y CLIENTES ── */}
      <div className="sec views-bg" id="para-quien">
        <div className="sec-label l">Dos experiencias</div>
        <div className="sec-title">Para negocios<br/>y para clientes</div>
        <div className="views-grid">

          {/* Negocio */}
          <div>
            <div style={{marginBottom:'12px'}}>
              <div style={{fontSize:'14px', fontWeight:700, color:'var(--text)', marginBottom:'6px'}}>Para dueños y equipos</div>
              <div style={{fontSize:'13px', color:'var(--muted)', lineHeight:1.6}}>Un panel completo desde el que controlas todas las operaciones de tu negocio: reservas, equipo, facturación y marketing.</div>
            </div>
            <div className="vc">
              <div className="vc-head b"><span className="vbadge b">Panel Negocio</span><span className="vc-sub">Dashboard completo</span></div>
              <div className="vc-body">
                <div className="vi"><div className="vi-ic b">📊</div>Dashboard de ingresos y métricas en tiempo real</div>
                <div className="vi"><div className="vi-ic b">🤖</div>Chatbot IA configurado con la info de tu negocio</div>
                <div className="vi"><div className="vi-ic b">🧾</div>Facturación automática adaptada al mercado español</div>
                <div className="vi"><div className="vi-ic b">👥</div>Gestión de equipo, horarios y servicios</div>
                <div className="vi"><div className="vi-ic b">⏰</div>Horarios semanales y excepciones por día</div>
                <div className="vi"><div className="vi-ic b">📱</div>Código QR para tu negocio listo para imprimir</div>
              </div>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <div style={{marginBottom:'12px'}}>
              <div style={{fontSize:'14px', fontWeight:700, color:'var(--text)', marginBottom:'6px'}}>Para el cliente final</div>
              <div style={{fontSize:'13px', color:'var(--muted)', lineHeight:1.6}}>Una app ligera donde los clientes descubren negocios, reservan citas y guardan sus favoritos, todo desde el móvil.</div>
            </div>
            <div className="vc">
              <div className="vc-head l"><span className="vbadge l">App Cliente</span><span className="vc-sub">Experiencia móvil</span></div>
              <div className="vc-body">
                <div className="vi"><div className="vi-ic l">🗺️</div>Mapa interactivo con negocios cercanos</div>
                <div className="vi"><div className="vi-ic l">📅</div>Reservar citas con disponibilidad en tiempo real</div>
                <div className="vi"><div className="vi-ic l">🔍</div>Buscar por tipo de negocio o ciudad</div>
                <div className="vi"><div className="vi-ic l">❤️</div>Guardar negocios favoritos</div>
                <div className="vi"><div className="vi-ic l">💬</div>Chatbot IA del negocio integrado</div>
              </div>
            </div>
            <div className="map">
              <div className="map-grid" />
              <div className="road-h" style={{top:'45%'}} />
              <div className="road-h" style={{top:'72%'}} />
              <div className="road-v" style={{left:'30%'}} />
              <div className="road-v" style={{left:'65%'}} />
              <div className="map-search">🔍 Buscar peluquerías, spas, clínicas...</div>
              <div className="map-chips">
                <div className="chip a">Todos</div>
                <div className="chip">💈 Peluquería</div>
                <div className="chip">💆 Spa</div>
              </div>
              <div className="pin" style={{left:'36%',top:'44%'}}><div className="pin-c pc-b">💈</div><div className="pin-label">Barber Co.</div></div>
              <div className="pin" style={{left:'60%',top:'30%'}}><div className="pin-c pc-l">💆</div><div className="pin-label">Spa Zen</div></div>
              <div className="pin" style={{left:'22%',top:'58%'}}><div className="pin-c pc-g">💅</div><div className="pin-label">Nails Studio</div></div>
              <div className="pin" style={{left:'68%',top:'60%'}}><div className="pin-c pc-y">✂️</div><div className="pin-label">Style Room</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLANES ── */}
      <div className="sec planes-bg" id="planes">
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <div className="sec-label g">Planes</div>
          <div className="sec-title center">Elige el plan<br/>para tu negocio</div>
        </div>
        <div className="planes-grid">

          {/* BÁSICO */}
          <div className="plan-card">
            <div className="plan-icon">🌱</div>
            <div className="plan-nombre">Básico</div>
            <div className="plan-desc">Para autónomos y negocios pequeños que quieren digitalizarse.</div>
            <div className="plan-precio b">Precio — Próximamente</div>
            <div className="plan-divider" />
            <div className="plan-feats">
              {[
                'Panel de reservas y agenda',
                'Hasta 3 servicios',
                'Perfil público en el mapa',
                'Horarios y excepciones',
                'Gestión básica de equipo',
                'Código QR del negocio',
              ].map(f => (
                <div key={f} className="plan-feat">
                  <div className="plan-check b">✓</div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth?modo=registro" className="btn-plan b">Registrarse</Link>
          </div>

          {/* PRO */}
          <div className="plan-card popular">
            <div className="plan-popular-badge">Más popular</div>
            <div className="plan-icon">🚀</div>
            <div className="plan-nombre">Pro</div>
            <div className="plan-desc">Para negocios en crecimiento que quieren automatizar y escalar.</div>
            <div className="plan-precio l">Precio — Próximamente</div>
            <div className="plan-divider" />
            <div className="plan-feats">
              {[
                'Todo lo del plan Básico',
                'Servicios y productos ilimitados',
                'Chatbot IA personalizado',
                'Facturación con IVA e IRPF',
                'Reseñas y respuestas públicas',
                'Marketing y estadísticas',
                'Soporte prioritario',
              ].map(f => (
                <div key={f} className="plan-feat">
                  <div className="plan-check l">✓</div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth?modo=registro" className="btn-plan l">Registrarse</Link>
          </div>

          {/* AGENCIA */}
          <div className="plan-card">
            <div className="plan-icon">🏢</div>
            <div className="plan-nombre">Agencia</div>
            <div className="plan-desc">Para franquicias, grupos y agencias que gestionan múltiples negocios.</div>
            <div className="plan-precio g">Precio — Próximamente</div>
            <div className="plan-divider" />
            <div className="plan-feats">
              {[
                'Todo lo del plan Pro',
                'Múltiples negocios en una cuenta',
                'Panel de control unificado',
                'Marca blanca disponible',
                'API de integración',
                'Gestor de cuenta dedicado',
                'SLA y soporte 24/7',
              ].map(f => (
                <div key={f} className="plan-feat">
                  <div className="plan-check g">✓</div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/auth?modo=registro" className="btn-plan g">Registrarse</Link>
          </div>

        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div className="cta">
        <h2>¿Listo para transformar<br/><span className="tag blue">tu negocio?</span></h2>
        <p>Únete a los primeros negocios en España que gestionan todo desde un solo lugar.</p>
        <div className="cta-btns">
          <Link href="/auth?modo=registro" className="btn-p">Registrarse</Link>
          <Link href="/auth?modo=login" className="btn-s">Iniciar sesión →</Link>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer>
        <Link href="/" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <div>© 2025 Khepria · Hecho en España 🇪🇸</div>
        <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/aviso-legal">Aviso Legal</Link>
          <a href="mailto:khepriacontact@gmail.com">Contacto</a>
        </div>
      </footer>
    </>
  )
}
