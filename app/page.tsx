'use client'

import { useEffect, useRef, useState } from 'react'
import type { WebGLRenderer } from 'three'
import { supabase } from './lib/supabase'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', color: '#B8D8F8', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento. Confirmaciones y recordatorios automáticos sin que muevas un dedo.' },
  { icon: '🤖', color: '#D4C5F9', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde consultas, reserva citas y cancela automáticamente sin intervención humana, a cualquier hora.' },
  { icon: '🧾', color: '#B8EDD4', title: 'Facturación española automática', desc: 'Facturas con IVA, modelos 303, 130 y 111. Compatible con la normativa fiscal española vigente.' },
  { icon: '📊', color: '#FDE9A2', title: 'Analytics con IA', desc: 'Predicciones de ingresos, análisis de clientes y recomendaciones accionables para crecer cada mes.' },
  { icon: '📸', color: '#FBCFE8', title: 'Marketing con IA', desc: 'Posts automáticos para redes, estrategias de captación y calendario editorial generados con IA.' },
  { icon: '👥', color: '#B8D8F8', title: 'Equipo y nóminas', desc: 'Gestiona empleados, turnos, nóminas y contratos SEPE desde el panel de control.' },
]

const QUIENES = [
  { icon: '💈', name: 'Peluquerías\ny barberías' },
  { icon: '💅', name: 'Centros de\nuñas y estética' },
  { icon: '💆', name: 'Spas\ny masajes' },
  { icon: '🏥', name: 'Clínicas\ny consultas' },
  { icon: '🧘', name: 'Yoga\ny pilates' },
  { icon: '🏋️', name: 'Gimnasios\ny entrenadores' },
]

const PLANES = [
  { nombre: 'Starter', precio: '9,99', emoji: '🌱', badge: 'Para empezar', popular: false, color: '#B8EDD4', colorDark: '#2E8A5E', funciones: ['Reservas online 24/7', 'Ficha pública en mapa', 'Chatbot básico', 'Recordatorios automáticos', 'Reseñas post-cita', 'Estadísticas básicas'] },
  { nombre: 'Básico', precio: '29,99', emoji: '🚀', badge: 'Para crecer', popular: false, color: '#B8D8F8', colorDark: '#1D4ED8', funciones: ['Todo lo del Starter', 'Chatbot completo', 'Caja diaria', 'Importador de apps', 'Fidelización con puntos', 'Descuentos y promociones'] },
  { nombre: 'Pro', precio: '59,99', emoji: '💎', badge: 'Más popular', popular: true, color: '#D4C5F9', colorDark: '#6B4FD8', funciones: ['Todo lo del Básico', '2 negocios', 'Gestión de equipo', 'Marketing IA completo', 'Analytics avanzado', 'Facturación e IVA'] },
  { nombre: 'Plus', precio: '99,99', emoji: '⚡', badge: 'Para escalar', popular: false, color: '#FDE9A2', colorDark: '#C4860A', funciones: ['Todo lo del Pro', 'Hasta 10 negocios', 'Nóminas + plantillas SEPE', 'Contratos SEPE oficiales', 'Kit gestor PDF/CSV', 'Soporte prioritario'] },
]

const TIPOS_NEGOCIO = [
  'Peluquería / Barbería', 'Centro de estética / Uñas', 'Spa / Masajes',
  'Clínica / Consulta médica', 'Yoga / Pilates', 'Gimnasio / Entrenador personal',
  'Dentista', 'Veterinaria', 'Otro tipo de negocio',
]

// ── FRAMER VARIANTS ───────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (d: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: 'easeOut' as const, delay: d },
  }),
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }

// ── TILT CARD ─────────────────────────────────────────────────────────────────

function TiltCard({ children, className, style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.transform = `perspective(800px) rotateX(${y * -12}deg) rotateY(${x * 12}deg) scale(1.02)`
    ref.current.style.transition = 'transform 0.05s ease'
  }
  const onLeave = () => {
    if (!ref.current) return
    ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)'
    ref.current.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1)'
  }
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  )
}

// ── ANIMATED COUNTER ─────────────────────────────────────────────────────────

function AnimCount({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let cur = 0
    const inc = end / 55
    const timer = setInterval(() => {
      cur = Math.min(cur + inc, end)
      setN(Math.round(cur))
      if (cur >= end) clearInterval(timer)
    }, 18)
    return () => clearInterval(timer)
  }, [inView, end])
  return <span ref={ref}>{prefix}{n}{suffix}</span>
}

// ── DIAMOND LOGO 3D ───────────────────────────────────────────────────────────

