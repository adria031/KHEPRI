'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('pwa-banner-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !prompt) return null

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') dismiss()
  }

  function dismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setVisible(false)
  }

  return (
    <>
      <style>{`
        .pwa-banner {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
          background: #fff; border-top: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
          padding: 14px 20px; display: flex; align-items: center; gap: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          animation: pwaSlideUp 0.3s ease;
        }
        @keyframes pwaSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        html.dark .pwa-banner {
          background: #1a1a2e; border-top-color: rgba(255,255,255,0.08);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.35);
        }
        .pwa-banner-icon { font-size: 1.6rem; flex-shrink: 0; }
        .pwa-banner-text { flex: 1; }
        .pwa-banner-title {
          font-size: 14px; font-weight: 700; color: #111827; line-height: 1.3;
        }
        html.dark .pwa-banner-title { color: #F7F9FC; }
        .pwa-banner-sub {
          font-size: 12px; color: #6B7280; margin-top: 2px;
        }
        html.dark .pwa-banner-sub { color: #9CA3AF; }
        .pwa-banner-install {
          flex-shrink: 0; padding: 9px 18px; border-radius: 999px; border: none;
          background: linear-gradient(135deg, #7C3AED, #4F46E5);
          color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pwa-banner-install:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.4); }
        .pwa-banner-dismiss {
          flex-shrink: 0; padding: 9px 14px; border-radius: 999px;
          border: 1.5px solid #E5E7EB; background: transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 600; color: #6B7280; cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        html.dark .pwa-banner-dismiss { border-color: rgba(255,255,255,0.15); color: #9CA3AF; }
        .pwa-banner-dismiss:hover { border-color: #D4C5F9; color: #7C3AED; }
        @media (min-width: 768px) { .pwa-banner { display: none; } }
      `}</style>
      <div className="pwa-banner" role="banner">
        <span className="pwa-banner-icon">📱</span>
        <div className="pwa-banner-text">
          <div className="pwa-banner-title">Instala Khepria en tu móvil</div>
          <div className="pwa-banner-sub">Acceso rápido desde la pantalla de inicio</div>
        </div>
        <button className="pwa-banner-install" onClick={install}>Instalar</button>
        <button className="pwa-banner-dismiss" onClick={dismiss}>No gracias</button>
      </div>
    </>
  )
}
