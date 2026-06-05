'use client'

import { useEffect, useRef, useState } from 'react'
import type { WebGLRenderer } from 'three'
import { supabase } from './lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', color: '#B8D8F8', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento. Confirmaciones y recordatorios automáticos sin que muevas un dedo.' },
  { icon: '🤖', color: '#D4C5F9', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde consultas, reserva citas y cancela automáticamente sin intervención humana, a cualquier hora.' },
  { icon: '🧾', color: '#B8EDD4', title: 'Facturación e IVA automático', desc: 'Facturas con IVA, modelos 303, 130 y 111. Compatible con la normativa fiscal española vigente.' },
  { icon: '📊', color: '#FDE9A2', title: 'Analytics con IA', desc: 'Predicciones de ingresos, análisis de clientes y recomendaciones accionables para crecer cada mes.' },
  { icon: '📸', color: '#FBCFE8', title: 'Marketing con IA', desc: 'Posts automáticos para redes sociales, estrategias de captación y calendario editorial generados con IA.' },
  { icon: '👥', color: '#B8D8F8', title: 'Gestión de equipo y nóminas', desc: 'Gestiona empleados, turnos, nóminas y contratos SEPE desde el panel de control.' },
]

const QUIENES = [
  { icon: '💈', name: 'Peluquerías y barberías' },
  { icon: '💅', name: 'Centros de uñas y estética' },
  { icon: '💆', name: 'Spas y masajes' },
  { icon: '🏥', name: 'Clínicas y consultas' },
  { icon: '🧘', name: 'Yoga y pilates' },
  { icon: '🏋️', name: 'Gimnasios y entrenadores' },
]

const NUMEROS = [
  { num: '3h', label: 'ahorradas al día', color: '#B8D8F8', icon: '⏱️' },
  { num: '+30%', label: 'más reservas', color: '#D4C5F9', icon: '📈' },
  { num: '24/7', label: 'atención automática', color: '#B8EDD4', icon: '🤖' },
  { num: '0€', label: 'en gestores de IVA', color: '#FDE9A2', icon: '💰' },
]

const TESTIMONIALS = [
  {
    name: 'Marcos García',
    biz: 'Barbería Marcos',
    city: 'Madrid',
    avatar: '💈',
    color: '#B8D8F8',
    text: 'Antes perdía 2 horas al día al teléfono. Ahora mis clientes reservan solos y yo me centro en lo que me gusta. Las reservas subieron un 35% en tres meses.',
    stars: 5,
  },
  {
    name: 'Laia Puig',
    biz: 'Spa Relax',
    city: 'Barcelona',
    avatar: '💆',
    color: '#D4C5F9',
    text: 'El chatbot de WhatsApp es una maravilla. Responde a las 2 de la mañana sin yo estar. Y la facturación automática me ha ahorrado el coste del gestor.',
    stars: 5,
  },
  {
    name: 'Carlos Pérez',
    biz: 'Clínica Dental Pérez',
    city: 'Valencia',
    avatar: '🦷',
    color: '#B8EDD4',
    text: 'Gestionar 4 dentistas con sus agendas era un caos. Ahora todo está centralizado y los recordatorios han reducido las faltas en un 80%.',
    stars: 5,
  },
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

// ── FRAMER VARIANTS ───────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: 'easeOut' as const, delay: i * 0.1 },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// ── CmpCell ───────────────────────────────────────────────────────────────────

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

// ── Globe3D ───────────────────────────────────────────────────────────────────

function Globe3D() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let disposed = false
    let animId = 0
    let renderer: WebGLRenderer | null = null
    let onResize: (() => void) | null = null

    import('three').then((THREE) => {
      if (disposed) return

      const w = mount.offsetWidth || 400
      const h = mount.offsetHeight || 400

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100)
      camera.position.z = 2.6

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      mount.appendChild(renderer.domElement)

      // Wireframe globe
      const sphereGeo = new THREE.SphereGeometry(1, 36, 36)
      const wire = new THREE.WireframeGeometry(sphereGeo)
      const wireMat = new THREE.LineBasicMaterial({ color: 0x7C3AED, transparent: true, opacity: 0.14 })
      const globe = new THREE.LineSegments(wire, wireMat)
      scene.add(globe)

      // Fibonacci sphere points
      const n = 280
      const pos = new Float32Array(n * 3)
      const gr = (1 + Math.sqrt(5)) / 2
      for (let i = 0; i < n; i++) {
        const theta = (2 * Math.PI * i) / gr
        const phi = Math.acos(1 - (2 * (i + 0.5)) / n)
        pos[i * 3]     = Math.sin(phi) * Math.cos(theta)
        pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta)
        pos[i * 3 + 2] = Math.cos(phi)
      }
      const ptGeo = new THREE.BufferGeometry()
      ptGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const ptMat = new THREE.PointsMaterial({ color: 0xB8D8F8, size: 0.022, transparent: true, opacity: 0.8 })
      const points = new THREE.Points(ptGeo, ptMat)
      scene.add(points)

      // Spain city highlights (lat/lon → unit sphere)
      const cities = [
        [40.4, -3.7],  // Madrid
        [41.4, 2.2],   // Barcelona
        [39.5, -0.4],  // Valencia
        [37.4, -5.9],  // Sevilla
        [43.3, -8.4],  // A Coruña
        [43.3, -1.9],  // Donostia
        [36.7, -4.4],  // Málaga
        [39.6, 2.7],   // Palma
      ]
      const cityFlat: number[] = []
      cities.forEach(([lat, lon]) => {
        const phi   = (90 - lat) * (Math.PI / 180)
        const theta = (lon + 180) * (Math.PI / 180)
        cityFlat.push(-(Math.sin(phi) * Math.cos(theta)), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
      })
      const cityGeo = new THREE.BufferGeometry()
      cityGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cityFlat), 3))
      const cityMat = new THREE.PointsMaterial({ color: 0x7C3AED, size: 0.055, transparent: true, opacity: 0.95 })
      const cityPts = new THREE.Points(cityGeo, cityMat)
      scene.add(cityPts)

      // Glow mesh (BackSide sphere)
      const glowGeo = new THREE.SphereGeometry(1.06, 32, 32)
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x7C3AED, transparent: true, opacity: 0.045, side: THREE.BackSide })
      scene.add(new THREE.Mesh(glowGeo, glowMat))

      // Animate
      let t = 0
      const animate = () => {
        if (disposed) return
        animId = requestAnimationFrame(animate)
        t += 0.004
        const rx = Math.sin(t * 0.18) * 0.08
        globe.rotation.y = t; globe.rotation.x = rx
        points.rotation.y = t; points.rotation.x = rx
        cityPts.rotation.y = t; cityPts.rotation.x = rx
        renderer!.render(scene, camera)
      }
      animate()

      // Resize handler
      onResize = () => {
        if (!mount || !renderer) return
        const nw = mount.offsetWidth
        const nh = mount.offsetHeight
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
      }
      window.addEventListener('resize', onResize)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(animId)
      if (onResize) window.removeEventListener('resize', onResize)
      renderer?.dispose()
      renderer?.domElement.remove()
      renderer = null
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}

