'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

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

function AuthForm() {
  const searchParams = useSearchParams()
  const modoInicial = searchParams?.get('modo') === 'login' ? 'login' : 'registro'
  const [modo, setModo] = useState<'login' | 'registro'>(modoInicial)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)

  // Sign out any existing session so a second user can register/login cleanly
  // without inheriting the previous user's cached auth state
  async function ensureSignedOut() {
    await supabase.auth.signOut({ scope: 'local' })
  }

  async function handleSubmit() {
    if (!email || !password) { setMensaje('Por favor rellena todos los campos.'); setEsError(true); return }
    setCargando(true); setMensaje(''); setEsError(false)
    await ensureSignedOut()

    if (modo === 'registro') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nombre } } })
      if (error) {
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists') || error.message.toLowerCase().includes('user already')) {
          setMensaje('Este email ya está registrado. Redirigiendo...'); setEsError(true)
          setTimeout(() => { setModo('login'); setMensaje(''); setEsError(false) }, 2500)
        } else { setMensaje(error.message); setEsError(true) }
      } else {
        window.location.href = window.location.origin + '/onboarding'
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMensaje('Email o contraseña incorrectos.'); setEsError(true) }
      else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', session.user.id).single()
          if (profile?.tipo === 'negocio') window.location.href = window.location.origin + '/dashboard'
          else if (profile?.tipo === 'cliente') window.location.href = window.location.origin + '/cliente'
          else window.location.href = window.location.origin + '/onboarding'
        }
      }
    }
    setCargando(false)
  }

  async function handleGoogle() {
    await ensureSignedOut()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: false, queryParams: { access_type: 'offline', prompt: 'consent' } }
    })
    if (!error && data?.url) window.location.href = data.url
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
        .tabs { display: flex; background: #F7F9FC; border-radius: 12px; padding: 4px; margin-bottom: 24px; gap: 4px; }
        .tab { flex: 1; padding: 9px; border-radius: 9px; border: none; background: transparent; font-family: inherit; font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; }
        .tab.active { background: white; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .field { margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        input { width: 100%; padding: 13px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 16px; color: #111827; outline: none; background: white; -webkit-appearance: none; }
        input:focus { border-color: #1D4ED8; }
        .btn { width: 100%; padding: 15px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; }
        .btn:disabled { background: #9CA3AF; cursor: not-allowed; }
        .mensaje { margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; text-align: center; }
        .mensaje.ok { background: rgba(184,237,212,0.3); color: #2E8A5E; }
        .mensaje.err { background: rgba(251,207,232,0.3); color: #B5467A; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: #9CA3AF; font-size: 13px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.08); }
        .btn-google { width: 100%; padding: 13px; background: white; color: #111827; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
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

          <h1>{modo === 'registro' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
          <p className="sub">{modo === 'registro' ? 'Crea tu cuenta y empieza a gestionar tu negocio.' : 'Accede a tu panel de gestión.'}</p>

          <div className="tabs">
            <button className={`tab ${modo === 'registro' ? 'active' : ''}`} onClick={() => { setModo('registro'); setMensaje('') }}>Registro</button>
            <button className={`tab ${modo === 'login' ? 'active' : ''}`} onClick={() => { setModo('login'); setMensaje('') }}>Iniciar sesión</button>
          </div>

          {modo === 'registro' && (
            <div className="field">
              <label>Tu nombre</label>
              <input type="text" placeholder="María García" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button className="btn" onClick={handleSubmit} disabled={cargando}>
            {cargando ? 'Cargando...' : modo === 'registro' ? 'Crear cuenta' : 'Entrar'}
          </button>

          {mensaje && <div className={`mensaje ${esError ? 'err' : 'ok'}`}>{mensaje}</div>}

          <div className="divider">o</div>

          <button className="btn-google" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="footer-link">
            {modo === 'registro' ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <a href="#" onClick={e => { e.preventDefault(); setModo(modo === 'registro' ? 'login' : 'registro'); setMensaje('') }}>
              {modo === 'registro' ? 'Inicia sesión' : 'Regístrate'}
            </a>
          </p>
        </div>
      </div>
    </>
  )
}

export default function Auth() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  )
}