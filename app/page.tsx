'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', color: '#B8D8F8', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento. Confirmaciones y recordatorios automáticos sin que muevas un dedo.' },
  { icon: '🤖', color: '#D4C5F9', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde consultas, reserva citas y cancela automáticamente sin intervención humana, a cualquier hora.' },
  { icon: '🧾', color: '#B8EDD4', title: 'Facturación e IVA automático', desc: 'Facturas con IVA, modelos 303, 130 y 111. Compatible con la normativa fiscal española vigente.' },
  { icon: '📊', color: '#FDE9A2', title: 'Analytics con IA', desc: 'Predicciones de ingresos, análisis de clientes y recomendaciones accionables para crecer cada mes.' },
  { icon: '📸', color: '#FBCFE8', title: 'Marketing con IA', desc: 'Posts automáticos para redes sociales, estrategias de captación y calendario editorial generados con IA.' },
  { icon: '👥', color: '#B8D8F8', title: 'Gestión de equipo y nóminas', desc: 'Gestiona empleados, turnos, nóminas y contratos SEPE desde el panel de control.' },
  { icon: '💰', color: '#B8EDD4', title: 'Caja diaria', desc: 'Control de ingresos y gastos en tiempo real. Cierre automático con resumen del día.' },
  { icon: '⭐', color: '#FDE9A2', title: 'Reseñas post-cita automáticas', desc: 'Solicita reseñas al finalizar cada visita. Mejora tu reputación sin esfuerzo extra.' },
  { icon: '🗺️', color: '#D4C5F9', title: 'Mapa para clientes', desc: 'Aparece en el mapa de Khepria y atrae nuevos clientes de tu zona de forma orgánica.' },
  { icon: '🏷️', color: '#FBCFE8', title: 'Descuentos inteligentes', desc: 'Crea ofertas dinámicas para maximizar la ocupación en horas y días con poca demanda.' },
  { icon: '📲', color: '#B8EDD4', title: 'Importador desde otras apps', desc: 'Migra clientes, citas y servicios desde Booksy, Fresha, Treatwell y más en minutos.' },
  { icon: '🎁', color: '#FDE9A2', title: 'Fidelización con puntos', desc: 'Premia a clientes habituales con puntos canjeables por descuentos. Retención automática.' },
]

const PROBLEMAS = [
  {
    icon: '📞',
    title: 'Tu teléfono no para de sonar',
    desc: 'Clientes que quieren reservar, cambiar o cancelar. Interrupciones constantes que te impiden concentrarte en tu trabajo.',
    sol: 'Reservas online 24/7 sin que muevas un dedo',
  },
  {
    icon: '🌙',
    title: 'Pierdes clientes fuera de horario',
    desc: 'Cuando cierras, las consultas quedan sin respuesta. Esos clientes que escriben a las 11 de la noche van a la competencia.',
    sol: 'Chatbot IA que responde y reserva a cualquier hora',
  },
  {
    icon: '📋',
    title: 'Horas perdidas con contabilidad',
    desc: 'Facturas, IVA, modelos fiscales... tiempo que podrías dedicar a tus clientes o simplemente a descansar.',
    sol: 'Facturación e IVA 100% automático',
  },
]

const NUMEROS = [
  { num: '3h', label: 'ahorradas al día', color: '#B8D8F8', icon: '⏱️' },
  { num: '+30%', label: 'más reservas', color: '#D4C5F9', icon: '📈' },
  { num: '24/7', label: 'atención automática', color: '#B8EDD4', icon: '🤖' },
  { num: '0€', label: 'en gestores de IVA', color: '#FDE9A2', icon: '💰' },
]

const QUIENES = [
  { icon: '💈', name: 'Peluquerías y barberías' },
  { icon: '💅', name: 'Centros de uñas y estética' },
  { icon: '💆', name: 'Spas y masajes' },
  { icon: '🏥', name: 'Clínicas y consultas' },
  { icon: '🧘', name: 'Yoga y pilates' },
  { icon: '🏋️', name: 'Gimnasios y entrenadores' },
]

const PLANES = [
  {
    nombre: 'Starter', precio: '9,99', emoji: '🌱', badge: 'Para empezar', popular: false,
    color: '#B8EDD4', colorDark: '#2E8A5E',
    funciones: ['Reservas online 24/7', 'Ficha pública en mapa', 'Chatbot básico', 'Recordatorios automáticos', 'Reseñas post-cita', 'Estadísticas básicas'],
  },
  {
    nombre: 'Básico', precio: '29,99', emoji: '🚀', badge: 'Para crecer', popular: false,
    color: '#B8D8F8', colorDark: '#1D4ED8',
    funciones: ['Todo lo del Starter', 'Chatbot completo', 'Caja diaria', 'Importador de apps', 'Fidelización con puntos', 'Descuentos y promociones'],
  },
  {
    nombre: 'Pro', precio: '59,99', emoji: '💎', badge: 'Más popular', popular: true,
    color: '#D4C5F9', colorDark: '#6B4FD8',
    funciones: ['Todo lo del Básico', '2 negocios', 'Gestión de equipo', 'Marketing IA completo', 'Analytics avanzado', 'Facturación e IVA'],
  },
  {
    nombre: 'Plus', precio: '99,99', emoji: '⚡', badge: 'Para escalar', popular: false,
    color: '#FDE9A2', colorDark: '#C4860A',
    funciones: ['Todo lo del Pro', 'Hasta 10 negocios', 'Nóminas + plantillas SEPE', 'Contratos SEPE oficiales', 'Kit gestor PDF/CSV', 'Soporte prioritario'],
  },
]

type CmpVal = boolean | string
const COMPARE: { feat: string; s: CmpVal; b: CmpVal; p: CmpVal; pl: CmpVal }[] = [
  { feat: 'Créditos IA / mes',           s: '100',  b: '300',  p: '1.000', pl: '5.000' },
  { feat: 'Trabajadores',                s: '1',    b: '3',    p: '5',     pl: '∞' },
  { feat: 'Negocios',                    s: '1',    b: '1',    p: '2',     pl: '10' },
  { feat: 'Reservas online 24/7',        s: true,   b: true,   p: true,    pl: true },
  { feat: 'Ficha pública en mapa',       s: true,   b: true,   p: true,    pl: true },
  { feat: 'Reseñas automáticas',         s: true,   b: true,   p: true,    pl: true },
  { feat: 'Recordatorios automáticos',   s: true,   b: true,   p: true,    pl: true },
  { feat: 'Chatbot básico',              s: true,   b: true,   p: true,    pl: true },
  { feat: 'Chatbot completo',            s: false,  b: true,   p: true,    pl: true },
  { feat: 'Caja diaria',                 s: false,  b: true,   p: true,    pl: true },
  { feat: 'Fidelización con puntos',     s: false,  b: true,   p: true,    pl: true },
  { feat: 'Lista de espera',             s: false,  b: true,   p: true,    pl: true },
  { feat: 'Descuentos y promociones',    s: false,  b: true,   p: true,    pl: true },
  { feat: 'Importador de apps',          s: false,  b: true,   p: true,    pl: true },
  { feat: 'Gestión de equipo',           s: false,  b: false,  p: true,    pl: true },
  { feat: 'Marketing IA',                s: false,  b: false,  p: true,    pl: true },
  { feat: 'Analytics avanzado',          s: false,  b: false,  p: true,    pl: true },
  { feat: 'Facturación e IVA',           s: false,  b: false,  p: true,    pl: true },
  { feat: 'Modelos 303 / 130',           s: false,  b: false,  p: true,    pl: true },
  { feat: 'Multi-negocio',               s: false,  b: false,  p: '2',     pl: '10' },
  { feat: 'Nóminas y contratos SEPE',    s: false,  b: false,  p: false,   pl: true },
  { feat: 'Soporte prioritario',         s: false,  b: false,  p: false,   pl: true },
]

