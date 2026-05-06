'use client'

import { useEffect, useState } from 'react'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', color: '#B8D8F8', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento. Confirmaciones y recordatorios automáticos sin que muevas un dedo.' },
  { icon: '🤖', color: '#D4C5F9', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde consultas, reserva citas y cancela automáticamente sin intervención humana, a cualquier hora.' },
  { icon: '🧾', color: '#B8EDD4', title: 'Facturación e IVA automático', desc: 'Facturas con IVA, modelos 303, 130 y 111. Compatible con la normativa fiscal española vigente.' },
  { icon: '📊', color: '#FDE9A2', title: 'Analytics con IA', desc: 'Predicciones de ingresos, análisis de clientes y recomendaciones accionables para crecer cada mes.' },
  { icon: '📸', color: '#FBCFE8', title: 'Marketing con IA', desc: 'Posts automáticos para redes sociales, estrategias de captación y calendario editorial generados con IA.' },
  { icon: '👥', color: '#B8D8F8', title: 'Gestión de equipo y nóminas', desc: 'Gestiona empleados, turnos, nóminas y contratos SEPE desde el panel de control.' },
]

const PROBLEMAS = [
  {
    icon: '📞', color: '#FFE4E1', borderColor: '#FECACA',
    title: 'Tu teléfono no para de sonar',
    desc: 'Clientes que quieren reservar, cambiar o cancelar. Interrupciones constantes que te impiden concentrarte en tu trabajo.',
    sol: 'Reservas online 24/7 sin que muevas un dedo',
  },
  {
    icon: '🌙', color: '#EDE8FD', borderColor: '#DDD6FE',
    title: 'Pierdes clientes fuera de horario',
    desc: 'Cuando cierras, las consultas quedan sin respuesta. Esos clientes que escriben a las 11 de la noche van a la competencia.',
    sol: 'Chatbot IA que responde y reserva a cualquier hora',
  },
  {
    icon: '📋', color: '#DCFCE7', borderColor: '#BBF7D0',
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

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [form, setForm] = useState({ nombre: '', email: '', tipo_negocio: '', ciudad: '' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [formError, setFormError] = useState('')

  // Fetch waitlist count
  useEffect(() => {
    fetch('/api/waitlist')
      .then(r => r.json())
      .then(d => setCount(Math.max(d.count ?? 0, 0) + 47))
      .catch(() => setCount(47))
  }, [])

  // Animate counter up when count changes
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

  // IntersectionObserver for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email) { setFormError('El email es obligatorio'); return }
    setEnviando(true)
    setFormError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setEnviado(true)
        setCount(c => c + 1)
      } else {
        const d = await res.json()
        setFormError(d.error || 'Error al guardar. Inténtalo de nuevo.')
      }
    } catch {
      setFormError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* ── FONTS ── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          background: #fff;
          color: #111827;
          overflow-x: hidden;
        }

        /* ── Keyframes ── */
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
          from { opacity:0; transform: translateY(-16px); }
          to   { opacity:1; transform: translateY(0); }
        }

        /* ── Scroll reveal ── */
        .fade-up {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .fade-up.visible { opacity:1; transform:translateY(0); }

        /* ── Navbar ── */
        .kh-nav {
          position: fixed; top:0; left:0; right:0; z-index:200;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .kh-nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 24px; height: 64px;
          display: flex; align-items: center; justify-content: space-between; gap:12px;
        }
        .kh-logo {
          font-family: 'Syne', sans-serif;
          font-size: clamp(18px, 3vw, 22px);
          font-weight: 800; color: #111827;
          text-decoration: none; letter-spacing: -0.5px; flex-shrink:0;
        }
        .kh-logo em { font-style:normal; color:#7C3AED; }
        .kh-nav-links { display:flex; gap:4px; align-items:center; }
        .kh-nav-btn {
          font-size: 14px; font-weight:600; color:#374151;
          padding: 8px 14px; border-radius:8px;
          cursor:pointer; border:none; background:none;
          transition: background 0.2s, color 0.2s; white-space:nowrap;
        }
        .kh-nav-btn:hover { background:#F3F4F6; color:#111827; }
        .kh-nav-cta {
          font-size:14px; font-weight:700; color:#fff;
          background: linear-gradient(135deg,#7C3AED,#4F46E5);
          padding:10px 22px; border-radius:999px; border:none;
          cursor:pointer; white-space:nowrap;
          transition: transform 0.2s, box-shadow 0.2s;
          flex-shrink:0;
        }
        .kh-nav-cta:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(124,58,237,0.4); }
        .kh-hamburger {
          display:none; flex-direction:column; gap:5px;
          cursor:pointer; border:none; background:none; padding:6px; flex-shrink:0;
        }
        .kh-hamburger span {
          display:block; width:22px; height:2px;
          background:#111827; border-radius:2px;
          transition: transform 0.3s, opacity 0.3s;
        }
        .kh-mobile {
          display:none; flex-direction:column; gap:4px;
          padding:8px 16px 16px;
          border-top:1px solid rgba(0,0,0,0.06);
          background:rgba(255,255,255,0.98);
          animation: slideDown 0.25s ease;
        }
        .kh-mobile.open { display:flex; }
        .kh-mobile-btn {
          font-size:15px; font-weight:600; color:#374151;
          padding:13px 12px; border-radius:10px;
          cursor:pointer; border:none; background:none; text-align:left;
          transition: background 0.2s;
        }
        .kh-mobile-btn:hover { background:#F3F4F6; }
        .kh-mobile-cta {
          margin-top:6px; font-size:15px; font-weight:700; color:#fff;
          background: linear-gradient(135deg,#7C3AED,#4F46E5);
          padding:14px 12px; border-radius:12px; border:none; cursor:pointer; text-align:center;
        }
        @media(max-width:768px) {
          .kh-nav-links { display:none; }
          .kh-hamburger { display:flex; }
        }

        /* ── Hero ── */
        .kh-hero {
          min-height:100svh; display:flex; align-items:center;
          position:relative; overflow:hidden;
          background:#fff; padding-top:64px;
        }
        .kh-blob {
          position:absolute; border-radius:50%;
          filter:blur(90px); opacity:0.45; pointer-events:none;
        }
        .kh-blob-1 { width:560px; height:560px; background:#D4C5F9; top:-140px; right:-120px; animation:blobA 14s ease-in-out infinite; }
        .kh-blob-2 { width:440px; height:440px; background:#B8D8F8; bottom:-80px; left:-100px; animation:blobB 17s ease-in-out infinite; }
        .kh-blob-3 { width:320px; height:320px; background:#B8EDD4; top:45%; left:42%; animation:blobC 11s ease-in-out infinite; }
        .kh-hero-inner {
          max-width:820px; margin:0 auto;
          padding: clamp(56px,10vw,120px) 24px;
          text-align:center; position:relative; z-index:1;
        }
        .kh-badge {
          display:inline-flex; align-items:center; gap:8px;
          background: linear-gradient(135deg,rgba(212,197,249,0.45),rgba(184,216,248,0.45));
          border:1px solid rgba(124,58,237,0.22);
          color:#6D28D9; font-size:clamp(12px,2vw,14px); font-weight:700;
          padding:8px 20px; border-radius:999px; margin-bottom:28px;
          animation: slideDown 0.8s ease, badgePulse 3s ease-in-out 1.5s infinite;
          letter-spacing:0.3px;
        }
        .kh-h1 {
          font-family:'Syne',sans-serif;
          font-size:clamp(2.4rem,7.5vw,5.2rem);
          font-weight:800; color:#111827;
          line-height:1.08; letter-spacing:-2.5px;
          margin-bottom:20px;
        }
        .kh-h1 mark {
          background: linear-gradient(135deg,#7C3AED,#4F46E5,#0EA5E9);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text; font-style:normal;
        }
        .kh-sub {
          font-size:clamp(1rem,2.6vw,1.2rem); color:#6B7280;
          line-height:1.75; max-width:580px; margin:0 auto 36px;
          font-weight:500;
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
        .kh-float {
          position:absolute; font-size:clamp(1.5rem,3vw,2.2rem);
          animation:floatUp 4s ease-in-out infinite; opacity:0.65;
        }

        /* ── Section commons ── */
        .kh-sec { padding: clamp(64px,10vw,100px) 24px; }
        .kh-wrap { max-width:1200px; margin:0 auto; }
        .kh-tag {
          display:inline-block; font-size:11px; font-weight:700;
          letter-spacing:1.8px; text-transform:uppercase;
          padding:6px 14px; border-radius:999px; margin-bottom:14px;
        }
        .kh-tag-purple { color:#7C3AED; background:rgba(124,58,237,0.09); border:1px solid rgba(124,58,237,0.18); }
        .kh-tag-light  { color:#A78BFA; background:rgba(167,139,250,0.14); border:1px solid rgba(167,139,250,0.28); }
        .kh-tag-green  { color:#4ADE80; background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); }
        .kh-h2 {
          font-family:'Syne',sans-serif;
          font-size:clamp(1.8rem,4vw,3rem);
          font-weight:800; letter-spacing:-1px; line-height:1.15;
          margin-bottom:10px;
        }
        .kh-h2-dark { color:#fff; }
        .kh-h2-light { color:#111827; }
        .kh-p { font-size:clamp(14px,2vw,16px); line-height:1.75; max-width:580px; }
        .kh-p-dark  { color:#94A3B8; }
        .kh-p-light { color:#6B7280; }
        .kh-center { text-align:center; }
        .kh-center .kh-p { margin:0 auto; }

        /* ── Problemas (dark) ── */
        .kh-problemas { background:#0F172A; }
        .kh-prob-grid {
          display:grid; grid-template-columns:repeat(3,1fr);
          gap:20px; margin-top:48px;
        }
        .kh-prob-card {
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:20px; padding:30px 26px;
          transition:background 0.3s,transform 0.2s;
        }
        .kh-prob-card:hover { background:rgba(255,255,255,0.07); transform:translateY(-2px); }
        .kh-prob-ico { font-size:2.2rem; margin-bottom:14px; }
        .kh-prob-t {
          font-family:'Syne',sans-serif;
          font-size:clamp(1rem,1.8vw,1.15rem);
          font-weight:700; color:#F1F5F9; margin-bottom:10px;
        }
        .kh-prob-d { font-size:14px; color:#94A3B8; line-height:1.65; margin-bottom:18px; }
        .kh-sol {
          display:inline-flex; align-items:center; gap:7px;
          font-size:12px; font-weight:700; color:#4ADE80;
          background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.22);
          padding:7px 14px; border-radius:999px;
        }
        @media(max-width:768px) {
          .kh-prob-grid { grid-template-columns:1fr; }
        }

        /* ── Features ── */
        .kh-features { background:#fff; }
        .kh-feat-grid {
          display:grid; grid-template-columns:repeat(3,1fr);
          gap:18px; margin-top:48px;
        }
        .kh-feat-card {
          background:#F9FAFB; border:1px solid #EAECEF;
          border-radius:20px; padding:26px 24px;
          transition:transform 0.22s,box-shadow 0.22s;
        }
        .kh-feat-card:hover { transform:translateY(-5px); box-shadow:0 14px 44px rgba(0,0,0,0.08); }
        .kh-feat-ico {
          width:50px; height:50px; border-radius:14px;
          display:flex; align-items:center; justify-content:center;
          font-size:1.4rem; margin-bottom:14px; flex-shrink:0;
        }
        .kh-feat-t {
          font-family:'Syne',sans-serif;
          font-size:clamp(0.9rem,1.6vw,1rem);
          font-weight:700; color:#111827; margin-bottom:7px;
        }
        .kh-feat-d { font-size:13px; color:#6B7280; line-height:1.6; }
        @media(max-width:768px) {
          .kh-feat-grid {
            display:flex !important;
            overflow-x:auto; scroll-snap-type:x mandatory;
            gap:14px; padding:4px 24px 20px;
            scrollbar-width:none; -webkit-overflow-scrolling:touch;
            grid-template-columns:unset !important;
            margin-left:-24px; margin-right:-24px; margin-top:32px;
          }
          .kh-feat-grid::-webkit-scrollbar { display:none; }
          .kh-feat-card { flex-shrink:0; width:260px; scroll-snap-align:start; }
        }

        /* ── Números ── */
        .kh-nums { background:#F8FAFC; }
        .kh-num-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:16px; margin-top:48px;
        }
        .kh-num-card { border-radius:20px; padding:30px 20px; text-align:center; }
        .kh-num-ico { font-size:2rem; margin-bottom:10px; }
        .kh-num-n {
          font-family:'Syne',sans-serif;
          font-size:clamp(2rem,4.5vw,3.2rem);
          font-weight:800; color:#111827; letter-spacing:-2px;
        }
        .kh-num-l { font-size:clamp(12px,1.8vw,14px); color:#6B7280; font-weight:600; margin-top:6px; }
        @media(max-width:640px) {
          .kh-num-grid { grid-template-columns:repeat(2,1fr); }
        }

        /* ── Para quién ── */
        .kh-quien { background:#fff; }
        .kh-q-grid {
          display:grid; grid-template-columns:repeat(6,1fr);
          gap:14px; margin-top:48px;
        }
        .kh-q-card {
          border-radius:16px; padding:22px 12px;
          text-align:center; border:2px solid #E5E7EB;
          transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s;
          cursor:default;
        }
        .kh-q-card:hover { border-color:#D4C5F9; transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.07); }
        .kh-q-ico { font-size:1.9rem; margin-bottom:8px; }
        .kh-q-name { font-size:11px; font-weight:700; color:#374151; line-height:1.35; }
        @media(max-width:900px) { .kh-q-grid { grid-template-columns:repeat(3,1fr); } }
        @media(max-width:600px) {
          .kh-q-grid {
            display:flex !important;
            overflow-x:auto; scroll-snap-type:x mandatory;
            gap:12px; padding:4px 24px 20px;
            scrollbar-width:none; -webkit-overflow-scrolling:touch;
            grid-template-columns:unset !important;
            margin-left:-24px; margin-right:-24px; margin-top:32px;
          }
          .kh-q-grid::-webkit-scrollbar { display:none; }
          .kh-q-card { flex-shrink:0; width:130px; scroll-snap-align:start; }
        }

        /* ── Planes ── */
        .kh-planes { background:#F8FAFC; }
        .kh-plan-grid {
          display:grid; grid-template-columns:repeat(4,1fr);
          gap:18px; margin-top:48px;
        }
        .kh-plan-card {
          border-radius:24px; padding:28px 22px;
          background:#fff; border:2px solid #E5E7EB;
          position:relative; transition:transform 0.22s,box-shadow 0.22s;
          display:flex; flex-direction:column;
        }
        .kh-plan-card.popular { border-color:#D4C5F9; }
        .kh-plan-card:hover { transform:translateY(-5px); box-shadow:0 14px 44px rgba(0,0,0,0.09); }
        .kh-plan-pop-badge {
          position:absolute; top:-13px; left:50%; transform:translateX(-50%);
          font-size:11px; font-weight:700;
          padding:5px 14px; border-radius:999px; white-space:nowrap;
        }
        .kh-plan-emoji { font-size:1.9rem; margin-bottom:10px; }
        .kh-plan-name {
          font-family:'Syne',sans-serif;
          font-size:1.2rem; font-weight:800; color:#111827; margin-bottom:4px;
        }
        .kh-plan-price {
          font-family:'Syne',sans-serif;
          font-size:clamp(1.8rem,3vw,2.2rem);
          font-weight:800; color:#111827; letter-spacing:-1px; line-height:1;
        }
        .kh-plan-price sup { font-size:0.6em; font-weight:700; vertical-align:super; }
        .kh-plan-price sub { font-size:13px; font-weight:500; color:#6B7280; letter-spacing:0; vertical-align:baseline; }
        .kh-plan-sep { height:1px; background:#E5E7EB; margin:18px 0; }
        .kh-plan-feats { display:flex; flex-direction:column; gap:9px; flex:1; margin-bottom:20px; }
        .kh-plan-feat { font-size:12.5px; color:#374151; display:flex; align-items:flex-start; gap:7px; line-height:1.45; }
        .kh-plan-feat-ok { color:#4ADE80; font-weight:800; flex-shrink:0; margin-top:1px; }
        .kh-plan-cta {
          width:100%; padding:11px; border-radius:12px;
          border:2px solid #E5E7EB; background:#F9FAFB;
          font-size:13px; font-weight:700; color:#9CA3AF;
          cursor:not-allowed; display:flex; align-items:center; justify-content:center; gap:5px;
        }
        @media(max-width:960px) { .kh-plan-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:580px) {
          .kh-plan-grid {
            display:flex !important;
            overflow-x:auto; scroll-snap-type:x mandatory;
            gap:16px; padding:20px 24px 24px;
            scrollbar-width:none; -webkit-overflow-scrolling:touch;
            grid-template-columns:unset !important;
            margin-left:-24px; margin-right:-24px; margin-top:28px;
          }
          .kh-plan-grid::-webkit-scrollbar { display:none; }
          .kh-plan-card { flex-shrink:0; width:min(calc(100vw - 48px),290px); scroll-snap-align:center; }
        }

        /* ── Waitlist ── */
        .kh-waitlist {
          background:linear-gradient(135deg,#EDE8FD 0%,#E8F3FD 50%,#E8FDF0 100%);
          padding: clamp(64px,10vw,100px) 24px;
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
          width:100%; padding:14px 16px;
          border:2px solid #E5E7EB; border-radius:12px;
          font-size:15px; font-family:'Plus Jakarta Sans',sans-serif;
          color:#111827; background:#F9FAFB;
          transition:border-color 0.2s, background 0.2s; outline:none;
          -webkit-appearance:none;
        }
        .kh-input:focus { border-color:#7C3AED; background:#fff; }
        .kh-input-full { grid-column:1 / -1; }
        .kh-submit {
          grid-column:1 / -1; width:100%;
          padding:16px; border-radius:12px; border:none;
          background:linear-gradient(135deg,#7C3AED,#4F46E5);
          color:#fff; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:16px; font-weight:700; cursor:pointer;
          transition:transform 0.2s,box-shadow 0.2s;
          margin-top:4px;
        }
        .kh-submit:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(124,58,237,0.42); }
        .kh-submit:disabled { opacity:0.7; cursor:not-allowed; transform:none; box-shadow:none; }
        .kh-form-err { color:#EF4444; font-size:13px; margin-top:8px; }
        .kh-success { text-align:center; padding:32px 16px; }
        .kh-success-ico { font-size:3rem; margin-bottom:14px; }
        .kh-success-t {
          font-family:'Syne',sans-serif;
          font-size:1.4rem; font-weight:800; color:#111827; margin-bottom:8px;
        }
        .kh-success-p { font-size:15px; color:#6B7280; }
        .kh-wl-counter {
          display:inline-flex; align-items:center; gap:7px;
          font-size:14px; color:#6B7280; margin-top:20px; font-weight:500;
        }
        .kh-wl-counter strong { color:#7C3AED; font-weight:800; font-size:16px; }
        @media(max-width:480px) {
          .kh-form-grid { grid-template-columns:1fr; }
          .kh-input-full { grid-column:1; }
          .kh-submit { grid-column:1; }
        }

        /* ── Para clientes ── */
        .kh-clients { background:#0F172A; padding:clamp(56px,8vw,88px) 24px; text-align:center; }

        /* ── Footer ── */
        .kh-footer { background:#080F1A; padding:clamp(40px,6vw,64px) 24px 28px; }
        .kh-footer-wrap { max-width:1200px; margin:0 auto; }
        .kh-footer-top {
          display:grid; grid-template-columns:1fr auto;
          gap:40px; align-items:start;
          border-bottom:1px solid rgba(255,255,255,0.06);
          padding-bottom:28px; margin-bottom:20px;
        }
        .kh-footer-logo { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:#fff; margin-bottom:6px; }
        .kh-footer-logo em { font-style:normal; color:#A78BFA; }
        .kh-footer-tag { font-size:13px; color:#475569; font-style:italic; }
        .kh-footer-links { display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
        .kh-footer-a {
          display:flex; align-items:center; gap:8px;
          font-size:13px; color:#64748B; text-decoration:none;
          transition:color 0.2s;
        }
        .kh-footer-a:hover { color:#94A3B8; }
        .kh-footer-bot {
          display:flex; justify-content:space-between;
          align-items:center; flex-wrap:wrap; gap:12px;
        }
        .kh-footer-copy { font-size:12px; color:#334155; }
        .kh-footer-legal { display:flex; gap:18px; flex-wrap:wrap; }
        .kh-footer-legal a { font-size:12px; color:#334155; text-decoration:none; transition:color 0.2s; }
        .kh-footer-legal a:hover { color:#64748B; }
        @media(max-width:600px) {
          .kh-footer-top { grid-template-columns:1fr; }
          .kh-footer-links { align-items:flex-start; }
        }
      `}</style>

      {/* ────────────────── NAVBAR ────────────────── */}
      <nav className="kh-nav">
        <div className="kh-nav-inner">
          <a className="kh-logo" href="#"><em>Kh</em>epria</a>

          <div className="kh-nav-links">
            <button className="kh-nav-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('quien')}>Para quién</button>
            <button className="kh-nav-btn" onClick={() => scrollTo('planes')}>Planes</button>
            <button className="kh-nav-cta" onClick={() => scrollTo('waitlist')}>Unirme a la beta</button>
          </div>

          <button
            className="kh-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menú"
          >
            <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : '' }} />
            <span style={{ opacity: menuOpen ? 0 : 1 }} />
            <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : '' }} />
          </button>
        </div>

        <div className={`kh-mobile${menuOpen ? ' open' : ''}`}>
          <button className="kh-mobile-btn" onClick={() => scrollTo('funciones')}>Funciones</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('quien')}>Para quién</button>
          <button className="kh-mobile-btn" onClick={() => scrollTo('planes')}>Planes</button>
          <button className="kh-mobile-cta" onClick={() => scrollTo('waitlist')}>Unirme a la lista de espera</button>
        </div>
      </nav>

      {/* ────────────────── HERO ────────────────── */}
      <section className="kh-hero">
        <div className="kh-blob kh-blob-1" />
        <div className="kh-blob kh-blob-2" />
        <div className="kh-blob kh-blob-3" />

        {/* Floating emojis — hidden on very small screens */}
        <div className="kh-floats" aria-hidden="true">
          <span className="kh-float" style={{ top: '22%', left: '6%', animationDelay: '0s', animationDuration: '3.8s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>📅</span>
          <span className="kh-float" style={{ top: '28%', right: '7%', animationDelay: '1.1s', animationDuration: '4.2s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>🤖</span>
          <span className="kh-float" style={{ bottom: '28%', left: '5%', animationDelay: '0.5s', animationDuration: '3.2s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>💬</span>
          <span className="kh-float" style={{ bottom: '24%', right: '6%', animationDelay: '1.6s', animationDuration: '4.6s', fontSize: 'clamp(1.2rem,3vw,2rem)' }}>⭐</span>
        </div>

        <div className="kh-hero-inner">
          <div className="kh-badge">
            🚀 En desarrollo — Beta próximamente
          </div>

          <h1 className="kh-h1">
            La app que tu negocio<br />
            <mark>estaba esperando</mark>
          </h1>

          <p className="kh-sub">
            Reservas automáticas, chatbot IA 24/7, facturación española y mucho más.
            Estamos construyendo algo grande.
          </p>

          <div className="kh-btns">
            <button className="kh-btn-p" onClick={() => scrollTo('waitlist')}>
              Quiero ser beta tester
            </button>
            <button className="kh-btn-s" onClick={() => scrollTo('funciones')}>
              Ver funciones ↓
            </button>
          </div>

          <div className="kh-counter">
            <span>🏢</span>
            <strong>{displayCount}</strong>
            <span>negocios ya en lista de espera</span>
          </div>
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
                <div className="kh-sol">
                  <span>✓</span>
                  <span>{p.sol}</span>
                </div>
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
              Herramientas diseñadas específicamente para negocios de servicios en España
            </p>
          </div>

          <div className="kh-feat-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="kh-feat-card fade-up" style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
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
              <div
                key={i}
                className={`kh-plan-card fade-up${p.popular ? ' popular' : ''}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {p.popular && (
                  <div
                    className="kh-plan-pop-badge"
                    style={{ background: p.color, color: p.colorDark }}
                  >
                    ⭐ {p.badge}
                  </div>
                )}
                <div className="kh-plan-emoji">{p.emoji}</div>
                <div className="kh-plan-name">{p.nombre}</div>
                <div className="kh-plan-price">
                  <sup>€</sup>{p.precio}<sub>/mes</sub>
                </div>
                <div className="kh-plan-sep" />
                <div className="kh-plan-feats">
                  {p.funciones.map((f, j) => (
                    <div key={j} className="kh-plan-feat">
                      <span className="kh-plan-feat-ok">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="kh-plan-cta">🔒 Próximamente</div>
              </div>
            ))}
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
              <form onSubmit={handleSubmit}>
                <div className="kh-form-grid">
                  <input
                    className="kh-input"
                    type="text"
                    placeholder="Tu nombre"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    autoComplete="name"
                  />
                  <input
                    className="kh-input"
                    type="email"
                    placeholder="Tu email *"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                    autoComplete="email"
                  />
                  <select
                    className="kh-input"
                    value={form.tipo_negocio}
                    onChange={e => setForm(f => ({ ...f, tipo_negocio: e.target.value }))}
                  >
                    <option value="">Tipo de negocio</option>
                    {TIPOS_NEGOCIO.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    className="kh-input"
                    type="text"
                    placeholder="Ciudad"
                    value={form.ciudad}
                    onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                    autoComplete="address-level2"
                  />
                  <button
                    className="kh-submit"
                    type="submit"
                    disabled={enviando}
                  >
                    {enviando ? 'Guardando...' : 'Unirme a la lista de espera →'}
                  </button>
                </div>
                {formError && <p className="kh-form-err">{formError}</p>}
              </form>
            )}
          </div>

          <div className="kh-wl-counter fade-up" style={{ transitionDelay: '0.25s' }}>
            <span>🏢</span>
            <strong>{displayCount}</strong>
            <span>negocios ya apuntados</span>
          </div>
        </div>
      </section>

      {/* ────────────────── PARA CLIENTES ────────────────── */}
      <section className="kh-clients">
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div className="fade-up">
            <div className="kh-tag kh-tag-light" style={{ marginBottom: 16 }}>Para clientes</div>
            <h2
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: 'clamp(1.6rem,3.5vw,2.4rem)',
                fontWeight: 800, color: '#fff',
                letterSpacing: '-1px', marginBottom: 14,
              }}
            >
              ¿Eres cliente?
            </h2>
            <p style={{ fontSize: 'clamp(14px,2vw,16px)', color: '#94A3B8', lineHeight: 1.75, marginBottom: 26 }}>
              Pronto podrás descubrir y reservar en los mejores negocios cerca de ti,
              con reseñas reales y disponibilidad en tiempo real.
            </p>
            <div className="kh-tag kh-tag-green" style={{ fontSize: 12 }}>
              🔜 Próximamente
            </div>
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
              <a href="mailto:khepriacontact@gmail.com" className="kh-footer-a">
                {/* Gmail */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335" />
                </svg>
                khepriacontact@gmail.com
              </a>
              <a href="https://instagram.com/khepria_es" target="_blank" rel="noopener noreferrer" className="kh-footer-a">
                {/* Instagram */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="ig" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F58529" />
                      <stop offset="50%" stopColor="#DD2A7B" />
                      <stop offset="100%" stopColor="#8134AF" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig)" />
                </svg>
                @khepria_es
              </a>
            </div>
          </div>

          <div className="kh-footer-bot">
            <div className="kh-footer-copy">© 2026 Khepria. Todos los derechos reservados.</div>
            <div className="kh-footer-legal">
              <a href="/terminos">Términos</a>
              <a href="/privacidad">Privacidad</a>
              <a href="/aviso-legal">Aviso legal</a>
              <a href="/cookies">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
