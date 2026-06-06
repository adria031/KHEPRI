'use client'

import { useEffect, useRef, useState } from 'react'
import type { WebGLRenderer } from 'three'
import { supabase } from './lib/supabase'
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento. Confirmaciones y recordatorios automáticos.' },
  { icon: '🤖', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde, reserva y cancela automáticamente sin intervención humana.' },
  { icon: '🧾', title: 'Facturación española automática', desc: 'Facturas con IVA, modelos 303, 130 y 111. Compatible con normativa española.' },
  { icon: '📊', title: 'Analytics con IA', desc: 'Predicciones de ingresos, análisis de clientes y recomendaciones para crecer.' },
  { icon: '📸', title: 'Marketing con IA', desc: 'Posts automáticos, estrategias de captación y calendario editorial con IA.' },
  { icon: '👥', title: 'Equipo y nóminas', desc: 'Gestiona empleados, turnos, nóminas y contratos SEPE desde el panel.' },
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
  { nombre: 'Starter', precio: '9,99',  emoji: '🌱', badge: 'Para empezar', popular: false, col: '#40DCA5', funciones: ['Reservas online 24/7', 'Ficha pública en mapa', 'Chatbot básico', 'Recordatorios automáticos', 'Reseñas post-cita', 'Estadísticas básicas'] },
  { nombre: 'Básico',  precio: '29,99', emoji: '🚀', badge: 'Para crecer',  popular: false, col: '#4FACFE', funciones: ['Todo lo del Starter', 'Chatbot completo', 'Caja diaria', 'Importador de apps', 'Fidelización con puntos', 'Descuentos y promociones'] },
  { nombre: 'Pro',     precio: '59,99', emoji: '💎', badge: 'Más popular',  popular: true,  col: '#7C5CEF', funciones: ['Todo lo del Básico', '2 negocios', 'Gestión de equipo', 'Marketing IA completo', 'Analytics avanzado', 'Facturación e IVA'] },
  { nombre: 'Plus',    precio: '99,99', emoji: '⚡', badge: 'Para escalar', popular: false, col: '#F59E0B', funciones: ['Todo lo del Pro', 'Hasta 10 negocios', 'Nóminas + plantillas SEPE', 'Contratos SEPE oficiales', 'Kit gestor PDF/CSV', 'Soporte prioritario'] },
]

const TIPOS_NEGOCIO = [
  'Peluquería / Barbería', 'Centro de estética / Uñas', 'Spa / Masajes',
  'Clínica / Consulta médica', 'Yoga / Pilates', 'Gimnasio / Entrenador personal',
  'Dentista', 'Veterinaria', 'Otro tipo de negocio',
]

const STATS = [
  { icon: '⏱️', num: 3,  prefix: '',  suffix: 'h',  label: 'ahorradas al día',    isStatic: false, staticVal: '' },
  { icon: '📈', num: 40, prefix: '+', suffix: '%',  label: 'más reservas',          isStatic: false, staticVal: '' },
  { icon: '🤖', num: 0,  prefix: '',  suffix: '',   label: 'atención automática',  isStatic: true,  staticVal: '24/7' },
  { icon: '💰', num: 0,  prefix: '',  suffix: '€',  label: 'en gestores de IVA',   isStatic: false, staticVal: '' },
]

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
    ref.current.style.transform = `perspective(800px) rotateX(${y * -10}deg) rotateY(${x * 10}deg) scale(1.02)`
    ref.current.style.transition = 'transform 0.05s ease'
  }
  const onLeave = () => {
    if (!ref.current) return
    ref.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)'
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1)'
  }
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform', ...style }}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  )
}

// ── ANIMATED COUNTER ──────────────────────────────────────────────────────────

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
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let rafId = 0
    let renderer: WebGLRenderer | null = null

    import('three').then((THREE) => {
      if (disposed) return

      const size = canvas.parentElement?.offsetWidth || 340
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      canvas.style.width = '100%'
      canvas.style.height = '100%'

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.z = 6

      function makeDiamondRing(outer: number, inner: number, color: number, emissive: number, opacity: number) {
        const shape = new THREE.Shape()
        shape.moveTo(0, outer); shape.lineTo(outer, 0)
        shape.lineTo(0, -outer); shape.lineTo(-outer, 0); shape.closePath()
        const hole = new THREE.Path()
        hole.moveTo(0, inner); hole.lineTo(inner, 0)
        hole.lineTo(0, -inner); hole.lineTo(-inner, 0); hole.closePath()
        shape.holes.push(hole)
        return new THREE.Mesh(
          new THREE.ShapeGeometry(shape, 2),
          new THREE.MeshPhongMaterial({
            color, emissive, emissiveIntensity: 0.35, shininess: 180,
            specular: 0xffffff, transparent: true, opacity,
            side: THREE.DoubleSide, depthWrite: false,
          })
        )
      }

      const d1 = makeDiamondRing(1.5, 1.14, 0xAA88FF, 0x6633CC, 0.80)
      const d2 = makeDiamondRing(1.09, 0.74, 0x66BBFF, 0x2255AA, 0.85)
      const d3 = makeDiamondRing(0.71, 0.42, 0xCCEEFF, 0x4488CC, 0.92)
      scene.add(d1, d2, d3)

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 0.4, shininess: 200, specular: 0xffffff })
      )
      sphere.position.z = 0.1
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x8899ff, transparent: true, opacity: 0.12 })
      )
      halo.position.z = 0.08
      scene.add(halo, sphere)

      scene.add(new THREE.AmbientLight(0x334466, 2))
      const l1 = new THREE.PointLight(0x7C5CEF, 8, 14)
      const l2 = new THREE.PointLight(0x4FACFE, 7, 14)
      const l3 = new THREE.PointLight(0xffffff, 4, 8)
      l3.position.set(0, 0, 5)
      scene.add(l1, l2, l3)

      const PI2 = Math.PI * 2
      const startTs = performance.now()

      function animate() {
        if (disposed) return
        const lt = ((performance.now() - startTs) / 1000 % 15) / 15
        d1.rotation.y = lt * PI2
        d2.rotation.y = -lt * PI2 * 2
        d3.rotation.y = lt * PI2 * 3
        const tilt = Math.sin(lt * PI2) * 0.25
        d1.rotation.x = tilt; d2.rotation.x = tilt * 0.85; d3.rotation.x = tilt * 0.7
        const la = lt * PI2 * 2
        l1.position.x = Math.cos(la) * 4; l1.position.z = Math.sin(la) * 4
        l2.position.x = Math.cos(la + Math.PI) * 4; l2.position.z = Math.sin(la + Math.PI) * 4
        const p = 1 + Math.sin(lt * PI2 * 4) * 0.08
        sphere.scale.setScalar(p); halo.scale.setScalar(p)
        renderer!.render(scene, camera)
        rafId = requestAnimationFrame(animate)
      }
      rafId = requestAnimationFrame(animate)
    })

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      renderer?.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