function DiamondLogo3D() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false, animId = 0
    let renderer: WebGLRenderer | null = null
    let onResize: (() => void) | null = null

    import('three').then((THREE) => {
      if (disposed) return
      const w = mount.offsetWidth || 380
      const h = mount.offsetHeight || 380

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
      camera.position.z = 5

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      mount.appendChild(renderer.domElement)

      // Lighting
      scene.add(new THREE.AmbientLight(0x334466, 2))
      const pl1 = new THREE.PointLight(0xAA88FF, 3, 8)
      const pl2 = new THREE.PointLight(0x66BBFF, 3, 8)
      pl1.position.set(3, 3, 2)
      pl2.position.set(-3, -3, 2)
      scene.add(pl1, pl2)
      const orb1 = new THREE.PointLight(0xFFFFFF, 2.5, 5)
      const orb2 = new THREE.PointLight(0xAADDFF, 2, 5)
      scene.add(orb1, orb2)

      // Helper: torus ring
      const mkRing = (
        outerR: number, innerR: number,
        col: number, emi: number, opa: number,
        tiltX: number
      ) => {
        const radius = (outerR + innerR) / 2
        const tube = (outerR - innerR) / 2
        const geo = new THREE.TorusGeometry(radius, tube, 12, 80)
        const mat = new THREE.MeshPhongMaterial({
          color: col, emissive: emi, emissiveIntensity: 0.4,
          transparent: true, opacity: opa, shininess: 130,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.rotation.x = tiltX
        return mesh
      }

      // d1: outer=1.5, inner=1.14 → right
      const d1 = mkRing(1.5, 1.14, 0xAA88FF, 0x6633CC, 0.80, 0)
      // d2: outer=1.09, inner=0.74 → left
      const d2 = mkRing(1.09, 0.74, 0x66BBFF, 0x2255AA, 0.85, Math.PI / 3)
      // d3: outer=0.71, inner=0.42 → right
      const d3 = mkRing(0.71, 0.42, 0xCCEEFF, 0x4488CC, 0.92, -Math.PI / 3)
      scene.add(d1, d2, d3)

      // Central sphere — pulsing
      const sphereGeo = new THREE.SphereGeometry(0.18, 32, 32)
      const sphereMat = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF, emissive: 0x9988FF, emissiveIntensity: 0.5, shininess: 200,
      })
      const sphere = new THREE.Mesh(sphereGeo, sphereMat)
      scene.add(sphere)

      let t = 0
      const animate = () => {
        if (disposed) return
        animId = requestAnimationFrame(animate)
        t += 0.008
        // Ring rotations: d1→, d2←, d3→
        d1.rotation.z += 0.005
        d2.rotation.z -= 0.004
        d3.rotation.z += 0.006
        // Pulse sphere
        const s = 1 + Math.sin(t * 2.5) * 0.15
        sphere.scale.setScalar(s)
        sphereMat.emissiveIntensity = 0.3 + Math.sin(t * 2.5) * 0.3
        // Orbit lights for metallic sheen
        orb1.position.set(Math.cos(t) * 3, Math.sin(t) * 3, 1.5)
        orb2.position.set(Math.cos(t + Math.PI) * 3, Math.sin(t + Math.PI) * 3, -1.5)
        renderer!.render(scene, camera)
      }
      animate()

      onResize = () => {
        if (!mount || !renderer) return
        const nw = mount.offsetWidth, nh = mount.offsetHeight
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

// ── HOME ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Waitlist
  const [count, setCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [form, setForm] = useState({ nombre: '', email: '', tipo_negocio: '', ciudad: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [formError, setFormError] = useState('')

  // Cursor
  const [cursor, setCursor] = useState({ x: -100, y: -100 })
  const [cursorVis, setCursorVis] = useState(false)

  // Parallax
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, -100])
  const heroOp = useTransform(scrollY, [0, 450], [1, 0.4])
  const navShadow = useTransform(scrollY, [0, 60], [
    'rgba(247,249,255,0)',
    'rgba(247,249,255,0.95)',
  ])

  // Effects
  useEffect(() => {
    supabase.from('waitlist').select('*', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0))
  }, [])

  useEffect(() => {
    if (count === 0) return
    let cur = 0
    const step = Math.max(1, Math.ceil(count / 80))
    const t = setInterval(() => {
      cur = Math.min(cur + step, count)
      setDisplayCount(cur)
      if (cur >= count) clearInterval(t)
    }, 20)
    return () => clearInterval(t)
  }, [count])

  useEffect(() => {
    const move = (e: MouseEvent) => { setCursor({ x: e.clientX, y: e.clientY }); setCursorVis(true) }
    const leave = () => setCursorVis(false)
    window.addEventListener('mousemove', move)
    document.documentElement.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('mousemove', move)
      document.documentElement.removeEventListener('mouseleave', leave)
    }
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
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
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── GRAIN ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 997, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '300px 300px',
        opacity: 0.022, mixBlendMode: 'overlay',
      }} />

      {/* ── CURSOR ── */}
      <div aria-hidden style={{
        position: 'fixed',
        left: cursor.x - 18, top: cursor.y - 18,
        width: 36, height: 36, borderRadius: '50%',
        border: '1.5px solid rgba(124,92,239,0.55)',
        background: 'rgba(124,92,239,0.09)',
        pointerEvents: 'none', zIndex: 9999,
        transition: 'left 0.07s linear, top 0.07s linear, opacity 0.3s',
        opacity: cursorVis ? 1 : 0,
      }} />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif !important; background: #F7F9FF; color: #111827; overflow-x: hidden; }

        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes flowDown {
          0%   { top: -5%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 0.85; }
          100% { top: 105%; opacity: 0; }
        }
        @keyframes nodePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,92,239,0.4); }
          50%     { box-shadow: 0 0 0 8px rgba(124,92,239,0); }
        }
        @keyframes heroBg {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(40px,-30px) scale(1.06); }
          66%     { transform: translate(-30px,40px) scale(0.96); }
        }

        /* ── Nav ── */
        .kh-nav { position:fixed; top:0; left:0; right:0; z-index:200; }
        .kh-nav-inner { max-width:1180px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .kh-logo { font-family:'Syne',sans-serif; font-size:clamp(18px,2.5vw,22px); font-weight:800; color:#111827; text-decoration:none; letter-spacing:-0.5px; flex-shrink:0; cursor:pointer; display:flex; align-items:center; gap:8px; }
        .kh-logo em { font-style:normal; color:#7C5CEF; }
        .kh-logo-gem { width:20px; height:20px; flex-shrink:0; }
        .kh-nav-links { display:flex; gap:2px; align-items:center; }
        .kh-nav-btn { font-size:14px; font-weight:600; color:#374151; padding:8px 14px; border-radius:8px; cursor:pointer; border:none; background:none; font-family:'DM Sans',sans-serif; transition:background 0.2s,color 0.2s; white-space:nowrap; }
        .kh-nav-btn:hover { background:#F3F4F6; color:#111827; }
        .kh-nav-login { font-size:14px; font-weight:600; color:#374151; padding:9px 18px; border-radius:999px; border:1.5px solid #E5E7EB; cursor:pointer; background:#fff; font-family:'DM Sans',sans-serif; white-space:nowrap; text-decoration:none; transition:border-color 0.2s,transform 0.2s; }
        .kh-nav-login:hover { border-color:#D4C5F9; transform:translateY(-1px); }
        .kh-nav-cta { font-size:14px; font-weight:700; color:#fff; background:linear-gradient(135deg,#7C5CEF,#4F46E5); padding:10px 22px; border-radius:999px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; text-decoration:none; flex-shrink:0; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-nav-cta:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(124,92,239,0.4); }
        .kh-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; border:none; background:none; padding:6px; flex-shrink:0; }
        .kh-hamburger span { display:block; width:22px; height:2px; background:#111827; border-radius:2px; }
        .kh-mobile { display:none; flex-direction:column; gap:4px; padding:8px 16px 16px; border-top:1px solid rgba(0,0,0,0.06); background:rgba(247,249,255,0.98); animation:slideDown 0.25s ease; }
        .kh-mobile.open { display:flex; }
        .kh-mobile-btn { font-size:15px; font-weight:600; color:#374151; padding:13px 12px; border-radius:10px; cursor:pointer; border:none; background:none; text-align:left; font-family:'DM Sans',sans-serif; }
        .kh-mobile-btn:hover { background:#F3F4F6; }

        /* ── Energy column ── */
        .energy-wrap { position:absolute; left:50%; top:0; transform:translateX(-50%); width:20px; height:100%; z-index:0; pointer-events:none; display:none; }
        @media(min-width:768px) { .energy-wrap { display:block; } }
        .energy-line { position:absolute; left:50%; transform:translateX(-50%); top:0; height:100%; width:2px; background:linear-gradient(to bottom, rgba(124,92,239,0.18), rgba(79,172,254,0.12), rgba(184,237,212,0.1), rgba(124,92,239,0.08)); }
        .energy-dot { position:absolute; left:50%; transform:translateX(-50%); width:7px; height:7px; border-radius:50%; animation:flowDown var(--dur) linear var(--del) infinite; }
        .energy-node { position:absolute; left:50%; transform:translate(-50%,-50%); width:14px; height:14px; border-radius:50%; background:rgba(124,92,239,0.25); border:1.5px solid rgba(124,92,239,0.45); animation:nodePulse 2.5s ease-in-out infinite; }

        /* ── Hero ── */
        .kh-hero { min-height:100svh; display:flex; align-items:center; justify-content:center; text-align:center; padding:120px 24px 80px; position:relative; overflow:hidden; }
        .kh-hero-bg { position:absolute; inset:-60px; background:radial-gradient(ellipse 70% 60% at 40% 40%, rgba(184,216,248,0.22) 0%,transparent 60%), radial-gradient(ellipse 50% 50% at 75% 65%, rgba(212,197,249,0.2) 0%,transparent 55%), #F7F9FF; animation:heroBg 12s ease-in-out infinite; z-index:0; }
        .kh-hero-inner { position:relative; z-index:1; max-width:760px; margin:0 auto; }
        .kh-diamond-wrap { width:clamp(240px,40vw,380px); height:clamp(240px,40vw,380px); margin:0 auto 32px; }
        .kh-tag { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; letter-spacing:0.3px; padding:6px 14px; border-radius:999px; }
        .kh-tag-purple { background:rgba(124,92,239,0.1); color:#7C5CEF; border:1px solid rgba(124,92,239,0.2); }
        .kh-tag-blue { background:rgba(184,216,248,0.4); color:#1D4ED8; border:1px solid rgba(184,216,248,0.6); }
        .kh-tag-green { background:rgba(184,237,212,0.4); color:#2E8A5E; border:1px solid rgba(184,237,212,0.6); }
        .kh-h1 { font-family:'Syne',sans-serif; font-size:clamp(2.2rem,5.5vw,3.8rem); font-weight:800; line-height:1.1; letter-spacing:-2px; color:#0F0F1A; margin:18px 0 16px; }
        .kh-h1 .accent { color:#7C5CEF; }
        .kh-h2 { font-family:'Syne',sans-serif; font-size:clamp(1.6rem,3.5vw,2.6rem); font-weight:800; line-height:1.15; letter-spacing:-1px; color:#0F0F1A; margin-bottom:14px; }
        .kh-lead { font-size:clamp(14px,2vw,17px); color:#6B7280; line-height:1.75; max-width:540px; margin:0 auto; }
        .kh-hero-btns { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin-top:32px; }
        .kh-btn-primary { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; border-radius:14px; background:linear-gradient(135deg,#7C5CEF,#4F46E5); color:#fff; font-size:15px; font-weight:700; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; text-decoration:none; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(124,92,239,0.45); }
        .kh-btn-secondary { display:inline-flex; align-items:center; gap:8px; padding:14px 24px; border-radius:14px; background:#fff; color:#374151; font-size:15px; font-weight:600; font-family:'DM Sans',sans-serif; border:1.5px solid #E5E7EB; cursor:pointer; text-decoration:none; transition:border-color 0.2s,transform 0.2s; }
        .kh-btn-secondary:hover { border-color:#D4C5F9; transform:translateY(-2px); }

        /* ── Section commons ── */
        .kh-section { padding:100px 24px; position:relative; z-index:1; }
        .kh-section-inner { max-width:1180px; margin:0 auto; }
        .kh-section-header { text-align:center; max-width:620px; margin:0 auto 56px; }
        .kh-section-p { font-size:15px; color:#6B7280; line-height:1.75; margin-top:12px; }

        /* ── Stats ── */
        .kh-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; background:#fff; border-top:1px solid #F1F5F9; border-bottom:1px solid #F1F5F9; }
        .kh-stat { display:flex; flex-direction:column; align-items:center; padding:32px 20px; gap:4px; border-right:1px solid #F1F5F9; transition:background 0.2s; }
        .kh-stat:last-child { border-right:none; }
        .kh-stat:hover { background:#FAFBFF; }
        .kh-stat-icon { font-size:22px; margin-bottom:6px; }
        .kh-stat-num { font-family:'Syne',sans-serif; font-size:clamp(1.8rem,3vw,2.4rem); font-weight:800; letter-spacing:-1.5px; color:#0F0F1A; }
        .kh-stat-label { font-size:13px; color:#9CA3AF; font-weight:500; text-align:center; }

        /* ── Feature cards ── */
        .kh-feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .kh-feat-card { background:#fff; border:1px solid #F1F5F9; border-radius:20px; padding:28px; cursor:default; }
        .kh-feat-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:16px; }
        .kh-feat-title { font-size:15px; font-weight:700; color:#111827; margin-bottom:8px; }
        .kh-feat-desc { font-size:13px; color:#6B7280; line-height:1.7; }

        /* ── Para quién ── */
        .kh-quien-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; }
        .kh-quien-card { background:#fff; border:1px solid #F1F5F9; border-radius:16px; padding:24px 12px; text-align:center; cursor:default; }
        .kh-quien-emoji { font-size:34px; margin-bottom:10px; display:block; }
        .kh-quien-name { font-size:12px; font-weight:600; color:#374151; line-height:1.4; white-space:pre-line; }

        /* ── Planes ── */
        .kh-planes-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .kh-plan-card { background:#fff; border:2px solid #F1F5F9; border-radius:24px; padding:28px; display:flex; flex-direction:column; position:relative; overflow:hidden; }
        .kh-plan-card.popular { border-color:#7C5CEF; box-shadow:0 8px 32px rgba(124,92,239,0.15); }
        .kh-plan-badge { position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; }
        .kh-plan-emoji { font-size:32px; margin-bottom:12px; }
        .kh-plan-name { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#111827; }
        .kh-plan-price { font-family:'Syne',sans-serif; font-size:36px; font-weight:800; color:#0F0F1A; margin:12px 0 4px; letter-spacing:-1px; }
        .kh-plan-mes { font-size:13px; color:#9CA3AF; margin-bottom:16px; }
        .kh-plan-divider { height:1px; background:#F1F5F9; margin:14px 0; }
        .kh-plan-feat { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#4B5563; margin-bottom:9px; }
        .kh-plan-check { color:#16A34A; font-weight:800; flex-shrink:0; margin-top:1px; }
        .kh-plan-cta { display:block; width:100%; margin-top:auto; padding-top:20px; padding-bottom:0; }
        .kh-plan-btn { display:block; width:100%; padding:13px; border-radius:12px; border:none; cursor:pointer; font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; text-align:center; text-decoration:none; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-plan-btn:hover { transform:translateY(-1px); }
        .kh-plan-note { font-size:11px; color:#9CA3AF; text-align:center; margin-top:16px; }

        /* ── Cliente CTA ── */
        .kh-cliente { padding:80px 24px; background:linear-gradient(135deg,rgba(184,216,248,0.3),rgba(212,197,249,0.2)); text-align:center; position:relative; z-index:1; }

        /* ── Waitlist ── */
        .kh-waitlist { padding:100px 24px; background:linear-gradient(160deg,#0F0F1A,#1a1040); position:relative; z-index:1; overflow:hidden; }
        .kh-wl-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 50% 60% at 50% 50%, rgba(124,92,239,0.18) 0%,transparent 70%); }
        .kh-wl-inner { max-width:560px; margin:0 auto; text-align:center; position:relative; z-index:1; }
        .kh-wl-form { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:32px; margin-top:36px; backdrop-filter:blur(10px); }
        .kh-wl-grid { display:flex; flex-direction:column; gap:12px; }
        .kh-input { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:13px 16px; color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; width:100%; transition:border-color 0.2s; }
        .kh-input::placeholder { color:rgba(255,255,255,0.35); }
        .kh-input:focus { border-color:rgba(124,92,239,0.6); }
        .kh-input option { background:#1a1040; color:#fff; }
        .kh-wl-submit { width:100%; padding:14px; border-radius:12px; border:none; cursor:pointer; background:linear-gradient(135deg,#7C5CEF,#4F46E5); color:#fff; font-size:15px; font-weight:700; font-family:'DM Sans',sans-serif; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-wl-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 24px rgba(124,92,239,0.45); }
        .kh-wl-submit:disabled { opacity:0.7; cursor:not-allowed; }
        .kh-wl-counter { margin-top:22px; display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:9px 20px; font-size:14px; font-weight:600; color:rgba(255,255,255,0.8); }
        .kh-wl-ok { padding:24px 0; text-align:center; }
        .kh-wl-ok-ico { font-size:48px; margin-bottom:12px; }
        .kh-wl-ok-t { font-size:20px; font-weight:700; color:#fff; margin-bottom:8px; }
        .kh-wl-ok-p { font-size:14px; color:rgba(255,255,255,0.6); line-height:1.6; }
        .kh-form-err { margin-top:10px; font-size:13px; color:#FCA5A5; }

        /* ── Footer ── */
        .kh-footer { background:#0A0A0F; padding:40px 24px 28px; position:relative; z-index:1; }
        .kh-footer-wrap { max-width:1180px; margin:0 auto; }
        .kh-footer-top { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; flex-wrap:wrap; margin-bottom:28px; }
        .kh-footer-logo { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
        .kh-footer-logo em { font-style:normal; color:#7C5CEF; }
        .kh-footer-tag { font-size:13px; color:rgba(255,255,255,0.4); margin-top:4px; }
        .kh-footer-links { display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
        .kh-footer-a { font-size:13px; color:rgba(255,255,255,0.5); text-decoration:none; display:flex; align-items:center; gap:6px; transition:color 0.2s; }
        .kh-footer-a:hover { color:#fff; }
        .kh-footer-bot { border-top:1px solid rgba(255,255,255,0.07); padding-top:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .kh-footer-copy { font-size:12px; color:rgba(255,255,255,0.3); }
        .kh-footer-legal { display:flex; gap:16px; flex-wrap:wrap; }
        .kh-footer-legal a { font-size:12px; color:rgba(255,255,255,0.3); text-decoration:none; transition:color 0.2s; }
        .kh-footer-legal a:hover { color:rgba(255,255,255,0.7); }

        /* ── Mobile carousels ── */
        .kh-carousel { display:flex; gap:16px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:8px; -webkit-overflow-scrolling:touch; }
        .kh-carousel::-webkit-scrollbar { height:4px; }
        .kh-carousel::-webkit-scrollbar-track { background:transparent; }
        .kh-carousel::-webkit-scrollbar-thumb { background:rgba(124,92,239,0.2); border-radius:2px; }
        .kh-carousel-item { scroll-snap-align:start; flex-shrink:0; }

        /* ── Responsive ── */
        @media(max-width:900px) {
          .kh-feat-grid { grid-template-columns:1fr 1fr; }
          .kh-planes-grid { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:16px; padding-bottom:12px; }
          .kh-plan-card { min-width:260px; scroll-snap-align:start; }
          .kh-stats-grid { grid-template-columns:1fr 1fr; }
          .kh-stat { border-right:none; border-bottom:1px solid #F1F5F9; }
          .kh-stat:nth-child(odd) { border-right:1px solid #F1F5F9; }
          .kh-nav-links { display:none; }
          .kh-hamburger { display:flex; }
          .kh-quien-grid { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:12px; padding-bottom:8px; }
          .kh-quien-card { min-width:130px; scroll-snap-align:start; }
        }
        @media(max-width:600px) {
          .kh-feat-grid { grid-template-columns:1fr; }
          .kh-hero-btns { flex-direction:column; align-items:center; }
          .kh-btn-primary, .kh-btn-secondary { width:100%; justify-content:center; }
          .kh-section { padding:64px 20px; }
          .kh-waitlist, .kh-cliente { padding:64px 20px; }
          .kh-footer-top { flex-direction:column; }
          .kh-footer-bot { flex-direction:column; align-items:flex-start; }
          .kh-stats-grid { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav className="kh-nav" style={{ background: navShadow, backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="kh-nav-inner">
          <span className="kh-logo" onClick={() => scrollTo('hero')}>
            {/* Diamond SVG logo */}
            <svg className="kh-logo-gem" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L20 9L12 22L4 9Z" stroke="#7C5CEF" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(124,92,239,0.12)" />
              <path d="M12 2L20 9L4 9Z" stroke="#7C5CEF" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(124,92,239,0.2)" />
              <circle cx="12" cy="9" r="2" fill="#7C5CEF" opacity="0.6" />
            </svg>
            <em>Kh</em>epria
          </span>

          <div className="kh-nav-links">
            <button className="kh-nav-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('quien')}>Para quién</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('planes')}>Planes</button>
            <a href="/cliente" className="kh-nav-btn" style={{ textDecoration: 'none' }}>Explorar negocios</a>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href="/auth" className="kh-nav-login">Iniciar sesión</a>
            <a href="/auth" className="kh-nav-cta">Registrarme</a>
          </div>

          <button className="kh-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
            <span /><span /><span />
          </button>
        </div>

        <div className={`kh-mobile ${menuOpen ? 'open' : ''}`}>
          <button className="kh-mobile-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('quien')}>Para quién</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('planes')}>Planes</button>
          <a href="/cliente" className="kh-mobile-btn" style={{ textDecoration: 'none' }}>Explorar negocios</a>
          <a href="/auth" className="kh-mobile-btn" style={{ textDecoration: 'none', color: '#7C5CEF', fontWeight: 700 }}>Registrarme →</a>
        </div>
      </motion.nav>

      {/* ── MAIN CONTENT WITH ENERGY COLUMN ── */}
      <div style={{ position: 'relative' }}>

        {/* Energy Column */}
        <div className="energy-wrap" aria-hidden>
          <div className="energy-line" />
          {[
            { del: '0s', dur: '5s', col: '#7C5CEF' },
            { del: '1.2s', dur: '6s', col: '#4FACFE' },
            { del: '2.5s', dur: '4.5s', col: '#B8EDD4' },
            { del: '3.8s', dur: '5.5s', col: '#D4C5F9' },
            { del: '0.7s', dur: '7s', col: '#FDE9A2' },
          ].map((p, i) => (
            <div key={i} className="energy-dot" style={{ '--del': p.del, '--dur': p.dur, background: p.col } as React.CSSProperties} />
          ))}
          {/* Section nodes */}
          <div className="energy-node" style={{ top: '20%' }} />
          <div className="energy-node" style={{ top: '38%' }} />
          <div className="energy-node" style={{ top: '58%' }} />
          <div className="energy-node" style={{ top: '75%' }} />
          <div className="energy-node" style={{ top: '88%' }} />
        </div>

        {/* ── HERO ── */}
        <section className="kh-hero" id="hero">
          <div className="kh-hero-bg" />
          <motion.div className="kh-hero-inner" style={{ y: heroY, opacity: heroOp }}>
            <motion.div initial="hidden" animate="visible" variants={stagger}>

              {/* Diamond 3D */}
              <motion.div
                className="kh-diamond-wrap"
                variants={fadeUp} custom={0}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' as const }}
              >
                <DiamondLogo3D />
              </motion.div>

              <motion.div variants={fadeUp} custom={0.1} style={{ display: 'inline-block' }}>
                <span className="kh-tag kh-tag-purple">✨ La IA fusionada con tu negocio</span>
              </motion.div>

              <motion.h1 className="kh-h1" variants={fadeUp} custom={0.2}>
                El corazón que une<br />la <span className="accent">IA</span> y tu negocio
              </motion.h1>

              <motion.p className="kh-lead" variants={fadeUp} custom={0.3}>
                Khepria se fusiona con tu negocio para ser uno solo.<br />Crecen juntos.
              </motion.p>

              <motion.div className="kh-hero-btns" variants={fadeUp} custom={0.4}>
                <a href="/auth" className="kh-btn-primary">Registrar mi negocio →</a>
                <a href="/cliente" className="kh-btn-secondary">Explorar negocios</a>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── STATS ── */}
        <section style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            className="kh-stats-grid"
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            {[
              { icon: '⏱️', num: 3, suffix: 'h', label: 'ahorradas al día', color: '#B8D8F8' },
              { icon: '📈', num: 40, prefix: '+', suffix: '%', label: 'más reservas', color: '#D4C5F9' },
              { icon: '🤖', label: 'atención automática', color: '#B8EDD4', static: '24/7' },
              { icon: '💰', num: 0, suffix: '€', label: 'en gestores de IVA', color: '#FDE9A2' },
            ].map((s, i) => (
              <motion.div key={i} className="kh-stat" variants={fadeUp} custom={i * 0.1}>
                <span className="kh-stat-icon">{s.icon}</span>
                <span className="kh-stat-num" style={{ color: s.color === '#FDE9A2' ? '#0F0F1A' : '#0F0F1A' }}>
                  {'static' in s && s.static
                    ? s.static
                    : <AnimCount end={s.num ?? 0} prefix={'prefix' in s ? s.prefix : ''} suffix={s.suffix ?? ''} />}
                </span>
                <span className="kh-stat-label">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── FUNCIONES ── */}
        <section className="kh-section" id="funciones" style={{ background: '#F7F9FF' }}>
          <div className="kh-section-inner">
            <motion.div className="kh-section-header" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
              <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
                <span className="kh-tag kh-tag-purple">Funciones</span>
              </motion.span>
              <motion.h2 className="kh-h2" variants={fadeUp} custom={0.1} style={{ marginTop: 12 }}>
                Todo lo que necesitas,<br />nada de lo que no
              </motion.h2>
              <motion.p className="kh-section-p" variants={fadeUp} custom={0.2}>
                Cada función está pensada para ahorrarte tiempo real y hacer crecer tu negocio
              </motion.p>
            </motion.div>

            <div className="kh-feat-grid">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeUp} custom={i * 0.08}
                >
                  <TiltCard className="kh-feat-card">
                    <div className="kh-feat-icon" style={{ background: f.color + '55' }}>{f.icon}</div>
                    <div className="kh-feat-title">{f.title}</div>
                    <div className="kh-feat-desc">{f.desc}</div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PARA QUIÉN ── */}
        <section className="kh-section" id="quien" style={{ background: '#fff' }}>
          <div className="kh-section-inner">
            <motion.div className="kh-section-header" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
              <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
                <span className="kh-tag kh-tag-blue">¿Para quién?</span>
              </motion.span>
              <motion.h2 className="kh-h2" variants={fadeUp} custom={0.1} style={{ marginTop: 12 }}>
                Diseñado para tu tipo<br />de negocio
              </motion.h2>
              <motion.p className="kh-section-p" variants={fadeUp} custom={0.2}>
                Khepria se adapta a cualquier negocio de servicios que trabaje con citas
              </motion.p>
            </motion.div>

            <div className="kh-quien-grid">
              {QUIENES.map((q, i) => (
                <motion.div
                  key={q.name}
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp} custom={i * 0.07}
                >
                  <TiltCard className="kh-quien-card">
                    <span className="kh-quien-emoji">{q.icon}</span>
                    <span className="kh-quien-name">{q.name}</span>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLANES ── */}
        <section className="kh-section" id="planes" style={{ background: '#F7F9FF' }}>
          <div className="kh-section-inner">
            <motion.div className="kh-section-header" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
              <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
                <span className="kh-tag kh-tag-purple">Planes</span>
              </motion.span>
              <motion.h2 className="kh-h2" variants={fadeUp} custom={0.1} style={{ marginTop: 12 }}>
                Sin sorpresas. Sin comisiones.
              </motion.h2>
              <motion.p className="kh-section-p" variants={fadeUp} custom={0.2}>
                Elige el plan que mejor se adapte. Cancela cuando quieras.
              </motion.p>
            </motion.div>

            <div className="kh-planes-grid">
              {PLANES.map((p, i) => (
                <motion.div
                  key={p.nombre}
                  initial="hidden" whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeUp} custom={i * 0.1}
                >
                  <TiltCard className={`kh-plan-card ${p.popular ? 'popular' : ''}`}>
                    <div className="kh-plan-badge" style={{ background: p.color + '66', color: p.colorDark }}>
                      {p.badge}
                    </div>
                    <div className="kh-plan-emoji">{p.emoji}</div>
                    <div className="kh-plan-name">{p.nombre}</div>
                    <div className="kh-plan-price">{p.precio}€</div>
                    <div className="kh-plan-mes">/ mes · IVA no incluido</div>
                    <div className="kh-plan-divider" />
                    {p.funciones.map(f => (
                      <div key={f} className="kh-plan-feat">
                        <span className="kh-plan-check">✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    <div className="kh-plan-cta">
                      <a
                        href="/auth"
                        className="kh-plan-btn"
                        style={{
                          background: p.popular ? 'linear-gradient(135deg,#7C5CEF,#4F46E5)' : p.color + '55',
                          color: p.popular ? '#fff' : p.colorDark,
                        }}
                      >
                        Empezar con {p.nombre} →
                      </a>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
            <p className="kh-plan-note" style={{ marginTop: 24 }}>* Precios orientativos. No se realiza ningún cargo durante el registro.</p>
          </div>
        </section>

        {/* ── PARA CLIENTES ── */}
        <section className="kh-cliente">
          <motion.div
            style={{ maxWidth: 600, margin: '0 auto' }}
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block', marginBottom: 16 }}>
              <span className="kh-tag kh-tag-green">Para clientes</span>
            </motion.span>
            <motion.h2 className="kh-h2" variants={fadeUp} custom={0.1}>¿Eres cliente?</motion.h2>
            <motion.p className="kh-lead" variants={fadeUp} custom={0.2} style={{ margin: '12px auto 28px' }}>
              Descubre y reserva en los mejores negocios cerca de ti, con disponibilidad en tiempo real.
            </motion.p>
            <motion.div variants={fadeUp} custom={0.3}>
              <a
                href="/cliente"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '16px 32px', borderRadius: 14,
                  background: 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                  textDecoration: 'none', boxShadow: '0 6px 28px rgba(107,79,216,0.35)',
                  transition: 'opacity 0.15s',
                }}
              >
                Explorar negocios →
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ── WAITLIST ── */}
        <section className="kh-waitlist" id="waitlist">
          <div className="kh-wl-glow" />
          <div className="kh-wl-inner">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
              <motion.span variants={fadeUp} custom={0} style={{ display: 'inline-block' }}>
                <span className="kh-tag kh-tag-purple">Lista de espera</span>
              </motion.span>
              <motion.h2
                variants={fadeUp} custom={0.1}
                style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.8rem,4.5vw,2.8rem)', fontWeight: 800, color: '#fff', letterSpacing: -1, margin: '16px 0 10px' }}
              >
                Sé de los primeros<br />en probarlo
              </motion.h2>
              <motion.p variants={fadeUp} custom={0.2} style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                Regístrate ahora y te avisamos cuando abramos la beta
              </motion.p>
            </motion.div>

            <motion.div
              className="kh-wl-form"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {enviado ? (
                <div className="kh-wl-ok">
                  <div className="kh-wl-ok-ico">🎉</div>
                  <div className="kh-wl-ok-t">¡Apuntado!</div>
                  <p className="kh-wl-ok-p">Te avisaremos muy pronto cuando abramos la beta.</p>
                </div>
              ) : (
                <form onSubmit={handleWaitlist}>
                  <div className="kh-wl-grid">
                    <input className="kh-input" type="text" placeholder="Tu nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoComplete="name" />
                    <input className="kh-input" type="email" placeholder="Tu email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoComplete="email" />
                    <select className="kh-input" value={form.tipo_negocio} onChange={e => setForm(f => ({ ...f, tipo_negocio: e.target.value }))}>
                      <option value="">Tipo de negocio</option>
                      {TIPOS_NEGOCIO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="kh-input" type="text" placeholder="Ciudad" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} autoComplete="address-level2" />
                    <button className="kh-wl-submit" type="submit" disabled={enviando}>
                      {enviando ? 'Guardando...' : 'Unirme a la lista de espera →'}
                    </button>
                  </div>
                  {formError && <p className="kh-form-err">{formError}</p>}
                </form>
              )}
            </motion.div>

            {count > 0 && (
              <motion.div className="kh-wl-counter" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
                <span>🏢</span>
                <strong>{displayCount}</strong>
                <span>negocios ya apuntados</span>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="kh-footer">
          <div className="kh-footer-wrap">
            <div className="kh-footer-top">
              <div>
                <div className="kh-footer-logo"><em>Kh</em>epria</div>
                <div className="kh-footer-tag">La IA que fusiona con tu negocio ✨</div>
              </div>
              <div className="kh-footer-links">
                <a href="/cliente" className="kh-footer-a">🗺️ Explorar negocios</a>
                <a href="mailto:khepriacontact@gmail.com" className="kh-footer-a">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                  </svg>
                  khepriacontact@gmail.com
                </a>
                <a href="https://instagram.com/khepria_es" target="_blank" rel="noopener noreferrer" className="kh-footer-a">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <defs>
                      <linearGradient id="ig-f" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#F58529" /><stop offset="50%" stopColor="#DD2A7B" /><stop offset="100%" stopColor="#8134AF" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-f)" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4" stroke="url(#ig-f)" strokeWidth="2" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-f)" />
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

      </div>{/* end energy wrapper */}
    </>
  )
}
