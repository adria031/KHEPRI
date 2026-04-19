'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
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

function ResetForm() {
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const token_hash = searchParams?.get('token_hash')
    const type = searchParams?.get('type')

    if (!token_hash || type !== 'recovery') {
      setError('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.')
      setVerificando(false)
      return
    }

    // Verificar el token y establecer la sesión
    supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
      if (error) setError('El enlace ha expirado o ya fue usado. Solicita uno nuevo.')
      setVerificando(false)
    })
  }, [searchParams])

  async function handleReset() {
    if (!password) { setError('Introduce una nueva contraseña.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return }

    setCargando(true); setError('')
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) { setError(updateErr.message); setCargando(false); return }

    setListo(true)

    // Redirigir según tipo de usuario
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', session.user.id).single()
      setTimeout(() => {
        window.location.href = profile?.tipo === 'negocio' ? '/dashboard' : '/cliente'
      }, 2000)
    }
    setCargando(false)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; color: #111827; }
        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { background: white; border-radius: 24px; padding: 40px; width: 100%; max-width: 420px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        h1 { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 8px; }
        .sub { font-size: 14px; color: #4B5563; margin-bottom: 28px; }
        .field { margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        input { width: 100%; padding: 13px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 16px; color: #111827; outline: none; background: white; -webkit-appearance: none; }
        input:focus { border-color: #1D4ED8; }
        .btn { width: 100%; padding: 15px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .btn:disabled { background: #9CA3AF; cursor: not-allowed; }
        .err { margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; background: rgba(251,207,232,0.3); color: #B5467A; }
        .ok  { margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; background: rgba(184,237,212,0.3); color: #2E8A5E; }
        .back { text-align: center; margin-top: 18px; font-size: 14px; color: #6B7280; }
        .back a { color: #1D4ED8; font-weight: 600; text-decoration: none; }
        @media (max-width: 480px) { .card { padding: 28px 20px; } }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div className="page">
        <div className="card">
          <div style={{ marginBottom: '28px' }}><KhepriLogo /></div>

          {verificando ? (
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Verificando enlace...</p>
          ) : listo ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h1>Contraseña actualizada</h1>
                <p className="sub">Redirigiendo a tu cuenta...</p>
              </div>
            </>
          ) : error && !password ? (
            <>
              <h1>Enlace no válido</h1>
              <div className="err">{error}</div>
              <p className="back" style={{ marginTop: '18px' }}>
                <a href="/auth">← Solicitar nuevo enlace</a>
              </p>
            </>
          ) : (
            <>
              <h1>Nueva contraseña</h1>
              <p className="sub">Elige una contraseña segura para tu cuenta.</p>

              <div className="field">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                />
              </div>
              <div className="field">
                <label>Confirmar contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                />
              </div>

              <button className="btn" onClick={handleReset} disabled={cargando}>
                {cargando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>

              {error && <div className="err">{error}</div>}

              <p className="back">
                <a href="/auth">← Volver al inicio de sesión</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  )
}