// ── PARTICLES BACKGROUND (hero) ───────────────────────────────────────────────

function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const rawCanvas = canvasRef.current
    if (!rawCanvas) return
    const canvasEl: HTMLCanvasElement = rawCanvas
    const ctx: CanvasRenderingContext2D = canvasEl.getContext('2d')!
    if (!ctx) return
    let rafId = 0
    let disposed = false
    canvasEl.width = window.innerWidth
    canvasEl.height = window.innerHeight
    const onResize = () => {
      canvasEl.width = window.innerWidth
      canvasEl.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    const COLS = ['#7C5CEF', '#4FACFE', '#40DCA5', '#B89EFF']
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvasEl.width,
      y: Math.random() * canvasEl.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.25 + 0.06,
      c: COLS[Math.floor(Math.random() * COLS.length)],
    }))
    function tick() {
      if (disposed) return
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvasEl.width
        if (p.x > canvasEl.width) p.x = 0
        if (p.y < 0) p.y = canvasEl.height
        if (p.y > canvasEl.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c
        ctx.globalAlpha = p.a
        ctx.fill()
      }
      ctx.globalAlpha = 1
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

// ── NEURAL NETWORK BACKGROUND ─────────────────────────────────────────────────

function NeuralNetworkBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const rawCanvas = canvasRef.current
    if (!rawCanvas) return
    const canvas: HTMLCanvasElement = rawCanvas
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!
    if (!ctx) return

    let rafId = 0
    let disposed = false
    let W = window.innerWidth
    let H = window.innerHeight

    const isMob = W < 768
    const NODE_COUNT = isMob ? 16 : 30
    const MAX_DIST = isMob ? 180 : 250
    const COLS = ['#7C5CEF', '#4FACFE', '#40DCA5', '#B89EFF', '#7EC8FF']

    // Nodes: some near center spine, rest spread
    const SPINE = Math.floor(NODE_COUNT * 0.4)
    type Node = { x: number; y: number; vx: number; vy: number; r: number; col: string; phase: number; ps: number }

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: i < SPINE
        ? W / 2 + (Math.random() - 0.5) * W * 0.22
        : Math.random() * W,
      y: i < SPINE
        ? (i / SPINE) * H + Math.random() * (H / SPINE)
        : Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 2.2 + 1.4,
      col: COLS[Math.floor(Math.random() * COLS.length)],
      phase: Math.random() * Math.PI * 2,
      ps: 0.012 + Math.random() * 0.018,
    }))

    // Particles — each travels from one node to another
    type Prt = { from: number; to: number; t: number; speed: number; col: string }
    const PCOUNT = isMob ? 22 : 50
    const particles: Prt[] = Array.from({ length: PCOUNT }, () => ({
      from: Math.floor(Math.random() * NODE_COUNT),
      to: Math.floor(Math.random() * NODE_COUNT),
      t: Math.random(),
      speed: 0.0035 + Math.random() * 0.005,
      col: COLS[Math.floor(Math.random() * COLS.length)],
    }))

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    canvas.width = W
    canvas.height = H
    window.addEventListener('resize', onResize)

    function draw() {
      if (disposed) return
      ctx.clearRect(0, 0, W, H)

      // Edges
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const a = (1 - dist / MAX_DIST) * 0.2
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y)
            const ai = Math.round(a * 255).toString(16).padStart(2, '0')
            grad.addColorStop(0, nodes[i].col + ai)
            grad.addColorStop(1, nodes[j].col + ai)
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = grad
            ctx.lineWidth = 0.9
            ctx.stroke()
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
        n.phase += n.ps

        const pulse = 1 + Math.sin(n.phase) * 0.35
        const gr = n.r * pulse * 5
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gr)
        grd.addColorStop(0, n.col + '55')
        grd.addColorStop(1, n.col + '00')
        ctx.beginPath()
        ctx.arc(n.x, n.y, gr, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2)
        ctx.fillStyle = n.col + 'DD'
        ctx.fill()
      }

      // Particles
      for (const p of particles) {
        p.t += p.speed
        if (p.t >= 1) {
          p.t = 0
          p.from = Math.floor(Math.random() * NODE_COUNT)
          p.to = Math.floor(Math.random() * NODE_COUNT)
          p.col = COLS[Math.floor(Math.random() * COLS.length)]
        }
        const n1 = nodes[p.from]
        const n2 = nodes[p.to]
        const edx = n1.x - n2.x
        const edy = n1.y - n2.y
        if (Math.sqrt(edx * edx + edy * edy) > MAX_DIST * 1.3) continue
        const px = n1.x + (n2.x - n1.x) * p.t
        const py = n1.y + (n2.y - n1.y) * p.t
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 5)
        pg.addColorStop(0, p.col + 'EE')
        pg.addColorStop(1, p.col + '00')
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = pg
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px, py, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffffCC'
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

