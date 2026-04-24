export default function OfflinePage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #F7F9FC;
          color: #111827;
        }
        html.dark, html.dark body { background: #0d0d0d; color: #f9fafb; }
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }
        .logo-wrap {
          width: 80px; height: 80px;
          border-radius: 24px;
          background: linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 28px;
          box-shadow: 0 8px 32px rgba(184,216,248,0.4);
        }
        .title {
          font-size: 26px; font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 10px;
          color: #111827;
        }
        html.dark .title { color: #f9fafb; }
        .sub {
          font-size: 15px; color: #6B7280;
          max-width: 340px; line-height: 1.7;
          margin-bottom: 36px;
        }
        html.dark .sub { color: #9CA3AF; }
        .card {
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          padding: 28px 32px;
          max-width: 400px; width: 100%;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        html.dark .card { background: #1a1a1a; border-color: rgba(255,255,255,0.08); }
        .tip { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; text-align: left; }
        .tip:last-child { margin-bottom: 0; }
        .tip-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 17px;
        }
        .tip-text { font-size: 13px; color: #4B5563; line-height: 1.6; }
        html.dark .tip-text { color: #9CA3AF; }
        .tip-title { font-weight: 700; font-size: 13px; color: #111827; margin-bottom: 2px; }
        html.dark .tip-title { color: #f9fafb; }
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px;
          background: #111827; color: white;
          border: none; border-radius: 14px;
          font-family: inherit; font-size: 15px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          transition: background 0.2s;
        }
        html.dark .btn { background: #f9fafb; color: #111827; }
        .btn:hover { background: #374151; }
        html.dark .btn:hover { background: #e5e7eb; }
        .wave {
          position: fixed; bottom: 0; left: 0; right: 0; height: 120px;
          background: linear-gradient(to top, rgba(184,216,248,0.15), transparent);
          pointer-events: none;
        }
        html.dark .wave { background: linear-gradient(to top, rgba(184,216,248,0.06), transparent); }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="page">
        <div className="logo-wrap">
          <svg width="42" height="42" viewBox="0 0 22 22" fill="none">
            <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
            <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
            <circle cx="11" cy="11" r="2" fill="white"/>
          </svg>
        </div>

        <div style={{ fontSize: '52px', marginBottom: '16px' }}>📡</div>
        <h1 className="title">Sin conexión</h1>
        <p className="sub">
          Parece que no tienes acceso a internet en este momento.<br />
          Algunas funciones de Khepria requieren conexión.
        </p>

        <div className="card">
          <div className="tip">
            <div className="tip-icon" style={{ background: 'rgba(184,216,248,0.25)' }}>📶</div>
            <div>
              <div className="tip-title">Comprueba tu red</div>
              <div className="tip-text">Verifica que tu WiFi o datos móviles estén activos.</div>
            </div>
          </div>
          <div className="tip">
            <div className="tip-icon" style={{ background: 'rgba(212,197,249,0.25)' }}>🔄</div>
            <div>
              <div className="tip-title">Vuelve a intentarlo</div>
              <div className="tip-text">Una vez recuperada la conexión, pulsa el botón de abajo.</div>
            </div>
          </div>
          <div className="tip">
            <div className="tip-icon" style={{ background: 'rgba(184,237,212,0.25)' }}>💾</div>
            <div>
              <div className="tip-title">Datos guardados</div>
              <div className="tip-text">Tus cambios se sincronizan automáticamente cuando vuelvas a estar online.</div>
            </div>
          </div>
        </div>

        <a href="/" className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Reintentar
        </a>
      </div>

      <div className="wave" />
    </>
  )
}
