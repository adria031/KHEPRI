'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const KEY = 'khepria_cookies_consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [config, setConfig] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [funcional, setFuncional] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(KEY, 'accepted')
    setVisible(false)
  }

  function reject() {
    localStorage.setItem(KEY, 'rejected')
    setVisible(false)
  }

  function saveConfig() {
    const val = analytics || funcional ? 'partial' : 'rejected'
    localStorage.setItem(KEY, val)
    localStorage.setItem('khepria_cookies_analytics', String(analytics))
    localStorage.setItem('khepria_cookies_funcional', String(funcional))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        .ck-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); z-index: 999; backdrop-filter: blur(2px); }
        .ck-banner {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
          background: white; border-top: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
          padding: 20px 32px; font-family: 'Plus Jakarta Sans', sans-serif;
          animation: ck-slide 0.3s ease;
        }
        @keyframes ck-slide { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .ck-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .ck-text { flex: 1; min-width: 260px; }
        .ck-title { font-size: 15px; font-weight: 800; color: #111827; margin-bottom: 4px; }
        .ck-desc { font-size: 13px; color: #4B5563; line-height: 1.5; }
        .ck-desc a { color: #4F46E5; text-decoration: none; }
        .ck-desc a:hover { text-decoration: underline; }
        .ck-btns { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .ck-btn-accept { padding: 10px 20px; background: #111827; color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .ck-btn-accept:hover { background: #1F2937; }
        .ck-btn-reject { padding: 10px 16px; background: transparent; color: #4B5563; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .ck-btn-reject:hover { background: #F3F4F6; }
        .ck-btn-config { padding: 10px 16px; background: transparent; color: #4F46E5; border: none; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: underline; white-space: nowrap; }

        /* Panel configurar */
        .ck-config { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.07); display: flex; flex-direction: column; gap: 10px; }
        .ck-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #F7F9FC; border-radius: 10px; gap: 16px; }
        .ck-toggle-info {}
        .ck-toggle-label { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px; }
        .ck-toggle-desc { font-size: 12px; color: #6B7280; }
        .ck-toggle { position: relative; width: 42px; height: 24px; flex-shrink: 0; }
        .ck-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .ck-slider { position: absolute; inset: 0; border-radius: 24px; background: #D1D5DB; cursor: pointer; transition: background 0.2s; }
        .ck-slider::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .ck-toggle input:checked + .ck-slider { background: #4F46E5; }
        .ck-toggle input:checked + .ck-slider::before { transform: translateX(18px); }
        .ck-toggle input:disabled + .ck-slider { background: #6EE7B7; cursor: not-allowed; opacity: 0.8; }
        .ck-config-btns { display: flex; gap: 8px; margin-top: 4px; justify-content: flex-end; }

        @media (max-width: 600px) {
          .ck-banner { padding: 16px; }
          .ck-row { gap: 14px; }
          .ck-btns { width: 100%; }
        }
      `}</style>

      {config && <div className="ck-overlay" onClick={() => setConfig(false)} />}

      <div className="ck-banner">
        <div className="ck-row">
          <div className="ck-text">
            <div className="ck-title">🍪 Usamos cookies</div>
            <div className="ck-desc">
              Khepria usa cookies para mantener tu sesión y mejorar tu experiencia.
              Consulta nuestra <Link href="/cookies">Política de Cookies</Link> y{' '}
              <Link href="/privacidad">Política de Privacidad</Link>.
            </div>
          </div>
          <div className="ck-btns">
            <button className="ck-btn-accept" onClick={accept}>Aceptar todo</button>
            <button className="ck-btn-reject" onClick={reject}>Rechazar</button>
            <button className="ck-btn-config" onClick={() => setConfig(v => !v)}>
              {config ? 'Cerrar ▲' : 'Configurar ▼'}
            </button>
          </div>
        </div>

        {config && (
          <div className="ck-config">
            <div className="ck-toggle-row">
              <div className="ck-toggle-info">
                <div className="ck-toggle-label">Cookies necesarias</div>
                <div className="ck-toggle-desc">Sesión y funcionamiento básico. No se pueden desactivar.</div>
              </div>
              <label className="ck-toggle">
                <input type="checkbox" checked disabled />
                <span className="ck-slider" />
              </label>
            </div>
            <div className="ck-toggle-row">
              <div className="ck-toggle-info">
                <div className="ck-toggle-label">Cookies analíticas</div>
                <div className="ck-toggle-desc">Nos ayudan a entender cómo se usa Khepria (datos agregados, sin identificar).</div>
              </div>
              <label className="ck-toggle">
                <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} />
                <span className="ck-slider" />
              </label>
            </div>
            <div className="ck-toggle-row">
              <div className="ck-toggle-info">
                <div className="ck-toggle-label">Cookies de funcionalidad</div>
                <div className="ck-toggle-desc">Recuerdan tus preferencias de interfaz entre sesiones.</div>
              </div>
              <label className="ck-toggle">
                <input type="checkbox" checked={funcional} onChange={e => setFuncional(e.target.checked)} />
                <span className="ck-slider" />
              </label>
            </div>
            <div className="ck-config-btns">
              <button className="ck-btn-reject" onClick={reject}>Rechazar todas</button>
              <button className="ck-btn-accept" onClick={saveConfig}>Guardar preferencias</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