// ── SECTION BRANCHES ──────────────────────────────────────────────────────────

function SectionBranches({ color = '#7C5CEF' }: { color?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })
  return (
    <div ref={ref} aria-hidden style={{ position: 'relative', height: 12, marginBottom: 48 }}>
      <div style={{
        position: 'absolute', right: '50%', top: 5, height: 1, width: '50%',
        background: `linear-gradient(to left, ${color}CC, transparent)`,
        boxShadow: `0 0 8px ${color}60`,
        transformOrigin: 'right center',
        transform: `scaleX(${inView ? 1 : 0})`,
        transition: 'transform 1s cubic-bezier(0.22,1,0.36,1)',
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: 0, width: 12, height: 12, marginLeft: -6,
        borderRadius: '50%', background: color,
        boxShadow: `0 0 20px ${color}, 0 0 8px ${color}`,
        opacity: inView ? 1 : 0,
        transform: inView ? 'scale(1)' : 'scale(0)',
        transition: 'opacity 0.4s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: 5, height: 1, width: '50%',
        background: `linear-gradient(to right, ${color}CC, transparent)`,
        boxShadow: `0 0 8px ${color}60`,
        transformOrigin: 'left center',
        transform: `scaleX(${inView ? 1 : 0})`,
        transition: 'transform 1s cubic-bezier(0.22,1,0.36,1) 0.2s',
      }} />
    </div>
  )
}

