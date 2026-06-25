'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { AnimatePresence } from 'framer-motion'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FUNCIONES = [
  { icon: '📅', label: 'Reservas',     title: 'Reservas automáticas 24/7',       desc: 'Tus clientes reservan, modifican y cancelan solos. Sin llamadas, sin WhatsApps. Confirmaciones y recordatorios automáticos por WhatsApp.', color: '#4FACFE' },
  { icon: '🤖', label: 'Chatbot',      title: 'IA que trabaja mientras duermes', desc: 'Responde consultas, gestiona citas y cobra automáticamente en WhatsApp e Instagram. El chatbot trabaja 24/7 sin que toques el móvil.', color: '#D4C5F9' },
  { icon: '🧾', label: 'Facturación',  title: 'Facturas e IVA sin gestor',       desc: 'Facturas con IVA, modelos 303, 130 y 111 automáticos. Cumple con Hacienda sin estrés ni coste extra.',       color: '#40DCA5' },
  { icon: '📊', label: 'Analytics',    title: 'IA predictiva de ingresos',       desc: 'Sabe cuánto vas a ingresar antes de que ocurra. Detecta clientes en riesgo y recomienda acciones concretas.',  color: '#FDE9A2' },
  { icon: '📸', label: 'Marketing',    title: 'Posts automáticos en redes',      desc: 'Genera y publica contenido en Instagram automáticamente. Estrategia de captación lista en segundos con IA.',     color: '#FBCFE8' },
  { icon: '👥', label: 'Equipo',       title: 'Nóminas y contratos oficiales',   desc: 'Turnos, nóminas y contratos SEPE generados automáticamente. Sin errores, sin papel, sin gestor laboral.',        color: '#B8D8F8' },
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
  { nombre: 'Starter', precio: '9,99',  emoji: '🌱', badge: 'Para empezar', popular: false, color: '#B8EDD4', colorDark: '#2E8A5E', funciones: ['Reservas online 24/7', 'Ficha pública en mapa', 'Chatbot básico', 'Recordatorios automáticos', 'Reseñas post-cita', 'Estadísticas básicas'] },
  { nombre: 'Básico',  precio: '29,99', emoji: '🚀', badge: 'Para crecer',  popular: false, color: '#B8D8F8', colorDark: '#1D4ED8', funciones: ['Todo lo del Starter', 'Chatbot completo', 'Caja diaria', 'Importador de apps', 'Fidelización con puntos', 'Descuentos y promociones'] },
  { nombre: 'Pro',     precio: '59,99', emoji: '💎', badge: 'Más popular',  popular: true,  color: '#D4C5F9', colorDark: '#6B4FD8', funciones: ['Todo lo del Básico', '2 negocios', 'Gestión de equipo', 'Marketing IA completo', 'Analytics avanzado', 'Facturación e IVA'] },
  { nombre: 'Plus',    precio: '99,99', emoji: '⚡', badge: 'Para escalar', popular: false, color: '#FDE9A2', colorDark: '#C4860A', funciones: ['Todo lo del Pro', 'Hasta 10 negocios', 'Nóminas + plantillas SEPE', 'Contratos SEPE oficiales', 'Kit gestor PDF/CSV', 'Soporte prioritario'] },
]

type CmpVal = boolean | string
const COMPARE: { feat: string; s: CmpVal; b: CmpVal; p: CmpVal; pl: CmpVal }[] = [
  { feat: 'Créditos IA / mes',         s: '100',  b: '300',  p: '1.000', pl: '5.000' },
  { feat: 'Trabajadores',              s: '1',    b: '3',    p: '5',     pl: '∞' },
  { feat: 'Negocios',                  s: '1',    b: '1',    p: '2',     pl: '10' },
  { feat: 'Reservas online 24/7',      s: true,   b: true,   p: true,    pl: true },
  { feat: 'Ficha pública en mapa',     s: true,   b: true,   p: true,    pl: true },
  { feat: 'Reseñas automáticas',       s: true,   b: true,   p: true,    pl: true },
  { feat: 'Recordatorios automáticos', s: true,   b: true,   p: true,    pl: true },
  { feat: 'Chatbot básico',            s: true,   b: true,   p: true,    pl: true },
  { feat: 'Chatbot completo',          s: false,  b: true,   p: true,    pl: true },
  { feat: 'Caja diaria',               s: false,  b: true,   p: true,    pl: true },
  { feat: 'Fidelización con puntos',   s: false,  b: true,   p: true,    pl: true },
  { feat: 'Lista de espera',           s: false,  b: true,   p: true,    pl: true },
  { feat: 'Descuentos y promociones',  s: false,  b: true,   p: true,    pl: true },
  { feat: 'Importador de apps',        s: false,  b: true,   p: true,    pl: true },
  { feat: 'Gestión de equipo',         s: false,  b: false,  p: true,    pl: true },
  { feat: 'Marketing IA',              s: false,  b: false,  p: true,    pl: true },
  { feat: 'Analytics avanzado',        s: false,  b: false,  p: true,    pl: true },
  { feat: 'Facturación e IVA',         s: false,  b: false,  p: true,    pl: true },
  { feat: 'Modelos 303 / 130',         s: false,  b: false,  p: true,    pl: true },
  { feat: 'Multi-negocio',             s: false,  b: false,  p: '2',     pl: '10' },
  { feat: 'Nóminas y contratos SEPE',  s: false,  b: false,  p: false,   pl: true },
  { feat: 'Soporte prioritario',       s: false,  b: false,  p: false,   pl: true },
]

// ── CmpCell ───────────────────────────────────────────────────────────────────

function CmpCell({ val, highlight }: { val: CmpVal; highlight?: boolean }) {
  const base: React.CSSProperties = { padding: '11px 8px', textAlign: 'center', borderBottom: '1px solid #F3F4F6', background: highlight ? 'rgba(212,197,249,0.07)' : 'transparent' }
  if (typeof val === 'boolean') {
    return <td style={base}>{val ? <span style={{ color: '#16A34A', fontWeight: 800, fontSize: 15 }}>✓</span> : <span style={{ color: '#D1D5DB', fontSize: 15 }}>—</span>}</td>
  }
  return <td style={{ ...base, fontSize: 13, fontWeight: 700, color: highlight ? '#7C3AED' : '#6B7280' }}>{val}</td>
}

// ── DiamondLogo3D ─────────────────────────────────────────────────────────────

function DiamondLogo3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false, rafId = 0
    let renderer: any = null
    import('three').then((THREE) => {
      if (disposed) return
      const size = canvas.parentElement?.offsetWidth || 340
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.z = 6
      function mkRing(o: number, i: number, c: number, e: number, op: number) {
        const sh = new THREE.Shape()
        sh.moveTo(0,o); sh.lineTo(o,0); sh.lineTo(0,-o); sh.lineTo(-o,0); sh.closePath()
        const h = new THREE.Path()
        h.moveTo(0,i); h.lineTo(i,0); h.lineTo(0,-i); h.lineTo(-i,0); h.closePath()
        sh.holes.push(h)
        return new THREE.Mesh(new THREE.ShapeGeometry(sh,2), new THREE.MeshPhongMaterial({ color:c, emissive:e, emissiveIntensity:0.35, shininess:180, specular:0xffffff, transparent:true, opacity:op, side:THREE.DoubleSide, depthWrite:false }))
      }
      const d1=mkRing(1.5,1.14,0xAA88FF,0x6633CC,0.80)
      const d2=mkRing(1.09,0.74,0x66BBFF,0x2255AA,0.85)
      const d3=mkRing(0.71,0.42,0xCCEEFF,0x4488CC,0.92)
      scene.add(d1,d2,d3)
      const sph = new THREE.Mesh(new THREE.SphereGeometry(0.22,32,32), new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xaaccff,emissiveIntensity:0.4,shininess:200,specular:0xffffff}))
      sph.position.z=0.1
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.34,32,32), new THREE.MeshBasicMaterial({color:0x8899ff,transparent:true,opacity:0.12}))
      hl.position.z=0.08
      scene.add(hl,sph)
      scene.add(new THREE.AmbientLight(0x334466,2))
      const l1=new THREE.PointLight(0x7C5CEF,8,14)
      const l2=new THREE.PointLight(0x4FACFE,7,14)
      const l3=new THREE.PointLight(0xffffff,4,8)
      l3.position.set(0,0,5); scene.add(l1,l2,l3)
      const PI2=Math.PI*2, st=performance.now()
      function animate() {
        if(disposed) return
        const lt=((performance.now()-st)/1000%15)/15
        d1.rotation.y=lt*PI2; d2.rotation.y=-lt*PI2*2; d3.rotation.y=lt*PI2*3
        const tl=Math.sin(lt*PI2)*0.25
        d1.rotation.x=tl; d2.rotation.x=tl*0.85; d3.rotation.x=tl*0.7
        const la=lt*PI2*2
        l1.position.x=Math.cos(la)*4; l1.position.z=Math.sin(la)*4
        l2.position.x=Math.cos(la+Math.PI)*4; l2.position.z=Math.sin(la+Math.PI)*4
        const p=1+Math.sin(lt*PI2*4)*0.08; sph.scale.setScalar(p); hl.scale.setScalar(p)
        renderer.render(scene,camera)
        rafId=requestAnimationFrame(animate)
      }
      rafId=requestAnimationFrame(animate)
    })
    return () => { disposed=true; cancelAnimationFrame(rafId); renderer?.dispose() }
  }, [])
  return <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
}

