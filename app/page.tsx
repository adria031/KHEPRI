import Link from 'next/link'
import { LandingLangSelector } from './components/LandingLangSelector'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '11px',
        background: 'linear-gradient(135deg, #B8D8F8 0%, #D4C5F9 50%, #B8EDD4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 2px 12px rgba(139,92,246,0.25)',
      }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.45"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.75"/>
          <circle cx="11" cy="11" r="2.2" fill="white"/>
        </svg>
      </div>
      <span className="logo-text">Khepria</span>
    </div>
  )
}

export default function Home() {
  const features = [
    { icon: '📅', color: '#DBEAFE', title: 'Reservas 24/7', desc: 'Tus clientes reservan en cualquier momento desde web o app. Confirmaciones y recordatorios automáticos.' },
    { icon: '🤖', color: '#EDE9FE', title: 'Chatbot IA', desc: 'Responde consultas en WhatsApp e Instagram sin intervención humana. Disponible todo el día.' },
    { icon: '🧾', color: '#DCFCE7', title: 'Facturación española', desc: 'Genera facturas con IVA automáticamente. Compatible con la normativa fiscal española vigente.' },
    { icon: '📊', color: '#FEF9C3', title: 'Analytics con IA', desc: 'Gráficas inteligentes, previsiones y recomendaciones accionables para crecer cada mes.' },
    { icon: '📣', color: '#FCE7F3', title: 'Marketing IA', desc: 'Campañas automáticas personalizadas basadas en el comportamiento real de tus clientes.' },
    { icon: '👥', color: '#DBEAFE', title: 'Equipo y nóminas', desc: 'Gestiona empleados, asigna turnos y calcula nóminas desde el mismo panel de control.' },
    { icon: '💰', color: '#DCFCE7', title: 'Caja diaria', desc: 'Control de ingresos y gastos en tiempo real. Cierre de caja automático con resumen diario.' },
    { icon: '⭐', color: '#FEF9C3', title: 'Reseñas automáticas', desc: 'Solicita reseñas a cada cliente al finalizar su visita. Mejora tu reputación sin esfuerzo.' },
    { icon: '🗺️', color: '#EDE9FE', title: 'Mapa de negocios', desc: 'Aparece en el mapa de Khepria y atrae nuevos clientes que buscan servicios en tu zona.' },
    { icon: '🏷️', color: '#FCE7F3', title: 'Descuentos inteligentes', desc: 'Crea ofertas dinámicas y temporadas para maximizar tu ocupación en horas valle.' },
    { icon: '🌐', color: '#DCFCE7', title: 'Multiidioma', desc: 'Tu perfil y comunicaciones en español, catalán e inglés de forma completamente automática.' },
    { icon: '📱', color: '#DBEAFE', title: 'App para clientes', desc: 'Tus clientes descubren tu negocio, reservan y gestionan sus citas desde la app Khepria.' },
  ]

  const quienes = [
    { icon: '✂️', name: 'Peluquerías' },
    { icon: '💅', name: 'Estética & Uñas' },
    { icon: '🧖', name: 'Spas & Masajes' },
    { icon: '🏥', name: 'Clínicas & Fisios' },
    { icon: '🏋️', name: 'Gimnasios & Yoga' },
    { icon: '💉', name: 'Tattoo & Piercing' },
    { icon: '👓', name: 'Ópticas' },
    { icon: '🦷', name: 'Clínicas Dentales' },
    { icon: '✨', name: 'Centros de Estética' },
    { icon: '📚', name: 'Academias & Clases' },
    { icon: '🐾', name: 'Veterinarias' },
    { icon: '🎨', name: 'Estudios Creativos' },
  ]

  const planes = [
    {
      id: 'basico', name: 'Básico', emoji: '🌱',
      colorBg: '#EFF6FF', colorBorder: '#BFDBFE', colorText: '#1D4ED8',
      features: ['Reservas 24/7', 'Perfil público en el mapa', 'Chatbot básico', 'Hasta 2 empleados', 'Reseñas automáticas', 'App para clientes'],
    },
    {
      id: 'pro', name: 'Pro', emoji: '🚀', popular: true,
      colorBg: '#F5F3FF', colorBorder: '#C4B5FD', colorText: '#7C3AED',
      features: ['Todo lo del Básico', 'Facturación automática', 'Analytics con IA', 'Marketing IA', 'Equipo ilimitado', 'Caja diaria', 'Descuentos inteligentes', 'Soporte prioritario'],
    },
    {
      id: 'plus', name: 'Plus', emoji: '💎',
      colorBg: '#ECFDF5', colorBorder: '#A7F3D0', colorText: '#059669',
      features: ['Todo lo del Pro', 'Multi-negocio', 'API access', 'Onboarding dedicado', 'Personalización avanzada', 'Informes PDF automáticos'],
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #FFFFFF;
          color: #0F172A;
          overflow-x: hidden;
          line-height: 1.6;
        }
        .logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.4px;
          color: #0F172A;
          line-height: 1;
        }

        /* ── NAV ── */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px;
          height: 66px;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          transition: box-shadow 0.3s;
        }
        nav.scrolled { box-shadow: 0 4px 32px rgba(0,0,0,0.07); }
        .nav-center { display: flex; align-items: center; gap: 32px; }
        .nav-links { display: flex; align-items: center; gap: 6px; }
        .nav-links a {
          color: #475569; text-decoration: none; font-size: 14px; font-weight: 500;
          padding: 7px 12px; border-radius: 8px; transition: all 0.15s;
        }
        .nav-links a:hover { color: #0F172A; background: rgba(0,0,0,0.04); }
        .nav-actions { display: flex; align-items: center; gap: 8px; }
        .btn-ghost {
          color: #475569; text-decoration: none; font-size: 14px; font-weight: 600;
          padding: 8px 16px; border-radius: 10px; transition: all 0.15s;
        }
        .btn-ghost:hover { color: #0F172A; background: rgba(0,0,0,0.05); }
        .btn-primary {
          background: #0F172A; color: #fff; text-decoration: none;
          font-size: 14px; font-weight: 700;
          padding: 9px 20px; border-radius: 100px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-primary:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(15,23,42,0.25); }
        .hamburger {
          display: none; background: none; border: none; cursor: pointer;
          padding: 8px; color: #0F172A; flex-direction: column; gap: 5px;
        }
        .hamburger span {
          display: block; width: 22px; height: 2px;
          background: currentColor; border-radius: 2px;
          transition: all 0.3s;
        }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        #mobile-menu {
          display: none; position: fixed; top: 66px; left: 0; right: 0;
          background: #fff; border-bottom: 1px solid rgba(0,0,0,0.08);
          padding: 16px 24px 24px; flex-direction: column; gap: 4px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.1);
          z-index: 190;
        }
        #mobile-menu.open { display: flex; }
        #mobile-menu a {
          color: #0F172A; text-decoration: none; font-size: 16px; font-weight: 600;
          padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        #mobile-menu a:last-child { border-bottom: none; }
        .mobile-cta {
          margin-top: 12px; background: #0F172A; color: #fff !important;
          text-align: center; padding: 14px !important; border-radius: 14px;
          border-bottom: none !important;
        }

        /* ── HERO ── */
        .hero {
          position: relative; overflow: hidden;
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 130px 24px 80px;
          background: #FAFBFF;
        }
        .hero-blob {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55;
          pointer-events: none;
        }
        .blob-1 {
          width: 600px; height: 600px; top: -200px; left: -100px;
          background: radial-gradient(circle, #B8D8F8 0%, transparent 70%);
          animation: float1 8s ease-in-out infinite;
        }
        .blob-2 {
          width: 500px; height: 500px; top: -100px; right: -80px;
          background: radial-gradient(circle, #D4C5F9 0%, transparent 70%);
          animation: float2 10s ease-in-out infinite;
        }
        .blob-3 {
          width: 400px; height: 400px; bottom: -50px; left: 30%;
          background: radial-gradient(circle, #B8EDD4 0%, transparent 70%);
          animation: float3 12s ease-in-out infinite;
        }
        .blob-4 {
          width: 300px; height: 300px; bottom: 100px; right: 10%;
          background: radial-gradient(circle, #FDE9A2 0%, transparent 70%);
          animation: float1 9s ease-in-out infinite reverse;
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.97); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.08); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(20px, -30px) scale(1.04); }
          80% { transform: translate(-30px, 10px) scale(0.95); }
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2);
          color: #7C3AED; font-size: 13px; font-weight: 700;
          padding: 6px 16px; border-radius: 100px;
          margin-bottom: 28px; position: relative; z-index: 1;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #7C3AED;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .hero h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(42px, 7vw, 82px);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -2px;
          color: #0F172A;
          max-width: 900px;
          margin-bottom: 24px;
          position: relative; z-index: 1;
        }
        .grad {
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 45%, #10B981 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .hero-sub {
          font-size: clamp(17px, 2.5vw, 21px);
          color: #475569; max-width: 620px;
          margin-bottom: 44px; position: relative; z-index: 1;
          font-weight: 400; line-height: 1.55;
        }
        .hero-ctas {
          display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
          position: relative; z-index: 1; margin-bottom: 72px;
        }
        .cta-main {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #3B82F6, #7C3AED);
          color: #fff; text-decoration: none;
          font-size: 16px; font-weight: 700;
          padding: 16px 32px; border-radius: 16px;
          transition: all 0.25s;
          box-shadow: 0 8px 32px rgba(124,58,237,0.3);
        }
        .cta-main:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(124,58,237,0.4); filter: brightness(1.05); }
        .cta-alt {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff; color: #0F172A; text-decoration: none;
          font-size: 16px; font-weight: 700;
          padding: 16px 32px; border-radius: 16px;
          border: 1.5px solid rgba(0,0,0,0.1);
          transition: all 0.25s;
        }
        .cta-alt:hover { border-color: rgba(0,0,0,0.2); box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .hero-preview {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
          position: relative; z-index: 1; max-width: 820px;
        }
        .preview-card {
          background: #fff; border-radius: 18px; padding: 18px 22px;
          box-shadow: 0 4px 28px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          text-align: left; min-width: 200px; flex: 1;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .preview-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        .pc-icon { font-size: 24px; margin-bottom: 10px; }
        .pc-label { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .pc-val { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #0F172A; }
        .pc-sub { font-size: 12px; color: #64748B; margin-top: 2px; }
        .pc-green { color: #10B981; font-weight: 700; }
        .pc-chat { display: flex; flex-direction: column; gap: 6px; }
        .chat-bubble {
          padding: 7px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;
          max-width: 170px;
        }
        .chat-bubble.in { background: #F1F5F9; color: #475569; align-self: flex-start; }
        .chat-bubble.out { background: linear-gradient(135deg, #3B82F6, #7C3AED); color: #fff; align-self: flex-end; border-radius: 12px 12px 4px 12px; }

        /* ── SCROLL REVEAL ── */
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }

        /* ── SECTIONS ── */
        .section-tag {
          display: inline-block;
          font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;
          color: #7C3AED; background: rgba(124,58,237,0.08);
          padding: 6px 14px; border-radius: 100px; margin-bottom: 16px;
        }
        .section-h {
          font-family: 'Syne', sans-serif;
          font-size: clamp(30px, 5vw, 50px);
          font-weight: 800; letter-spacing: -1.5px; color: #0F172A;
          line-height: 1.1; margin-bottom: 16px;
        }
        .section-sub {
          font-size: 17px; color: #64748B; max-width: 560px;
          margin: 0 auto 56px; line-height: 1.6;
        }
        .section-center { text-align: center; }

        /* ── FEATURES ── */
        #funciones { background: #F8FAFC; padding: 100px 48px; }
        .feat-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; max-width: 1200px; margin: 0 auto;
        }
        .feat-card {
          background: #fff; border-radius: 20px; padding: 24px;
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.3s;
        }
        .feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.09); }
        .feat-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 16px;
        }
        .feat-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
        .feat-desc { font-size: 13px; color: #64748B; line-height: 1.55; }

        /* ── NUMBERS ── */
        #numeros {
          background: #0F172A; padding: 90px 48px;
          position: relative; overflow: hidden;
        }
        .nums-bg {
          position: absolute; inset: 0; opacity: 0.08;
          background: radial-gradient(ellipse at 20% 50%, #3B82F6 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 50%, #7C3AED 0%, transparent 50%);
          pointer-events: none;
        }
        .nums-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 2px; max-width: 1000px; margin: 0 auto;
          position: relative; z-index: 1;
        }
        .num-item {
          text-align: center; padding: 40px 24px;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .num-item:last-child { border-right: none; }
        .num-val {
          font-family: 'Syne', sans-serif;
          font-size: clamp(40px, 6vw, 72px); font-weight: 800;
          letter-spacing: -2px; line-height: 1;
          background: linear-gradient(135deg, #B8D8F8, #D4C5F9);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          margin-bottom: 12px;
        }
        .num-label { font-size: 15px; color: #94A3B8; font-weight: 500; line-height: 1.4; }

        /* ── PARA QUIÉN ── */
        #para-quien { background: #fff; padding: 100px 48px; }
        .quien-grid {
          display: grid; grid-template-columns: repeat(6, 1fr);
          gap: 12px; max-width: 1100px; margin: 0 auto;
        }
        .quien-card {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 24px 16px; border-radius: 18px;
          background: #F8FAFC; border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.25s; cursor: default;
          text-align: center;
        }
        .quien-card:hover {
          background: #fff; transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          border-color: rgba(124,58,237,0.15);
        }
        .quien-icon { font-size: 32px; }
        .quien-name { font-size: 13px; font-weight: 700; color: #334155; }

        /* ── PLANES ── */
        #planes { background: #F8FAFC; padding: 100px 48px; }
        .planes-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 20px; max-width: 1050px; margin: 0 auto;
          align-items: start;
        }
        .plan-card {
          background: #fff; border-radius: 24px; padding: 32px;
          border: 1.5px solid rgba(0,0,0,0.08);
          transition: all 0.3s; position: relative;
        }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 16px 50px rgba(0,0,0,0.1); }
        .plan-card.popular {
          border-color: #C4B5FD;
          box-shadow: 0 8px 40px rgba(124,58,237,0.12);
        }
        .popular-badge {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #7C3AED, #3B82F6);
          color: #fff; font-size: 11px; font-weight: 800;
          padding: 4px 16px; border-radius: 100px;
          letter-spacing: 0.5px; text-transform: uppercase; white-space: nowrap;
        }
        .plan-emoji { font-size: 32px; margin-bottom: 12px; }
        .plan-name {
          font-family: 'Syne', sans-serif;
          font-size: 22px; font-weight: 800; color: #0F172A;
          margin-bottom: 4px;
        }
        .plan-price-tag {
          display: inline-block;
          font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
          padding: 4px 12px; border-radius: 8px; margin-bottom: 24px;
        }
        .plan-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 24px 0; }
        .plan-feats { display: flex; flex-direction: column; gap: 10px; }
        .plan-feat {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; color: #334155;
        }
        .plan-feat-check {
          width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; margin-top: 1px;
        }
        .plan-cta {
          display: block; text-align: center; text-decoration: none;
          padding: 13px; border-radius: 12px; font-size: 14px; font-weight: 700;
          margin-top: 28px; transition: all 0.2s;
        }

        /* ── PARA CLIENTES ── */
        #clientes {
          padding: 100px 48px;
          background: linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%);
        }
        .clientes-inner {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
        }
        .clientes-steps { display: flex; flex-direction: column; gap: 28px; }
        .step {
          display: flex; align-items: flex-start; gap: 18px;
        }
        .step-num {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, #3B82F6, #7C3AED);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #fff;
        }
        .step-title { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .step-desc { font-size: 14px; color: #64748B; line-height: 1.5; }
        .clientes-visual {
          background: #fff; border-radius: 28px; padding: 32px;
          box-shadow: 0 12px 60px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .app-screen { display: flex; flex-direction: column; gap: 12px; }
        .app-header { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: #0F172A; margin-bottom: 4px; }
        .app-biz-card {
          border-radius: 14px; padding: 14px 16px;
          border: 1px solid rgba(0,0,0,0.07);
          display: flex; align-items: center; gap: 14px;
          transition: all 0.2s;
        }
        .app-biz-card:hover { border-color: rgba(124,58,237,0.2); background: #FAFAFA; }
        .biz-av {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .biz-name { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
        .biz-meta { font-size: 12px; color: #94A3B8; }
        .biz-btn {
          margin-left: auto; padding: 6px 14px; border-radius: 8px;
          background: linear-gradient(135deg, #3B82F6, #7C3AED);
          color: #fff; font-size: 12px; font-weight: 700;
          border: none; cursor: pointer; white-space: nowrap;
          text-decoration: none; display: inline-block;
        }

        /* ── CTA FINAL ── */
        #cta-final {
          padding: 120px 48px;
          background: #0F172A;
          text-align: center; position: relative; overflow: hidden;
        }
        .cta-bg {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 50%, rgba(124,58,237,0.15) 0%, transparent 60%);
        }
        #cta-final h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px, 5vw, 62px); font-weight: 800; letter-spacing: -1.5px;
          color: #fff; margin-bottom: 20px; line-height: 1.1;
          position: relative; z-index: 1;
        }
        #cta-final p {
          font-size: 18px; color: #94A3B8; margin-bottom: 48px;
          position: relative; z-index: 1;
        }
        .cta-final-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #3B82F6, #7C3AED);
          color: #fff; text-decoration: none;
          font-size: 17px; font-weight: 700;
          padding: 18px 44px; border-radius: 18px;
          transition: all 0.25s;
          box-shadow: 0 8px 40px rgba(124,58,237,0.35);
          position: relative; z-index: 1;
        }
        .cta-final-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 56px rgba(124,58,237,0.45); filter: brightness(1.05); }

        /* ── FOOTER ── */
        footer {
          background: #0a0f1a; padding: 56px 48px 40px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 48px; margin-bottom: 40px; flex-wrap: wrap;
        }
        .footer-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800; font-size: 20px; color: #F8FAFC; letter-spacing: -0.4px;
        }
        .footer-tagline { font-size: 13px; color: #475569; margin-top: 8px; max-width: 220px; line-height: 1.5; }
        .footer-col-title { font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
        .footer-links { display: flex; flex-direction: column; gap: 8px; }
        .footer-links a { color: #94A3B8; text-decoration: none; font-size: 14px; transition: color 0.15s; }
        .footer-links a:hover { color: #F8FAFC; }
        .footer-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.05);
          flex-wrap: wrap; gap: 12px;
        }
        .footer-copy { font-size: 13px; color: #334155; }
        .footer-socials { display: flex; gap: 10px; }
        .social-btn {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; font-size: 15px; transition: all 0.2s;
        }
        .social-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }

        /* ── DARK MODE ── */
        html.dark body { background: #0a0f1a; color: #F1F5F9; }
        html.dark nav { background: rgba(10,15,26,0.92); border-color: rgba(255,255,255,0.07); }
        html.dark .logo-text { color: #F1F5F9; }
        html.dark .nav-links a { color: #94A3B8; }
        html.dark .nav-links a:hover { color: #F1F5F9; background: rgba(255,255,255,0.06); }
        html.dark .btn-ghost { color: #94A3B8; }
        html.dark .btn-ghost:hover { color: #F1F5F9; background: rgba(255,255,255,0.07); }
        html.dark .btn-primary { background: #F1F5F9; color: #0a0f1a; }
        html.dark .btn-primary:hover { background: #e2e8f0; }
        html.dark #mobile-menu { background: #0f1829; border-color: rgba(255,255,255,0.08); }
        html.dark #mobile-menu a { color: #F1F5F9; border-color: rgba(255,255,255,0.05); }
        html.dark .mobile-cta { background: #F1F5F9; color: #0a0f1a !important; }
        html.dark .hero { background: #070c18; }
        html.dark .hero h1 { color: #F1F5F9; }
        html.dark .hero-sub { color: #94A3B8; }
        html.dark .cta-alt { background: #1e293b; color: #F1F5F9; border-color: rgba(255,255,255,0.1); }
        html.dark .preview-card { background: #1e293b; border-color: rgba(255,255,255,0.08); box-shadow: 0 4px 28px rgba(0,0,0,0.4); }
        html.dark .pc-val { color: #F1F5F9; }
        html.dark .pc-sub { color: #64748B; }
        html.dark .chat-bubble.in { background: #0f1829; color: #94A3B8; }
        html.dark #funciones { background: #0a0f1a; }
        html.dark .feat-card { background: #1e293b; border-color: rgba(255,255,255,0.07); }
        html.dark .feat-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
        html.dark .feat-title { color: #F1F5F9; }
        html.dark .section-h { color: #F1F5F9; }
        html.dark #para-quien { background: #0a0f1a; }
        html.dark .quien-card { background: #1e293b; border-color: rgba(255,255,255,0.07); }
        html.dark .quien-card:hover { background: #263047; box-shadow: 0 8px 30px rgba(0,0,0,0.4); }
        html.dark .quien-name { color: #CBD5E1; }
        html.dark #planes { background: #070c18; }
        html.dark .plan-card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
        html.dark .plan-name { color: #F1F5F9; }
        html.dark .plan-feat { color: #CBD5E1; }
        html.dark .plan-divider { background: rgba(255,255,255,0.07); }
        html.dark #clientes { background: linear-gradient(135deg, #0f1829 0%, #0a1a14 100%); }
        html.dark .step-title { color: #F1F5F9; }
        html.dark .step-desc { color: #64748B; }
        html.dark .clientes-visual { background: #1e293b; border-color: rgba(255,255,255,0.08); }
        html.dark .app-header { color: #F1F5F9; }
        html.dark .app-biz-card { border-color: rgba(255,255,255,0.08); }
        html.dark .app-biz-card:hover { background: #263047; }
        html.dark .biz-name { color: #F1F5F9; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .feat-grid { grid-template-columns: repeat(3, 1fr); }
          .quien-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 900px) {
          nav { padding: 0 24px; }
          .nav-center, .nav-actions .btn-ghost { display: none; }
          .hamburger { display: flex; }
          .hero { padding: 110px 24px 60px; }
          .feat-grid { grid-template-columns: repeat(2, 1fr); }
          #funciones, #para-quien, #planes, #clientes, #cta-final { padding: 72px 24px; }
          #numeros { padding: 72px 24px; }
          .nums-grid { grid-template-columns: repeat(2, 1fr); gap: 0; }
          .num-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .num-item:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.06); }
          .num-item:nth-child(3), .num-item:nth-child(4) { border-bottom: none; }
          .planes-grid { grid-template-columns: 1fr; max-width: 480px; }
          .clientes-inner { grid-template-columns: 1fr; gap: 40px; }
          .clientes-visual { max-width: 100%; }
          .footer-top { flex-direction: column; gap: 32px; }
          footer { padding: 48px 24px 32px; }
          .quien-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .hero h1 { letter-spacing: -1px; }
          .hero-ctas { flex-direction: column; align-items: center; }
          .cta-main, .cta-alt { width: 100%; max-width: 320px; justify-content: center; }
          .feat-grid { grid-template-columns: 1fr; }
          .quien-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-bottom { flex-direction: column; text-align: center; }
        }
      `}</style>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          // Scroll reveal
          function initReveal() {
            var obs = new IntersectionObserver(function(entries) {
              entries.forEach(function(e) {
                if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
              });
            }, { threshold: 0.12 });
            document.querySelectorAll('.reveal').forEach(function(el) { obs.observe(el); });
          }
          // Nav scroll
          function initNav() {
            window.addEventListener('scroll', function() {
              document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 20);
            }, { passive: true });
          }
          // Hamburger
          function initHamburger() {
            document.addEventListener('click', function(e) {
              var hb = e.target.closest('#hamburger');
              var mm = document.getElementById('mobile-menu');
              if (!mm) return;
              if (hb) {
                mm.classList.toggle('open');
                hb.classList.toggle('open');
              } else if (!e.target.closest('#mobile-menu')) {
                mm.classList.remove('open');
                var hamburger = document.getElementById('hamburger');
                if (hamburger) hamburger.classList.remove('open');
              }
            });
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { initReveal(); initNav(); initHamburger(); });
          } else {
            initReveal(); initNav(); initHamburger();
          }
        })();
      ` }} />

      {/* ── NAVBAR ── */}
      <nav>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>

        <div className="nav-center">
          <div className="nav-links">
            <a href="#funciones">Funciones</a>
            <a href="#para-quien">Para quién</a>
            <a href="#planes">Planes</a>
            <a href="#clientes">App clientes</a>
          </div>
        </div>

        <div className="nav-actions">
          <LandingLangSelector />
          <Link href="/auth" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/auth?modo=registro" className="btn-primary">Registrarse →</Link>
          <button id="hamburger" className="hamburger" aria-label="Menú">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div id="mobile-menu">
        <a href="#funciones">Funciones</a>
        <a href="#para-quien">Para quién</a>
        <a href="#planes">Planes</a>
        <a href="#clientes">App clientes</a>
        <Link href="/auth" style={{ color: '#475569', textDecoration: 'none', fontSize: '16px', fontWeight: 600, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'block' }}>Iniciar sesión</Link>
        <Link href="/auth?modo=registro" className="mobile-cta">Registrar mi negocio →</Link>
      </div>

      <main>
        {/* ── HERO ── */}
        <section className="hero" id="inicio">
          <div className="hero-blob blob-1" />
          <div className="hero-blob blob-2" />
          <div className="hero-blob blob-3" />
          <div className="hero-blob blob-4" />

          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Reservas · IA · Facturación · Equipo
          </div>

          <h1>
            Tu negocio,<br />
            <span className="grad">reinventado con IA</span>
          </h1>

          <p className="hero-sub">
            Reservas, chatbot, facturación y equipo en una sola app.<br />
            Diseñada para negocios de servicios en España.
          </p>

          <div className="hero-ctas">
            <Link href="/auth?modo=registro" className="cta-main">
              Registrar mi negocio →
            </Link>
            <Link href="/cliente" className="cta-alt">
              Soy cliente 📲
            </Link>
          </div>

          <div className="hero-preview">
            <div className="preview-card">
              <div className="pc-icon">📅</div>
              <div className="pc-label">Hoy</div>
              <div className="pc-val">12 citas</div>
              <div className="pc-sub"><span className="pc-green">↑ 4</span> vs ayer</div>
            </div>
            <div className="preview-card">
              <div className="pc-icon">💬</div>
              <div className="pc-label">Chatbot activo</div>
              <div className="pc-chat">
                <div className="chat-bubble in">¿Tenéis hueco mañana a las 5?</div>
                <div className="chat-bubble out">¡Sí! Te reservo a las 17:00 ✓</div>
              </div>
            </div>
            <div className="preview-card">
              <div className="pc-icon">📊</div>
              <div className="pc-label">Ingresos este mes</div>
              <div className="pc-val">2.840 €</div>
              <div className="pc-sub"><span className="pc-green">↑ 32%</span> vs mes anterior</div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="funciones">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="section-tag reveal">Todo lo que necesitas</span>
            <h2 className="section-h reveal reveal-delay-1">Una plataforma,<br />todas las herramientas</h2>
            <p className="section-sub reveal reveal-delay-2">
              Deja de usar 5 apps distintas. Khepria centraliza todo tu negocio en un panel intuitivo.
            </p>
          </div>
          <div className="feat-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {features.map((f, i) => (
              <div key={f.title} className={`feat-card reveal reveal-delay-${(i % 4) + 1 as 1 | 2 | 3 | 4}`}>
                <div className="feat-icon" style={{ background: f.color }}>
                  {f.icon}
                </div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NUMBERS ── */}
        <section id="numeros">
          <div className="nums-bg" />
          <div style={{ textAlign: 'center', marginBottom: '56px', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-1px' }} className="reveal">
              Resultados que se notan
            </h2>
          </div>
          <div className="nums-grid">
            {[
              { val: '3h', label: 'ahorradas al día\npor cada negocio' },
              { val: '+30%', label: 'más reservas\nen el primer mes' },
              { val: '24/7', label: 'atención automática\nsin intervención humana' },
              { val: '0€', label: 'en gestores\npara el IVA trimestral' },
            ].map((n, i) => (
              <div key={n.val} className={`num-item reveal reveal-delay-${i + 1 as 1 | 2 | 3 | 4}`}>
                <div className="num-val">{n.val}</div>
                <div className="num-label" style={{ whiteSpace: 'pre-line' }}>{n.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PARA QUIÉN ── */}
        <section id="para-quien">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="section-tag reveal">Para quién</span>
            <h2 className="section-h reveal reveal-delay-1">Hecho para tu sector</h2>
            <p className="section-sub reveal reveal-delay-2">
              Khepria se adapta a cualquier negocio de servicios. Si recibes clientes con cita, es para ti.
            </p>
          </div>
          <div className="quien-grid">
            {quienes.map((q, i) => (
              <div key={q.name} className={`quien-card reveal reveal-delay-${(i % 4 + 1) as 1|2|3|4}`}>
                <div className="quien-icon">{q.icon}</div>
                <div className="quien-name">{q.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PLANES ── */}
        <section id="planes">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="section-tag reveal">Planes</span>
            <h2 className="section-h reveal reveal-delay-1">Elige tu plan</h2>
            <p className="section-sub reveal reveal-delay-2">
              Empieza con lo esencial y escala cuando lo necesites. Sin permanencia.
            </p>
          </div>
          <div className="planes-grid">
            {planes.map((p, i) => (
              <div
                key={p.id}
                className={`plan-card ${p.popular ? 'popular' : ''} reveal reveal-delay-${i + 1 as 1|2|3}`}
              >
                {p.popular && <div className="popular-badge">Más popular</div>}
                <div className="plan-emoji">{p.emoji}</div>
                <div className="plan-name">{p.name}</div>
                <div
                  className="plan-price-tag"
                  style={{ background: p.colorBg, color: p.colorText }}
                >
                  Próximamente
                </div>
                <div className="plan-divider" />
                <div className="plan-feats">
                  {p.features.map(feat => (
                    <div key={feat} className="plan-feat">
                      <div
                        className="plan-feat-check"
                        style={{ background: p.colorBg, color: p.colorText }}
                      >
                        ✓
                      </div>
                      {feat}
                    </div>
                  ))}
                </div>
                <Link
                  href="/auth?modo=registro"
                  className="plan-cta"
                  style={p.popular
                    ? { background: `linear-gradient(135deg, #3B82F6, #7C3AED)`, color: '#fff' }
                    : { background: p.colorBg, color: p.colorText }
                  }
                >
                  Empezar con {p.name} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── PARA CLIENTES ── */}
        <section id="clientes">
          <div className="clientes-inner">
            <div>
              <span className="section-tag reveal">App para clientes</span>
              <h2 className="section-h reveal reveal-delay-1" style={{ textAlign: 'left', maxWidth: '440px' }}>
                Descubre y reserva<br />en segundos
              </h2>
              <p className="section-sub reveal reveal-delay-2" style={{ textAlign: 'left', margin: '0 0 40px' }}>
                La app de Khepria para clientes te permite encontrar los mejores negocios de tu zona y gestionar tus citas desde el móvil.
              </p>
              <div className="clientes-steps">
                {[
                  { n: '1', title: 'Descubre negocios cercanos', desc: 'Filtra por tipo, precio y valoraciones en el mapa de Khepria.' },
                  { n: '2', title: 'Reserva en pocos toques', desc: 'Elige servicio, profesional y franja horaria. Confirmación instantánea.' },
                  { n: '3', title: 'Gestiona tus citas', desc: 'Modifica, cancela o recibe recordatorios. Todo desde la app.' },
                ].map((s, i) => (
                  <div key={s.n} className={`step reveal reveal-delay-${i + 1 as 1|2|3}`}>
                    <div className="step-num">{s.n}</div>
                    <div>
                      <div className="step-title">{s.title}</div>
                      <div className="step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/cliente" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                marginTop: '36px',
                background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                color: '#fff', textDecoration: 'none',
                fontSize: '15px', fontWeight: 700,
                padding: '14px 28px', borderRadius: '14px',
                boxShadow: '0 6px 28px rgba(124,58,237,0.25)',
                transition: 'all 0.2s',
              }} className="reveal reveal-delay-4">
                Abrir app de clientes →
              </Link>
            </div>
            <div className="clientes-visual reveal reveal-delay-2">
              <div className="app-screen">
                <div className="app-header">Negocios cerca de ti 📍</div>
                {[
                  { icon: '✂️', bg: '#DBEAFE', name: 'Peluquería Style', meta: '⭐ 4.9 · 0.3km · Disponible hoy' },
                  { icon: '💅', bg: '#FCE7F3', name: 'Nails & Beauty', meta: '⭐ 4.8 · 0.7km · Próxima cita 16h' },
                  { icon: '🧖', bg: '#DCFCE7', name: 'Spa Relax', meta: '⭐ 4.7 · 1.2km · Disponible hoy' },
                ].map(b => (
                  <div key={b.name} className="app-biz-card">
                    <div className="biz-av" style={{ background: b.bg }}>{b.icon}</div>
                    <div>
                      <div className="biz-name">{b.name}</div>
                      <div className="biz-meta">{b.meta}</div>
                    </div>
                    <Link href="/cliente" className="biz-btn">Reservar</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section id="cta-final">
          <div className="cta-bg" />
          <h2 className="reveal">
            Tu negocio merece<br />
            <span className="grad">crecer con IA</span>
          </h2>
          <p className="reveal reveal-delay-1">
            Únete a los negocios que ya gestionan todo desde Khepria.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }} className="reveal reveal-delay-2">
            <Link href="/auth?modo=registro" className="cta-final-btn">
              Empieza ahora →
            </Link>
          </div>
          <div style={{ marginTop: '48px', display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }} className="reveal reveal-delay-3">
            {['Sin permanencia', 'Soporte en español', 'Datos en servidores europeos'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px' }}>
                <span style={{ color: '#4ADE80' }}>✓</span> {t}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="footer-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '9px',
                  background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                    <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                    <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.75"/>
                    <circle cx="11" cy="11" r="2.2" fill="white"/>
                  </svg>
                </div>
                <span className="footer-logo-text">Khepria</span>
              </div>
              <p className="footer-tagline">La plataforma de gestión para negocios de servicios en España.</p>
            </div>

            <div>
              <div className="footer-col-title">Producto</div>
              <div className="footer-links">
                <a href="#funciones">Funciones</a>
                <a href="#planes">Planes</a>
                <a href="#clientes">App para clientes</a>
                <Link href="/auth">Iniciar sesión</Link>
                <Link href="/auth?modo=registro">Registrarse</Link>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Para quién</div>
              <div className="footer-links">
                <a href="#para-quien">Peluquerías</a>
                <a href="#para-quien">Estética & Uñas</a>
                <a href="#para-quien">Spas & Masajes</a>
                <a href="#para-quien">Clínicas & Fisios</a>
                <a href="#para-quien">Ver todos</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Legal</div>
              <div className="footer-links">
                <Link href="/privacidad">Privacidad</Link>
                <Link href="/terminos">Términos</Link>
                <Link href="/cookies">Cookies</Link>
                <Link href="/aviso-legal">Aviso legal</Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">
              © {new Date().getFullYear()} Khepria. Todos los derechos reservados.
            </div>
            <div className="footer-socials">
              <a href="#" className="social-btn" aria-label="Instagram">📷</a>
              <a href="#" className="social-btn" aria-label="TikTok">🎵</a>
              <a href="#" className="social-btn" aria-label="LinkedIn">💼</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