// ── Tilt helper ───────────────────────────────────────────────────────────────

function onTileMove(e: React.MouseEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  e.currentTarget.style.transform = `perspective(900px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) scale(1.03)`
  e.currentTarget.style.transition = 'transform 0.05s ease'
}
function onTileLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = ''
  e.currentTarget.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1)'
}

// ── HOME ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Waitlist
  const [count, setCount]             = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [form, setForm]               = useState({ nombre: '', email: '', tipo_negocio: '', ciudad: '' })
  const [enviando, setEnviando]       = useState(false)
  const [enviado, setEnviado]         = useState(false)
  const [formError, setFormError]     = useState('')

  // Auth modal
  const [authOpen, setAuthOpen]       = useState(false)
  const [authMode, setAuthMode]       = useState<'login' | 'registro' | 'recuperar'>('login')
  const [authEmail, setAuthEmail]     = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authNombre, setAuthNombre]   = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authMsg, setAuthMsg]         = useState('')
  const [authIsError, setAuthIsError] = useState(false)

  // Custom cursor
  const [cursor, setCursor] = useState({ x: -100, y: -100 })
  const [cursorVisible, setCursorVisible] = useState(false)

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
    const step = Math.max(1, Math.ceil(count / 80))
    const timer = setInterval(() => {
      current = Math.min(current + step, count)
      setDisplayCount(current)
      if (current >= count) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [count])

  // Custom cursor tracking
  useEffect(() => {
    const move = (e: MouseEvent) => { setCursor({ x: e.clientX, y: e.clientY }); setCursorVisible(true) }
    const leave = () => setCursorVisible(false)
    window.addEventListener('mousemove', move)
    document.documentElement.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('mousemove', move)
      document.documentElement.removeEventListener('mouseleave', leave)
    }
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
    setAuthMode(mode); setAuthMsg(''); setAuthIsError(false)
    setAuthOpen(true); setMenuOpen(false)
  }

  function closeAuth() {
    setAuthOpen(false); setAuthMsg('')
    setAuthEmail(''); setAuthPassword(''); setAuthNombre('')
  }

  function setMsg(msg: string, isError: boolean) {
    setAuthMsg(msg); setAuthIsError(isError)
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
    if (error) { setMsg('Email o contraseña incorrectos.', true); setAuthLoading(false); return }
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
      const m = error.message.toLowerCase()
      if (m.includes('already') || m.includes('registered')) {
        setMsg('Este email ya está registrado.', true)
        setTimeout(() => { setAuthMode('login'); setMsg('', false) }, 2000)
      } else { setMsg(error.message, true) }
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
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ── GRAIN OVERLAY ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 997, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '300px 300px',
        opacity: 0.022, mixBlendMode: 'overlay',
      }} />

      {/* ── CUSTOM CURSOR ── */}
      <div aria-hidden style={{
        position: 'fixed',
        left: cursor.x - 18,
        top: cursor.y - 18,
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1.5px solid rgba(124,58,237,0.5)',
        background: 'rgba(124,58,237,0.08)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'left 0.08s linear, top 0.08s linear, opacity 0.3s',
        opacity: cursorVisible ? 1 : 0,
        backdropFilter: 'blur(1px)',
      }} />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'DM Sans', sans-serif !important;
          background: #F7F9FF;
          color: #111827;
          overflow-x: hidden;
        }

        @keyframes slideDown {
          from { opacity:0; transform:translateY(-12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes modalUp {
          from { opacity:0; transform:translateY(28px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); }
          50%      { box-shadow: 0 0 0 12px rgba(124,58,237,0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }

        /* ── Nav ── */
        .kh-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          background: rgba(247,249,255,0.85); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .kh-nav-inner {
          max-width: 1180px; margin: 0 auto; padding: 0 24px; height: 64px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .kh-logo {
          font-family: 'Syne', sans-serif; font-size: clamp(18px,3vw,22px);
          font-weight: 800; color: #111827; text-decoration: none;
          letter-spacing: -0.5px; flex-shrink: 0; cursor: pointer;
        }
        .kh-logo em { font-style: normal; color: #7C3AED; }
        .kh-nav-links { display: flex; gap: 4px; align-items: center; }
        .kh-nav-btn {
          font-size: 14px; font-weight: 600; color: #374151;
          padding: 8px 14px; border-radius: 8px;
          cursor: pointer; border: none; background: none;
          transition: background 0.2s, color 0.2s; white-space: nowrap; font-family: 'DM Sans', sans-serif;
        }
        .kh-nav-btn:hover { background: #F3F4F6; color: #111827; }
        .kh-nav-login {
          font-size: 14px; font-weight: 600; color: #374151;
          padding: 9px 18px; border-radius: 999px; border: 1.5px solid #E5E7EB;
          cursor: pointer; background: #fff; white-space: nowrap; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s, transform 0.2s;
        }
        .kh-nav-login:hover { border-color: #D4C5F9; transform: translateY(-1px); }
        .kh-nav-cta {
          font-size: 14px; font-weight: 700; color: #fff;
          background: linear-gradient(135deg,#7C3AED,#4F46E5);
          padding: 10px 22px; border-radius: 999px; border: none;
          cursor: pointer; white-space: nowrap; flex-shrink: 0; font-family: 'DM Sans', sans-serif;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .kh-nav-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(124,58,237,0.4); }
        .kh-hamburger {
          display: none; flex-direction: column; gap: 5px;
          cursor: pointer; border: none; background: none; padding: 6px; flex-shrink: 0;
        }
        .kh-hamburger span { display: block; width: 22px; height: 2px; background: #111827; border-radius: 2px; transition: transform 0.3s, opacity 0.3s; }
        .kh-mobile {
          display: none; flex-direction: column; gap: 4px; padding: 8px 16px 16px;
          border-top: 1px solid rgba(0,0,0,0.06); background: rgba(247,249,255,0.98);
          animation: slideDown 0.25s ease;
        }
        .kh-mobile.open { display: flex; }
        .kh-mobile-btn {
          font-size: 15px; font-weight: 600; color: #374151;
          padding: 13px 12px; border-radius: 10px;
          cursor: pointer; border: none; background: none; text-align: left; font-family: 'DM Sans', sans-serif;
        }
        .kh-mobile-btn:hover { background: #F3F4F6; }

        /* ── Hero ── */
        .kh-hero {
          min-height: 100svh;
          padding: 120px 24px 80px;
          display: flex; align-items: center;
          position: relative; overflow: hidden;
          background: radial-gradient(ellipse 80% 60% at 70% 50%, rgba(212,197,249,0.25) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 50% at 10% 80%, rgba(184,216,248,0.2) 0%, transparent 50%),
                      #F7F9FF;
        }
        .kh-hero-inner {
          max-width: 1180px; margin: 0 auto; width: 100%;
          display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;
        }
        .kh-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.3px;
          padding: 6px 14px; border-radius: 999px;
        }
        .kh-tag-purple {
          background: rgba(124,58,237,0.1); color: #7C3AED;
          border: 1px solid rgba(124,58,237,0.2);
        }
        .kh-tag-blue { background: rgba(184,216,248,0.4); color: #1D4ED8; border: 1px solid rgba(184,216,248,0.6); }
        .kh-tag-green { background: rgba(184,237,212,0.4); color: #2E8A5E; border: 1px solid rgba(184,237,212,0.6); }
        .kh-h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.4rem, 5.5vw, 4rem);
          font-weight: 800; line-height: 1.08;
          letter-spacing: -2px; color: #0F0F1A;
          margin: 16px 0 20px;
        }
        .kh-h1 .accent { color: #7C3AED; }
        .kh-h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.6rem, 3.5vw, 2.6rem);
          font-weight: 800; line-height: 1.15;
          letter-spacing: -1px; color: #0F0F1A;
          margin-bottom: 14px;
        }
        .kh-lead {
          font-size: clamp(15px, 2vw, 17px); color: #6B7280; line-height: 1.75; max-width: 520px;
        }
        .kh-hero-btns { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
        .kh-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 14px;
          background: linear-gradient(135deg,#7C3AED,#4F46E5);
          color: #fff; font-size: 15px; font-weight: 700; font-family: 'DM Sans', sans-serif;
          border: none; cursor: pointer; text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: pulse 2.5s ease-in-out infinite;
        }
        .kh-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(124,58,237,0.45); }
        .kh-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 24px; border-radius: 14px;
          background: #fff; color: #374151; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          border: 1.5px solid #E5E7EB; cursor: pointer; text-decoration: none;
          transition: border-color 0.2s, transform 0.2s;
        }
        .kh-btn-secondary:hover { border-color: #D4C5F9; transform: translateY(-2px); }
        .kh-globe-wrap {
          position: relative; height: 440px;
          display: flex; align-items: center; justify-content: center;
        }
        .kh-globe-glow {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(124,58,237,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .kh-globe-ring {
          position: absolute; inset: 20px; border-radius: 50%;
          border: 1px solid rgba(124,58,237,0.12);
          animation: spin 20s linear infinite;
        }
        .kh-globe-ring2 {
          position: absolute; inset: 40px; border-radius: 50%;
          border: 1px dashed rgba(184,216,248,0.4);
          animation: spin 30s linear infinite reverse;
        }

        /* ── Stats strip ── */
        .kh-stats {
          padding: 0 24px 0;
          background: #fff;
          border-top: 1px solid #F1F5F9;
          border-bottom: 1px solid #F1F5F9;
        }
        .kh-stats-inner {
          max-width: 1180px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .kh-stat {
          display: flex; flex-direction: column; align-items: center;
          padding: 28px 16px; gap: 4px;
          border-right: 1px solid #F1F5F9;
          transition: background 0.2s;
        }
        .kh-stat:last-child { border-right: none; }
        .kh-stat:hover { background: #FAFBFF; }
        .kh-stat-num {
          font-family: 'Syne', sans-serif; font-size: clamp(1.6rem,3vw,2.2rem);
          font-weight: 800; letter-spacing: -1px; color: #0F0F1A;
        }
        .kh-stat-label { font-size: 13px; color: #9CA3AF; font-weight: 500; text-align: center; }

        /* ── Section ── */
        .kh-section {
          padding: 100px 24px;
        }
        .kh-section-inner { max-width: 1180px; margin: 0 auto; }
        .kh-section-header { text-align: center; max-width: 620px; margin: 0 auto 56px; }
        .kh-section-p { font-size: 15px; color: #6B7280; line-height: 1.75; margin-top: 12px; }

        /* ── Cards grid ── */
        .kh-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .kh-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .kh-grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
        .kh-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }

        .kh-feature-card {
          background: #fff; border: 1px solid #F1F5F9; border-radius: 20px;
          padding: 28px; cursor: default;
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease;
          will-change: transform;
        }
        .kh-feature-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.07); }
        .kh-feat-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 16px; flex-shrink: 0;
        }
        .kh-feat-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .kh-feat-desc { font-size: 13px; color: #6B7280; line-height: 1.7; }

        /* ── Quienes cards ── */
        .kh-quien-card {
          background: #fff; border: 1px solid #F1F5F9; border-radius: 16px;
          padding: 22px 16px; text-align: center; cursor: default;
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s;
          will-change: transform;
        }
        .kh-quien-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.06); }
        .kh-quien-emoji { font-size: 32px; margin-bottom: 10px; display: block; }
        .kh-quien-name { font-size: 13px; font-weight: 600; color: #374151; line-height: 1.4; }

        /* ── Phones section ── */
        .kh-phones {
          padding: 80px 24px;
          background: linear-gradient(160deg, #0F0F1A 0%, #1a1040 100%);
          overflow: hidden; position: relative;
        }
        .kh-phones-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%);
        }
        .kh-phones-inner { max-width: 1180px; margin: 0 auto; position: relative; z-index: 1; }
        .kh-phones-header { text-align: center; max-width: 540px; margin: 0 auto 56px; }
        .kh-phones-h2 {
          font-family: 'Syne', sans-serif; font-size: clamp(1.6rem,3.5vw,2.4rem);
          font-weight: 800; color: #fff; letter-spacing: -1px; margin: 12px 0 10px;
        }
        .kh-phones-p { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.7; }
        .kh-phones-row { display: flex; gap: 24px; justify-content: center; align-items: flex-end; }
        .kh-phone-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .kh-phone-wrap:nth-child(2) { transform: translateY(-20px); }
        .kh-phone-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); letter-spacing: 0.5px; text-transform: uppercase; }
        .kh-phone {
          width: 200px; background: #0A0A0F; border-radius: 32px;
          border: 2px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1);
          overflow: hidden; position: relative;
          animation: float 4s ease-in-out infinite;
        }
        .kh-phone:nth-child(1) { animation-delay: 0s; }
        .kh-phone:nth-child(2) { animation-delay: 0.5s; }
        .kh-phone:nth-child(3) { animation-delay: 1s; }
        .kh-phone-notch {
          position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
          width: 70px; height: 6px; background: #1A1A2E; border-radius: 3px; z-index: 2;
        }
        .kh-phone-screen { padding: 28px 0 0; }
        .kh-phone-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; font-size: 10px; color: rgba(255,255,255,0.5);
        }

        /* ── Testimonials ── */
        .kh-testimonial-card {
          background: #fff; border: 1px solid #F1F5F9; border-radius: 20px;
          padding: 28px; display: flex; flex-direction: column; gap: 14px;
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s;
          will-change: transform;
        }
        .kh-testimonial-card:hover { box-shadow: 0 10px 40px rgba(0,0,0,0.07); }
        .kh-testi-stars { color: #F59E0B; font-size: 14px; letter-spacing: 1px; }
        .kh-testi-text { font-size: 14px; color: #4B5563; line-height: 1.75; flex: 1; }
        .kh-testi-author { display: flex; align-items: center; gap: 12px; }
        .kh-testi-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .kh-testi-name { font-size: 14px; font-weight: 700; color: #111827; }
        .kh-testi-biz { font-size: 12px; color: #9CA3AF; }

        /* ── Plans ── */
        .kh-plans { padding: 100px 24px; background: #F7F9FF; }
        .kh-plan-card {
          background: #fff; border: 2px solid #F1F5F9; border-radius: 24px;
          padding: 28px; display: flex; flex-direction: column; gap: 0;
          transition: transform 0.3s, box-shadow 0.3s;
          position: relative; overflow: hidden;
        }
        .kh-plan-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.08); }
        .kh-plan-card.popular { border-color: #7C3AED; box-shadow: 0 8px 32px rgba(124,58,237,0.15); }
        .kh-plan-badge {
          position: absolute; top: 16px; right: 16px;
          font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
        }
        .kh-plan-emoji { font-size: 32px; margin-bottom: 12px; }
        .kh-plan-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #111827; }
        .kh-plan-precio {
          font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800; color: #0F0F1A;
          margin: 12px 0 4px; letter-spacing: -1px;
        }
        .kh-plan-mes { font-size: 14px; color: #9CA3AF; margin-bottom: 20px; }
        .kh-plan-divider { height: 1px; background: #F1F5F9; margin: 16px 0; }
        .kh-plan-feature { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #4B5563; margin-bottom: 10px; }
        .kh-plan-check { color: #16A34A; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
        .kh-plan-cta {
          display: block; width: 100%; margin-top: 20px;
          padding: 13px; border-radius: 12px; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700; font-family: 'DM Sans', sans-serif;
          transition: transform 0.2s, box-shadow 0.2s;
          text-align: center;
        }
        .kh-plan-cta:hover { transform: translateY(-1px); }

        /* ── Compare table ── */
        .kh-compare-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid #F1F5F9; }
        .kh-compare-tbl { width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; }
        .kh-tbl-feat { padding: 11px 16px; color: #374151; font-weight: 500; font-size: 13px; border-bottom: 1px solid #F3F4F6; text-align: left; }
        .kh-tbl-head {
          padding: 14px 8px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
          text-align: center; white-space: nowrap;
        }
        .kh-tbl-group {
          padding: 12px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
          text-transform: uppercase; color: #9CA3AF; background: #FAFBFF;
          border-bottom: 1px solid #F3F4F6;
        }

        /* ── Waitlist ── */
        .kh-waitlist {
          padding: 100px 24px;
          background: linear-gradient(160deg,#0F0F1A 0%,#1a1040 100%);
          position: relative; overflow: hidden;
        }
        .kh-waitlist-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 50% 60% at 50% 50%, rgba(124,58,237,0.18) 0%, transparent 70%);
        }
        .kh-waitlist-inner { max-width: 560px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
        .kh-h2-light { color: #fff; }
        .kh-p-light { color: rgba(255,255,255,0.6); }
        .kh-wl-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; padding: 32px; margin-top: 36px; backdrop-filter: blur(10px);
        }
        .kh-form-grid { display: flex; flex-direction: column; gap: 12px; }
        .kh-input {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px; padding: 13px 16px; color: #fff; font-size: 14px; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s; outline: none; width: 100%;
        }
        .kh-input::placeholder { color: rgba(255,255,255,0.35); }
        .kh-input:focus { border-color: rgba(124,58,237,0.6); }
        .kh-input option { background: #1a1040; color: #fff; }
        .kh-submit {
          padding: 14px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg,#7C3AED,#4F46E5);
          color: #fff; font-size: 15px; font-weight: 700; font-family: 'DM Sans', sans-serif;
          transition: transform 0.2s, box-shadow 0.2s; width: 100%;
        }
        .kh-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.45); }
        .kh-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .kh-form-err { margin-top: 10px; font-size: 13px; color: #FCA5A5; }
        .kh-success { padding: 20px; text-align: center; }
        .kh-success-ico { font-size: 48px; margin-bottom: 12px; }
        .kh-success-t { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .kh-success-p { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; }
        .kh-wl-counter {
          margin-top: 24px; display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px; padding: 10px 20px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8);
        }

        /* ── Clients section ── */
        .kh-clients { padding: 80px 24px; background: #fff; text-align: center; }
        .kh-clients-inner { max-width: 580px; margin: 0 auto; }

        /* ── Footer ── */
        .kh-footer { background: #0A0A0F; padding: 40px 24px 28px; }
        .kh-footer-wrap { max-width: 1180px; margin: 0 auto; }
        .kh-footer-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; }
        .kh-footer-logo { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
        .kh-footer-logo em { font-style: normal; color: #7C3AED; }
        .kh-footer-tag { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 4px; }
        .kh-footer-links { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
        .kh-footer-a { font-size: 13px; color: rgba(255,255,255,0.55); text-decoration: none; display: flex; align-items: center; gap: 6px; transition: color 0.2s; }
        .kh-footer-a:hover { color: #fff; }
        .kh-footer-bot { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .kh-footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }
        .kh-footer-legal { display: flex; gap: 16px; flex-wrap: wrap; }
        .kh-footer-legal a { font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; transition: color 0.2s; }
        .kh-footer-legal a:hover { color: rgba(255,255,255,0.7); }

        /* ── Auth modal ── */
        .kh-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        .kh-modal {
          background: #fff; border-radius: 24px; padding: 36px 32px; width: 100%; max-width: 420px;
          position: relative; box-shadow: 0 24px 60px rgba(0,0,0,0.2);
          animation: modalUp 0.3s cubic-bezier(0.22,1,0.36,1);
          max-height: 90vh; overflow-y: auto;
        }
        .kh-modal-close {
          position: absolute; top: 14px; right: 14px;
          background: #F3F4F6; border: none; width: 32px; height: 32px;
          border-radius: 50%; cursor: pointer; font-size: 14px; color: #6B7280;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .kh-modal-close:hover { background: #E5E7EB; }
        .kh-modal-logo { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 20px; color: #111827; }
        .kh-modal-logo em { font-style: normal; color: #7C3AED; }
        .kh-auth-tabs { display: flex; gap: 4px; background: #F3F4F6; border-radius: 12px; padding: 4px; margin-bottom: 24px; }
        .kh-auth-tab {
          flex: 1; padding: 9px; border-radius: 9px; border: none; background: none;
          font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.2s, color 0.2s;
        }
        .kh-auth-tab.active { background: #fff; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .kh-auth-field { margin-bottom: 16px; }
        .kh-auth-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .kh-auth-input {
          width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E5E7EB;
          font-size: 14px; font-family: 'DM Sans', sans-serif; color: #111827; background: #fff; outline: none;
          transition: border-color 0.2s;
        }
        .kh-auth-input:focus { border-color: #7C3AED; }
        .kh-auth-forgot { text-align: right; margin-bottom: 16px; }
        .kh-auth-forgot button { font-size: 13px; color: #7C3AED; background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .kh-auth-btn {
          width: 100%; padding: 13px; border-radius: 12px; border: none;
          background: linear-gradient(135deg,#7C3AED,#4F46E5); color: #fff;
          font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: opacity 0.2s; margin-top: 4px;
        }
        .kh-auth-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .kh-auth-msg { margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; }
        .kh-auth-msg.ok  { background: #DCFCE7; color: #166534; }
        .kh-auth-msg.err { background: #FEE2E2; color: #991B1B; }
        .kh-auth-divider { text-align: center; font-size: 13px; color: #9CA3AF; margin: 18px 0; position: relative; }
        .kh-auth-divider::before, .kh-auth-divider::after {
          content: ''; position: absolute; top: 50%; width: calc(50% - 20px); height: 1px; background: #E5E7EB;
        }
        .kh-auth-divider::before { left: 0; }
        .kh-auth-divider::after { right: 0; }
        .kh-auth-google {
          width: 100%; padding: 13px; border-radius: 12px; border: 1.5px solid #E5E7EB;
          background: #fff; color: #374151; font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: border-color 0.2s, background 0.2s;
        }
        .kh-auth-google:hover { border-color: #D4C5F9; background: #FAFBFF; }
        .kh-auth-back {
          display: block; width: 100%; margin-top: 16px; background: none; border: none;
          font-size: 13px; color: #7C3AED; cursor: pointer; font-family: 'DM Sans', sans-serif; text-align: left;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .kh-hero-inner { grid-template-columns: 1fr; }
          .kh-globe-wrap { height: 280px; order: -1; }
          .kh-grid-3 { grid-template-columns: 1fr 1fr; }
          .kh-grid-4 { grid-template-columns: 1fr 1fr; }
          .kh-stats-inner { grid-template-columns: 1fr 1fr; }
          .kh-stat { border-right: none; border-bottom: 1px solid #F1F5F9; }
          .kh-stat:nth-child(odd) { border-right: 1px solid #F1F5F9; }
          .kh-nav-links { display: none; }
          .kh-hamburger { display: flex; }
          .kh-phones-row { overflow-x: auto; padding-bottom: 8px; justify-content: flex-start; }
        }
        @media (max-width: 600px) {
          .kh-grid-3 { grid-template-columns: 1fr; }
          .kh-grid-4 { grid-template-columns: 1fr; }
          .kh-grid-6 { grid-template-columns: repeat(2, 1fr); }
          .kh-hero-btns { flex-direction: column; }
          .kh-btn-primary, .kh-btn-secondary { width: 100%; justify-content: center; }
          .kh-section { padding: 64px 20px; }
          .kh-plans { padding: 64px 20px; }
          .kh-phones { padding: 64px 20px; }
          .kh-waitlist { padding: 64px 20px; }
          .kh-footer-top { flex-direction: column; }
          .kh-footer-bot { flex-direction: column; align-items: flex-start; }
          .kh-modal { padding: 28px 20px; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="kh-nav">
        <div className="kh-nav-inner">
          <span className="kh-logo" onClick={() => scrollTo('hero')}>
            <em>Kh</em>epria
          </span>
          <div className="kh-nav-links">
            <button className="kh-nav-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('planes')}>Precios</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('testimonios')}>Testimonios</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="kh-nav-login" onClick={() => openAuth('login')}>Entrar</button>
            <button className="kh-nav-cta" onClick={() => openAuth('registro')}>Pruébalo gratis</button>
          </div>
          <button className="kh-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className={`kh-mobile ${menuOpen ? 'open' : ''}`}>
          <button className="kh-mobile-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('planes')}>Precios</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('testimonios')}>Testimonios</button>
          <button className="kh-mobile-btn" onClick={() => openAuth('login')}>Entrar</button>
          <button className="kh-mobile-btn" style={{ color: '#7C3AED' }} onClick={() => openAuth('registro')}>Pruébalo gratis →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="kh-hero" id="hero">
        <div className="kh-hero-inner">
          {/* Left: copy */}
          <div>
            <motion.div
              initial="hidden" animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} custom={0}>
                <span className="kh-tag kh-tag-purple">✨ Plataforma para negocios de servicios</span>
              </motion.div>
              <motion.h1 className="kh-h1" variants={fadeUp} custom={1} style={{ marginTop: 18 }}>
                La IA que gestiona<br />
                tu <span className="accent">negocio</span> por ti
              </motion.h1>
              <motion.p className="kh-lead" variants={fadeUp} custom={2}>
                Reservas automáticas, chatbot 24/7, facturación con IVA y analytics con inteligencia artificial.
                Todo en una sola plataforma pensada para el autónomo español.
              </motion.p>
              <motion.div className="kh-hero-btns" variants={fadeUp} custom={3}>
                <button className="kh-btn-primary" onClick={() => openAuth('registro')}>
                  Empezar gratis →
                </button>
                <button className="kh-btn-secondary" onClick={() => scrollTo('funciones')}>
                  Ver funciones
                </button>
              </motion.div>
              <motion.div
                variants={fadeUp} custom={4}
                style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 20 }}
              >
                {NUMEROS.map(n => (
                  <div key={n.num} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -1, color: '#0F0F1A' }}>
                      {n.num}
                    </span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>{n.icon} {n.label}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Right: globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="kh-globe-wrap"
          >
            <div className="kh-globe-glow" />
            <div className="kh-globe-ring" />
            <div className="kh-globe-ring2" />
            <Globe3D />
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="kh-stats">
        <div className="kh-stats-inner">
          {NUMEROS.map((n, i) => (
            <motion.div
              key={n.num}
              className="kh-stat"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              custom={i}
            >
              <span style={{ fontSize: 22 }}>{n.icon}</span>
              <span className="kh-stat-num">{n.num}</span>
              <span className="kh-stat-label">{n.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PHONES ── */}
      <section className="kh-phones">
        <div className="kh-phones-glow" />
        <div className="kh-phones-inner">
          <div className="kh-phones-header">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
              variants={staggerContainer}
            >
              <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
                <span className="kh-tag kh-tag-purple">Todo en tu bolsillo</span>
              </motion.span>
              <motion.h2 className="kh-phones-h2" variants={fadeUp} custom={1}>
                Tres herramientas,<br />una plataforma
              </motion.h2>
              <motion.p className="kh-phones-p" variants={fadeUp} custom={2}>
                Tu negocio en el bolsillo de tus clientes y en el tuyo
              </motion.p>
            </motion.div>
          </div>

          <div className="kh-phones-row">
            {/* Phone 1: Hub público */}
            <motion.div
              className="kh-phone-wrap"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0 }}
              viewport={{ once: true }}
            >
              <div className="kh-phone">
                <div className="kh-phone-notch" />
                <div className="kh-phone-screen">
                  <div className="kh-phone-bar">
                    <span>9:41</span>
                    <span>●●●</span>
                  </div>
                  {/* Business profile */}
                  <div style={{ padding: '4px 14px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💈</div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: '#fff' }}>Barbería Marcos</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Madrid · ⭐ 4.9</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horarios disponibles</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
                      {['10:00', '11:30', '14:00', '16:30'].map((h, i) => (
                        <div key={h} style={{ background: i === 1 ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : 'rgba(255,255,255,0.08)', color: i === 1 ? '#fff' : 'rgba(255,255,255,0.7)', borderRadius: 7, padding: '5px 8px', fontSize: 11, fontWeight: 600 }}>{h}</div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>✂️</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Corte de cabello</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>30 min · 18€</div>
                      </div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', borderRadius: 10, padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      Reservar ahora →
                    </div>
                  </div>
                </div>
              </div>
              <div className="kh-phone-label">Hub público</div>
            </motion.div>

            {/* Phone 2: Dashboard KPIs */}
            <motion.div
              className="kh-phone-wrap"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              viewport={{ once: true }}
            >
              <div className="kh-phone">
                <div className="kh-phone-notch" />
                <div className="kh-phone-screen">
                  <div className="kh-phone-bar">
                    <span>9:41</span>
                    <span>●●●</span>
                  </div>
                  <div style={{ padding: '4px 14px 14px' }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Dashboard</div>
                    {/* Mini chart */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Ingresos esta semana</div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>1.248€</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32 }}>
                        {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                          <div key={i} style={{ flex: 1, background: i === 5 ? '#7C3AED' : 'rgba(124,58,237,0.3)', borderRadius: '3px 3px 0 0', height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
                      {[
                        { label: 'Citas hoy', val: '8', color: '#B8D8F8' },
                        { label: 'Pendientes', val: '3', color: '#FDE9A2' },
                        { label: 'Canceladas', val: '1', color: '#FBCFE8' },
                        { label: 'Completadas', val: '4', color: '#B8EDD4' },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(184,237,212,0.15)', border: '1px solid rgba(184,237,212,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 10, color: '#B8EDD4', lineHeight: 1.4 }}>
                      🤖 IA: Martes y jueves con baja ocupación. Activa descuentos.
                    </div>
                  </div>
                </div>
              </div>
              <div className="kh-phone-label">Dashboard KPIs</div>
            </motion.div>

            {/* Phone 3: Calendario */}
            <motion.div
              className="kh-phone-wrap"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="kh-phone">
                <div className="kh-phone-notch" />
                <div className="kh-phone-screen">
                  <div className="kh-phone-bar">
                    <span>9:41</span>
                    <span>●●●</span>
                  </div>
                  <div style={{ padding: '4px 14px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 800, color: '#fff' }}>Junio 2026</div>
                      <div style={{ fontSize: 10, color: '#7C3AED', fontWeight: 700 }}>Hoy</div>
                    </div>
                    {/* Calendar mini */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 10 }}>
                      {['L','M','X','J','V','S','D'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{d}</div>
                      ))}
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: d === 5 ? 800 : 400, color: d === 5 ? '#fff' : 'rgba(255,255,255,0.5)', background: d === 5 ? '#7C3AED' : 'transparent', borderRadius: 4, padding: '2px 0' }}>{d}</div>
                      ))}
                    </div>
                    {/* Appointments */}
                    {[
                      { time: '10:00', name: 'Ana García', color: '#B8D8F8', service: 'Corte' },
                      { time: '11:30', name: 'Luis Martín', color: '#D4C5F9', service: 'Barba' },
                      { time: '13:00', name: 'Sara López', color: '#B8EDD4', service: 'Tinte' },
                    ].map(a => (
                      <div key={a.time} style={{ background: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${a.color}`, borderRadius: '0 8px 8px 0', padding: '7px 8px', marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{a.name}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{a.service}</div>
                        </div>
                        <div style={{ fontSize: 9, color: a.color, fontWeight: 700 }}>{a.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="kh-phone-label">Calendario</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ── */}
      <section className="kh-section" style={{ background: '#fff' }}>
        <div className="kh-section-inner">
          <motion.div
            className="kh-section-header"
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
              <span className="kh-tag kh-tag-blue">¿Para quién?</span>
            </motion.span>
            <motion.h2 className="kh-h2" variants={fadeUp} custom={1} style={{ marginTop: 12 }}>
              Diseñado para tu tipo de negocio
            </motion.h2>
            <motion.p className="kh-section-p" variants={fadeUp} custom={2}>
              Khepria se adapta a cualquier negocio de servicios que trabaje con citas
            </motion.p>
          </motion.div>

          <div className="kh-grid-6">
            {QUIENES.map((q, i) => (
              <motion.div
                key={q.name}
                className="kh-quien-card"
                initial="hidden" whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                custom={i * 0.5}
                onMouseMove={onTileMove}
                onMouseLeave={onTileLeave}
              >
                <span className="kh-quien-emoji">{q.icon}</span>
                <span className="kh-quien-name">{q.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="kh-section" id="funciones" style={{ background: '#F7F9FF' }}>
        <div className="kh-section-inner">
          <motion.div
            className="kh-section-header"
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
              <span className="kh-tag kh-tag-purple">Funciones</span>
            </motion.span>
            <motion.h2 className="kh-h2" variants={fadeUp} custom={1} style={{ marginTop: 12 }}>
              Todo lo que necesitas,<br />nada de lo que no
            </motion.h2>
            <motion.p className="kh-section-p" variants={fadeUp} custom={2}>
              Cada función está pensada para ahorrarte tiempo real y hacer crecer tu negocio
            </motion.p>
          </motion.div>

          <div className="kh-grid-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="kh-feature-card"
                initial="hidden" whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                custom={i * 0.4}
                onMouseMove={onTileMove}
                onMouseLeave={onTileLeave}
              >
                <div className="kh-feat-icon" style={{ background: f.color + '55' }}>
                  {f.icon}
                </div>
                <div className="kh-feat-title">{f.title}</div>
                <div className="kh-feat-desc">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="kh-section" id="testimonios" style={{ background: '#fff' }}>
        <div className="kh-section-inner">
          <motion.div
            className="kh-section-header"
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
              <span className="kh-tag kh-tag-green">Testimonios</span>
            </motion.span>
            <motion.h2 className="kh-h2" variants={fadeUp} custom={1} style={{ marginTop: 12 }}>
              Lo que dicen los primeros
            </motion.h2>
            <motion.p className="kh-section-p" variants={fadeUp} custom={2}>
              Negocios reales que ya confían en Khepria para gestionar su día a día
            </motion.p>
          </motion.div>

          <div className="kh-grid-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                className="kh-testimonial-card"
                initial="hidden" whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                custom={i * 0.5}
                onMouseMove={onTileMove}
                onMouseLeave={onTileLeave}
              >
                <div className="kh-testi-stars">{'★'.repeat(t.stars)}</div>
                <p className="kh-testi-text">"{t.text}"</p>
                <div className="kh-testi-author">
                  <div className="kh-testi-avatar" style={{ background: t.color + '66' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="kh-testi-name">{t.name}</div>
                    <div className="kh-testi-biz">{t.biz} · {t.city}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section className="kh-plans" id="planes">
        <div className="kh-section-inner">
          <motion.div
            className="kh-section-header"
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
              <span className="kh-tag kh-tag-purple">Precios</span>
            </motion.span>
            <motion.h2 className="kh-h2" variants={fadeUp} custom={1} style={{ marginTop: 12 }}>
              Sin sorpresas. Sin comisiones.
            </motion.h2>
            <motion.p className="kh-section-p" variants={fadeUp} custom={2}>
              Elige el plan que mejor se adapte a tu negocio. Cancela cuando quieras.
            </motion.p>
          </motion.div>

          <div className="kh-grid-4">
            {PLANES.map((p, i) => (
              <motion.div
                key={p.nombre}
                className={`kh-plan-card${p.popular ? ' popular' : ''}`}
                initial="hidden" whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                custom={i * 0.5}
              >
                <div className="kh-plan-badge" style={{ background: p.color + '66', color: p.colorDark }}>
                  {p.badge}
                </div>
                <div className="kh-plan-emoji">{p.emoji}</div>
                <div className="kh-plan-name">{p.nombre}</div>
                <div className="kh-plan-precio">{p.precio}€</div>
                <div className="kh-plan-mes">/ mes · IVA no incluido</div>
                <div className="kh-plan-divider" />
                {p.funciones.map(f => (
                  <div key={f} className="kh-plan-feature">
                    <span className="kh-plan-check">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                <button
                  className="kh-plan-cta"
                  style={{
                    background: p.popular ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : p.color + '55',
                    color: p.popular ? '#fff' : p.colorDark,
                  }}
                  onClick={() => openAuth('registro')}
                >
                  Empezar con {p.nombre} →
                </button>
              </motion.div>
            ))}
          </div>

          {/* Compare table */}
          <motion.div
            style={{ marginTop: 56 }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.7 }}
          >
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#0F0F1A', marginBottom: 20, textAlign: 'center' }}>
              Comparativa completa
            </h3>
            <div className="kh-compare-wrap">
              <table className="kh-compare-tbl">
                <thead>
                  <tr style={{ background: '#FAFBFF' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#374151', borderBottom: '2px solid #F1F5F9' }}>Función</th>
                    {PLANES.map(p => (
                      <th key={p.nombre} className="kh-tbl-head" style={{ borderBottom: '2px solid #F1F5F9', color: p.popular ? '#7C3AED' : '#111827' }}>
                        {p.emoji} {p.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={5} className="kh-tbl-group">Límites del plan</td></tr>
                  {COMPARE.slice(0, 3).map((row, i) => (
                    <tr key={i}>
                      <td className="kh-tbl-feat">{row.feat}</td>
                      <CmpCell val={row.s} /><CmpCell val={row.b} />
                      <CmpCell val={row.p} highlight /><CmpCell val={row.pl} />
                    </tr>
                  ))}
                  <tr><td colSpan={5} className="kh-tbl-group">Funciones incluidas</td></tr>
                  {COMPARE.slice(3, 8).map((row, i) => (
                    <tr key={i}>
                      <td className="kh-tbl-feat">{row.feat}</td>
                      <CmpCell val={row.s} /><CmpCell val={row.b} />
                      <CmpCell val={row.p} highlight /><CmpCell val={row.pl} />
                    </tr>
                  ))}
                  <tr><td colSpan={5} className="kh-tbl-group">Funciones avanzadas</td></tr>
                  {COMPARE.slice(8, 14).map((row, i) => (
                    <tr key={i}>
                      <td className="kh-tbl-feat">{row.feat}</td>
                      <CmpCell val={row.s} /><CmpCell val={row.b} />
                      <CmpCell val={row.p} highlight /><CmpCell val={row.pl} />
                    </tr>
                  ))}
                  <tr><td colSpan={5} className="kh-tbl-group">IA, equipo y fiscalidad</td></tr>
                  {COMPARE.slice(14).map((row, i) => (
                    <tr key={i}>
                      <td className="kh-tbl-feat">{row.feat}</td>
                      <CmpCell val={row.s} /><CmpCell val={row.b} />
                      <CmpCell val={row.p} highlight /><CmpCell val={row.pl} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section className="kh-waitlist" id="waitlist">
        <div className="kh-waitlist-glow" />
        <div className="kh-waitlist-inner">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
              <span className="kh-tag kh-tag-purple">Lista de espera</span>
            </motion.span>
            <motion.h2 className="kh-h2 kh-h2-light" variants={fadeUp} custom={1} style={{ marginTop: 14, fontSize: 'clamp(1.8rem,4.5vw,2.8rem)' }}>
              Sé de los primeros<br />en probarlo
            </motion.h2>
            <motion.p className="kh-section-p kh-p-light" variants={fadeUp} custom={2}>
              Regístrate ahora y te avisamos cuando abramos la beta
            </motion.p>
          </motion.div>

          <motion.div
            className="kh-wl-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
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
          </motion.div>

          {count > 0 && (
            <motion.div
              className="kh-wl-counter"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <span>🏢</span>
              <strong>{displayCount}</strong>
              <span>negocios ya apuntados</span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── PARA CLIENTES ── */}
      <section className="kh-clients">
        <div className="kh-clients-inner">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block', marginBottom: 16 }}>
              <span className="kh-tag kh-tag-green">Para clientes</span>
            </motion.span>
            <motion.h2 className="kh-h2" variants={fadeUp} custom={1}>¿Eres cliente?</motion.h2>
            <motion.p className="kh-lead" variants={fadeUp} custom={2} style={{ margin: '10px auto 24px' }}>
              Descubre y reserva en los mejores negocios cerca de ti,<br />con disponibilidad en tiempo real.
            </motion.p>
            <motion.div variants={fadeUp} custom={3}>
              <a
                href="/cliente"
                style={{
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '18px 36px', borderRadius: 16,
                  background: 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                  color: 'white', fontWeight: 700, fontSize: 17,
                  textDecoration: 'none', boxShadow: '0 6px 28px rgba(107,79,216,0.4)',
                  transition: 'opacity 0.15s',
                }}
              >
                Descubre negocios cerca de ti →
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>
                  Busca, compara y reserva en los mejores negocios de tu zona
                </span>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="kh-footer">
        <div className="kh-footer-wrap">
          <div className="kh-footer-top">
            <div>
              <div className="kh-footer-logo"><em>Kh</em>epria</div>
              <div className="kh-footer-tag">Estamos construyendo algo grande ✨</div>
            </div>
            <div className="kh-footer-links">
              <a href="/cliente" className="kh-footer-a">🗺️ App para clientes</a>
              <a href="mailto:khepriacontact@gmail.com" className="kh-footer-a">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                </svg>
                khepriacontact@gmail.com
              </a>
              <a href="https://instagram.com/khepria_es" target="_blank" rel="noopener noreferrer" className="kh-footer-a">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="ig-kh" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F58529" /><stop offset="50%" stopColor="#DD2A7B" /><stop offset="100%" stopColor="#8134AF" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-kh)" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="url(#ig-kh)" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-kh)" />
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

      {/* ── AUTH MODAL ── */}
      <AnimatePresence>
        {authOpen && (
          <div className="kh-overlay" onClick={e => { if (e.target === e.currentTarget) closeAuth() }}>
            <div className="kh-modal" role="dialog" aria-modal="true">
              <button className="kh-modal-close" onClick={closeAuth} aria-label="Cerrar">✕</button>

              <div className="kh-modal-logo"><em>Kh</em>epria</div>

              {authMode === 'recuperar' ? (
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
      </AnimatePresence>
    </>
  )
}
