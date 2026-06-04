'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Suspense } from 'react'

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
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

function TrabajadorOnboardingInner() {
  const params    = useSearchParams()
  const router    = useRouter()

  const negocioId = params.get('negocio_id') ?? ''
  const email     = params.get('email') ?? ''
  const nombre    = decodeURIComponent(params.get('nombre') ?? '')

  const [nombreNegocio, setNombreNegocio] = useState<string | null>(null)
  const [formNombre, setFormNombre]       = useState(nombre)
  const [password, setPassword]           = useState('')
  const [confirmPass, setConfirmPass]     = useState('')
  const [enviando, setEnviando]           = useState(false)
  const [error, setError]                 = useState('')
  const [paso, setPaso]                   = useState<'form' | 'exito' | 'email-pendiente'>('form')
  const [yaRegistrado, setYaRegistrado]   = useState(false)

  // Load negocio name
  useEffect(() => {
    if (!negocioId) return
    supabase.from('negocios').select('nombre').eq('id', negocioId).single()
      .then(({ data }) => setNombreNegocio(data?.nombre ?? null))
  }, [negocioId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formNombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirmPass) { setError('Las contraseñas no coinciden.'); return }
    if (!email) { setError('Email no encontrado en el enlace. Usa el link del email de invitación.'); return }

    setEnviando(true)
    try {
      // 1. Crear cuenta — emailRedirectTo lleva rol+negocio para que el callback
      //    pueda crear el perfil server-side si hay confirmación de email pendiente
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?rol=empleado&negocio=${encodeURIComponent(negocioId)}`,
          data: { nombre: formNombre.trim() },
        },
      })
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already registered') || msg.includes('email address is already')) {
          setYaRegistrado(true)
          setEnviando(false)
          return
        }
        setError(signUpErr.message)
        setEnviando(false); return
      }

      const userId = authData?.user?.id
      if (!userId) { setError('Error al obtener el usuario. Inténtalo de nuevo.'); setEnviando(false); return }

      if (authData.session) {
        // Confirmación de email desactivada — sesión inmediata, podemos escribir
        // 2. Crear perfil de empleado
        await supabase.from('profiles').upsert(
          { id: userId, tipo: 'empleado', nombre: formNombre.trim(), email },
          { onConflict: 'id' }
        )
        // 3. Confirmar email en el registro del trabajador
        if (negocioId) {
          await supabase.from('trabajadores')
            .update({ email })
            .eq('negocio_id', negocioId)
            .eq('nombre', nombre)
        }
        setPaso('exito')
        setTimeout(() => router.push('/empleado'), 2000)
      } else {
        // Confirmación de email activada — el callback creará el perfil al confirmar
        setPaso('email-pendiente')
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error inesperado')
      setEnviando(false)
    }
  }

  if (yaRegistrado) {
    return (
      <>
        <style>{`
          *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
          html, body { background:#F7F9FC !important; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#111827; }
        `}</style>
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F9FC', padding:'24px' }}>
          <div style={{ background:'#fff', borderRadius:'20px', boxShadow:'0 2px 24px rgba(0,0,0,0.08)', overflow:'hidden', width:'100%', maxWidth:'420px', textAlign:'center' }}>
            <div style={{ background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', padding:'32px 36px' }}>
              <KhepriLogo />
              <div style={{ fontSize:'40px', margin:'16px 0 10px' }}>✅</div>
              <div style={{ fontSize:'20px', fontWeight:800, color:'#1E3A5F', letterSpacing:'-0.3px' }}>Ya tienes cuenta</div>
              {nombreNegocio && (
                <div style={{ fontSize:'14px', color:'rgba(30,58,95,0.7)', marginTop:'6px' }}>
                  <strong style={{ color:'#1E3A5F' }}>{nombreNegocio}</strong> te ha invitado a su equipo
                </div>
              )}
            </div>
            <div style={{ padding:'28px 32px' }}>
              <p style={{ fontSize:'14px', color:'#4B5563', lineHeight:1.65, marginBottom:'24px' }}>
                El email <strong style={{ color:'#111827' }}>{email}</strong> ya tiene una cuenta en Khepria.<br/>
                Inicia sesión para acceder a tu agenda.
              </p>
              <a href="/auth" style={{ display:'block', width:'100%', padding:'13px', borderRadius:'12px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'white', fontWeight:700, fontSize:'15px', textDecoration:'none', textAlign:'center' }}>
                Iniciar sesión →
              </a>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!negocioId || !email) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>Enlace inválido</div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>Usa el enlace del email de invitación.</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#F7F9FC !important; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#111827; }
        .tw-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
        .tw-card { background:#fff; border-radius:20px; box-shadow:0 2px 24px rgba(0,0,0,0.08); overflow:hidden; width:100%; max-width:440px; }
        .tw-header { background:linear-gradient(135deg,#B8D8F8,#D4C5F9); padding:32px 36px; text-align:center; }
        .tw-body { padding:32px 36px; }
        .tw-title { font-size:22px; font-weight:800; color:#1E3A5F; letter-spacing:-0.3px; margin:16px 0 6px; }
        .tw-subtitle { font-size:14px; color:rgba(30,58,95,0.7); }
        .tw-label { display:block; font-size:12px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.3px; margin-bottom:5px; }
        .tw-input { width:100%; padding:10px 14px; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:14px; font-family:inherit; outline:none; transition:border .15s; }
        .tw-input:focus { border-color:#4F46E5; }
        .tw-group { margin-bottom:16px; }
        .tw-btn { width:100%; padding:13px; border-radius:12px; border:none; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:#fff; transition:opacity .15s; }
        .tw-btn:disabled { opacity:0.55; cursor:not-allowed; }
        .tw-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:10px 14px; font-size:13px; color:#B91C1C; margin-bottom:16px; }
        .tw-hint { font-size:12px; color:#9CA3AF; margin-top:4px; }
      `}</style>

      <div className="tw-page">
        <div className="tw-card">
          <div className="tw-header">
            <KhepriLogo />
            {paso === 'form' ? (
              <>
                <div style={{ fontSize: '36px', margin: '16px 0 10px' }}>👋</div>
                <div className="tw-title">¡Bienvenido al equipo!</div>
                <div className="tw-subtitle">
                  {nombreNegocio
                    ? <><strong style={{ color: '#1E3A5F' }}>{nombreNegocio}</strong> te ha invitado a unirte</>
                    : 'Te han invitado a unirte a su equipo'}
                </div>
              </>
            ) : paso === 'email-pendiente' ? (
              <>
                <div style={{ fontSize: '36px', margin: '16px 0 10px' }}>📧</div>
                <div className="tw-title">Revisa tu email</div>
                <div className="tw-subtitle">Te hemos enviado un enlace de confirmación a <strong style={{ color: '#1E3A5F' }}>{email}</strong></div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '36px', margin: '16px 0 10px' }}>🎉</div>
                <div className="tw-title">¡Cuenta creada!</div>
                <div className="tw-subtitle">Redirigiendo a tu panel…</div>
              </>
            )}
          </div>

          {paso === 'form' && (
            <div className="tw-body">
              <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6, marginBottom: '24px' }}>
                Hola <strong style={{ color: '#111827' }}>{nombre || 'trabajador'}</strong>, crea tu contraseña para acceder a tu agenda y gestionar tus citas.
              </p>

              {error && <div className="tw-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="tw-group">
                  <label className="tw-label">Email</label>
                  <input className="tw-input" value={email} disabled style={{ background: '#F9FAFB', color: '#6B7280' }} />
                </div>
                <div className="tw-group">
                  <label className="tw-label">Tu nombre *</label>
                  <input className="tw-input" value={formNombre}
                    onChange={e => setFormNombre(e.target.value)} placeholder="Tu nombre completo" />
                </div>
                <div className="tw-group">
                  <label className="tw-label">Contraseña *</label>
                  <input className="tw-input" type="password" value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="tw-group">
                  <label className="tw-label">Confirmar contraseña *</label>
                  <input className="tw-input" type="password" value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)} placeholder="Repite la contraseña" />
                </div>

                <button className="tw-btn" type="submit" disabled={enviando} style={{ marginTop: '8px' }}>
                  {enviando ? 'Creando cuenta…' : 'Crear mi cuenta →'}
                </button>

                <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', marginTop: '16px', lineHeight: 1.6 }}>
                  Al continuar aceptas los <a href="/legal/terminos" style={{ color: '#6B7280' }}>Términos de uso</a> de Khepria.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function TrabajadorOnboarding() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC', fontSize: '14px', color: '#9CA3AF' }}>
        Cargando…
      </div>
    }>
      <TrabajadorOnboardingInner />
    </Suspense>
  )
}