// ── Tilt helpers ──────────────────────────────────────────────────────────────

function onTileMove(e: React.MouseEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  e.currentTarget.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) scale(1.02)`
  e.currentTarget.style.transition = 'transform 0.05s ease'
}
function onTileLeave(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = ''
  e.currentTarget.style.transition = 'transform 0.45s cubic-bezier(0.22,1,0.36,1)'
}

// ── Phone screen components ───────────────────────────────────────────────────

function PhoneShell({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ width: 220, height: 440, background: '#F7F9FC', borderRadius: 36, border: '2px solid rgba(0,0,0,0.08)', boxShadow: `0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px ${color}22, 0 0 60px ${color}18`, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 70, height: 5, background: '#D1D5DB', borderRadius: 3, zIndex: 2 }} />
      <div style={{ padding: '28px 0 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

// ── HOME ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen]         = useState(false)
  const [authMode, setAuthMode]         = useState<'login' | 'registro' | 'recuperar'>('login')
  const [authEmail, setAuthEmail]       = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authNombre, setAuthNombre]     = useState('')
  const [authLoading, setAuthLoading]   = useState(false)
  const [authMsg, setAuthMsg]           = useState('')
  const [authIsError, setAuthIsError]   = useState(false)
  const [honeypot, setHoneypot]         = useState('')
  const planesRef = useRef<HTMLDivElement>(null)

  // Lenis smooth scroll + GSAP ScrollTrigger
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    if (window.innerWidth < 768) return
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.6,
      touchMultiplier: 1.5,
    })
    lenis.on('scroll', ({ scroll }: { scroll: number }) => {
      void scroll
      ScrollTrigger.update()
    })
    const ticker = gsap.ticker.add((time: number) => { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)
    return () => { lenis.destroy(); gsap.ticker.remove(ticker); ScrollTrigger.killAll() }
  }, [])

  // All GSAP animations — scroll cinematográfico
  useEffect(() => {
    // Navbar: blur al scrollear desde arriba
    ScrollTrigger.create({
      start: 'top -60',
      onEnter:     () => gsap.to('.kh-nav', { background: 'rgba(245,240,255,0.92)', backdropFilter: 'blur(20px)', boxShadow: '0 1px 0 rgba(124,58,237,0.1)', duration: 0.3 }),
      onLeaveBack: () => gsap.to('.kh-nav', { background: 'transparent', backdropFilter: 'none', boxShadow: 'none', duration: 0.3 }),
    })

    // Navbar cambia a oscuro al entrar en sección funciones
    ScrollTrigger.create({
      trigger: '.funciones-section',
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter:     () => gsap.to('.kh-nav', { background: 'rgba(15,15,26,0.92)', duration: 0.5 }),
      onLeave:     () => gsap.to('.kh-nav', { background: 'rgba(245,240,255,0.92)', duration: 0.5 }),
      onEnterBack: () => gsap.to('.kh-nav', { background: 'rgba(15,15,26,0.92)', duration: 0.5 }),
      onLeaveBack: () => gsap.to('.kh-nav', { background: 'rgba(245,240,255,0.92)', duration: 0.5 }),
    })

    // Hero — animaciones inmediatas
    gsap.fromTo('.hero-char',   { opacity: 0, y: 40, rotateX: -90 }, { opacity: 1, y: 0, rotateX: 0, stagger: 0.035, duration: 0.7, ease: 'back.out(1.7)', delay: 0.5 })
    gsap.fromTo('.hero-sub',    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 1.2 })
    gsap.fromTo('.hero-chips',  { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, delay: 1.5 })
    gsap.fromTo('.hero-btns',   { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, delay: 1.8 })
    gsap.fromTo('.hero-logo',   { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'back.out(1.2)', delay: 0.3 })
    gsap.fromTo('.hero-scroll', { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 2.2 })

    // Transiciones cinematográficas entre secciones
    const sections = gsap.utils.toArray<Element>('.scroll-section')
    sections.forEach((section: any, i) => {
      if (i === 0) return
      gsap.fromTo(section,
        { yPercent: 6, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 95%', end: 'top 30%', scrub: 1 },
        }
      )
    })

    // Títulos de sección — fade + blur
    gsap.utils.toArray<HTMLElement>('.section-title').forEach(title => {
      gsap.fromTo(title,
        { opacity: 0, y: 60, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: title, start: 'top 85%' } }
      )
    })

    // Contenido de sección — stagger de hijos
    gsap.utils.toArray<HTMLElement>('.section-content').forEach(content => {
      if (!content.children.length) return
      gsap.fromTo(Array.from(content.children),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: content, start: 'top 80%' } }
      )
    })

    // Parallax en backgrounds
    gsap.utils.toArray<HTMLElement>('.section-bg').forEach(bg => {
      gsap.to(bg, {
        yPercent: -20, ease: 'none',
        scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
      })
    })

    // Funciones — stagger simple por item (sin pin, sin conflicto con Lenis)
    gsap.utils.toArray<HTMLElement>('.funcion-item').forEach((item, i) => {
      gsap.fromTo(item,
        { opacity: 0, x: i % 2 === 0 ? -60 : 60 },
        {
          opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    })

    const mm = gsap.matchMedia()
    mm.add('(max-width: 768px)', () => {
      ScrollTrigger.config({ ignoreMobileResize: true })
    })

    return () => { ScrollTrigger.killAll(); mm.revert() }
  }, [])

  // Planes mobile carousel drag
  useEffect(() => {
    const el = planesRef.current
    if (!el) return
    if (window.innerWidth > 768) return
    let dragging = false, startX = 0, startScroll = 0
    const onDown = (e: MouseEvent) => { dragging = true; startX = e.pageX; startScroll = el.scrollLeft }
    const onMove = (e: MouseEvent) => { if (!dragging) return; el.scrollLeft = startScroll - (e.pageX - startX) }
    const onUp = () => { dragging = false }
    const onTS = (e: TouchEvent) => { dragging = true; startX = e.touches[0].pageX; startScroll = el.scrollLeft }
    const onTM = (e: TouchEvent) => { if (!dragging) return; el.scrollLeft = startScroll - (e.touches[0].pageX - startX) }
    const onTE = () => { dragging = false }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: true })
    el.addEventListener('touchend', onTE)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      el.removeEventListener('touchstart', onTS)
      el.removeEventListener('touchmove', onTM)
      el.removeEventListener('touchend', onTE)
    }
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuth() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = authOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authOpen])

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }

  function openAuth(mode: 'login' | 'registro' = 'login') { setAuthMode(mode); setAuthMsg(''); setAuthIsError(false); setAuthOpen(true); setMenuOpen(false) }
  function closeAuth() { setAuthOpen(false); setAuthMsg(''); setAuthEmail(''); setAuthPassword(''); setAuthNombre(''); setHoneypot('') }
  function setMsg(msg: string, isError: boolean) { setAuthMsg(msg); setAuthIsError(isError) }

  async function handleAuthGoogle() {
    await supabase.auth.signOut({ scope: 'local' })
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: false, queryParams: { access_type: 'offline', prompt: 'consent' } } })
    if (!error && data?.url) window.location.href = data.url
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!authEmail || !authPassword) { setMsg('Rellena todos los campos.', true); return }
    if (honeypot) return
    setAuthLoading(true); setMsg('', false)
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    if (error) { setMsg('Email o contraseña incorrectos.', true); setAuthLoading(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const ADMIN_EMAILS = ['adria.gaitan.sola@gmail.com']
      if (ADMIN_EMAILS.includes(session.user.email ?? '')) { window.location.href = window.location.origin + '/admin'; return }
      const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', session.user.id).single()
      const dest = profile?.tipo === 'negocio' ? '/dashboard' : profile?.tipo === 'cliente' ? '/cliente' : profile?.tipo === 'empleado' ? '/empleado' : '/onboarding'
      window.location.href = window.location.origin + dest
    }
    setAuthLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!authEmail || !authPassword) { setMsg('Rellena todos los campos.', true); return }
    if (authPassword.length < 6) { setMsg('La contraseña debe tener al menos 6 caracteres.', true); return }
    if (honeypot) return
    setAuthLoading(true); setMsg('', false)
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.signUp({ email: authEmail.trim().toLowerCase(), password: authPassword, options: { data: { nombre: authNombre.trim() || undefined } } })
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('already') || m.includes('registered')) { setMsg('Este email ya está registrado.', true); setTimeout(() => { setAuthMode('login'); setMsg('', false) }, 2000) }
      else setMsg(error.message, true)
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
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), { redirectTo: `${window.location.origin}/auth/reset-password` })
    if (error) setMsg(error.message, true)
    else setMsg('Te hemos enviado un correo para restablecer tu contraseña.', false)
    setAuthLoading(false)
  }

  return (
    <>
      {/* ── FONTS ── */}
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── GRAIN OVERLAY ── */}
      <div aria-hidden style={{ position:'fixed', inset:0, zIndex:997, pointerEvents:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat:'repeat', backgroundSize:'200px 200px', opacity:0.02, mixBlendMode:'overlay' }} />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        :root { --purple:#7C3AED; --blue:#4FACFE; --green:#40DCA5; --bg:#F5F0FF; --text:#0F0F1A; }
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:auto!important; overflow-x:hidden; max-width:100vw; }
        body { font-family:'DM Sans',sans-serif!important; background:#F5F0FF; color:#0F0F1A; overflow-x:hidden; max-width:100vw; }

        /* ── Scroll cinematográfico ── */
        .scroll-section { position:relative; overflow:hidden; will-change:transform; transform-origin:center top; background-color:inherit; isolation:isolate; }
        .section-bg { position:absolute; inset:-20%; width:140%; height:140%; z-index:0; pointer-events:none; }
        .section-content { position:relative; z-index:1; }
        .section-title { opacity:0; }
        @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; } }

        /* ── Animations ── */
        @keyframes blobAnim  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @keyframes blobAnim2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,15px) scale(1.08)} }
        @keyframes blobAnim3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,25px) scale(1.05)} }
        @keyframes logoFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes scrollPulse { 0%,100%{transform:scaleY(1);opacity:.6} 50%{transform:scaleY(.4);opacity:1} }
        @keyframes planGlow { 0%,100%{box-shadow:0 0 30px rgba(124,58,237,.2)} 50%{box-shadow:0 0 60px rgba(124,58,237,.45)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.3)} 50%{box-shadow:0 0 0 12px rgba(124,58,237,0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalUp { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fnGlow { 0%,100%{opacity:.4} 50%{opacity:.8} }

        /* GSAP initial states — solo hero (el resto via scroll-section / section-title / section-content) */
        .hero-char { display:inline-block; opacity:0; perspective:400px; }
        .hero-sub,.hero-chips,.hero-btns { opacity:0; }
        .hero-logo { opacity:0; }
        .hero-scroll { opacity:0; }

        /* ── Nav ── */
        .kh-nav { position:fixed; top:0; left:0; right:0; z-index:200; background:transparent; transition:background .35s,backdrop-filter .35s,box-shadow .35s; }
        .kh-nav-inner { max-width:1180px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .kh-logo { font-family:'Syne',sans-serif; font-size:clamp(18px,3vw,22px); font-weight:800; color:#111827; text-decoration:none; letter-spacing:-.5px; flex-shrink:0; cursor:pointer; display:flex; align-items:center; gap:8px; }
        .kh-logo em { font-style:normal; color:#7C3AED; }
        .kh-nav-links { display:flex; gap:4px; align-items:center; }
        .kh-nav-btn { font-size:14px; font-weight:600; color:#374151; padding:8px 14px; border-radius:8px; cursor:pointer; border:none; background:none; transition:background .2s,color .2s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
        .kh-nav-btn:hover { background:#F3F4F6; color:#111827; }
        .kh-nav-login { font-size:14px; font-weight:600; color:#374151; padding:9px 18px; border-radius:999px; border:1.5px solid #E5E7EB; cursor:pointer; background:#fff; white-space:nowrap; font-family:'DM Sans',sans-serif; transition:border-color .2s,transform .2s; }
        .kh-nav-login:hover { border-color:#D4C5F9; transform:translateY(-1px); }
        .kh-nav-cta { font-size:14px; font-weight:700; color:#fff; background:linear-gradient(135deg,#7C3AED,#4F46E5); padding:10px 22px; border-radius:999px; border:none; cursor:pointer; white-space:nowrap; flex-shrink:0; font-family:'DM Sans',sans-serif; transition:transform .2s,box-shadow .2s; }
        .kh-nav-cta:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(124,58,237,.4); }
        .kh-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; border:none; background:none; padding:6px; flex-shrink:0; }
        .kh-hamburger span { display:block; width:22px; height:2px; background:#111827; border-radius:2px; }
        .kh-mobile { display:none; flex-direction:column; gap:4px; padding:8px 16px 16px; border-top:1px solid rgba(124,58,237,.08); background:rgba(245,240,255,.98); animation:slideDown .25s ease; }
        .kh-mobile.open { display:flex; }
        .kh-mobile-btn { font-size:15px; font-weight:600; color:#374151; padding:13px 12px; border-radius:10px; cursor:pointer; border:none; background:none; text-align:left; font-family:'DM Sans',sans-serif; }
        .kh-mobile-btn:hover { background:#F3F4F6; }
        .kh-nav-mob-auth { display:none; gap:6px; align-items:center; flex-shrink:0; }
        .kh-nav-mob-login { background:transparent; border:1.5px solid rgba(124,58,237,.35); color:#7C3AED; border-radius:8px; padding:6px 12px; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
        .kh-nav-mob-cta { background:#7C3AED; color:white; border:none; border-radius:8px; padding:6px 12px; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }

        /* ── Hero ── */
        .kh-hero { min-height:100svh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; position:relative; overflow:hidden; background:#F5F0FF; padding:120px 24px 80px; }
        .kh-blob { position:absolute; border-radius:50%; pointer-events:none; filter:blur(60px); z-index:0; }
        .kh-blob-1 { width:600px; height:600px; background:rgba(184,216,248,.45); top:-100px; right:-100px; animation:blobAnim 12s ease-in-out infinite; }
        .kh-blob-2 { width:450px; height:450px; background:rgba(212,197,249,.4); bottom:-80px; left:-80px; animation:blobAnim2 16s ease-in-out 4s infinite; }
        .kh-blob-3 { width:320px; height:320px; background:rgba(184,237,212,.3); top:35%; right:18%; animation:blobAnim3 14s ease-in-out 8s infinite; }
        .kh-hero-inner { position:relative; z-index:2; max-width:820px; margin:0 auto; display:flex; flex-direction:column; align-items:center; }
        .kh-hero-logo { width:180px; height:180px; margin-bottom:40px; animation:logoFloat 5s ease-in-out infinite; }
        .kh-hero-tag { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; padding:6px 14px; border-radius:999px; background:rgba(124,58,237,.1); color:#7C3AED; border:1px solid rgba(124,58,237,.2); margin-bottom:24px; }
        .kh-h1 { font-family:'Syne',sans-serif; font-size:clamp(2.8rem,6vw,5rem); font-weight:800; line-height:1.04; letter-spacing:-2.5px; color:#0F0F1A; perspective:600px; }
        .kh-h1 .accent { color:#7C3AED; }
        .kh-h1-word { display:inline-block; white-space:nowrap; }
        .kh-lead { font-size:clamp(15px,2vw,18px); color:#6B7280; line-height:1.7; max-width:540px; margin:20px auto 0; }
        .kh-hero-chips { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:20px; }
        .kh-chip { font-size:12px; font-weight:600; padding:5px 12px; border-radius:999px; background:rgba(255,255,255,.8); border:1px solid rgba(124,58,237,.12); color:#374151; backdrop-filter:blur(8px); }
        .kh-hero-btns { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin-top:32px; }
        .kh-btn-primary { display:inline-flex; align-items:center; gap:8px; padding:16px 32px; border-radius:14px; background:linear-gradient(135deg,#7C3AED,#4F46E5); color:#fff; font-size:16px; font-weight:700; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; animation:pulse 2.5s ease-in-out infinite; transition:transform .2s,box-shadow .2s; }
        .kh-btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(124,58,237,.45); }
        .kh-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:16px 28px; border-radius:14px; background:rgba(255,255,255,.8); color:#374151; font-size:16px; font-weight:600; font-family:'DM Sans',sans-serif; border:1.5px solid rgba(124,58,237,.15); cursor:pointer; backdrop-filter:blur(8px); transition:border-color .2s,transform .2s; }
        .kh-btn-ghost:hover { border-color:#D4C5F9; transform:translateY(-2px); }
        .kh-scroll-ind { position:absolute; bottom:32px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(15,15,26,.35); z-index:2; }
        .kh-scroll-line { width:1px; height:40px; background:rgba(124,58,237,.4); animation:scrollPulse 2s ease-in-out infinite; }

        /* ── Propuesta de Valor ── */
        .valor-section { padding:100px 24px; background:#fff; position:relative; overflow:hidden; }
        .valor-section::before { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z' fill='%237C3AED' fill-opacity='.04'/%3E%3C/svg%3E"); pointer-events:none; }
        .valor-inner { max-width:1100px; margin:0 auto; position:relative; }
        .valor-header { text-align:center; max-width:600px; margin:0 auto 64px; }
        .kh-tag { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; padding:6px 14px; border-radius:999px; }
        .kh-tag-purple { background:rgba(124,58,237,.1); color:#7C3AED; border:1px solid rgba(124,58,237,.2); }
        .kh-tag-blue { background:rgba(184,216,248,.4); color:#1D4ED8; border:1px solid rgba(184,216,248,.6); }
        .kh-tag-green { background:rgba(184,237,212,.4); color:#2E8A5E; border:1px solid rgba(184,237,212,.6); }
        .kh-h2 { font-family:'Syne',sans-serif; font-size:clamp(1.7rem,3.5vw,2.8rem); font-weight:800; line-height:1.12; letter-spacing:-1px; color:#0F0F1A; margin:14px 0 12px; }
        .kh-section-p { font-size:15px; color:#6B7280; line-height:1.75; }
        .valor-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .valor-card { background:rgba(255,255,255,.9); border:1px solid rgba(124,58,237,.08); border-radius:24px; padding:36px 28px; text-align:center; transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s,border-color .3s; will-change:transform; }
        .valor-card:hover { transform:translateY(-8px); box-shadow:0 16px 48px rgba(124,58,237,.1); border-color:rgba(124,58,237,.2); }
        .valor-icon { font-size:48px; margin-bottom:20px; display:block; }
        .valor-title-card { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:#111827; margin-bottom:10px; }
        .valor-desc { font-size:14px; color:#6B7280; line-height:1.75; }

        /* ── Funciones — lista vertical con stagger GSAP ── */
        .funciones-wrap { background:#0F0F1A; position:relative; }
        .funciones-sticky { position:relative; max-width:860px; margin:0 auto; padding:80px 40px; }
        .funciones-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,58,237,.10) 0%, transparent 70%); }
        .fn-tabs-row { display:none!important; }
        .funciones-left { display:flex; flex-direction:column; }
        .funciones-right { display:none!important; }
        .fn-panel { position:relative; display:flex; flex-direction:column; padding:56px 0; border-bottom:1px solid rgba(255,255,255,.06); pointer-events:auto; }
        .fn-panel:last-child { border-bottom:none; }
        .fn-panel-icon { font-size:48px; margin-bottom:16px; display:block; }
        .fn-panel-label { font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:16px; }
        .fn-panel-title { font-family:'Syne',sans-serif; font-size:clamp(1.4rem,3vw,2.2rem); font-weight:800; color:#fff; line-height:1.12; letter-spacing:-.8px; margin-bottom:16px; }
        .fn-panel-desc { font-size:15px; color:rgba(255,255,255,.6); line-height:1.8; max-width:560px; }
        .fn-phone-screen { display:none!important; }
        .fn-phone-glow { display:none!important; }

        /* ── Para quién ── */
        .kh-quien { padding:100px 24px; background:#F5F0FF; }
        .kh-quien-inner { max-width:1100px; margin:0 auto; }
        .kh-section-header { text-align:center; max-width:600px; margin:0 auto 56px; }
        .quien-section { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; }
        .quien-card { background:rgba(255,255,255,.75); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(124,58,237,.1); border-radius:20px; padding:28px 16px; text-align:center; will-change:transform; transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .3s; }
        .quien-card:hover { transform:translateY(-8px); box-shadow:0 12px 32px rgba(124,58,237,.12); }
        .quien-emoji { font-size:32px; margin-bottom:10px; display:block; }
        .quien-name { font-size:13px; font-weight:600; color:#374151; line-height:1.4; }

        /* ── Planes ── */
        .kh-planes { padding:100px 24px; background:#fff; }
        .kh-planes-inner { max-width:1180px; margin:0 auto; }
        .planes-section { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .plan-card { background:rgba(255,255,255,.9); border:1.5px solid rgba(124,58,237,.1); backdrop-filter:blur(12px); border-radius:24px; padding:28px; display:flex; flex-direction:column; position:relative; overflow:hidden; transition:transform .3s,box-shadow .3s; }
        .plan-card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(0,0,0,.08); }
        .plan-card.popular { border-color:rgba(124,58,237,.5); transform:scale(1.04); animation:planGlow 3s ease-in-out infinite; }
        .plan-badge { position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; }
        .plan-emoji { font-size:32px; margin-bottom:12px; }
        .plan-name { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#111827; }
        .plan-precio { font-family:'Syne',sans-serif; font-size:36px; font-weight:800; color:#0F0F1A; margin:12px 0 4px; letter-spacing:-1px; }
        .plan-mes { font-size:14px; color:#9CA3AF; margin-bottom:20px; }
        .plan-divider { height:1px; background:#F1F5F9; margin:16px 0; }
        .plan-feature { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#4B5563; margin-bottom:10px; }
        .plan-check { color:#16A34A; font-weight:800; flex-shrink:0; margin-top:1px; }
        .plan-cta { display:block; width:100%; margin-top:20px; padding:13px; border-radius:12px; border:none; cursor:pointer; font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; transition:transform .2s,box-shadow .2s; text-align:center; }
        .plan-cta:hover { transform:translateY(-1px); }
        .kh-compare-wrap { overflow-x:auto; border-radius:16px; border:1px solid #F1F5F9; margin-top:56px; }
        .kh-compare-tbl { width:100%; border-collapse:collapse; font-size:14px; background:#fff; }
        .kh-tbl-feat { padding:11px 16px; color:#374151; font-weight:500; font-size:13px; border-bottom:1px solid #F3F4F6; text-align:left; }
        .kh-tbl-head { padding:14px 8px; font-family:'Syne',sans-serif; font-weight:700; font-size:14px; text-align:center; white-space:nowrap; }
        .kh-tbl-group { padding:12px 16px; font-size:11px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:#9CA3AF; background:#FAFBFF; border-bottom:1px solid #F3F4F6; }

        /* ── CTA Final ── */
        .cta-section { padding:120px 24px; background:linear-gradient(135deg,#2D1163 0%,#7C3AED 55%,#4F46E5 100%); position:relative; overflow:hidden; text-align:center; }
        .cta-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,.06) 0%, transparent 70%); }
        .cta-logo-wrap { width:80px; height:80px; margin:0 auto 32px; animation:logoFloat 4s ease-in-out infinite; }
        .cta-h2 { font-family:'Syne',sans-serif; font-size:clamp(2rem,5vw,3.6rem); font-weight:800; color:#fff; line-height:1.08; letter-spacing:-1.5px; margin-bottom:20px; }
        .cta-p { font-size:17px; color:rgba(255,255,255,.7); line-height:1.7; max-width:520px; margin:0 auto 40px; }
        .kh-btn-white { display:inline-flex; align-items:center; gap:10px; padding:18px 40px; border-radius:16px; background:#fff; color:#7C3AED; font-size:17px; font-weight:700; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; transition:transform .2s,box-shadow .2s; }
        .kh-btn-white:hover { transform:translateY(-2px); box-shadow:0 12px 40px rgba(0,0,0,.2); }

        /* ── Para Clientes ── */
        .kh-clients { padding:80px 24px; background:rgba(64,220,165,.07); text-align:center; position:relative; overflow:hidden; }
        .kh-clients-blob { position:absolute; inset:-50px; background:radial-gradient(circle at 50% 50%,rgba(64,220,165,.12) 0%,transparent 70%); pointer-events:none; }

        /* ── Footer ── */
        .kh-footer { background:#0A0A0F; padding:48px 24px 28px; }
        .kh-footer-wrap { max-width:1180px; margin:0 auto; }
        .kh-footer-top { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; flex-wrap:wrap; margin-bottom:32px; }
        .kh-footer-logo { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#fff; letter-spacing:-.5px; display:flex; align-items:center; gap:8px; }
        .kh-footer-logo em { font-style:normal; color:#7C3AED; }
        .kh-footer-tag { font-size:13px; color:rgba(255,255,255,.4); margin-top:4px; }
        .kh-footer-links { display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
        .kh-footer-a { font-size:13px; color:rgba(255,255,255,.55); text-decoration:none; display:flex; align-items:center; gap:6px; transition:color .2s; }
        .kh-footer-a:hover { color:#fff; }
        .kh-footer-bot { border-top:1px solid rgba(255,255,255,.07); padding-top:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .kh-footer-copy { font-size:12px; color:rgba(255,255,255,.3); }
        .kh-footer-legal { display:flex; gap:16px; flex-wrap:wrap; }
        .kh-footer-legal a { font-size:12px; color:rgba(255,255,255,.3); text-decoration:none; transition:color .2s; }
        .kh-footer-legal a:hover { color:rgba(255,255,255,.7); }

        /* ── Auth modal ── */
        .kh-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; animation:fadeIn .2s ease; }
        .kh-modal { background:#fff; border-radius:24px; padding:36px 32px; width:100%; max-width:420px; position:relative; box-shadow:0 24px 60px rgba(0,0,0,.2); animation:modalUp .3s cubic-bezier(.22,1,.36,1); max-height:90vh; overflow-y:auto; }
        .kh-modal-close { position:absolute; top:14px; right:14px; background:#F3F4F6; border:none; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:14px; color:#6B7280; display:flex; align-items:center; justify-content:center; transition:background .2s; }
        .kh-modal-close:hover { background:#E5E7EB; }
        .kh-modal-logo { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; letter-spacing:-.5px; margin-bottom:20px; color:#111827; }
        .kh-modal-logo em { font-style:normal; color:#7C3AED; }
        .kh-auth-tabs { display:flex; gap:4px; background:#F3F4F6; border-radius:12px; padding:4px; margin-bottom:24px; }
        .kh-auth-tab { flex:1; padding:9px; border-radius:9px; border:none; background:none; font-size:14px; font-weight:600; color:#6B7280; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background .2s,color .2s; }
        .kh-auth-tab.active { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,.08); }
        .kh-auth-field { margin-bottom:16px; }
        .kh-auth-label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
        .kh-auth-input { width:100%; padding:12px 14px; border-radius:10px; border:1.5px solid #E5E7EB; font-size:14px; font-family:'DM Sans',sans-serif; color:#111827; background:#fff; outline:none; transition:border-color .2s; }
        .kh-auth-input:focus { border-color:#7C3AED; }
        .kh-auth-forgot { text-align:right; margin-bottom:16px; }
        .kh-auth-forgot button { font-size:13px; color:#7C3AED; background:none; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .kh-auth-btn { width:100%; padding:13px; border-radius:12px; border:none; background:linear-gradient(135deg,#7C3AED,#4F46E5); color:#fff; font-size:15px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; transition:opacity .2s; margin-top:4px; }
        .kh-auth-btn:disabled { opacity:.7; cursor:not-allowed; }
        .kh-auth-msg { margin-top:14px; padding:12px 14px; border-radius:10px; font-size:13px; line-height:1.5; }
        .kh-auth-msg.ok  { background:#DCFCE7; color:#166534; }
        .kh-auth-msg.err { background:#FEE2E2; color:#991B1B; }
        .kh-auth-divider { text-align:center; font-size:13px; color:#9CA3AF; margin:18px 0; position:relative; }
        .kh-auth-divider::before,.kh-auth-divider::after { content:''; position:absolute; top:50%; width:calc(50% - 20px); height:1px; background:#E5E7EB; }
        .kh-auth-divider::before { left:0; } .kh-auth-divider::after { right:0; }
        .kh-auth-google { width:100%; padding:13px; border-radius:12px; border:1.5px solid #E5E7EB; background:#fff; color:#374151; font-size:14px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:border-color .2s,background .2s; }
        .kh-auth-google:hover { border-color:#D4C5F9; background:#FAFBFF; }
        .kh-auth-back { display:block; width:100%; margin-top:16px; background:none; border:none; font-size:13px; color:#7C3AED; cursor:pointer; font-family:'DM Sans',sans-serif; text-align:left; }

        /* ── Responsive ── */
        @media (max-width:900px) {
          .valor-cards { grid-template-columns:1fr 1fr; }
          .quien-section { grid-template-columns:repeat(3,1fr); }
          .planes-section { grid-template-columns:1fr 1fr; }
          .kh-nav-links { display:none; }
          .kh-hamburger { display:flex; }
        }
        @media (max-width:768px) {
          .kh-nav-login,.kh-nav-cta { display:none!important; }
          .kh-nav-mob-auth { display:flex!important; }
          .kh-hamburger { display:flex!important; }
          .kh-h1 { font-size:clamp(2.2rem,8vw,3.2rem)!important; letter-spacing:-1.5px!important; }
          .kh-hero-btns { flex-direction:column; align-items:center; }
          .kh-btn-primary,.kh-btn-ghost { width:100%; max-width:320px; justify-content:center; }
          .kh-hero-logo { width:130px; height:130px; margin-bottom:28px; }
          /* Funciones mobile */
          .funciones-sticky { padding:40px 20px; }
          .fn-panel { padding:40px 0; }
          /* Quien mobile carousel */
          .quien-section { display:flex!important; overflow-x:auto; scroll-snap-type:x mandatory; gap:12px; padding-bottom:8px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
          .quien-section::-webkit-scrollbar { display:none; }
          .quien-card { min-width:130px; flex-shrink:0; scroll-snap-align:start; }
          /* Planes mobile carousel */
          .planes-section { display:flex!important; overflow-x:auto; scroll-snap-type:x mandatory; gap:16px; padding-bottom:16px; -webkit-overflow-scrolling:touch; scrollbar-width:none; cursor:grab; }
          .planes-section::-webkit-scrollbar { display:none; }
          .plan-card { min-width:260px; flex-shrink:0; scroll-snap-align:start; }
          .plan-card.popular { transform:none!important; }
          .plan-card { opacity:1!important; }
          .quien-card { opacity:1!important; }
          .kh-footer-top { flex-direction:column; }
          .kh-footer-bot { flex-direction:column; align-items:flex-start; }
          .kh-modal { padding:28px 20px; }
        }
        @media (max-width:600px) {
          .kh-hero { padding:100px 20px 80px!important; }
          .valor-section { padding:64px 20px; }
          .valor-cards { grid-template-columns:1fr; }
          .kh-quien { padding:64px 20px; }
          .kh-planes { padding:64px 20px; }
          .cta-section { padding:80px 20px; }
          .kh-clients { padding:64px 20px; }
          .quien-section { grid-template-columns:repeat(2,1fr)!important; display:grid!important; }
          .quien-card { min-width:unset!important; flex-shrink:unset!important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="kh-nav">
        <div className="kh-nav-inner">
          <span className="kh-logo" onClick={() => scrollTo('hero')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="url(#ng1)" opacity=".9"/>
              <path d="M12 6L18 12L12 18L6 12L12 6Z" fill="url(#ng2)" opacity=".7"/>
              <circle cx="12" cy="12" r="2" fill="white" opacity=".9"/>
              <defs>
                <linearGradient id="ng1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#A78BFA"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
                <linearGradient id="ng2" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse"><stop stopColor="#C4B5FD"/><stop offset="1" stopColor="#818CF8"/></linearGradient>
              </defs>
            </svg>
            <em>Kh</em>epria
          </span>

          <div className="kh-nav-links">
            <button className="kh-nav-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('planes')}>Precios</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('quien')}>Para quién</button>
          </div>

          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button className="kh-nav-login" onClick={() => openAuth('login')}>Entrar</button>
            <button className="kh-nav-cta"   onClick={() => openAuth('registro')}>Pruébalo gratis</button>
          </div>

          <div className="kh-nav-mob-auth">
            <button className="kh-nav-mob-login" onClick={() => openAuth('login')}>Entrar</button>
            <button className="kh-nav-mob-cta"   onClick={() => openAuth('registro')}>Registro</button>
          </div>

          <button className="kh-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menú">
            <span /><span /><span />
          </button>
        </div>

        <div className={`kh-mobile ${menuOpen ? 'open' : ''}`}>
          <button className="kh-mobile-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('planes')}>Precios</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('quien')}>Para quién</button>
          <button className="kh-mobile-btn" onClick={() => openAuth('login')}>Entrar</button>
          <button className="kh-mobile-btn" style={{ color:'#7C3AED' }} onClick={() => openAuth('registro')}>Pruébalo gratis →</button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 1 — HERO                                  */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="kh-hero scroll-section" id="hero">
        {/* Parallax bg */}
        <div className="section-bg" aria-hidden style={{ background:'radial-gradient(ellipse 80% 80% at 60% 40%, rgba(184,216,248,.5) 0%, rgba(212,197,249,.3) 40%, rgba(184,237,212,.2) 70%, transparent 100%)' }} />
        <div className="kh-blob kh-blob-1" aria-hidden />
        <div className="kh-blob kh-blob-2" aria-hidden />
        <div className="kh-blob kh-blob-3" aria-hidden />

        <div className="kh-hero-inner">
          {/* Logo 3D flotando */}
          <div className="kh-hero-logo hero-logo">
            <DiamondLogo3D />
          </div>

          <span className="kh-hero-tag">✨ Plataforma para negocios de servicios</span>

          <h1 className="kh-h1">
            {'La IA que gestiona'.split('').map((ch, i) => (
              <span key={`a${i}`} className="hero-char">{ch === ' ' ? ' ' : ch}</span>
            ))}
            {' '}
            <span className="accent">
              {'tu negocio'.split('').map((ch, i) => (
                <span key={`b${i}`} className="hero-char" style={{ color:'#7C3AED' }}>{ch === ' ' ? ' ' : ch}</span>
              ))}
            </span>
            {' '}
            {'por ti'.split('').map((ch, i) => (
              <span key={`c${i}`} className="hero-char">{ch === ' ' ? ' ' : ch}</span>
            ))}
          </h1>

          <p className="kh-lead hero-sub">
            Todo lo que necesita tu negocio, impulsado por inteligencia artificial.<br />
            Reservas, chatbot, facturación y marketing — todo automático.
          </p>

          <div className="kh-hero-chips hero-chips">
            {['Reservas', 'Chatbot IA', 'Facturación', 'Marketing', 'Analytics', 'Equipo'].map(c => (
              <span key={c} className="kh-chip">{c}</span>
            ))}
          </div>

          <div className="kh-hero-btns hero-btns">
            <button className="kh-btn-primary" onClick={() => openAuth('registro')}>Empezar gratis →</button>
            <button className="kh-btn-ghost"   onClick={() => scrollTo('funciones')}>Ver demo</button>
          </div>
        </div>

        <div className="kh-scroll-ind hero-scroll">
          <div className="kh-scroll-line" />
          scroll
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 2 — PROPUESTA DE VALOR                    */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="valor-section scroll-section">
        <div className="section-bg" aria-hidden style={{ background:'linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(124,58,237,.04) 100%)' }} />
        <div className="valor-inner">
          <div className="valor-header">
            <span className="kh-tag kh-tag-purple" style={{ display:'inline-flex', marginBottom:16 }}>Por qué Khepria</span>
            <h2 className="kh-h2 section-title">Todo lo que necesita tu negocio</h2>
            <p className="kh-section-p">Una sola plataforma. Sin instalaciones. Sin gestor. Sin complicaciones.</p>
          </div>

          <div className="valor-cards section-content">
            {[
              { icon: '⚡', title: 'Automatización total', desc: 'Reservas, recordatorios y confirmaciones funcionan solas. Recuperas horas cada semana sin hacer nada.' },
              { icon: '🤖', title: 'IA que trabaja por ti', desc: 'Chatbot 24/7 en WhatsApp e Instagram que responde, gestiona y cobra sin que toques el móvil.' },
              { icon: '📊', title: 'Crece con datos reales', desc: 'Analytics predictivo, detección de clientes en riesgo y recomendaciones para aumentar tus ingresos.' },
            ].map((v, i) => (
              <div key={i} className="valor-card" onMouseMove={onTileMove} onMouseLeave={onTileLeave}>
                <span className="valor-icon">{v.icon}</span>
                <div className="valor-title-card">{v.title}</div>
                <p className="valor-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 3 — FUNCIONES (sticky scroll inmersivo)   */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="funciones-wrap funciones-section scroll-section" id="funciones">
        <div className="funciones-sticky">
          <div className="funciones-glow" aria-hidden />

          {/* Tabs de funciones */}
          <div className="fn-tabs-row" aria-hidden>
            {FUNCIONES.map((fn, i) => (
              <div key={i} className="fn-tab" style={{ background: i === 0 ? fn.color : 'rgba(255,255,255,0.08)', color: i === 0 ? '#0F0F1A' : 'rgba(255,255,255,0.45)', fontWeight: i === 0 ? 700 : 500 }}>
                {fn.icon} {fn.label}
              </div>
            ))}
          </div>

          {/* Panel izquierdo: texto */}
          <div className="funciones-left">
            {FUNCIONES.map((fn, i) => (
              <div key={i} className="fn-panel funcion-item">
                <span className="fn-panel-icon">{fn.icon}</span>
                <span className="fn-panel-label" style={{ color: fn.color }}>{fn.label}</span>
                <h2 className="fn-panel-title">{fn.title}</h2>
                <p className="fn-panel-desc">{fn.desc}</p>
                <button
                  style={{ marginTop:32, alignSelf:'flex-start', padding:'12px 24px', borderRadius:12, border:'none', background: fn.color, color:'#0F0F1A', fontWeight:700, fontSize:14, fontFamily:'DM Sans,sans-serif', cursor:'pointer', transition:'transform .2s,box-shadow .2s' }}
                  onClick={() => openAuth('registro')}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${fn.color}55` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='' }}
                >
                  Probar {fn.label} gratis →
                </button>
              </div>
            ))}
          </div>

          {/* Panel derecho: mockups de móvil */}
          <div className="funciones-right">
            {/* Reservas */}
            <div className="fn-phone-screen funcion-phone-1">
              <div className="fn-phone-glow" style={{ background:'rgba(79,172,254,.3)' }} />
              <PhoneShell color="#4FACFE">
                <div style={{ padding:'0 14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 0 10px', borderBottom:'1px solid #E8ECF0' }}>
                    <span style={{ fontWeight:800, fontSize:11, color:'#111827' }}>Enero 2026</span>
                    <span style={{ fontSize:18 }}>📅</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, textAlign:'center' }}>
                    {['L','M','X','J','V','S','D'].map(d=><div key={d} style={{ fontSize:9, color:'#9CA3AF', fontWeight:600 }}>{d}</div>)}
                    {[...Array(31)].map((_,i) => (
                      <div key={i} style={{ fontSize:10, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, background: [14,20,27].includes(i+1) ? 'linear-gradient(135deg,#4FACFE,#2563EB)' : 'transparent', color: [14,20,27].includes(i+1) ? '#fff' : '#374151', fontWeight: [14,20,27].includes(i+1) ? 700 : 400 }}>
                        {i+1}
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'linear-gradient(135deg,rgba(79,172,254,.12),rgba(79,172,254,.04))', border:'1px solid rgba(79,172,254,.25)', borderRadius:12, padding:12 }}>
                    <div style={{ fontSize:10, color:'#4FACFE', fontWeight:700, marginBottom:4 }}>Próxima cita</div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#111827' }}>María García · 11:30</div>
                    <div style={{ fontSize:10, color:'#6B7280', marginTop:2 }}>Corte + color · 60min · €45</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <div style={{ flex:1, background:'#F1F5F9', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#4FACFE' }}>8</div>
                      <div style={{ fontSize:9, color:'#6B7280' }}>hoy</div>
                    </div>
                    <div style={{ flex:1, background:'#F1F5F9', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#111827' }}>47</div>
                      <div style={{ fontSize:9, color:'#6B7280' }}>este mes</div>
                    </div>
                    <div style={{ flex:1, background:'#F1F5F9', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'#16A34A' }}>2.3k€</div>
                      <div style={{ fontSize:9, color:'#6B7280' }}>pendiente</div>
                    </div>
                  </div>
                </div>
              </PhoneShell>
            </div>

            {/* Chatbot */}
            <div className="fn-phone-screen funcion-phone-2">
              <div className="fn-phone-glow" style={{ background:'rgba(212,197,249,.3)' }} />
              <PhoneShell color="#D4C5F9">
                <div style={{ padding:'0 14px', flex:1, display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:10, borderBottom:'1px solid #E8ECF0' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#7C3AED,#4F46E5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#111827' }}>Khepria AI</div>
                      <div style={{ fontSize:8, color:'#34D399', fontWeight:600 }}>● En línea siempre</div>
                    </div>
                  </div>
                  {[
                    { from:'bot', text:'¡Hola! Soy el asistente de Barbería Marcos. ¿En qué puedo ayudarte? 💈' },
                    { from:'user', text:'Quiero reservar para mañana' },
                    { from:'bot', text:'Perfecto 👌 Huecos disponibles:' },
                  ].map((m,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:m.from==='user'?'flex-end':'flex-start' }}>
                      <div style={{ background:m.from==='user'?'linear-gradient(135deg,#7C3AED,#4F46E5)':'#fff', border:m.from==='user'?'none':'1px solid #E8ECF0', borderRadius:m.from==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px', padding:'7px 9px', maxWidth:'82%', fontSize:9, color:m.from==='user'?'#fff':'#374151', lineHeight:1.5 }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {['10:00','11:30','16:00','17:30'].map((h,i) => (
                      <div key={h} style={{ background:i===1?'linear-gradient(135deg,#7C3AED,#4F46E5)':'#fff', color:i===1?'#fff':'#4F46E5', border:i===1?'none':'1px solid #DDD6FE', borderRadius:8, padding:'4px 7px', fontSize:9, fontWeight:700 }}>{h}</div>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <div style={{ background:'linear-gradient(135deg,#7C3AED,#4F46E5)', borderRadius:'12px 12px 2px 12px', padding:'7px 9px', fontSize:9, color:'#fff' }}>Las 11:30 🙌</div>
                  </div>
                  <div style={{ background:'#fff', border:'1px solid #E8ECF0', borderRadius:'12px 12px 12px 2px', padding:'7px 9px', fontSize:9, color:'#374151', lineHeight:1.5 }}>
                    ✅ ¡Confirmado! Mañana 11:30. Recordatorio 1h antes.
                  </div>
                </div>
              </PhoneShell>
            </div>

            {/* Facturación */}
            <div className="fn-phone-screen funcion-phone-3">
              <div className="fn-phone-glow" style={{ background:'rgba(64,220,165,.3)' }} />
              <PhoneShell color="#40DCA5">
                <div style={{ padding:'0 14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:10, borderBottom:'1px solid #E8ECF0' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#111827' }}>Facturas · Mayo 2026</span>
                    <span style={{ fontSize:18 }}>🧾</span>
                  </div>
                  {[
                    { num:'F-0045', cliente:'María G.', importe:'87,00€', iva:'103,53€', estado:'Pagada', ok:true },
                    { num:'F-0044', cliente:'Carlos R.', importe:'45,00€', iva:'54,45€', estado:'Pendiente', ok:false },
                    { num:'F-0043', cliente:'Ana L.', importe:'120,00€', iva:'145,20€', estado:'Pagada', ok:true },
                  ].map((f,i) => (
                    <div key={i} style={{ background:'#F9FAFB', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'#111827' }}>{f.num} · {f.cliente}</div>
                        <div style={{ fontSize:9, color:'#6B7280', marginTop:2 }}>{f.iva} con IVA</div>
                      </div>
                      <span style={{ fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:999, background:f.ok?'#DCFCE7':'#FEF3C7', color:f.ok?'#166534':'#92400E' }}>{f.estado}</span>
                    </div>
                  ))}
                  <div style={{ background:'linear-gradient(135deg,rgba(64,220,165,.15),rgba(64,220,165,.05))', border:'1px solid rgba(64,220,165,.3)', borderRadius:12, padding:'12px 14px', marginTop:'auto' }}>
                    <div style={{ fontSize:9, color:'#40DCA5', fontWeight:700, marginBottom:4 }}>Total mayo · IVA incluido</div>
                    <div style={{ fontSize:20, fontWeight:800, color:'#111827', fontFamily:'Syne,sans-serif' }}>2.840€</div>
                    <div style={{ fontSize:9, color:'#6B7280', marginTop:2 }}>Modelo 303 generado ✓</div>
                  </div>
                </div>
              </PhoneShell>
            </div>

            {/* Analytics */}
            <div className="fn-phone-screen funcion-phone-4">
              <div className="fn-phone-glow" style={{ background:'rgba(253,233,162,.3)' }} />
              <PhoneShell color="#FDE9A2">
                <div style={{ padding:'0 14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:10, borderBottom:'1px solid #E8ECF0' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#111827' }}>Analytics · Junio 2026</span>
                    <span style={{ fontSize:18 }}>📊</span>
                  </div>
                  <div style={{ background:'linear-gradient(135deg,rgba(253,233,162,.4),rgba(253,233,162,.1))', borderRadius:12, padding:14, textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'#92400E', fontWeight:700, marginBottom:4 }}>Predicción próximo mes</div>
                    <div style={{ fontSize:28, fontWeight:800, color:'#111827', fontFamily:'Syne,sans-serif' }}>3.240€</div>
                    <div style={{ fontSize:10, color:'#16A34A', fontWeight:700 }}>↑ +18% vs mes anterior</div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:60, padding:'0 4px' }}>
                    {[40,55,45,70,62,80,75,95].map((h,i) => (
                      <div key={i} style={{ flex:1, background:i===7?'linear-gradient(180deg,#FDE9A2,#F59E0B)':'rgba(253,233,162,.4)', borderRadius:'4px 4px 0 0', height:`${h}%`, transition:'height .3s' }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['Reservas','47','📅','#4FACFE'],['Ingresos','2.8k','💶','#40DCA5']].map(([label,val,ico,c],i) => (
                      <div key={i} style={{ flex:1, background:'#F9FAFB', borderRadius:10, padding:10 }}>
                        <div style={{ fontSize:16 }}>{ico}</div>
                        <div style={{ fontSize:14, fontWeight:800, color:String(c), fontFamily:'Syne,sans-serif' }}>{val}</div>
                        <div style={{ fontSize:9, color:'#6B7280' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'#FEF3C7', borderRadius:10, padding:'8px 12px', display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:14 }}>⚠️</span>
                    <div style={{ fontSize:9, color:'#92400E', lineHeight:1.4 }}><b>IA detecta:</b> 3 clientes sin reserva en 60 días. Recomendación: enviar promo.</div>
                  </div>
                </div>
              </PhoneShell>
            </div>

            {/* Marketing */}
            <div className="fn-phone-screen funcion-phone-5">
              <div className="fn-phone-glow" style={{ background:'rgba(251,207,232,.3)' }} />
              <PhoneShell color="#FBCFE8">
                <div style={{ padding:'0 14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:10, borderBottom:'1px solid #E8ECF0' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#111827' }}>Marketing IA</span>
                    <span style={{ fontSize:18 }}>📸</span>
                  </div>
                  <div style={{ background:'linear-gradient(135deg,#7C3AED,#4FACFE)', borderRadius:14, aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>
                    ✂️
                  </div>
                  <div style={{ background:'#F9FAFB', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#111827', lineHeight:1.6 }}>
                      <b>@barberia_marcos</b> ✨ ¡Nuevo servicio disponible! Corte + barba + arreglo de cejas por solo <b>35€</b>. Reserva ahora con un solo clic 🔗 en nuestra bio 📅
                    </div>
                    <div style={{ fontSize:9, color:'#4F46E5', marginTop:6 }}>#barberia #madrid #estilo #barba</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <div style={{ flex:1, background:'linear-gradient(135deg,#7C3AED,#4F46E5)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:9, color:' rgba(255,255,255,.8)' }}>Publicar ahora</div>
                    </div>
                    <div style={{ flex:1, background:'#F1F5F9', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'#374151' }}>Programar 📅</div>
                    </div>
                  </div>
                  <div style={{ fontSize:9, color:'#6B7280', textAlign:'center' }}>
                    Generado por IA en <b>3 segundos</b>
                  </div>
                </div>
              </PhoneShell>
            </div>

            {/* Equipo */}
            <div className="fn-phone-screen funcion-phone-6">
              <div className="fn-phone-glow" style={{ background:'rgba(184,216,248,.3)' }} />
              <PhoneShell color="#B8D8F8">
                <div style={{ padding:'0 14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:10, borderBottom:'1px solid #E8ECF0' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#111827' }}>Equipo · semana 24</span>
                    <span style={{ fontSize:18 }}>👥</span>
                  </div>
                  {[
                    { nombre:'Marcos G.', rol:'Peluquero', turno:'09:00–17:00', horas:'40h', color:'#4FACFE' },
                    { nombre:'Laura M.', rol:'Colorista', turno:'10:00–18:00', horas:'38h', color:'#D4C5F9' },
                    { nombre:'Pedro R.', rol:'Barbero', turno:'11:00–19:00', horas:'36h', color:'#40DCA5' },
                  ].map((p,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'#F9FAFB', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:p.color+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:p.color, flexShrink:0 }}>
                        {p.nombre[0]}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#111827' }}>{p.nombre}</div>
                        <div style={{ fontSize:9, color:'#6B7280' }}>{p.rol} · {p.turno}</div>
                      </div>
                      <span style={{ fontSize:9, fontWeight:700, color:p.color }}>{p.horas}</span>
                    </div>
                  ))}
                  <div style={{ background:'linear-gradient(135deg,rgba(184,216,248,.3),rgba(184,216,248,.1))', border:'1px solid rgba(184,216,248,.4)', borderRadius:12, padding:'10px 14px', marginTop:'auto' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:9, color:'#1D4ED8', fontWeight:700 }}>Total semana</div>
                        <div style={{ fontSize:16, fontWeight:800, color:'#111827', fontFamily:'Syne,sans-serif' }}>114h</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:9, color:'#6B7280' }}>Nómina estimada</div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#111827', fontFamily:'Syne,sans-serif' }}>4.200€</div>
                      </div>
                    </div>
                  </div>
                </div>
              </PhoneShell>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 4 — PARA QUIÉN                           */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="kh-quien scroll-section" id="quien">
        <div className="kh-quien-inner">
          <div className="kh-section-header">
            <span className="kh-tag kh-tag-blue" style={{ display:'inline-flex', marginBottom:14 }}>¿Para quién?</span>
            <h2 className="kh-h2 section-title">Diseñado para tu tipo de negocio</h2>
            <p className="kh-section-p">Khepria se adapta a cualquier negocio de servicios que trabaje con citas</p>
          </div>

          <div className="quien-section section-content">
            {QUIENES.map(q => (
              <div key={q.name} className="quien-card" onMouseMove={onTileMove} onMouseLeave={onTileLeave}>
                <span className="quien-emoji">{q.icon}</span>
                <span className="quien-name">{q.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 5 — PLANES                               */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="kh-planes scroll-section" id="planes">
        <div className="kh-planes-inner">
          <div className="kh-section-header">
            <span className="kh-tag kh-tag-purple" style={{ display:'inline-flex', marginBottom:14 }}>Precios</span>
            <h2 className="kh-h2 section-title">Sin sorpresas. Sin comisiones.</h2>
            <p className="kh-section-p">Elige el plan que mejor se adapte a tu negocio. Cancela cuando quieras.</p>
          </div>

          <div className="planes-section section-content" ref={planesRef}>
            {PLANES.map((p, i) => (
              <div key={i} className={`plan-card${p.popular ? ' popular' : ''}`}>
                <div className="plan-badge" style={{ background: p.color + '66', color: p.colorDark }}>{p.badge}</div>
                <div className="plan-emoji">{p.emoji}</div>
                <div className="plan-name">{p.nombre}</div>
                <div className="plan-precio">{p.precio}€</div>
                <div className="plan-mes">/ mes · IVA no incluido</div>
                <div className="plan-divider" />
                {p.funciones.map(f => (
                  <div key={f} className="plan-feature">
                    <span className="plan-check">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                <button
                  className="plan-cta"
                  style={{ background: p.popular ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : p.color + '55', color: p.popular ? '#fff' : p.colorDark }}
                  onClick={() => openAuth('registro')}
                >
                  Empezar con {p.nombre} →
                </button>
              </div>
            ))}
          </div>

          {/* Compare table */}
          <div className="kh-compare-wrap">
            <table className="kh-compare-tbl">
              <thead>
                <tr style={{ background:'#FAFBFF' }}>
                  <th style={{ padding:'14px 16px', textAlign:'left', fontWeight:700, fontSize:13, color:'#374151', borderBottom:'2px solid #F1F5F9' }}>Función</th>
                  {PLANES.map(p => (
                    <th key={p.nombre} className="kh-tbl-head" style={{ borderBottom:'2px solid #F1F5F9', color: p.popular ? '#7C3AED' : '#111827' }}>
                      {p.emoji} {p.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={5} className="kh-tbl-group">Límites del plan</td></tr>
                {COMPARE.slice(0,3).map((row,i) => (
                  <tr key={i}><td className="kh-tbl-feat">{row.feat}</td><CmpCell val={row.s}/><CmpCell val={row.b}/><CmpCell val={row.p} highlight/><CmpCell val={row.pl}/></tr>
                ))}
                <tr><td colSpan={5} className="kh-tbl-group">Funciones incluidas</td></tr>
                {COMPARE.slice(3,8).map((row,i) => (
                  <tr key={i}><td className="kh-tbl-feat">{row.feat}</td><CmpCell val={row.s}/><CmpCell val={row.b}/><CmpCell val={row.p} highlight/><CmpCell val={row.pl}/></tr>
                ))}
                <tr><td colSpan={5} className="kh-tbl-group">Funciones avanzadas</td></tr>
                {COMPARE.slice(8,14).map((row,i) => (
                  <tr key={i}><td className="kh-tbl-feat">{row.feat}</td><CmpCell val={row.s}/><CmpCell val={row.b}/><CmpCell val={row.p} highlight/><CmpCell val={row.pl}/></tr>
                ))}
                <tr><td colSpan={5} className="kh-tbl-group">IA, equipo y fiscalidad</td></tr>
                {COMPARE.slice(14).map((row,i) => (
                  <tr key={i}><td className="kh-tbl-feat">{row.feat}</td><CmpCell val={row.s}/><CmpCell val={row.b}/><CmpCell val={row.p} highlight/><CmpCell val={row.pl}/></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 6 — CTA FINAL                            */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="cta-section scroll-section">
        <div className="cta-glow section-bg" aria-hidden />
        <div className="cta-inner">
          <div className="cta-logo-wrap">
            <DiamondLogo3D />
          </div>
          <h2 className="cta-h2">Tu negocio merece<br />la mejor herramienta</h2>
          <p className="cta-p">
            Empieza gratis hoy. Sin tarjeta de crédito. Sin permanencia.<br />
            Configuración en menos de 5 minutos.
          </p>
          <button className="kh-btn-white" onClick={() => openAuth('registro')}>
            Empezar gratis →
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECCIÓN 7 — PARA CLIENTES                        */}
      {/* ══════════════════════════════════════════════════ */}
      <section className="kh-clients scroll-section">
        <div className="kh-clients-blob" aria-hidden />
        <div className="clientes-inner" style={{ maxWidth:580, margin:'0 auto', position:'relative', zIndex:1 }}>
          <span className="kh-tag kh-tag-green" style={{ display:'inline-flex', marginBottom:16 }}>Para clientes</span>
          <h2 className="kh-h2">¿Eres cliente?</h2>
          <p className="kh-section-p" style={{ margin:'10px auto 28px', maxWidth:440 }}>
            Descubre y reserva en los mejores negocios cerca de ti, con disponibilidad en tiempo real.
          </p>
          <a
            href="/cliente"
            style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'16px 36px', borderRadius:16, background:'linear-gradient(135deg,#40DCA5,#22C88A)', color:'#fff', fontWeight:700, fontSize:16, textDecoration:'none', boxShadow:'0 6px 28px rgba(64,220,165,.35)', transition:'transform .2s,box-shadow .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 12px 40px rgba(64,220,165,.5)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 28px rgba(64,220,165,.35)' }}
          >
            Descubre negocios cerca de ti →
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════ */}
      {/* FOOTER                                            */}
      {/* ══════════════════════════════════════════════════ */}
      <footer className="kh-footer">
        <div className="kh-footer-wrap">
          <div className="kh-footer-top">
            <div>
              <div className="kh-footer-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="url(#fg1)" opacity=".9"/>
                  <path d="M12 6L18 12L12 18L6 12L12 6Z" fill="url(#fg2)" opacity=".7"/>
                  <circle cx="12" cy="12" r="2" fill="white" opacity=".9"/>
                  <defs>
                    <linearGradient id="fg1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#A78BFA"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
                    <linearGradient id="fg2" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse"><stop stopColor="#C4B5FD"/><stop offset="1" stopColor="#818CF8"/></linearGradient>
                  </defs>
                </svg>
                <em>Kh</em>epria
              </div>
              <div className="kh-footer-tag">Estamos construyendo algo grande ✨</div>
            </div>
            <div className="kh-footer-links">
              <a href="/cliente" className="kh-footer-a">🗺️ App para clientes</a>
              <a href="mailto:khepriacontact@gmail.com" className="kh-footer-a">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/></svg>
                khepriacontact@gmail.com
              </a>
              <a href="https://instagram.com/khepria_es" target="_blank" rel="noopener noreferrer" className="kh-footer-a">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <defs><linearGradient id="ig" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#F58529"/><stop offset="50%" stopColor="#DD2A7B"/><stop offset="100%" stopColor="#8134AF"/></linearGradient></defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig)"/>
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

      {/* ══════════════════════════════════════════════════ */}
      {/* AUTH MODAL                                        */}
      {/* ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {authOpen && (
          <div className="kh-overlay" onClick={e => { if (e.target === e.currentTarget) closeAuth() }}>
            <div className="kh-modal" role="dialog" aria-modal="true">
              <button className="kh-modal-close" onClick={closeAuth} aria-label="Cerrar">✕</button>
              <div className="kh-modal-logo"><em>Kh</em>epria</div>

              {authMode === 'recuperar' ? (
                <form onSubmit={handleRecover}>
                  <p style={{ fontSize:15, color:'#6B7280', marginBottom:20, lineHeight:1.6 }}>
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
                    <button className={`kh-auth-tab${authMode === 'login' ? ' active' : ''}`} onClick={() => { setAuthMode('login'); setAuthMsg('') }} type="button">Iniciar sesión</button>
                    <button className={`kh-auth-tab${authMode === 'registro' ? ' active' : ''}`} onClick={() => { setAuthMode('registro'); setAuthMsg('') }} type="button">Crear cuenta</button>
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
                        <button type="button" onClick={() => { setAuthMode('recuperar'); setAuthMsg('') }}>¿Olvidaste tu contraseña?</button>
                      </div>
                    )}
                    <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} style={{ display:'none', position:'absolute', left:'-9999px', opacity:0, pointerEvents:'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
                    <button className="kh-auth-btn" type="submit" disabled={authLoading}>
                      {authLoading ? (authMode === 'login' ? 'Entrando...' : 'Creando cuenta...') : (authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta gratis')}
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
