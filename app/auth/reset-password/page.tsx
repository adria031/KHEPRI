'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)
  const [listo, setListo] = useState(false)
  const [sesionOk, setSesionOk] = useState(false)

  useEffect(() => {
    // El callback ya intercambió el código y estableció la sesión.
    // Comprobamos sesión activa; también escuchamos PASSWORD_RECOVERY para el flujo hash.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSesionOk(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSesionOk(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    if (!password) { setMensaje('Introduce una nueva contraseña.'); setEsError(true); return }
    if (password.length < 8) { setMensaje('La contraseña debe tener al menos 8 caracteres.'); setEsError(true); return }
    if (password !== confirmar) { setMensaje('Las contraseñas no coinciden.'); setEsError(true); return }
    setCargando(true); setMensaje(''); setEsError(false)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setMensaje(error.message); setEsError(true) }
    else { setListo(true) }
    setCargando(false)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; color: #111827; }
        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #F7F9FC; }
        .card { background: white; border-radius: 24px; padding: 40px; width: 100%; max-width: 420px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        h1 { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 6px; }
        .sub { font-size: 14px; color: #4B5563; margin-bottom: 24px; }
        .field { margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        input { width: 100%; padding: 13px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 16px; color: #111827; outline: none; background: white; -webkit-appearance: none; }
        input:focus { border-color: #1D4ED8; }
        .btn { width: 100%; padding: 15px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .btn:disabled { background: #9CA3AF; cursor: not-allowed; }
        .mensaje { margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; text-align: center; }
        .mensaje.ok { background: rgba(184,237,212,0.3); color: #2E8A5E; }
        .mensaje.err { background: rgba(251,207,232,0.3); color: #B5467A; }
        .footer-link { text-align: center; margin-top: 18px; font-size: 14px; color: #6B7280; }
        .footer-link a { color: #1D4ED8; font-weight: 600; text-decoration: none; }
        @media (max-width: 480px) {
          .page { padding: 16px; align-items: flex-start; padding-top: 32px; }
          .card { padding: 28px 20px; border-radius: 20px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="page">
        <div className="card">
          <div style={{marginBottom:'28px'}}>
            <Link href="/" style={{textDecoration:'none'}}><KhepriLogo /></Link>
          </div>

          {listo ? (
            <>
              <div style={{textAlign:'center', marginBottom:'20px'}}>
                <div style={{fontSize:'48px', marginBottom:'12px'}}>✅</div>
                <h1 style={{marginBottom:'8px'}}>Contraseña actualizada</h1>
                <p className="sub">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              </div>
              <Link href="/auth?modo=login" className="btn" style={{display:'block', textAlign:'center', textDecoration:'none'}}>
                Ir al inicio de sesión
              </Link>
            </>
          ) : !sesionOk ? (
            <>
              <div style={{textAlign:'center', marginBottom:'20px'}}>
                <div style={{fontSize:'48px', marginBottom:'12px'}}>⏳</div>
                <h1 style={{marginBottom:'8px'}}>Verificando enlace...</h1>
                <p className="sub">Estamos comprobando tu enlace de recuperación.</p>
              </div>
              <p className="footer-link">
                <Link href="/auth?modo=login" style={{color:'#1D4ED8', fontWeight:600, textDecoration:'none'}}>← Volver al inicio de sesión</Link>
              </p>
            </>
          ) : (
            <>
              <h1>Nueva contraseña</h1>
              <p className="sub">Elige una contraseña segura para tu cuenta.</p>

              <div className="field">
                <label>Nueva contraseña</label>
                <input type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="field">
                <label>Confirmar contraseña</label>
                <input type="password" placeholder="Repite la contraseña" value={confirmar} onChange={e => setConfirmar(e.target.value)} />
              </div>

              <button className="btn" onClick={handleReset} disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>

              {mensaje && <div className={`mensaje ${esError ? 'err' : 'ok'}`}>{mensaje}</div>}

              <p className="footer-link">
                <a href="/auth?modo=login">← Volver al inicio de sesión</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