const TIPOS_NEGOCIO = [
  'Peluquería / Barbería',
  'Centro de estética / Uñas',
  'Spa / Masajes',
  'Clínica / Consulta médica',
  'Yoga / Pilates',
  'Gimnasio / Entrenador personal',
  'Dentista',
  'Veterinaria',
  'Otro tipo de negocio',
]

// ── COMPARE CELL ──────────────────────────────────────────────────────────────

function CmpCell({ val, highlight }: { val: CmpVal; highlight?: boolean }) {
  const base: React.CSSProperties = {
    padding: '11px 8px', textAlign: 'center',
    borderBottom: '1px solid #F3F4F6',
    background: highlight ? 'rgba(212,197,249,0.07)' : 'transparent',
  }
  if (typeof val === 'boolean') {
    return (
      <td style={base}>
        {val
          ? <span style={{ color: '#16A34A', fontWeight: 800, fontSize: 15 }}>✓</span>
          : <span style={{ color: '#D1D5DB', fontSize: 15 }}>—</span>}
      </td>
    )
  }
  return (
    <td style={{ ...base, fontSize: 13, fontWeight: 700, color: highlight ? '#7C3AED' : '#6B7280' }}>
      {val}
    </td>
  )
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function Home() {
  // UI state
  const [menuOpen, setMenuOpen] = useState(false)

  // Waitlist
  const [count, setCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [form, setForm] = useState({ nombre: '', email: '', tipo_negocio: '', ciudad: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [formError, setFormError] = useState('')

  // Auth modal
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'registro' | 'recuperar'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authNombre, setAuthNombre] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMsg, setAuthMsg] = useState('')
  const [authIsError, setAuthIsError] = useState(false)

  // Fetch waitlist count
  useEffect(() => {
    supabase.from('waitlist').select('*', { count: 'exact', head: true }).then(({ count: c }) => {
      setCount(c ?? 0)
    })
  }, [])

  // Animate counter
  useEffect(() => {
    if (count === 0) return
    let current = 0
    const target = count
    const step = Math.max(1, Math.ceil(target / 80))
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplayCount(current)
      if (current >= target) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [count])

  // IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          ;(e.target as HTMLElement).classList.add('visible')
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Close modal on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuth() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = authOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authOpen])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  function openAuth(mode: 'login' | 'registro' = 'login') {
    setAuthMode(mode)
    setAuthMsg('')
    setAuthIsError(false)
    setAuthOpen(true)
    setMenuOpen(false)
  }

  function closeAuth() {
    setAuthOpen(false)
    setAuthMsg('')
    setAuthEmail('')
    setAuthPassword('')
    setAuthNombre('')
  }

  function setMsg(msg: string, isError: boolean) {
    setAuthMsg(msg)
    setAuthIsError(isError)
  }

  async function handleAuthGoogle() {
    await supabase.auth.signOut({ scope: 'local' })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (!error && data?.url) window.location.href = data.url
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!authEmail || !authPassword) { setMsg('Rellena todos los campos.', true); return }
    setAuthLoading(true); setMsg('', false)
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    if (error) {
      setMsg('Email o contraseña incorrectos.', true)
      setAuthLoading(false)
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', session.user.id).single()
      const dest = profile?.tipo === 'negocio' ? '/dashboard'
        : profile?.tipo === 'cliente' ? '/cliente'
        : profile?.tipo === 'empleado' ? '/empleado'
        : '/onboarding'
      window.location.href = window.location.origin + dest
    }
    setAuthLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!authEmail || !authPassword) { setMsg('Rellena todos los campos.', true); return }
    if (authPassword.length < 6) { setMsg('La contraseña debe tener al menos 6 caracteres.', true); return }
    setAuthLoading(true); setMsg('', false)
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.signUp({
      email: authEmail.trim().toLowerCase(),
      password: authPassword,
      options: { data: { nombre: authNombre.trim() || undefined } },
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered')) {
        setMsg('Este email ya está registrado.', true)
        setTimeout(() => { setAuthMode('login'); setMsg('', false) }, 2000)
      } else {
        setMsg(error.message, true)
      }
    } else {
      setMsg('¡Cuenta creada! Revisa tu email para confirmar.', false)
      setTimeout(() => { window.location.href = window.location.origin + '/onboarding' }, 1500)
    }
    setAuthLoading(false)
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    if (!authEmail) { setMsg('Introduce tu email.', true); return }
    setAuthLoading(true); setMsg('', false)
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setMsg(error.message, true) }
    else { setMsg('Te hemos enviado un correo para restablecer tu contraseña.', false) }
    setAuthLoading(false)
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email) { setFormError('El email es obligatorio'); return }
    setEnviando(true); setFormError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setEnviado(true); setCount(c => c + 1) }
      else { const d = await res.json(); setFormError(d.error || 'Error. Inténtalo de nuevo.') }
    } catch { setFormError('Error de conexión.') }
    finally { setEnviando(false) }
  }

  return (
    <>
      {/* ── FONTS ── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* ── STYLES ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          background: #fff; color: #111827; overflow-x: hidden;
        }

        @keyframes blobA {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(50px,-40px) scale(1.08); }
          66%      { transform: translate(-30px,30px) scale(0.94); }
        }
        @keyframes blobB {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-60px,40px) scale(1.06); }
          66%      { transform: translate(40px,-50px) scale(0.92); }
        }
        @keyframes blobC {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(30px,40px) scale(1.1); }
        }
        @keyframes floatUp {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-14px) rotate(3deg); }
        }
        @keyframes badgePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.35); }
          50%      { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes modalUp {
          from { opacity:0; transform:translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        /* ── Scroll reveal ── */
        .fade-up { opacity:0; transform:translateY(28px); transition:opacity 0.65s ease,transform 0.65s ease; }
        .fade-up.visible { opacity:1; transform:translateY(0); }

        /* ── Navbar ── */
        .kh-nav {
          position:fixed; top:0; left:0; right:0; z-index:200;
          background:rgba(255,255,255,0.88); backdrop-filter:blur(14px);
          border-bottom:1px solid rgba(0,0,0,0.06);
        }
        .kh-nav-inner {
          max-width:1200px; margin:0 auto; padding:0 24px; height:64px;
          display:flex; align-items:center; justify-content:space-between; gap:12px;
        }
        .kh-logo {
          font-family:'Syne',sans-serif; font-size:clamp(18px,3vw,22px);
          font-weight:800; color:#111827; text-decoration:none;
          letter-spacing:-0.5px; flex-shrink:0;
        }
        .kh-logo em { font-style:normal; color:#7C3AED; }
        .kh-nav-links { display:flex; gap:4px; align-items:center; }
        .kh-nav-btn {
          font-size:14px; font-weight:600; color:#374151;
          padding:8px 14px; border-radius:8px;
          cursor:pointer; border:none; background:none;
          transition:background 0.2s,color 0.2s; white-space:nowrap;
        }
        .kh-nav-btn:hover { background:#F3F4F6; color:#111827; }
        .kh-nav-login {
          font-size:14px; font-weight:600; color:#374151;
          padding:9px 18px; border-radius:999px; border:1.5px solid #E5E7EB;
          cursor:pointer; background:#fff; white-space:nowrap;
          transition:border-color 0.2s,transform 0.2s;
        }
        .kh-nav-login:hover { border-color:#D4C5F9; transform:translateY(-1px); }
        .kh-nav-cta {
          font-size:14px; font-weight:700; color:#fff;
          background:linear-gradient(135deg,#7C3AED,#4F46E5);
          padding:10px 22px; border-radius:999px; border:none;
          cursor:pointer; white-space:nowrap; flex-shrink:0;
          transition:transform 0.2s,box-shadow 0.2s;
        }
        .kh-nav-cta:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(124,58,237,0.4); }
        .kh-hamburger {
          display:none; flex-direction:column; gap:5px;
          cursor:pointer; border:none; background:none; padding:6px; flex-shrink:0;
        }
        .kh-hamburger span {
          display:block; width:22px; height:2px;
          background:#111827; border-radius:2px;
          transition:transform 0.3s,opacity 0.3s;
        }
        .kh-mobile {
          display:none; flex-direction:column; gap:4px;
          padding:8px 16px 16px;
          border-top:1px solid rgba(0,0,0,0.06);
          background:rgba(255,255,255,0.98);
          animation:slideDown 0.25s ease;
        }
        .kh-mobile.open { display:flex; }
        .kh-mobile-btn {
          font-size:15px; font-weight:600; color:#374151;
          padding:13px 12px; border-radius:10px;
          cursor:pointer; border:none; background:none; text-align:left;
          transition:background 0.2s;
        }
        .kh-mobile-btn:hover { background:#F3F4F6; }
        .kh-mobile-row { display:flex; gap:8px; margin-top:6px; }
        .kh-mobile-login {
          flex:1; font-size:15px; font-weight:600; color:#374151;
          padding:13px 12px; border-radius:12px; border:1.5px solid #E5E7EB;
          background:#fff; cursor:pointer; text-align:center;
        }
        .kh-mobile-cta {
          flex:2; font-size:15px; font-weight:700; color:#fff;
          background:linear-gradient(135deg,#7C3AED,#4F46E5);
          padding:13px 12px; border-radius:12px; border:none; cursor:pointer; text-align:center;
        }
        @media(max-width:768px) {
          .kh-nav-links { display:none; }
          .kh-hamburger { display:flex; }
        }

        /* ── Hero ── */
        .kh-hero {
          min-height:100svh; display:flex; align-items:center;
          position:relative; overflow:hidden; background:#fff; padding-top:64px;
        }
        .kh-blob { position:absolute; border-radius:50%; filter:blur(90px); opacity:0.45; pointer-events:none; }
        .kh-blob-1 { width:560px; height:560px; background:#D4C5F9; top:-140px; right:-120px; animation:blobA 14s ease-in-out infinite; }
        .kh-blob-2 { width:440px; height:440px; background:#B8D8F8; bottom:-80px; left:-100px; animation:blobB 17s ease-in-out infinite; }
        .kh-blob-3 { width:320px; height:320px; background:#B8EDD4; top:45%; left:42%; animation:blobC 11s ease-in-out infinite; }
        .kh-hero-inner {
          max-width:820px; margin:0 auto;
          padding:clamp(56px,10vw,120px) 24px;
          text-align:center; position:relative; z-index:1;
        }
        .kh-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:linear-gradient(135deg,rgba(212,197,249,0.45),rgba(184,216,248,0.45));
          border:1px solid rgba(124,58,237,0.22);
          color:#6D28D9; font-size:clamp(12px,2vw,14px); font-weight:700;
          padding:8px 20px; border-radius:999px; margin-bottom:28px;
          animation:slideDown 0.8s ease, badgePulse 3s ease-in-out 1.5s infinite;
          letter-spacing:0.3px;
        }
        .kh-h1 {
          font-family:'Syne',sans-serif; font-size:clamp(2.4rem,7.5vw,5.2rem);
          font-weight:800; color:#111827; line-height:1.08;
          letter-spacing:-2.5px; margin-bottom:20px;
        }
        .kh-h1 mark {
          background:linear-gradient(135deg,#7C3AED,#4F46E5,#0EA5E9);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text; font-style:normal;
        }
        .kh-sub {
          font-size:clamp(1rem,2.6vw,1.2rem); color:#6B7280;
          line-height:1.75; max-width:580px; margin:0 auto 36px; font-weight:500;
        }
        .kh-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-bottom:44px; }
        .kh-btn-p {
          font-size:clamp(14px,2vw,16px); font-weight:700; color:#fff;
          background:linear-gradient(135deg,#7C3AED,#4F46E5);
          padding:16px 34px; border-radius:999px; border:none; cursor:pointer;
          transition:transform 0.2s,box-shadow 0.2s;
        }
        .kh-btn-p:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(124,58,237,0.42); }
        .kh-btn-s {
          font-size:clamp(14px,2vw,16px); font-weight:700; color:#374151;
          background:#fff; border:2px solid #E5E7EB;
          padding:16px 34px; border-radius:999px; cursor:pointer;
          transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s;
        }
        .kh-btn-s:hover { border-color:#D4C5F9; transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,0.08); }
        .kh-counter {
          display:inline-flex; align-items:center; gap:8px;
          background:#F9FAFB; border:1px solid #E5E7EB;
          border-radius:999px; padding:10px 22px;
          font-size:14px; color:#6B7280; font-weight:500;
        }
        .kh-counter strong { color:#7C3AED; font-weight:800; font-size:16px; }
        .kh-floats { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
        .kh-float { position:absolute; animation:floatUp 4s ease-in-out infinite; opacity:0.65; }

        /* ── Sections ── */
        .kh-sec { padding:clamp(64px,10vw,100px) 24px; }
        .kh-wrap { max-width:1200px; margin:0 auto; }
        .kh-tag {
          display:inline-block; font-size:11px; font-weight:700;
          letter-spacing:1.8px; text-transform:uppercase;
          padding:6px 14px; border-radius:999px; margin-bottom:14px;
        }
        .kh-tag-purple { color:#7C3AED; background:rgba(124,58,237,0.09); border:1px solid rgba(124,58,237,0.18); }
        .kh-tag-light  { color:#A78BFA; background:rgba(167,139,250,0.14); border:1px solid rgba(167,139,250,0.28); }
        .kh-tag-green  { color:#16A34A; background:rgba(22,163,74,0.08); border:1px solid rgba(22,163,74,0.2); }
        .kh-h2 {
          font-family:'Syne',sans-serif; font-size:clamp(1.8rem,4vw,3rem);
          font-weight:800; letter-spacing:-1px; line-height:1.15; margin-bottom:10px;
        }
        .kh-h2-dark { color:#fff; }
        .kh-h2-light { color:#111827; }
        .kh-p { font-size:clamp(14px,2vw,16px); line-height:1.75; max-width:580px; }
        .kh-p-dark  { color:#94A3B8; }
        .kh-p-light { color:#6B7280; }
        .kh-center { text-align:center; }
        .kh-center .kh-p { margin:0 auto; }

        /* ── Problemas ── */
        .kh-problemas { background:#0F172A; }
        .kh-prob-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:48px; }
        .kh-prob-card {
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          border-radius:20px; padding:30px 26px;
          transition:background 0.3s,transform 0.2s;
        }
        .kh-prob-card:hover { background:rgba(255,255,255,0.07); transform:translateY(-2px); }
        .kh-prob-ico { font-size:2.2rem; margin-bottom:14px; }
        .kh-prob-t { font-family:'Syne',sans-serif; font-size:clamp(1rem,1.8vw,1.15rem); font-weight:700; color:#F1F5F9; margin-bottom:10px; }
        .kh-prob-d { font-size:14px; color:#94A3B8; line-height:1.65; margin-bottom:18px; }
        .kh-sol {
          display:inline-flex; align-items:center; gap:7px;
          font-size:12px; font-weight:700; color:#4ADE80;
          background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2);
          padding:7px 14px; border-radius:999px;
        }
        @media(max-width:768px) { .kh-prob-grid { grid-template-columns:1fr; } }

        /* ── Features ── */
        .kh-features { background:#fff; }
        .kh-feat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:48px; }
        .kh-feat-card {
          background:#F9FAFB; border:1px solid #EAECEF;
          border-radius:20px; padding:24px;
          transition:transform 0.22s,box-shadow 0.22s;
        }
        .kh-feat-card:hover { transform:translateY(-5px); box-shadow:0 14px 44px rgba(0,0,0,0.08); }
        .kh-feat-ico {
          width:48px; height:48px; border-radius:13px;
          display:flex; align-items:center; justify-content:center;
          font-size:1.35rem; margin-bottom:13px; flex-shrink:0;
        }
        .kh-feat-t { font-family:'Syne',sans-serif; font-size:clamp(0.85rem,1.4vw,0.95rem); font-weight:700; color:#111827; margin-bottom:6px; }
        .kh-feat-d { font-size:12.5px; color:#6B7280; line-height:1.6; }
        @media(max-width:900px) { .kh-feat-grid { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:768px) {
          .kh-feat-grid {
            display:flex !important; overflow-x:auto; scroll-snap-type:x mandatory;
            gap:14px; padding:4px 24px 20px; scrollbar-width:none;
            -webkit-overflow-scrolling:touch; grid-template-columns:unset !important;
            margin-left:-24px; margin-right:-24px; margin-top:32px;
          }
          .kh-feat-grid::-webkit-scrollbar { display:none; }
          .kh-feat-card { flex-shrink:0; width:250px; scroll-snap-align:start; }
        }

        /* ── Números ── */
        .kh-nums { background:#F8FAFC; }
        .kh-num-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:48px; }
        .kh-num-card { border-radius:20px; padding:30px 20px; text-align:center; }
        .kh-num-ico { font-size:2rem; margin-bottom:10px; }
        .kh-num-n { font-family:'Syne',sans-serif; font-size:clamp(2rem,4.5vw,3.2rem); font-weight:800; color:#111827; letter-spacing:-2px; }
        .kh-num-l { font-size:clamp(12px,1.8vw,14px); color:#6B7280; font-weight:600; margin-top:6px; }
        @media(max-width:640px) { .kh-num-grid { grid-template-columns:repeat(2,1fr); } }

        /* ── Para quién ── */
        .kh-quien { background:#fff; }
        .kh-q-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; margin-top:48px; }
        .kh-q-card {
          border-radius:16px; padding:22px 12px; text-align:center;
          border:2px solid #E5E7EB;
          transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s;
        }
        .kh-q-card:hover { border-color:#D4C5F9; transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.07); }
        .kh-q-ico { font-size:1.9rem; margin-bottom:8px; }
        .kh-q-name { font-size:11px; font-weight:700; color:#374151; line-height:1.35; }
        @media(max-width:900px) { .kh-q-grid { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:600px) {
          .kh-q-grid {
            display:flex !important; overflow-x:auto; scroll-snap-type:x mandatory;
            gap:12px; padding:4px 24px 20px; scrollbar-width:none;
            -webkit-overflow-scrolling:touch; grid-template-columns:unset !important;
            margin-left:-24px; margin-right:-24px; margin-top:32px;
          }
          .kh-q-grid::-webkit-scrollbar { display:none; }
          .kh-q-card { flex-shrink:0; width:130px; scroll-snap-align:start; }
        }

        /* ── Planes ── */
        .kh-planes { background:#F8FAFC; }
        .kh-plan-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-top:48px; }
        .kh-plan-card {
          border-radius:24px; padding:28px 22px; background:#fff;
          border:2px solid #E5E7EB; position:relative;
          transition:transform 0.22s,box-shadow 0.22s;
          display:flex; flex-direction:column;
        }
        .kh-plan-card.popular { border-color:#D4C5F9; }
        .kh-plan-card:hover { transform:translateY(-5px); box-shadow:0 14px 44px rgba(0,0,0,0.09); }
        .kh-plan-pop-badge {
          position:absolute; top:-13px; left:50%; transform:translateX(-50%);
          font-size:11px; font-weight:700; padding:5px 14px; border-radius:999px; white-space:nowrap;
        }
        .kh-plan-emoji { font-size:1.9rem; margin-bottom:10px; }
        .kh-plan-name { font-family:'Syne',sans-serif; font-size:1.2rem; font-weight:800; color:#111827; margin-bottom:4px; }
        .kh-plan-price { font-family:'Syne',sans-serif; font-size:clamp(1.8rem,3vw,2.2rem); font-weight:800; color:#111827; letter-spacing:-1px; line-height:1; }
        .kh-plan-price sup { font-size:0.6em; font-weight:700; vertical-align:super; }
        .kh-plan-price sub { font-size:13px; font-weight:500; color:#6B7280; letter-spacing:0; vertical-align:baseline; }
        .kh-plan-sep { height:1px; background:#E5E7EB; margin:18px 0; }
        .kh-plan-feats { display:flex; flex-direction:column; gap:9px; flex:1; margin-bottom:20px; }
        .kh-plan-feat { font-size:12.5px; color:#374151; display:flex; align-items:flex-start; gap:7px; line-height:1.45; }
        .kh-plan-feat-ok { color:#16A34A; font-weight:800; flex-shrink:0; margin-top:1px; }
        .kh-plan-cta {
          width:100%; padding:11px; border-radius:12px; border:2px solid #E5E7EB;
          background:#F9FAFB; font-size:13px; font-weight:700; color:#9CA3AF;
          cursor:not-allowed; display:flex; align-items:center; justify-content:center; gap:5px;
        }
        @media(max-width:960px) { .kh-plan-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:580px) {
          .kh-plan-grid {
            display:flex !important; overflow-x:auto; scroll-snap-type:x mandatory;
            gap:16px; padding:20px 24px 24px; scrollbar-width:none;
            -webkit-overflow-scrolling:touch; grid-template-columns:unset !important;
            margin-left:-24px; margin-right:-24px; margin-top:28px;
          }
          .kh-plan-grid::-webkit-scrollbar { display:none; }
          .kh-plan-card { flex-shrink:0; width:min(calc(100vw - 48px),290px); scroll-snap-align:center; }
        }

        /* ── Tabla comparativa ── */
        .kh-compare { background:#fff; }
        .kh-tbl-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; margin-top:48px; border-radius:20px; border:1px solid #E5E7EB; }
        .kh-tbl {
          width:100%; border-collapse:collapse;
          font-family:'Plus Jakarta Sans',sans-serif;
          min-width:580px;
        }
        .kh-tbl thead th {
          padding:18px 10px; text-align:center;
          font-size:13px; font-weight:700; border-bottom:2px solid #E5E7EB;
          background:#F9FAFB;
        }
        .kh-tbl thead th:first-child { text-align:left; padding-left:20px; min-width:190px; }
        .kh-tbl thead th.pro { background:rgba(212,197,249,0.15); color:#7C3AED; }
        .kh-tbl-plan-name { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; display:block; }
        .kh-tbl-plan-price { font-size:12px; font-weight:500; color:#6B7280; margin-top:2px; display:block; }
        .kh-tbl-feat {
          text-align:left; padding:11px 10px 11px 20px;
          font-size:13px; color:#374151; font-weight:500;
          border-bottom:1px solid #F3F4F6;
        }
        .kh-tbl-group {
          font-size:11px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase;
          color:#9CA3AF; background:#F9FAFB; padding:10px 10px 10px 20px;
          border-bottom:1px solid #E5E7EB;
        }

        /* ── Waitlist ── */
        .kh-waitlist {
          padding:clamp(64px,10vw,100px) 24px;
          background:linear-gradient(135deg,#EDE8FD 0%,#E8F3FD 50%,#E8FDF0 100%);
        }
        .kh-wl-inner { max-width:640px; margin:0 auto; text-align:center; }
        .kh-wl-card {
          background:#fff; border-radius:24px;
          padding:clamp(28px,5vw,48px);
          box-shadow:0 24px 64px rgba(0,0,0,0.09);
          margin-top:40px; text-align:left;
        }
        .kh-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .kh-input {
          width:100%; padding:14px 16px; border:2px solid #E5E7EB; border-radius:12px;
          font-size:15px; font-family:'Plus Jakarta Sans',sans-serif;
          color:#111827; background:#F9FAFB;
          transition:border-color 0.2s,background 0.2s; outline:none; -webkit-appearance:none;
        }
        .kh-input:focus { border-color:#7C3AED; background:#fff; }
        .kh-input-full { grid-column:1/-1; }
        .kh-submit {
          grid-column:1/-1; width:100%; padding:16px; border-radius:12px; border:none;
          background:linear-gradient(135deg,#7C3AED,#4F46E5);
          color:#fff; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:16px; font-weight:700; cursor:pointer; margin-top:4px;
          transition:transform 0.2s,box-shadow 0.2s;
        }
        .kh-submit:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(124,58,237,0.42); }
        .kh-submit:disabled { opacity:0.7; cursor:not-allowed; transform:none; box-shadow:none; }
        .kh-form-err { color:#EF4444; font-size:13px; margin-top:8px; }
        .kh-success { text-align:center; padding:32px 16px; }
        .kh-success-ico { font-size:3rem; margin-bottom:14px; }
        .kh-success-t { font-family:'Syne',sans-serif; font-size:1.4rem; font-weight:800; color:#111827; margin-bottom:8px; }
        .kh-success-p { font-size:15px; color:#6B7280; }
        .kh-wl-counter {
          display:inline-flex; align-items:center; gap:7px;
          font-size:14px; color:#6B7280; margin-top:20px; font-weight:500;
        }
        .kh-wl-counter strong { color:#7C3AED; font-weight:800; font-size:16px; }
        @media(max-width:480px) {
          .kh-form-grid { grid-template-columns:1fr; }
          .kh-input-full,.kh-submit { grid-column:1; }
        }

        /* ── Para clientes ── */
        .kh-clients { background:#0F172A; padding:clamp(56px,8vw,88px) 24px; text-align:center; }

        /* ── Footer ── */
        .kh-footer { background:#080F1A; padding:clamp(40px,6vw,64px) 24px 28px; }
        .kh-footer-wrap { max-width:1200px; margin:0 auto; }
        .kh-footer-top {
          display:grid; grid-template-columns:1fr auto; gap:40px; align-items:start;
          border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:28px; margin-bottom:20px;
        }
        .kh-footer-logo { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:#fff; margin-bottom:6px; }
        .kh-footer-logo em { font-style:normal; color:#A78BFA; }
        .kh-footer-tag { font-size:13px; color:#475569; font-style:italic; }
        .kh-footer-links { display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
        .kh-footer-a { display:flex; align-items:center; gap:8px; font-size:13px; color:#64748B; text-decoration:none; transition:color 0.2s; }
        .kh-footer-a:hover { color:#94A3B8; }
        .kh-footer-bot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .kh-footer-copy { font-size:12px; color:#334155; }
        .kh-footer-legal { display:flex; gap:18px; flex-wrap:wrap; }
        .kh-footer-legal a { font-size:12px; color:#334155; text-decoration:none; transition:color 0.2s; }
        .kh-footer-legal a:hover { color:#64748B; }
        @media(max-width:600px) {
          .kh-footer-top { grid-template-columns:1fr; }
          .kh-footer-links { align-items:flex-start; }
        }

        /* ── Auth Modal ── */
        .kh-overlay {
          position:fixed; inset:0; z-index:500;
          background:rgba(0,0,0,0.5); backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center;
          padding:20px; animation:fadeIn 0.2s ease;
        }
        .kh-modal {
          background:#fff; border-radius:24px;
          width:100%; max-width:420px;
          padding:clamp(28px,5vw,40px);
          box-shadow:0 32px 80px rgba(0,0,0,0.2);
          animation:modalUp 0.28s ease;
          position:relative; max-height:90svh; overflow-y:auto;
        }
        .kh-modal-close {
          position:absolute; top:16px; right:16px;
          width:32px; height:32px; border-radius:50%;
          border:none; background:#F3F4F6; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-size:16px; color:#6B7280;
          transition:background 0.2s;
        }
        .kh-modal-close:hover { background:#E5E7EB; color:#111827; }
        .kh-modal-logo {
          font-family:'Syne',sans-serif; font-size:20px; font-weight:800;
          color:#111827; margin-bottom:20px;
        }
        .kh-modal-logo em { font-style:normal; color:#7C3AED; }
        .kh-auth-tabs {
          display:flex; background:#F3F4F6; border-radius:12px;
          padding:4px; margin-bottom:22px; gap:4px;
        }
        .kh-auth-tab {
          flex:1; padding:9px; border-radius:9px; border:none;
          background:transparent; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:14px; font-weight:600; color:#6B7280; cursor:pointer;
          transition:background 0.2s,color 0.2s;
        }
        .kh-auth-tab.active { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
        .kh-auth-field { margin-bottom:13px; }
        .kh-auth-label { display:block; font-size:13px; font-weight:600; color:#111827; margin-bottom:5px; }
        .kh-auth-input {
          width:100%; padding:13px 14px; border:1.5px solid #E5E7EB; border-radius:12px;
          font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; color:#111827;
          outline:none; background:#F9FAFB;
          transition:border-color 0.2s,background 0.2s; -webkit-appearance:none;
        }
        .kh-auth-input:focus { border-color:#7C3AED; background:#fff; }
        .kh-auth-forgot {
          text-align:right; margin-top:-6px; margin-bottom:10px;
        }
        .kh-auth-forgot button {
          font-size:12px; font-weight:600; color:#7C3AED;
          border:none; background:none; cursor:pointer; padding:0;
        }
        .kh-auth-btn {
          width:100%; padding:14px; border-radius:12px; border:none;
          background:linear-gradient(135deg,#7C3AED,#4F46E5);
          color:#fff; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:15px; font-weight:700; cursor:pointer; margin-top:6px;
          transition:transform 0.2s,box-shadow 0.2s;
        }
        .kh-auth-btn:hover { transform:translateY(-1px); box-shadow:0 8px 28px rgba(124,58,237,0.4); }
        .kh-auth-btn:disabled { opacity:0.7; cursor:not-allowed; transform:none; box-shadow:none; }
        .kh-auth-divider {
          display:flex; align-items:center; gap:12px; margin:16px 0;
          color:#9CA3AF; font-size:13px;
        }
        .kh-auth-divider::before,.kh-auth-divider::after { content:''; flex:1; height:1px; background:#E5E7EB; }
        .kh-auth-google {
          width:100%; padding:12px; background:#fff; color:#111827;
          border:1.5px solid #E5E7EB; border-radius:12px;
          font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; font-weight:600;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
          transition:border-color 0.2s,box-shadow 0.2s;
        }
        .kh-auth-google:hover { border-color:#D4C5F9; box-shadow:0 4px 16px rgba(0,0,0,0.07); }
        .kh-auth-msg {
          margin-top:12px; padding:11px 14px; border-radius:10px;
          font-size:13px; font-weight:500; text-align:center;
        }
        .kh-auth-msg.ok  { background:rgba(184,237,212,0.3); color:#166534; }
        .kh-auth-msg.err { background:rgba(254,226,226,0.5); color:#991B1B; }
        .kh-auth-back {
          background:none; border:none; cursor:pointer;
          color:#7C3AED; font-size:13px; font-weight:600; margin-top:12px;
          display:flex; align-items:center; gap:4px;
        }

        /* ── Dark mode ── */
        html.dark body { background:#0f0f1a; color:#F7F9FC; }
        html.dark .kh-nav { background:rgba(15,15,26,0.9); border-bottom-color:rgba(255,255,255,0.07); }
        html.dark .kh-mobile { background:rgba(20,20,35,0.98); border-top-color:rgba(255,255,255,0.07); }
        html.dark .kh-logo { color:#F7F9FC; }
        html.dark .kh-nav-btn { color:#D1D5DB; }
        html.dark .kh-nav-btn:hover { background:rgba(255,255,255,0.07); color:#fff; }
        html.dark .kh-nav-login { color:#D1D5DB; background:transparent; border-color:rgba(255,255,255,0.15); }
        html.dark .kh-nav-login:hover { border-color:#D4C5F9; }
        html.dark .kh-mobile-btn { color:#D1D5DB; }
        html.dark .kh-mobile-btn:hover { background:rgba(255,255,255,0.07); }
        html.dark .kh-mobile-login { background:transparent; border-color:rgba(255,255,255,0.15); color:#D1D5DB; }
        html.dark .kh-hamburger span { background:#F7F9FC; }

        html.dark .kh-hero { background:#0f0f1a; }
        html.dark .kh-h1 { color:#F7F9FC; }
        html.dark .kh-sub { color:#9CA3AF; }
        html.dark .kh-btn-s { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.15); color:#D1D5DB; }
        html.dark .kh-btn-s:hover { border-color:#D4C5F9; box-shadow:0 6px 20px rgba(0,0,0,0.3); }
        html.dark .kh-counter { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1); color:#9CA3AF; }

        html.dark .kh-features { background:#0f0f1a; }
        html.dark .kh-feat-card { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.08); }
        html.dark .kh-feat-card:hover { box-shadow:0 14px 44px rgba(0,0,0,0.35); }
        html.dark .kh-feat-t { color:#F7F9FC; }
        html.dark .kh-feat-d { color:#9CA3AF; }

        html.dark .kh-nums { background:#0d0d1a; }
        html.dark .kh-num-n { color:#F7F9FC; }
        html.dark .kh-num-l { color:#9CA3AF; }

        html.dark .kh-quien { background:#0f0f1a; }
        html.dark .kh-q-card { border-color:rgba(255,255,255,0.1); }
        html.dark .kh-q-card:hover { border-color:#D4C5F9; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
        html.dark .kh-q-name { color:#D1D5DB; }

        html.dark .kh-planes { background:#0d0d1a; }
        html.dark .kh-plan-card { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.09); }
        html.dark .kh-plan-card.popular { border-color:#7C3AED; }
        html.dark .kh-plan-card:hover { box-shadow:0 14px 44px rgba(0,0,0,0.35); }
        html.dark .kh-plan-name { color:#F7F9FC; }
        html.dark .kh-plan-price { color:#F7F9FC; }
        html.dark .kh-plan-sep { background:rgba(255,255,255,0.08); }
        html.dark .kh-plan-feat { color:#D1D5DB; }
        html.dark .kh-plan-cta { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.1); color:#9CA3AF; }

        html.dark .kh-compare { background:#0f0f1a; }
        html.dark .kh-tbl-wrap { border-color:rgba(255,255,255,0.08); }
        html.dark .kh-tbl thead th { background:rgba(255,255,255,0.04); border-bottom-color:rgba(255,255,255,0.08); color:#D1D5DB; }
        html.dark .kh-tbl thead th.pro { background:rgba(124,58,237,0.15); }
        html.dark .kh-tbl-plan-price { color:#9CA3AF; }
        html.dark .kh-tbl-feat { color:#D1D5DB; border-bottom-color:rgba(255,255,255,0.05); }
        html.dark .kh-tbl-group { background:rgba(255,255,255,0.03); color:#6B7280; border-bottom-color:rgba(255,255,255,0.08); }

        html.dark .kh-waitlist { background:linear-gradient(135deg,rgba(124,58,237,0.15) 0%,rgba(79,70,229,0.12) 50%,rgba(16,185,129,0.1) 100%); }
        html.dark .kh-wl-card { background:#1a1a2e; box-shadow:0 24px 64px rgba(0,0,0,0.35); }
        html.dark .kh-input { background:#0f0f1a; border-color:rgba(255,255,255,0.12); color:#F7F9FC; }
        html.dark .kh-input:focus { border-color:#7C3AED; background:#1a1a2e; }
        html.dark .kh-success-t { color:#F7F9FC; }
        html.dark .kh-success-p { color:#9CA3AF; }

        html.dark .kh-modal { background:#1a1a2e; }
        html.dark .kh-modal-logo { color:#F7F9FC; }
        html.dark .kh-modal-close { background:rgba(255,255,255,0.08); color:#9CA3AF; }
        html.dark .kh-modal-close:hover { background:rgba(255,255,255,0.14); color:#F7F9FC; }
        html.dark .kh-auth-tabs { background:rgba(255,255,255,0.06); }
        html.dark .kh-auth-tab { color:#9CA3AF; }
        html.dark .kh-auth-tab.active { background:#0f0f1a; color:#F7F9FC; }
        html.dark .kh-auth-label { color:#D1D5DB; }
        html.dark .kh-auth-input { background:#0f0f1a; border-color:rgba(255,255,255,0.12); color:#F7F9FC; }
        html.dark .kh-auth-input:focus { border-color:#7C3AED; background:#1a1a2e; }
        html.dark .kh-auth-divider { color:#6B7280; }
        html.dark .kh-auth-divider::before,html.dark .kh-auth-divider::after { background:rgba(255,255,255,0.08); }
        html.dark .kh-auth-google { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.12); color:#D1D5DB; }
        html.dark .kh-auth-google:hover { border-color:#D4C5F9; box-shadow:0 4px 16px rgba(0,0,0,0.25); }

        html.dark .kh-h2-light { color:#F7F9FC; }
        html.dark .kh-p-light { color:#9CA3AF; }
        html.dark .kh-tag-purple { color:#C4B5FD; background:rgba(124,58,237,0.15); border-color:rgba(124,58,237,0.3); }
        html.dark .kh-tag-green { color:#6EE7B7; background:rgba(16,185,129,0.12); border-color:rgba(16,185,129,0.25); }
      `}</style>

      {/* ────────────────── NAVBAR ────────────────── */}
      <nav className="kh-nav">
        <div className="kh-nav-inner">
          <a className="kh-logo" href="#"><em>Kh</em>epria</a>

          <div className="kh-nav-links">
            <button className="kh-nav-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('quien')}>Para quién</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('planes')}>Planes</button>
            <a href="/cliente" className="kh-nav-btn" style={{ textDecoration: 'none' }}>Para clientes</a>
            <button className="kh-nav-login" onClick={() => openAuth('login')}>Iniciar sesión</button>
            <button className="kh-nav-cta" onClick={() => openAuth('registro')}>Registrarse gratis</button>
          </div>

          <button className="kh-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
            <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : '' }} />
            <span style={{ opacity: menuOpen ? 0 : 1 }} />
            <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : '' }} />
          </button>
        </div>

        <div className={`kh-mobile${menuOpen ? ' open' : ''}`}>
          <button className="kh-mobile-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('quien')}>Para quién</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('planes')}>Planes</button>
          <a href="/cliente" className="kh-mobile-btn" style={{ textDecoration: 'none', display: 'block', textAlign: 'left' }}>Para clientes</a>
          <div className="kh-mobile-row">
            <button className="kh-mobile-login" onClick={() => openAuth('login')}>Entrar</button>
            <button className="kh-mobile-cta" onClick={() => openAuth('registro')}>Registrarse</button>
          </div>
        </div>
      </nav>

      {/* ────────────────── HERO ────────────────── */}
      <section className="kh-hero">
        <div className="kh-blob kh-blob-1" />
        <div className="kh-blob kh-blob-2" />
        <div className="kh-blob kh-blob-3" />
        <div className="kh-floats" aria-hidden="true">
          <span className="kh-float" style={{ top: '22%', left: '6%', animationDelay: '0s', animationDuration: '3.8s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>📅</span>
          <span className="kh-float" style={{ top: '28%', right: '7%', animationDelay: '1.1s', animationDuration: '4.2s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>🤖</span>
          <span className="kh-float" style={{ bottom: '28%', left: '5%', animationDelay: '0.5s', animationDuration: '3.2s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>💬</span>
          <span className="kh-float" style={{ bottom: '24%', right: '6%', animationDelay: '1.6s', animationDuration: '4.6s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>⭐</span>
        </div>

        <div className="kh-hero-inner">
          <div className="kh-badge">🚀 En desarrollo — Beta próximamente</div>
          <h1 className="kh-h1">
            La app que tu negocio<br /><mark>estaba esperando</mark>
          </h1>
          <p className="kh-sub">
            Reservas automáticas, chatbot IA 24/7, facturación española y mucho más.
            Estamos construyendo algo grande.
          </p>
          <div className="kh-btns">
            <button className="kh-btn-p" onClick={() => openAuth('registro')}>Empezar gratis</button>
            <button className="kh-btn-s" onClick={() => scrollTo('funciones')}>Ver funciones ↓</button>
          </div>
          <div style={{ marginTop: 14 }}>
            <a href="/cliente" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.22)',
              color: 'white', fontWeight: 600, fontSize: '15px',
              textDecoration: 'none', backdropFilter: 'blur(8px)',
              transition: 'background 0.15s',
            }}>
              🗺️ Explorar negocios
            </a>
          </div>
          {count > 0 && (
            <div className="kh-counter">
              <span>🏢</span>
              <strong>{displayCount}</strong>
              <span>negocios ya en lista de espera</span>
            </div>
          )}
        </div>
      </section>

      {/* ────────────────── PROBLEMA ────────────────── */}
      <section className="kh-sec kh-problemas">
        <div className="kh-wrap">
          <div className="kh-center fade-up">
            <div className="kh-tag kh-tag-light">El problema</div>
            <h2 className="kh-h2 kh-h2-dark">¿Te suena familiar?</h2>
            <p className="kh-p kh-p-dark" style={{ margin: '10px auto 0' }}>
              Estos son los problemas que tienen a diario miles de negocios de servicios en España
            </p>
          </div>
          <div className="kh-prob-grid">
            {PROBLEMAS.map((p, i) => (
              <div key={i} className="kh-prob-card fade-up" style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className="kh-prob-ico">{p.icon}</div>
                <div className="kh-prob-t">{p.title}</div>
                <div className="kh-prob-d">{p.desc}</div>
                <div className="kh-sol"><span>✓</span><span>{p.sol}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── FUNCIONES ────────────────── */}
      <section className="kh-sec kh-features" id="funciones">
        <div className="kh-wrap">
          <div className="kh-center fade-up">
            <div className="kh-tag kh-tag-purple">Funciones</div>
            <h2 className="kh-h2 kh-h2-light">Todo lo que necesitas,<br />en un solo lugar</h2>
            <p className="kh-p kh-p-light" style={{ margin: '10px auto 0' }}>
              12 módulos diseñados específicamente para negocios de servicios en España
            </p>
          </div>
          <div className="kh-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="kh-feat-card fade-up" style={{ transitionDelay: `${(i % 4) * 0.08}s` }}>
                <div className="kh-feat-ico" style={{ background: f.color }}>{f.icon}</div>
                <div className="kh-feat-t">{f.title}</div>
                <div className="kh-feat-d">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── NÚMEROS ────────────────── */}
      <section className="kh-sec kh-nums">
        <div className="kh-wrap">
          <div className="kh-center fade-up">
            <div className="kh-tag kh-tag-purple">Resultados</div>
            <h2 className="kh-h2 kh-h2-light">Números que hablan<br />por sí solos</h2>
          </div>
          <div className="kh-num-grid">
            {NUMEROS.map((n, i) => (
              <div key={i} className="kh-num-card fade-up" style={{ background: n.color, transitionDelay: `${i * 0.1}s` }}>
                <div className="kh-num-ico">{n.icon}</div>
                <div className="kh-num-n">{n.num}</div>
                <div className="kh-num-l">{n.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── PARA QUIÉN ────────────────── */}
      <section className="kh-sec kh-quien" id="quien">
        <div className="kh-wrap">
          <div className="kh-center fade-up">
            <div className="kh-tag kh-tag-purple">Para quién</div>
            <h2 className="kh-h2 kh-h2-light">Diseñado para tu sector</h2>
            <p className="kh-p kh-p-light" style={{ margin: '10px auto 0' }}>
              Cualquier negocio que trabaje con citas y reservas
            </p>
          </div>
          <div className="kh-q-grid">
            {QUIENES.map((q, i) => (
              <div key={i} className="kh-q-card fade-up" style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="kh-q-ico">{q.icon}</div>
                <div className="kh-q-name">{q.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── PLANES ────────────────── */}
      <section className="kh-sec kh-planes" id="planes">
        <div className="kh-wrap">
          <div className="kh-center fade-up">
            <div className="kh-tag kh-tag-purple">Precios</div>
            <h2 className="kh-h2 kh-h2-light">Planes para cada negocio</h2>
            <p className="kh-p kh-p-light" style={{ margin: '10px auto 0' }}>
              Los precios que verás al lanzamiento. Transparentes, sin sorpresas.
            </p>
          </div>
          <div className="kh-plan-grid">
            {PLANES.map((p, i) => (
              <div key={i} className={`kh-plan-card fade-up${p.popular ? ' popular' : ''}`} style={{ transitionDelay: `${i * 0.1}s` }}>
                {p.popular && (
                  <div className="kh-plan-pop-badge" style={{ background: p.color, color: p.colorDark }}>
                    ⭐ {p.badge}
                  </div>
                )}
                <div className="kh-plan-emoji">{p.emoji}</div>
                <div className="kh-plan-name">{p.nombre}</div>
                <div className="kh-plan-price"><sup>€</sup>{p.precio}<sub>/mes</sub></div>
                <div className="kh-plan-sep" />
                <div className="kh-plan-feats">
                  {p.funciones.map((f, j) => (
                    <div key={j} className="kh-plan-feat">
                      <span className="kh-plan-feat-ok">✓</span><span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="kh-plan-cta">🔒 Próximamente</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── TABLA COMPARATIVA ────────────────── */}
      <section className="kh-sec kh-compare" id="comparar">
        <div className="kh-wrap">
          <div className="kh-center fade-up">
            <div className="kh-tag kh-tag-purple">Comparativa</div>
            <h2 className="kh-h2 kh-h2-light">¿Qué incluye cada plan?</h2>
            <p className="kh-p kh-p-light" style={{ margin: '10px auto 0' }}>
              Compara todos los planes para elegir el que mejor se adapta a tu negocio
            </p>
          </div>

          <div className="kh-tbl-wrap fade-up" style={{ transitionDelay: '0.15s' }}>
            <table className="kh-tbl">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: 20, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                    Funcionalidad
                  </th>
                  {PLANES.map(p => (
                    <th key={p.nombre} className={p.popular ? 'pro' : ''} style={{ borderBottom: '2px solid #E5E7EB', background: p.popular ? 'rgba(212,197,249,0.15)' : '#F9FAFB' }}>
                      <span className="kh-tbl-plan-name" style={{ color: p.popular ? '#7C3AED' : '#111827' }}>
                        {p.emoji} {p.nombre}
                      </span>
                      <span className="kh-tbl-plan-price">€{p.precio}/mes</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Límites */}
                <tr>
                  <td colSpan={5} className="kh-tbl-group">Límites del plan</td>
                </tr>
                {COMPARE.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    <td className="kh-tbl-feat">{row.feat}</td>
                    <CmpCell val={row.s} />
                    <CmpCell val={row.b} />
                    <CmpCell val={row.p} highlight />
                    <CmpCell val={row.pl} />
                  </tr>
                ))}
                {/* Reservas y agenda */}
                <tr><td colSpan={5} className="kh-tbl-group">Reservas y agenda</td></tr>
                {COMPARE.slice(3, 8).map((row, i) => (
                  <tr key={i}>
                    <td className="kh-tbl-feat">{row.feat}</td>
                    <CmpCell val={row.s} />
                    <CmpCell val={row.b} />
                    <CmpCell val={row.p} highlight />
                    <CmpCell val={row.pl} />
                  </tr>
                ))}
                {/* Funciones avanzadas */}
                <tr><td colSpan={5} className="kh-tbl-group">Funciones avanzadas</td></tr>
                {COMPARE.slice(8, 14).map((row, i) => (
                  <tr key={i}>
                    <td className="kh-tbl-feat">{row.feat}</td>
                    <CmpCell val={row.s} />
                    <CmpCell val={row.b} />
                    <CmpCell val={row.p} highlight />
                    <CmpCell val={row.pl} />
                  </tr>
                ))}
                {/* IA y gestión */}
                <tr><td colSpan={5} className="kh-tbl-group">IA, equipo y fiscalidad</td></tr>
                {COMPARE.slice(14).map((row, i) => (
                  <tr key={i}>
                    <td className="kh-tbl-feat">{row.feat}</td>
                    <CmpCell val={row.s} />
                    <CmpCell val={row.b} />
                    <CmpCell val={row.p} highlight />
                    <CmpCell val={row.pl} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ────────────────── WAITLIST ────────────────── */}
      <section className="kh-waitlist" id="waitlist">
        <div className="kh-wl-inner">
          <div className="fade-up">
            <div className="kh-tag kh-tag-purple">Lista de espera</div>
            <h2 className="kh-h2 kh-h2-light" style={{ fontSize: 'clamp(1.8rem,4.5vw,2.8rem)' }}>
              Sé de los primeros<br />en probarlo
            </h2>
            <p className="kh-p kh-p-light" style={{ margin: '10px auto 0' }}>
              Regístrate ahora y te avisamos cuando abramos la beta
            </p>
          </div>

          <div className="kh-wl-card fade-up" style={{ transitionDelay: '0.15s' }}>
            {enviado ? (
              <div className="kh-success">
                <div className="kh-success-ico">🎉</div>
                <div className="kh-success-t">¡Apuntado!</div>
                <p className="kh-success-p">Te avisaremos muy pronto cuando abramos la beta.</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist}>
                <div className="kh-form-grid">
                  <input className="kh-input" type="text" placeholder="Tu nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoComplete="name" />
                  <input className="kh-input" type="email" placeholder="Tu email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="email" />
                  <select className="kh-input" value={form.tipo_negocio} onChange={e => setForm(f => ({ ...f, tipo_negocio: e.target.value }))}>
                    <option value="">Tipo de negocio</option>
                    {TIPOS_NEGOCIO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input className="kh-input" type="text" placeholder="Ciudad" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} autoComplete="address-level2" />
                  <button className="kh-submit" type="submit" disabled={enviando}>
                    {enviando ? 'Guardando...' : 'Unirme a la lista de espera →'}
                  </button>
                </div>
                {formError && <p className="kh-form-err">{formError}</p>}
              </form>
            )}
          </div>

          {count > 0 && (
            <div className="kh-wl-counter fade-up" style={{ transitionDelay: '0.25s' }}>
              <span>🏢</span><strong>{displayCount}</strong><span>negocios ya apuntados</span>
            </div>
          )}
        </div>
      </section>

      {/* ────────────────── PARA CLIENTES ────────────────── */}
      <section className="kh-clients">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div className="fade-up">
            <div className="kh-tag kh-tag-light" style={{ marginBottom: 16 }}>Para clientes</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: 14 }}>
              ¿Eres cliente?
            </h2>
            <p style={{ fontSize: 'clamp(14px,2vw,16px)', color: '#94A3B8', lineHeight: 1.75, marginBottom: 26 }}>
              Descubre y reserva en los mejores negocios cerca de ti,
              con disponibilidad en tiempo real.
            </p>
            <a
              href="/cliente"
              style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                padding: '18px 36px', borderRadius: '16px',
                background: 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                color: 'white', fontWeight: 700, fontSize: '18px',
                textDecoration: 'none', boxShadow: '0 6px 28px rgba(107,79,216,0.45)',
                transition: 'opacity 0.15s',
              }}
            >
              Descubre negocios cerca de ti →
              <span style={{ fontSize: '13px', fontWeight: 400, opacity: 0.85, marginTop: 2 }}>
                Busca, compara y reserva en los mejores negocios de tu zona
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer className="kh-footer">
        <div className="kh-footer-wrap">
          <div className="kh-footer-top">
            <div>
              <div className="kh-footer-logo"><em>Kh</em>epria</div>
              <div className="kh-footer-tag">Estamos construyendo algo grande ✨</div>
            </div>
            <div className="kh-footer-links">
              <a href="/cliente" className="kh-footer-a">
                🗺️ App para clientes
              </a>
              <a href="mailto:khepriacontact@gmail.com" className="kh-footer-a">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                </svg>
                khepriacontact@gmail.com
              </a>
              <a href="https://instagram.com/khepria_es" target="_blank" rel="noopener noreferrer" className="kh-footer-a">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="ig2" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F58529" /><stop offset="50%" stopColor="#DD2A7B" /><stop offset="100%" stopColor="#8134AF" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig2)" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="url(#ig2)" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig2)" />
                </svg>
                @khepria_es
              </a>
            </div>
          </div>
          <div className="kh-footer-bot">
            <div className="kh-footer-copy">© 2026 Khepria. Todos los derechos reservados.</div>
            <div className="kh-footer-legal">
              <a href="/legal/privacidad">Política de Privacidad</a>
              <a href="/legal/terminos">Términos y Condiciones</a>
              <a href="/legal/cookies">Política de Cookies</a>
              <a href="/aviso-legal">Aviso Legal</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ────────────────── AUTH MODAL ────────────────── */}
      {authOpen && (
        <div className="kh-overlay" onClick={e => { if (e.target === e.currentTarget) closeAuth() }}>
          <div className="kh-modal" role="dialog" aria-modal="true">
            <button className="kh-modal-close" onClick={closeAuth} aria-label="Cerrar">✕</button>

            <div className="kh-modal-logo"><em>Kh</em>epria</div>

            {authMode === 'recuperar' ? (
              /* ── Recuperar contraseña ── */
              <form onSubmit={handleRecover}>
                <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                  Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <div className="kh-auth-field">
                  <label className="kh-auth-label">Email</label>
                  <input className="kh-auth-input" type="email" placeholder="tu@email.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoFocus autoComplete="email" />
                </div>
                <button className="kh-auth-btn" type="submit" disabled={authLoading}>
                  {authLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
                {authMsg && <div className={`kh-auth-msg ${authIsError ? 'err' : 'ok'}`}>{authMsg}</div>}
                <button type="button" className="kh-auth-back" onClick={() => { setAuthMode('login'); setAuthMsg('') }}>
                  ← Volver al inicio de sesión
                </button>
              </form>
            ) : (
              /* ── Login / Registro ── */
              <>
                <div className="kh-auth-tabs">
                  <button className={`kh-auth-tab${authMode === 'login' ? ' active' : ''}`} onClick={() => { setAuthMode('login'); setAuthMsg('') }} type="button">
                    Iniciar sesión
                  </button>
                  <button className={`kh-auth-tab${authMode === 'registro' ? ' active' : ''}`} onClick={() => { setAuthMode('registro'); setAuthMsg('') }} type="button">
                    Crear cuenta
                  </button>
                </div>

                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                  {authMode === 'registro' && (
                    <div className="kh-auth-field">
                      <label className="kh-auth-label">Nombre</label>
                      <input className="kh-auth-input" type="text" placeholder="Tu nombre" value={authNombre} onChange={e => setAuthNombre(e.target.value)} autoComplete="name" />
                    </div>
                  )}
                  <div className="kh-auth-field">
                    <label className="kh-auth-label">Email</label>
                    <input className="kh-auth-input" type="email" placeholder="tu@email.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoFocus autoComplete="email" />
                  </div>
                  <div className="kh-auth-field">
                    <label className="kh-auth-label">Contraseña</label>
                    <input className="kh-auth-input" type="password" placeholder={authMode === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'} value={authPassword} onChange={e => setAuthPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
                  </div>

                  {authMode === 'login' && (
                    <div className="kh-auth-forgot">
                      <button type="button" onClick={() => { setAuthMode('recuperar'); setAuthMsg('') }}>
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  <button className="kh-auth-btn" type="submit" disabled={authLoading}>
                    {authLoading
                      ? (authMode === 'login' ? 'Entrando...' : 'Creando cuenta...')
                      : (authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta gratis')}
                  </button>
                </form>

                {authMsg && <div className={`kh-auth-msg ${authIsError ? 'err' : 'ok'}`}>{authMsg}</div>}

                <div className="kh-auth-divider">o</div>

                <button className="kh-auth-google" type="button" onClick={handleAuthGoogle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