// ── HOME ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  // Global scroll
  const { scrollY } = useScroll()
  const navBg  = useTransform(scrollY, [0, 60],  ['rgba(7,7,15,0)', 'rgba(7,7,15,0.95)'])
  const heroY  = useTransform(scrollY, [0, 600], [0, -80])
  const heroOp = useTransform(scrollY, [0, 500], [1, 0.15])

  // Per-section scroll refs
  const featRef   = useRef<HTMLElement>(null)
  const quienRef  = useRef<HTMLElement>(null)
  const planesRef = useRef<HTMLElement>(null)

  const { scrollYProgress: fpRaw } = useScroll({ target: featRef,   offset: ['start end', 'center center'] })
  const { scrollYProgress: qpRaw } = useScroll({ target: quienRef,  offset: ['start end', 'center center'] })
  const { scrollYProgress: ppRaw } = useScroll({ target: planesRef, offset: ['start end', 'center center'] })

  // Spring smoothing — eliminates jitter from rapid scroll
  const fp = useSpring(fpRaw, { stiffness: 100, damping: 30, restDelta: 0.001 })
  const qp = useSpring(qpRaw, { stiffness: 100, damping: 30, restDelta: 0.001 })
  const pp = useSpring(ppRaw, { stiffness: 100, damping: 30, restDelta: 0.001 })

  // Feature transforms — reduced range, zero on mobile to avoid clip
  const fLX  = useTransform(fp, [0, 0.75], [-110, 0])
  const fLRY = useTransform(fp, [0, 0.75], [18,   0])
  const fRX  = useTransform(fp, [0, 0.75], [ 110, 0])
  const fRRY = useTransform(fp, [0, 0.75], [-18,  0])
  const fOp  = useTransform(fp, [0, 0.45], [0,    1])

  // Para quién transforms
  const qLX = useTransform(qp, [0, 0.7], [-90, 0])
  const qRX = useTransform(qp, [0, 0.7], [ 90, 0])
  const qOp = useTransform(qp, [0, 0.4], [0,   1])

  // Planes transforms
  const pLX = useTransform(pp, [0, 0.7], [-110, 0])
  const pRX = useTransform(pp, [0, 0.7], [ 110, 0])
  const pOp = useTransform(pp, [0, 0.4], [0,    1])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email) { setFormError('El email es obligatorio'); return }
    setEnviando(true); setFormError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setEnviado(true); setCount(c => c + 1) }
      else { const d = await res.json(); setFormError(d.error || 'Error. Inténtalo de nuevo.') }
    } catch { setFormError('Error de conexión.') }
    finally { setEnviando(false) }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; overflow-x: hidden !important; }
        body { font-family: 'DM Sans', sans-serif !important; background: #07070F; color: #E8E8F0; overflow-x: hidden !important; }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes heroBg {
          0%,100% { transform:translate(0,0) scale(1); }
          33%     { transform:translate(50px,-30px) scale(1.06); }
          66%     { transform:translate(-30px,50px) scale(0.95); }
        }
        @keyframes scrollBounce {
          0%,100% { transform:translateY(0); opacity:0.7; }
          50%     { transform:translateY(8px); opacity:0.25; }
        }
        @keyframes neuronFlow { 0%{top:-2%;opacity:0} 10%{opacity:1} 90%{opacity:.9} 100%{top:102%;opacity:0} }
        @keyframes nodePulse {
          0%,100% { box-shadow:0 0 0 0 rgba(124,92,239,0.8); }
          50%     { box-shadow:0 0 0 14px rgba(124,92,239,0); }
        }
        @keyframes particleFlow {
          0%   { opacity:0; transform:translateY(0) scale(1); }
          15%  { opacity:.7; }
          85%  { opacity:.5; }
          100% { opacity:0; transform:translateY(-40px) scale(.6); }
        }

        /* ── Nav ── */
        .kh-nav { position:fixed; top:0; left:0; right:0; z-index:200; }
        .kh-nav-inner { max-width:1180px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .kh-logo { font-family:'Syne',sans-serif; font-size:clamp(18px,2.5vw,22px); font-weight:800; color:#fff; text-decoration:none; letter-spacing:-0.5px; flex-shrink:0; cursor:pointer; display:flex; align-items:center; gap:8px; }
        .kh-logo em { font-style:normal; color:#9B7EFF; }
        .kh-logo-gem { width:20px; height:20px; flex-shrink:0; }
        .kh-nav-links { display:flex; gap:2px; align-items:center; }
        .kh-nav-btn { font-size:14px; font-weight:600; color:rgba(255,255,255,0.6); padding:8px 14px; border-radius:8px; cursor:pointer; border:none; background:none; font-family:'DM Sans',sans-serif; transition:color 0.2s; white-space:nowrap; }
        .kh-nav-btn:hover { color:#fff; }
        .kh-nav-login { font-size:14px; font-weight:600; color:rgba(255,255,255,0.75); padding:9px 18px; border-radius:999px; border:1.5px solid rgba(124,92,239,0.45); cursor:pointer; background:transparent; font-family:'DM Sans',sans-serif; white-space:nowrap; text-decoration:none; transition:border-color 0.2s,color 0.2s,box-shadow 0.2s; }
        .kh-nav-login:hover { border-color:#9B7EFF; color:#fff; box-shadow:0 0 20px rgba(124,92,239,0.3); }
        .kh-nav-cta { font-size:14px; font-weight:700; color:#fff; background:linear-gradient(135deg,#7C5CEF,#4F46E5); padding:10px 22px; border-radius:999px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; white-space:nowrap; text-decoration:none; flex-shrink:0; transition:box-shadow 0.2s,transform 0.2s; }
        .kh-nav-cta:hover { transform:translateY(-1px); box-shadow:0 0 32px rgba(124,92,239,0.65); }
        .kh-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; border:none; background:none; padding:6px; flex-shrink:0; }
        .kh-hamburger span { display:block; width:22px; height:2px; background:rgba(255,255,255,0.75); border-radius:2px; }
        .kh-mobile { display:none; flex-direction:column; gap:4px; padding:8px 16px 16px; border-top:1px solid rgba(255,255,255,0.07); background:rgba(7,7,15,0.97); animation:slideDown 0.25s ease; }
        .kh-mobile.open { display:flex; }
        .kh-mobile-btn { font-size:15px; font-weight:600; color:rgba(255,255,255,0.65); padding:13px 12px; border-radius:10px; cursor:pointer; border:none; background:none; text-align:left; font-family:'DM Sans',sans-serif; }
        .kh-mobile-btn:hover { background:rgba(255,255,255,0.05); color:#fff; }

        /* ── Hero ── */
        .kh-hero { min-height:100svh; display:flex; align-items:center; justify-content:center; text-align:center; padding:120px 24px 100px; position:relative; overflow:hidden; }
        .kh-hero-bg { position:absolute; inset:-80px; background:radial-gradient(ellipse 55% 50% at 35% 35%, rgba(124,92,239,0.18) 0%,transparent 60%), radial-gradient(ellipse 40% 45% at 72% 65%, rgba(79,172,254,0.13) 0%,transparent 55%), #07070F; animation:heroBg 14s ease-in-out infinite; z-index:0; }
        .kh-hero-inner { position:relative; z-index:1; max-width:760px; margin:0 auto; }
        .kh-diamond-wrap { width:clamp(180px,32vw,320px); height:clamp(180px,32vw,320px); margin:0 auto 28px; }
        .kh-tag { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; letter-spacing:0.3px; padding:6px 14px; border-radius:999px; }
        .kh-tag-purple { background:rgba(124,92,239,0.15); color:#B89EFF; border:1px solid rgba(124,92,239,0.3); }
        .kh-tag-blue   { background:rgba(79,172,254,0.12);  color:#7EC8FF; border:1px solid rgba(79,172,254,0.3); }
        .kh-tag-green  { background:rgba(64,220,165,0.12);  color:#6EEBC2; border:1px solid rgba(64,220,165,0.3); }
        .kh-h1 { font-family:'Syne',sans-serif; font-size:clamp(2rem,5.5vw,3.6rem); font-weight:800; line-height:1.1; letter-spacing:-2px; color:#fff; margin:16px 0 14px; }
        .kh-h1 .accent { color:#B89EFF; }
        .kh-h2 { font-family:'Syne',sans-serif; font-size:clamp(1.5rem,3.5vw,2.4rem); font-weight:800; line-height:1.15; letter-spacing:-1px; color:#fff; margin-bottom:14px; }
        .kh-lead { font-size:clamp(14px,1.8vw,16px); color:rgba(255,255,255,0.5); line-height:1.8; max-width:520px; margin:0 auto; }
        .kh-hero-btns { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin-top:36px; }
        .kh-btn-primary { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; border-radius:14px; background:linear-gradient(135deg,#7C5CEF,#4F46E5); color:#fff; font-size:15px; font-weight:700; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; text-decoration:none; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 48px rgba(124,92,239,0.65); }
        .kh-btn-secondary { display:inline-flex; align-items:center; gap:8px; padding:14px 24px; border-radius:14px; background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.8); font-size:15px; font-weight:600; font-family:'DM Sans',sans-serif; border:1.5px solid rgba(255,255,255,0.1); cursor:pointer; text-decoration:none; transition:border-color 0.2s,background 0.2s; }
        .kh-btn-secondary:hover { border-color:rgba(124,92,239,0.5); background:rgba(124,92,239,0.07); }
        .scroll-ind { position:absolute; bottom:30px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; z-index:1; animation:scrollBounce 2.2s ease-in-out infinite; }
        .scroll-line { width:1.5px; height:36px; background:linear-gradient(to bottom,rgba(124,92,239,0.9),transparent); }
        .scroll-txt { font-size:10px; letter-spacing:0.15em; color:rgba(255,255,255,0.28); text-transform:uppercase; }

        /* ── Section commons ── */
        .kh-section { padding:100px 24px; position:relative; z-index:1; }
        .kh-section-inner { max-width:1180px; margin:0 auto; }
        .kh-sec-hdr { text-align:center; max-width:620px; margin:0 auto 56px; }
        .kh-sec-p { font-size:15px; color:rgba(255,255,255,0.4); line-height:1.75; margin-top:12px; }

        /* ── Stats — glassmorphism ── */
        .kh-stats-section { position:relative; z-index:1; padding:48px 24px; }
        .kh-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; max-width:1180px; margin:0 auto; }
        .kh-stat { display:flex; flex-direction:column; align-items:center; padding:32px 20px; gap:4px; border-radius:20px; background:rgba(255,255,255,0.03); border:1px solid rgba(124,92,239,0.3); backdrop-filter:blur(12px); box-shadow:0 0 32px rgba(124,92,239,0.08), inset 0 1px 0 rgba(255,255,255,0.06); transition:background 0.3s,border-color 0.3s,box-shadow 0.3s; }
        .kh-stat:hover { background:rgba(124,92,239,0.08); border-color:rgba(124,92,239,0.55); box-shadow:0 0 48px rgba(124,92,239,0.2); }
        .kh-stat-icon { font-size:22px; margin-bottom:8px; }
        .kh-stat-num { font-family:'Syne',sans-serif; font-size:clamp(1.8rem,3vw,2.4rem); font-weight:800; letter-spacing:-1.5px; color:#fff; }
        .kh-stat-label { font-size:13px; color:rgba(255,255,255,0.35); font-weight:500; text-align:center; }

        /* ── Feature cards ── */
        .feat-cols { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
        .feat-col { display:flex; flex-direction:column; gap:20px; will-change:transform; }
        .kh-feat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:28px; cursor:default; transition:background 0.3s,border-color 0.3s; }
        .kh-feat-card:hover { background:rgba(124,92,239,0.07); border-color:rgba(124,92,239,0.28); }
        .kh-feat-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:16px; background:rgba(124,92,239,0.15); }
        .kh-feat-title { font-size:15px; font-weight:700; color:#fff; margin-bottom:8px; }
        .kh-feat-desc { font-size:13px; color:rgba(255,255,255,0.42); line-height:1.7; }

        /* ── Para quién ── */
        .kh-quien-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; }
        .kh-quien-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:24px 12px; text-align:center; cursor:default; transition:background 0.3s,border-color 0.3s; }
        .kh-quien-card:hover { background:rgba(79,172,254,0.07); border-color:rgba(79,172,254,0.28); }
        .kh-quien-emoji { font-size:30px; margin-bottom:10px; display:block; }
        .kh-quien-name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.55); line-height:1.4; white-space:pre-line; }

        /* ── Planes ── */
        .kh-planes-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .kh-plan-card { background:rgba(255,255,255,0.03); border:1.5px solid rgba(255,255,255,0.07); border-radius:24px; padding:28px; display:flex; flex-direction:column; position:relative; overflow:hidden; height:100%; transition:border-color 0.3s; }
        .kh-plan-card.popular { border-color:rgba(124,92,239,0.6); box-shadow:0 0 48px rgba(124,92,239,0.2), inset 0 1px 0 rgba(124,92,239,0.15); background:rgba(124,92,239,0.06); }
        .kh-plan-badge { position:absolute; top:16px; right:16px; font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; }
        .kh-plan-emoji { font-size:30px; margin-bottom:12px; }
        .kh-plan-name { font-family:'Syne',sans-serif; font-size:19px; font-weight:800; color:#fff; }
        .kh-plan-price { font-family:'Syne',sans-serif; font-size:34px; font-weight:800; color:#fff; margin:12px 0 4px; letter-spacing:-1px; }
        .kh-plan-mes { font-size:13px; color:rgba(255,255,255,0.3); margin-bottom:16px; }
        .kh-plan-divider { height:1px; background:rgba(255,255,255,0.07); margin:14px 0; }
        .kh-plan-feat { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:9px; }
        .kh-plan-check { color:#40DCA5; font-weight:800; flex-shrink:0; margin-top:1px; }
        .kh-plan-cta { display:block; width:100%; margin-top:auto; padding-top:20px; }
        .kh-plan-btn { display:block; width:100%; padding:13px; border-radius:12px; border:none; cursor:pointer; font-size:14px; font-weight:700; font-family:'DM Sans',sans-serif; text-align:center; text-decoration:none; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-plan-btn:hover { transform:translateY(-1px); }
        .kh-plan-note { font-size:11px; color:rgba(255,255,255,0.22); text-align:center; margin-top:16px; }

        /* ── Cliente CTA ── */
        .kh-cliente { padding:80px 24px; text-align:center; position:relative; z-index:1; border-top:1px solid rgba(255,255,255,0.05); }

        /* ── Waitlist ── */
        .kh-waitlist { padding:100px 24px; background:linear-gradient(160deg, rgba(124,92,239,0.07) 0%, transparent 50%, rgba(64,220,165,0.04) 100%); position:relative; z-index:1; }
        .kh-wl-glow { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 40% 50% at 50% 50%, rgba(124,92,239,0.1) 0%,transparent 70%); }
        .kh-wl-inner { max-width:520px; margin:0 auto; text-align:center; position:relative; z-index:1; }
        .kh-wl-form { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:24px; padding:32px; margin-top:36px; backdrop-filter:blur(12px); }
        .kh-wl-grid { display:flex; flex-direction:column; gap:12px; }
        .kh-input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:13px 16px; color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; width:100%; transition:border-color 0.2s; }
        .kh-input::placeholder { color:rgba(255,255,255,0.28); }
        .kh-input:focus { border-color:rgba(124,92,239,0.6); }
        .kh-input option { background:#07070F; color:#fff; }
        .kh-wl-submit { width:100%; padding:14px; border-radius:12px; border:none; cursor:pointer; background:linear-gradient(135deg,#7C5CEF,#4F46E5); color:#fff; font-size:15px; font-weight:700; font-family:'DM Sans',sans-serif; transition:transform 0.2s,box-shadow 0.2s; }
        .kh-wl-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 0 40px rgba(124,92,239,0.55); }
        .kh-wl-submit:disabled { opacity:0.6; cursor:not-allowed; }
        .kh-wl-counter { margin-top:22px; display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:999px; padding:9px 20px; font-size:14px; font-weight:600; color:rgba(255,255,255,0.6); }
        .kh-wl-ok { padding:24px 0; }
        .kh-wl-ok-ico { font-size:48px; margin-bottom:12px; }
        .kh-wl-ok-t { font-size:20px; font-weight:700; color:#fff; margin-bottom:8px; }
        .kh-wl-ok-p { font-size:14px; color:rgba(255,255,255,0.45); line-height:1.6; }
        .kh-form-err { margin-top:10px; font-size:13px; color:#FCA5A5; }

        /* ── Footer ── */
        .kh-footer { background:#030307; padding:40px 24px 28px; border-top:1px solid rgba(255,255,255,0.06); position:relative; z-index:1; }
        .kh-footer-wrap { max-width:1180px; margin:0 auto; }
        .kh-footer-top { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; flex-wrap:wrap; margin-bottom:28px; }
        .kh-footer-logo { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
        .kh-footer-logo em { font-style:normal; color:#9B7EFF; }
        .kh-footer-tag { font-size:13px; color:rgba(255,255,255,0.28); margin-top:4px; }
        .kh-footer-links { display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
        .kh-footer-a { font-size:13px; color:rgba(255,255,255,0.38); text-decoration:none; display:flex; align-items:center; gap:6px; transition:color 0.2s; }
        .kh-footer-a:hover { color:rgba(255,255,255,0.8); }
        .kh-footer-bot { border-top:1px solid rgba(255,255,255,0.06); padding-top:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .kh-footer-copy { font-size:12px; color:rgba(255,255,255,0.2); }
        .kh-footer-legal { display:flex; gap:16px; flex-wrap:wrap; }
        .kh-footer-legal a { font-size:12px; color:rgba(255,255,255,0.22); text-decoration:none; transition:color 0.2s; }
        .kh-footer-legal a:hover { color:rgba(255,255,255,0.6); }

        /* ── Responsive ── */
        @media(max-width:900px) {
          .feat-cols { grid-template-columns:1fr; }
          .kh-planes-grid { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:16px; padding-bottom:12px; -webkit-overflow-scrolling:touch; }
          .kh-plan-card { min-width:260px; scroll-snap-align:start; flex-shrink:0; }
          .kh-stats-grid { grid-template-columns:1fr 1fr; }
          .kh-nav-links { display:none; }
          .kh-hamburger { display:flex; }
          .kh-quien-grid { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:12px; padding-bottom:8px; -webkit-overflow-scrolling:touch; }
          .kh-quien-card { min-width:130px; scroll-snap-align:start; flex-shrink:0; }
        }
        @media(max-width:600px) {
          .kh-hero-btns { flex-direction:column; align-items:center; }
          .kh-btn-primary, .kh-btn-secondary { width:100%; justify-content:center; }
          .kh-section { padding:64px 16px; }
          .kh-waitlist, .kh-cliente { padding:64px 16px; }
          .kh-footer-top { flex-direction:column; }
          .kh-footer-bot { flex-direction:column; align-items:flex-start; }
          .kh-stats-section { padding:32px 16px; }
          .kh-stats-grid { grid-template-columns:1fr 1fr; gap:12px; }
        }
      `}</style>

      {/* ── NEURAL NETWORK (fixed background, z-index:0) ── */}
      <NeuralNetworkBg />

      {/* ── GRAIN ── */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 997, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '300px 300px',
        opacity: 0.03, mixBlendMode: 'overlay',
      }} />

      {/* ── CURSOR ── */}
      <div aria-hidden style={{
        position: 'fixed', left: cursor.x - 20, top: cursor.y - 20,
        width: 40, height: 40, borderRadius: '50%',
        border: '1.5px solid rgba(124,92,239,0.6)',
        background: 'rgba(124,92,239,0.09)',
        boxShadow: '0 0 22px rgba(124,92,239,0.35)',
        pointerEvents: 'none', zIndex: 9999,
        transition: 'left 0.08s linear, top 0.08s linear, opacity 0.3s',
        opacity: cursorVis ? 1 : 0,
      }} />

      {/* ── NAVBAR ── */}
      <motion.nav className="kh-nav" style={{ background: navBg, backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="kh-nav-inner">
          <span className="kh-logo" onClick={() => scrollTo('hero')}>
            <svg className="kh-logo-gem" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L20 9L12 22L4 9Z" stroke="#9B7EFF" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(124,92,239,0.18)" />
              <path d="M12 2L20 9L4 9Z" stroke="#9B7EFF" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(124,92,239,0.3)" />
              <circle cx="12" cy="9" r="2" fill="#9B7EFF" opacity="0.9" />
            </svg>
            <em>Kh</em>epria
          </span>

          <div className="kh-nav-links">
            <button className="kh-nav-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
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
          <button className="kh-mobile-btn" onClick={() => scrollTo('planes')}>Planes</button>
          <a href="/cliente" className="kh-mobile-btn" style={{ textDecoration: 'none' }}>Explorar negocios</a>
          <a href="/auth" className="kh-mobile-btn" style={{ textDecoration: 'none', color: '#B89EFF', fontWeight: 700 }}>Registrarme →</a>
        </div>
      </motion.nav>

      {/* ── MAIN WRAPPER ── */}
      <div style={{ position: 'relative', zIndex: 1, overflowX: 'hidden' }}>

        {/* ── HERO ── */}
        <section className="kh-hero" id="hero">
          <div className="kh-hero-bg" />
          <ParticlesBackground />
          <motion.div className="kh-hero-inner" style={{ y: heroY, opacity: heroOp }}>

            <div style={{ animation: 'logoFloat 4s ease-in-out infinite' }}>
              <motion.div
                className="kh-diamond-wrap"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.3, ease: 'easeOut' as const }}
              >
                <DiamondLogo3D />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              style={{ display: 'inline-block', marginBottom: 14 }}
            >
              <span className="kh-tag kh-tag-purple">✨ La IA fusionada con tu negocio</span>
            </motion.div>

            <motion.h1
              className="kh-h1"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              El corazón que une<br />la <span className="accent">IA</span> y tu negocio
            </motion.h1>

            <motion.p
              className="kh-lead"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.75 }}
            >
              Khepria se fusiona con tu negocio para ser uno solo.<br />Crecen juntos.
            </motion.p>

            <motion.div
              className="kh-hero-btns"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
            >
              <a href="/auth" className="kh-btn-primary">Registrar mi negocio →</a>
              <a href="/cliente" className="kh-btn-secondary">Explorar negocios</a>
            </motion.div>

          </motion.div>

          <div className="scroll-ind" aria-hidden>
            <div className="scroll-line" />
            <span className="scroll-txt">scroll</span>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="kh-stats-section">
          <motion.div
            className="kh-stats-grid"
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {STATS.map((s, i) => (
              <motion.div
                key={i} className="kh-stat"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } } }}
              >
                <span className="kh-stat-icon">{s.icon}</span>
                <span className="kh-stat-num">
                  {s.isStatic ? s.staticVal : <AnimCount end={s.num} prefix={s.prefix} suffix={s.suffix} />}
                </span>
                <span className="kh-stat-label">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── FUNCIONES ── */}
        <section className="kh-section" id="funciones" ref={featRef}>
          <div className="kh-section-inner">
            {!isMobile && <SectionBranches color="#7C5CEF" />}
            <motion.div
              className="kh-sec-hdr"
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                style={{ display: 'inline-block', marginBottom: 12 }}
              >
                <span className="kh-tag kh-tag-purple">Funciones</span>
              </motion.span>
              <motion.h2
                className="kh-h2"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              >
                Todo lo que necesitas,<br />nada de lo que no
              </motion.h2>
              <motion.p
                className="kh-sec-p"
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              >
                Cada función está pensada para ahorrarte tiempo real y hacer crecer tu negocio
              </motion.p>
            </motion.div>

            <div className="feat-cols">
              <motion.div
                className="feat-col"
                style={{ x: isMobile ? 0 : fLX, rotateY: isMobile ? 0 : fLRY, opacity: isMobile ? 1 : fOp, transformPerspective: 1200 }}
              >
                {FEATURES.filter((_, i) => i % 2 === 0).map(f => (
                  <TiltCard key={f.title} className="kh-feat-card">
                    <div className="kh-feat-icon">{f.icon}</div>
                    <div className="kh-feat-title">{f.title}</div>
                    <div className="kh-feat-desc">{f.desc}</div>
                  </TiltCard>
                ))}
              </motion.div>

              <motion.div
                className="feat-col"
                style={{ x: isMobile ? 0 : fRX, rotateY: isMobile ? 0 : fRRY, opacity: isMobile ? 1 : fOp, transformPerspective: 1200, marginTop: isMobile ? 0 : 48 }}
              >
                {FEATURES.filter((_, i) => i % 2 === 1).map(f => (
                  <TiltCard key={f.title} className="kh-feat-card">
                    <div className="kh-feat-icon">{f.icon}</div>
                    <div className="kh-feat-title">{f.title}</div>
                    <div className="kh-feat-desc">{f.desc}</div>
                  </TiltCard>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── PARA QUIÉN ── */}
        <section className="kh-section" id="quien" ref={quienRef} style={{ background: 'rgba(79,172,254,0.02)' }}>
          <div className="kh-section-inner">
            {!isMobile && <SectionBranches color="#4FACFE" />}
            <motion.div
              className="kh-sec-hdr"
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                style={{ display: 'inline-block', marginBottom: 12 }}
              >
                <span className="kh-tag kh-tag-blue">¿Para quién?</span>
              </motion.span>
              <motion.h2
                className="kh-h2"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              >
                Diseñado para tu tipo<br />de negocio
              </motion.h2>
            </motion.div>

            <div className="kh-quien-grid">
              {QUIENES.map((q, i) => (
                <motion.div key={q.name} style={{ x: isMobile ? 0 : (i % 2 === 0 ? qLX : qRX), opacity: isMobile ? 1 : qOp }}>
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
        <section className="kh-section" id="planes" ref={planesRef}>
          <div className="kh-section-inner">
            {!isMobile && <SectionBranches color="#40DCA5" />}
            <motion.div
              className="kh-sec-hdr"
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                style={{ display: 'inline-block', marginBottom: 12 }}
              >
                <span className="kh-tag kh-tag-purple">Planes</span>
              </motion.span>
              <motion.h2
                className="kh-h2"
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              >
                Sin sorpresas. Sin comisiones.
              </motion.h2>
              <motion.p
                className="kh-sec-p"
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              >
                Elige el plan que mejor se adapte. Cancela cuando quieras.
              </motion.p>
            </motion.div>

            <div className="kh-planes-grid">
              {PLANES.map((p, i) => (
                <motion.div
                  key={p.nombre}
                  style={{
                    x: isMobile ? 0 : (i % 2 === 0 ? pLX : pRX),
                    opacity: isMobile ? 1 : pOp,
                    scale: p.popular ? 1.06 : 1,
                    transformPerspective: 1200,
                  }}
                >
                  <TiltCard className={`kh-plan-card ${p.popular ? 'popular' : ''}`}>
                    <div className="kh-plan-badge" style={{ background: `${p.col}20`, color: p.col }}>{p.badge}</div>
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
                          background: p.popular ? 'linear-gradient(135deg,#7C5CEF,#4F46E5)' : `${p.col}18`,
                          color: p.popular ? '#fff' : p.col,
                          border: p.popular ? 'none' : `1px solid ${p.col}40`,
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
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.span
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              style={{ display: 'inline-block', marginBottom: 16 }}
            >
              <span className="kh-tag kh-tag-green">Para clientes</span>
            </motion.span>
            <motion.h2
              className="kh-h2"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
            >
              ¿Eres cliente?
            </motion.h2>
            <motion.p
              className="kh-lead"
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              style={{ margin: '12px auto 28px' }}
            >
              Descubre y reserva en los mejores negocios cerca de ti,<br />con disponibilidad en tiempo real.
            </motion.p>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            >
              <a href="/cliente" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg,#40DCA5,#1aA080)',
                color: '#fff', fontWeight: 700, fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 0 36px rgba(64,220,165,0.3)',
                transition: 'transform 0.2s,box-shadow 0.2s',
              }}>
                Explorar negocios →
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ── WAITLIST ── */}
        <section className="kh-waitlist" id="waitlist">
          <div className="kh-wl-glow" />
          <div className="kh-wl-inner">
            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.span
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                style={{ display: 'inline-block' }}
              >
                <span className="kh-tag kh-tag-purple">Lista de espera</span>
              </motion.span>
              <motion.h2
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
                style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.8rem,4.5vw,2.8rem)', fontWeight: 800, color: '#fff', letterSpacing: -1, margin: '16px 0 10px' }}
              >
                Sé de los primeros<br />en probarlo
              </motion.h2>
              <motion.p
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                style={{ fontSize: 15, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7 }}
              >
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

        {/* ── FOOTER ── */}
        <footer className="kh-footer">
          <div className="kh-footer-wrap">
            <div className="kh-footer-top">
              <div>
                <div className="kh-footer-logo"><em>Kh</em>epria</div>
                <div className="kh-footer-tag">La IA que se fusiona con tu negocio ✨</div>
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
                      <linearGradient id="ig-f2" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#F58529" /><stop offset="50%" stopColor="#DD2A7B" /><stop offset="100%" stopColor="#8134AF" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-f2)" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4" stroke="url(#ig-f2)" strokeWidth="2" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-f2)" />
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

      </div>
    </>
  )
}
