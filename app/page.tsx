import Link from 'next/link'

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: 'linear-gradient(135deg,#B8D8F8 0%,#D4C5F9 50%,#B8EDD4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 2px 12px rgba(139,92,246,0.22)',
      }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.4"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.75"/>
          <circle cx="11" cy="11" r="2.2" fill="white"/>
        </svg>
      </div>
      <span style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20,
        letterSpacing: '-0.4px', color: dark ? '#F8FAFC' : '#0F172A', lineHeight: 1,
      }}>Khepria</span>
    </div>
  )
}

const FEATURES = [
  { icon: '📅', color: '#DBEAFE', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento desde web o app. Confirmaciones y recordatorios automáticos.' },
  { icon: '🤖', color: '#EDE9FE', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde consultas, reserva citas y cancela automáticamente en WhatsApp e Instagram sin intervención.' },
  { icon: '🧾', color: '#DCFCE7', title: 'Facturación española', desc: 'Genera facturas con IVA, modelos 303, 130 y 111. Compatible con la normativa fiscal española vigente.' },
  { icon: '📊', color: '#FEF9C3', title: 'Analytics con IA', desc: 'Gráficas inteligentes, predicciones de ingresos y recomendaciones accionables para crecer cada mes.' },
  { icon: '📣', color: '#FCE7F3', title: 'Marketing IA', desc: 'Posts automáticos, estrategias de captación y calendario editorial generados con IA para tus redes.' },
  { icon: '👥', color: '#DBEAFE', title: 'Gestión de equipo y nóminas', desc: 'Gestiona empleados, asigna turnos, genera nóminas y contratos SEPE desde el panel de control.' },
  { icon: '💰', color: '#DCFCE7', title: 'Caja diaria', desc: 'Control de ingresos y gastos en tiempo real. Cierre de caja automático con resumen del día.' },
  { icon: '⭐', color: '#FEF9C3', title: 'Reseñas automáticas post-cita', desc: 'Solicita reseñas a cada cliente al finalizar su visita. Mejora tu reputación sin esfuerzo extra.' },
  { icon: '🗺️', color: '#EDE9FE', title: 'Mapa de negocios para clientes', desc: 'Aparece en el mapa de Khepria y atrae nuevos clientes que buscan servicios en tu zona.' },
  { icon: '🏷️', color: '#FCE7F3', title: 'Descuentos inteligentes', desc: 'Crea ofertas dinámicas y promociones temporales para maximizar tu ocupación en horas valle.' },
  { icon: '📲', color: '#DCFCE7', title: 'Importador desde otras apps', desc: 'Migra tus clientes, citas y servicios desde Booksy, Fresha, Treatwell y otras plataformas.' },
  { icon: '🪪', color: '#DBEAFE', title: 'Ficha pública profesional', desc: 'Tu negocio con fotos, servicios, precios y valoraciones. Indexada en buscadores automáticamente.' },
  { icon: '🏢', color: '#EDE9FE', title: 'Multi-negocio (Plan Plus)', desc: 'Gestiona hasta 10 negocios desde un único panel consolidado con analytics comparativo.' },
  { icon: '🎁', color: '#FEF9C3', title: 'Sistema de fidelización puntos', desc: 'Premia a tus clientes habituales con puntos canjeables por descuentos o servicios gratuitos.' },
  { icon: '⏳', color: '#FCE7F3', title: 'Lista de espera automática', desc: 'Cuando se cancela una cita, el sistema avisa automáticamente al siguiente cliente en espera.' },
  { icon: '📋', color: '#DCFCE7', title: 'Contratos SEPE oficiales', desc: 'Genera contratos laborales con las plantillas oficiales del SEPE listos para firmar y entregar.' },
]

const QUIENES = [
  { icon: '💈', name: 'Peluquerías y barberías' },
  { icon: '💅', name: 'Centros de uñas y estética' },
  { icon: '💆', name: 'Spas y masajes' },
  { icon: '🏥', name: 'Clínicas y consultas' },
  { icon: '🧘', name: 'Yoga y pilates' },
  { icon: '🏋️', name: 'Gimnasios y entrenadores' },
  { icon: '🦷', name: 'Dentistas' },
  { icon: '🐾', name: 'Veterinarias' },
  { icon: '🔧', name: 'Cualquier negocio de servicios' },
]

const PLANES = [
  {
    key: 'starter', nombre: 'Starter', precio: '9,99', emoji: '🌱',
    badge: 'Para empezar',
    color: '#B8EDD4', colorDark: '#2E8A5E',
    grad: 'linear-gradient(135deg,#B8EDD4,#6EE7B7)',
    creditos: 100, trabajadores: '1', negocios: '1',
    funciones: [
      'Reservas online 24/7',
      'Ficha pública en el mapa',
      'Horarios y servicios',
      'Chatbot básico (responde preguntas)',
      'Recordatorios automáticos 24h antes',
      'Reseñas automáticas post-cita',
      'Estadísticas básicas',
      'App cliente',
      'Configuración de agenda',
      'Política de cancelación',
    ],
  },
  {
    key: 'basico', nombre: 'Básico', precio: '29,99', emoji: '🚀',
    badge: 'Para crecer',
    color: '#B8D8F8', colorDark: '#1D4ED8',
    grad: 'linear-gradient(135deg,#B8D8F8,#93C5FD)',
    creditos: 300, trabajadores: 'hasta 3', negocios: '1',
    funciones: [
      'Todo lo del Starter',
      'Chatbot completo (reserva y cancela)',
      'Caja diaria',
      'Importador desde otras apps',
      'Fidelización con puntos',
      'Descuentos y promociones',
      'Lista de espera automática',
      'Gestión productos y stock',
      'Multiidioma ES/CA/EN',
      'PWA instalable',
    ],
  },
  {
    key: 'pro', nombre: 'Pro', precio: '59,99', emoji: '💎',
    badge: 'Más popular', popular: true,
    color: '#D4C5F9', colorDark: '#6B4FD8',
    grad: 'linear-gradient(135deg,#D4C5F9,#A78BFA)',
    creditos: 1000, trabajadores: 'hasta 5', negocios: '2',
    funciones: [
      'Todo lo del Básico',
      '2 negocios',
      'Gestión equipo completa',
      'Marketing IA (posts, estrategias, calendario)',
      'Analytics avanzado con predicciones',
      'Facturación e IVA automático',
      'Modelos fiscales 303 y 130',
      'Asistente fiscal IA',
    ],
  },
  {
    key: 'plus', nombre: 'Plus', precio: '99,99', emoji: '⚡',
    badge: 'Para escalar',
    color: '#FDE9A2', colorDark: '#C4860A',
    grad: 'linear-gradient(135deg,#FDE9A2,#FCD34D)',
    creditos: 5000, trabajadores: 'ilimitados', negocios: 'hasta 10',
    funciones: [
      'Todo lo del Pro',
      'Multi-negocio con panel consolidado',
      'Analytics comparativo entre negocios',
      'Nóminas con plantillas SEPE',
      'Contratos SEPE oficiales',
      'Modelos fiscales 303/130/111/190',
      'Kit para gestor PDF/CSV trimestral',
      'Monitor cumplimiento legal',
      'Tap to Pay Stripe',
      'Dominio personalizado',
      'Soporte prioritario',
    ],
  },
]

type CmpVal = boolean | string
const COMPARE: { feat: string; s: CmpVal; b: CmpVal; p: CmpVal; pl: CmpVal }[] = [
  { feat: 'Créditos IA/mes',          s: '100',    b: '300',     p: '1.000',  pl: '5.000' },
  { feat: 'Trabajadores',             s: '1',      b: '3',       p: '5',      pl: '∞' },
  { feat: 'Negocios',                 s: '1',      b: '1',       p: '2',      pl: '10' },
  { feat: 'Reservas online 24/7',     s: true,     b: true,      p: true,     pl: true },
  { feat: 'Ficha pública en mapa',    s: true,     b: true,      p: true,     pl: true },
  { feat: 'Reseñas automáticas',      s: true,     b: true,      p: true,     pl: true },
  { feat: 'Recordatorios automáticos',s: true,     b: true,      p: true,     pl: true },
  { feat: 'Chatbot básico',           s: true,     b: true,      p: true,     pl: true },
  { feat: 'Chatbot completo',         s: false,    b: true,      p: true,     pl: true },
  { feat: 'Fidelización con puntos',  s: false,    b: true,      p: true,     pl: true },
  { feat: 'Lista de espera',          s: false,    b: true,      p: true,     pl: true },
  { feat: 'Descuentos y promociones', s: false,    b: true,      p: true,     pl: true },
  { feat: 'Gestión de equipo',        s: false,    b: false,     p: true,     pl: true },
  { feat: 'Marketing IA',             s: false,    b: false,     p: true,     pl: true },
  { feat: 'Analytics avanzado',       s: false,    b: false,     p: true,     pl: true },
  { feat: 'Caja diaria',              s: false,    b: true,      p: true,     pl: true },
  { feat: 'Importador otras apps',    s: false,    b: true,      p: true,     pl: true },
  { feat: 'Facturación e IVA',        s: false,    b: false,     p: true,     pl: true },
  { feat: 'Modelos 303/130',          s: false,    b: false,     p: true,     pl: true },
  { feat: 'Multi-negocio',            s: false,    b: false,     p: '2',      pl: '10' },
  { feat: 'Nóminas y contratos SEPE', s: false,    b: false,     p: false,    pl: true },
  { feat: 'Modelos 111/190',          s: false,    b: false,     p: false,    pl: true },
  { feat: 'Kit para gestor',          s: false,    b: false,     p: false,    pl: true },
  { feat: 'Tap to Pay Stripe',        s: false,    b: false,     p: false,    pl: true },
  { feat: 'Soporte prioritario',      s: false,    b: false,     p: false,    pl: true },
]

function CmpCell({ val, highlight }: { val: CmpVal; highlight?: boolean }) {
  if (typeof val === 'boolean') {
    return (
      <td style={{
        padding: '11px 0', textAlign: 'center', fontSize: 16,
        background: highlight ? 'rgba(212,197,249,0.08)' : 'transparent',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        {val
          ? <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>
          : <span style={{ color: '#D1D5DB' }}>—</span>}
      </td>
    )
  }
  return (
    <td style={{
      padding: '11px 8px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#374151',
      background: highlight ? 'rgba(212,197,249,0.08)' : 'transparent',
      borderBottom: '1px solid rgba(0,0,0,0.04)',
    }}>
      {val}
    </td>
  )
}

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; max-width: 100%; }
        html { scroll-behavior: smooth; overflow-x: hidden; }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #F7F9FC; color: #0F172A;
          overflow-x: hidden; line-height: 1.6; width: 100%;
        }
        main, section, header, footer { overflow-x: hidden; width: 100%; }

        /* ── NAV ── */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px; height: 66px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          transition: box-shadow 0.3s;
        }
        nav.scrolled { box-shadow: 0 4px 32px rgba(0,0,0,0.07); }
        .nav-links { display: flex; align-items: center; gap: 4px; }
        .nav-links a {
          color: #475569; text-decoration: none; font-size: 14px; font-weight: 500;
          padding: 7px 13px; border-radius: 8px; transition: all 0.15s;
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
          font-size: 14px; font-weight: 700; padding: 9px 20px; border-radius: 100px;
          transition: all 0.2s; white-space: nowrap;
        }
        .btn-primary:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(15,23,42,0.22); }
        .hamburger {
          display: none; background: none; border: none; cursor: pointer;
          padding: 8px; color: #0F172A; flex-direction: column; gap: 5px;
        }
        .hamburger span { display: block; width: 22px; height: 2px; background: currentColor; border-radius: 2px; transition: all 0.3s; }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        #mobile-menu {
          display: none; position: fixed; top: 66px; left: 0; right: 0;
          background: #fff; border-bottom: 1px solid rgba(0,0,0,0.08);
          padding: 16px 24px 24px; flex-direction: column; gap: 4px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.1); z-index: 190;
        }
        #mobile-menu.open { display: flex; }
        #mobile-menu a {
          color: #0F172A; text-decoration: none; font-size: 16px; font-weight: 600;
          padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); display: block;
        }
        .mob-ghost {
          color: #475569 !important; font-weight: 500 !important;
        }
        .mobile-cta {
          margin-top: 12px; background: #0F172A; color: #fff !important;
          text-align: center; padding: 14px !important; border-radius: 14px;
          border-bottom: none !important; text-decoration: none;
          display: block; font-size: 16px; font-weight: 700;
        }

        /* ── HERO ── */
        .hero {
          position: relative; overflow: hidden; min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 130px 24px 80px; background: #fff;
        }
        .hero-blob {
          position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5;
          pointer-events: none; max-width: none; max-height: none;
        }
        .blob-1 { width: 600px; height: 600px; top: -180px; left: -100px; background: radial-gradient(circle,#B8D8F8 0%,transparent 70%); animation: float1 8s ease-in-out infinite; }
        .blob-2 { width: 500px; height: 500px; top: -80px; right: -80px; background: radial-gradient(circle,#D4C5F9 0%,transparent 70%); animation: float2 10s ease-in-out infinite; }
        .blob-3 { width: 400px; height: 400px; bottom: -60px; left: 30%; background: radial-gradient(circle,#B8EDD4 0%,transparent 70%); animation: float3 12s ease-in-out infinite; }
        .blob-4 { width: 300px; height: 300px; bottom: 80px; right: 8%; background: radial-gradient(circle,#FDE9A2 0%,transparent 70%); animation: float1 9s ease-in-out infinite reverse; }
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-40px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,30px) scale(1.08)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(20px,-30px) scale(1.04)} 80%{transform:translate(-30px,10px) scale(0.95)} }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(107,79,216,0.07); border: 1px solid rgba(107,79,216,0.2);
          color: #6B4FD8; font-size: 13px; font-weight: 700;
          padding: 6px 16px; border-radius: 100px; margin-bottom: 28px; position: relative; z-index: 1;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #6B4FD8; animation: blink 2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        .hero h1 {
          font-family: 'Syne', sans-serif; font-size: clamp(42px,7vw,82px);
          font-weight: 800; line-height: 1.05; letter-spacing: -2px;
          color: #0F172A; max-width: 900px; margin-bottom: 24px;
          position: relative; z-index: 1;
        }
        .grad { background: linear-gradient(135deg,#3B82F6 0%,#8B5CF6 50%,#10B981 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; }
        .hero-sub {
          font-size: clamp(17px,2.5vw,21px); color: #475569; max-width: 600px;
          margin-bottom: 44px; position: relative; z-index: 1; font-weight: 400; line-height: 1.55;
        }
        .hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; position: relative; z-index: 1; margin-bottom: 72px; }
        .cta-main {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg,#3B82F6,#7C3AED); color: #fff; text-decoration: none;
          font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 16px;
          transition: all 0.25s; box-shadow: 0 8px 32px rgba(124,58,237,0.28);
        }
        .cta-main:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(124,58,237,0.4); filter: brightness(1.05); }
        .cta-alt {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff; color: #0F172A; text-decoration: none;
          font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 16px;
          border: 1.5px solid rgba(0,0,0,0.1); transition: all 0.25s;
        }
        .cta-alt:hover { border-color: rgba(0,0,0,0.2); box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .hero-preview { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; position: relative; z-index: 1; max-width: 820px; }
        .preview-card {
          background: #fff; border-radius: 18px; padding: 18px 22px;
          box-shadow: 0 4px 28px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05); text-align: left; min-width: 200px; flex: 1;
          transition: transform 0.3s,box-shadow 0.3s;
        }
        .preview-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
        .pc-icon { font-size: 22px; margin-bottom: 10px; }
        .pc-label { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .pc-val { font-family: 'Syne',sans-serif; font-size: 22px; font-weight: 800; color: #0F172A; }
        .pc-sub { font-size: 12px; color: #64748B; margin-top: 2px; }
        .pc-green { color: #10B981; font-weight: 700; }
        .pc-chat { display: flex; flex-direction: column; gap: 6px; }
        .chat-b { padding: 7px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; max-width: 170px; }
        .chat-in { background: #F1F5F9; color: #475569; align-self: flex-start; }
        .chat-out { background: linear-gradient(135deg,#3B82F6,#7C3AED); color: #fff; align-self: flex-end; border-radius: 12px 12px 4px 12px; }

        /* ── REVEAL ── */
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.6s ease,transform 0.6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .rd1{transition-delay:0.1s} .rd2{transition-delay:0.2s} .rd3{transition-delay:0.3s} .rd4{transition-delay:0.4s}

        /* ── SECTION COMMON ── */
        .sec-tag { display:inline-block; font-size:12px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:#6B4FD8; background:rgba(107,79,216,0.08); padding:6px 14px; border-radius:100px; margin-bottom:16px; }
        .sec-h { font-family:'Syne',sans-serif; font-size:clamp(30px,5vw,50px); font-weight:800; letter-spacing:-1.5px; color:#0F172A; line-height:1.1; margin-bottom:16px; }
        .sec-sub { font-size:17px; color:#64748B; max-width:560px; margin:0 auto 56px; line-height:1.6; }
        .sec-center { text-align:center; }

        /* ── NUMBERS ── */
        #numeros { background: #0F172A; padding: 90px 48px; position: relative; overflow: hidden; }
        .nums-bg { position:absolute; inset:0; opacity:0.08; max-width:none; background: radial-gradient(ellipse at 20% 50%,#3B82F6 0%,transparent 50%), radial-gradient(ellipse at 80% 50%,#7C3AED 0%,transparent 50%); pointer-events:none; }
        .nums-grid { display:grid; grid-template-columns:repeat(4,1fr); max-width:1000px; margin:0 auto; position:relative; z-index:1; }
        .num-item { text-align:center; padding:40px 24px; border-right:1px solid rgba(255,255,255,0.06); }
        .num-item:last-child { border-right:none; }
        .num-val { font-family:'Syne',sans-serif; font-size:clamp(40px,6vw,72px); font-weight:800; letter-spacing:-2px; line-height:1; background:linear-gradient(135deg,#B8D8F8,#D4C5F9); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; margin-bottom:12px; }
        .num-label { font-size:15px; color:#94A3B8; font-weight:500; line-height:1.4; }

        /* ── FEATURES ── */
        #funciones { background: #F8FAFC; padding: 100px 48px; }
        .feat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; max-width:1200px; margin:0 auto; }
        .feat-card { background:#fff; border-radius:20px; padding:24px; border:1px solid rgba(0,0,0,0.06); transition:all 0.3s; }
        .feat-card:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(0,0,0,0.09); }
        .feat-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:16px; }
        .feat-title { font-size:15px; font-weight:700; color:#0F172A; margin-bottom:8px; }
        .feat-desc { font-size:13px; color:#64748B; line-height:1.55; }

        /* ── PARA QUIÉN ── */
        #para-quien { background: #fff; padding: 100px 48px; }
        .quien-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; max-width:900px; margin:0 auto; }
        .quien-card { display:flex; align-items:center; gap:14px; padding:20px 24px; border-radius:18px; background:#F8FAFC; border:1.5px solid rgba(0,0,0,0.06); transition:all 0.25s; cursor:default; }
        .quien-card:hover { background:#fff; transform:translateY(-2px); box-shadow:0 8px 30px rgba(0,0,0,0.08); border-color:rgba(107,79,216,0.18); }
        .quien-icon { font-size:32px; flex-shrink:0; }
        .quien-name { font-size:15px; font-weight:700; color:#334155; }

        /* ── PLANES ── */
        #planes { background: #F8FAFC; padding: 100px 48px; }
        .planes-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; max-width:1200px; margin:0 auto; align-items:start; }
        .plan-card { background:#fff; border-radius:24px; padding:28px 24px; border:1.5px solid rgba(0,0,0,0.08); transition:all 0.3s; position:relative; display:flex; flex-direction:column; gap:18px; }
        .plan-card:hover { transform:translateY(-4px); box-shadow:0 16px 50px rgba(0,0,0,0.1); }
        .plan-card.popular { border-color:#D4C5F9; box-shadow:0 8px 40px rgba(107,79,216,0.14); }
        .popular-badge { position:absolute; top:-14px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#6B4FD8,#A78BFA); color:#fff; font-size:11px; font-weight:800; padding:4px 16px; border-radius:100px; letter-spacing:0.5px; text-transform:uppercase; white-space:nowrap; }
        .plan-head { display:flex; flex-direction:column; gap:8px; }
        .plan-emoji { font-size:28px; width:54px; height:54px; border-radius:14px; display:flex; align-items:center; justify-content:center; }
        .plan-name { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#0F172A; }
        .plan-badge-tag { display:inline-block; font-size:11px; font-weight:700; padding:3px 10px; border-radius:8px; }
        .plan-price { display:flex; align-items:baseline; gap:3px; }
        .plan-price-num { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; color:#0F172A; }
        .plan-price-per { font-size:13px; color:#9CA3AF; }
        .plan-divider { height:1px; background:rgba(0,0,0,0.06); }
        .plan-feats { display:flex; flex-direction:column; gap:8px; flex:1; }
        .plan-feat { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#334155; line-height:1.4; }
        .plan-feat-ck { flex-shrink:0; width:16px; height:16px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; margin-top:1px; }
        .plan-cta { display:block; text-align:center; text-decoration:none; padding:13px; border-radius:12px; font-size:14px; font-weight:700; transition:all 0.2s; border:none; cursor:pointer; width:100%; font-family:inherit; }
        .plan-beta-note { font-size:11px; color:#9CA3AF; text-align:center; margin-top:-8px; }

        /* Comparison table */
        .cmp-wrap { max-width:1200px; margin:56px auto 0; overflow-x:auto; }
        .cmp-table { width:100%; border-collapse:collapse; min-width:600px; background:#fff; border-radius:20px; overflow:hidden; border:1px solid rgba(0,0,0,0.07); }
        .cmp-table thead th { padding:14px 12px; font-size:13px; font-weight:800; color:#0F172A; background:#FAFBFF; text-align:center; border-bottom:2px solid rgba(0,0,0,0.07); }
        .cmp-table thead th:first-child { text-align:left; padding-left:20px; }
        .cmp-table tbody td:first-child { text-align:left; padding-left:20px; font-size:13px; color:#374151; font-weight:500; border-bottom:1px solid rgba(0,0,0,0.04); padding-top:11px; padding-bottom:11px; }
        .cmp-th-pop { color:#6B4FD8 !important; background:rgba(212,197,249,0.12) !important; }

        /* ── PARA CLIENTES ── */
        #clientes { padding:100px 48px; background:linear-gradient(135deg,#EEF2FF 0%,#F0FDF4 100%); }
        .clientes-inner { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .clientes-steps { display:flex; flex-direction:column; gap:28px; }
        .step { display:flex; align-items:flex-start; gap:18px; }
        .step-num { width:38px; height:38px; border-radius:12px; flex-shrink:0; background:linear-gradient(135deg,#3B82F6,#7C3AED); display:flex; align-items:center; justify-content:center; font-family:'Syne',sans-serif; font-size:15px; font-weight:800; color:#fff; }
        .step-title { font-size:16px; font-weight:700; color:#0F172A; margin-bottom:4px; }
        .step-desc { font-size:14px; color:#64748B; line-height:1.5; }
        .clientes-visual { background:#fff; border-radius:28px; padding:32px; box-shadow:0 12px 60px rgba(0,0,0,0.1); border:1px solid rgba(0,0,0,0.05); }
        .app-screen { display:flex; flex-direction:column; gap:12px; }
        .app-header { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; color:#0F172A; margin-bottom:4px; }
        .app-biz-card { border-radius:14px; padding:14px 16px; border:1px solid rgba(0,0,0,0.07); display:flex; align-items:center; gap:14px; transition:all 0.2s; }
        .app-biz-card:hover { border-color:rgba(107,79,216,0.2); background:#FAFAFA; }
        .biz-av { width:44px; height:44px; border-radius:12px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; }
        .biz-name { font-size:14px; font-weight:700; color:#0F172A; margin-bottom:2px; }
        .biz-meta { font-size:12px; color:#94A3B8; }
        .biz-btn { margin-left:auto; padding:6px 14px; border-radius:8px; background:linear-gradient(135deg,#3B82F6,#7C3AED); color:#fff; font-size:12px; font-weight:700; border:none; cursor:pointer; white-space:nowrap; text-decoration:none; display:inline-block; }

        /* ── CTA FINAL ── */
        #cta-final {
          padding:120px 48px; text-align:center; position:relative; overflow:hidden;
          background: linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 40%,#F0FDF4 100%);
        }
        #cta-final h2 { font-family:'Syne',sans-serif; font-size:clamp(32px,5vw,62px); font-weight:800; letter-spacing:-1.5px; color:#0F172A; margin-bottom:20px; line-height:1.1; position:relative; z-index:1; }
        #cta-final p { font-size:18px; color:#64748B; margin-bottom:48px; position:relative; z-index:1; }
        .cta-final-btn { display:inline-flex; align-items:center; gap:10px; background:linear-gradient(135deg,#3B82F6,#7C3AED); color:#fff; text-decoration:none; font-size:17px; font-weight:700; padding:18px 44px; border-radius:18px; transition:all 0.25s; box-shadow:0 8px 40px rgba(124,58,237,0.28); position:relative; z-index:1; }
        .cta-final-btn:hover { transform:translateY(-3px); box-shadow:0 16px 56px rgba(124,58,237,0.4); filter:brightness(1.05); }
        .trust-row { margin-top:48px; display:flex; gap:28px; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; }
        .trust-item { display:flex; align-items:center; gap:8px; color:#64748B; font-size:14px; font-weight:500; }
        .trust-check { color:#10B981; font-weight:700; }

        /* ── FOOTER ── */
        footer { background:#0a0f1a; padding:56px 48px 40px; border-top:1px solid rgba(255,255,255,0.05); }
        .footer-inner { max-width:1200px; margin:0 auto; }
        .footer-top { display:flex; justify-content:space-between; align-items:flex-start; gap:48px; margin-bottom:40px; flex-wrap:wrap; }
        .footer-logo-text { font-family:'Syne',sans-serif; font-weight:800; font-size:20px; color:#F8FAFC; letter-spacing:-0.4px; }
        .footer-tagline { font-size:13px; color:#475569; margin-top:8px; max-width:220px; line-height:1.5; }
        .footer-col-title { font-size:12px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; }
        .footer-links { display:flex; flex-direction:column; gap:8px; }
        .footer-links a { color:#94A3B8; text-decoration:none; font-size:14px; transition:color 0.15s; }
        .footer-links a:hover { color:#F8FAFC; }
        .footer-bottom { display:flex; justify-content:space-between; align-items:center; padding-top:28px; border-top:1px solid rgba(255,255,255,0.05); flex-wrap:wrap; gap:12px; }
        .footer-copy { font-size:13px; color:#334155; }
        .footer-contact { display:flex; gap:14px; align-items:center; }
        .contact-link { display:inline-flex; align-items:center; gap:7px; color:#94A3B8; text-decoration:none; font-size:13px; font-weight:500; transition:color 0.15s; padding:7px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.07); }
        .contact-link:hover { color:#F8FAFC; border-color:rgba(255,255,255,0.15); }

        /* ── RESPONSIVE ── */
        @media (max-width:1100px) {
          .feat-grid { grid-template-columns:repeat(3,1fr); }
          .planes-grid { grid-template-columns:repeat(2,1fr); }
          .quien-grid { grid-template-columns:repeat(3,1fr); }
        }
        @media (max-width:900px) {
          nav { padding:0 24px; }
          .nav-links,.nav-actions .btn-ghost { display:none; }
          .hamburger { display:flex; }
          .hero { padding:110px 24px 60px; }
          .feat-grid { grid-template-columns:repeat(2,1fr); }
          #funciones,#para-quien,#planes,#clientes,#cta-final { padding:72px 24px; }
          #numeros { padding:72px 24px; }
          .nums-grid { grid-template-columns:repeat(2,1fr); }
          .num-item { border-right:none; border-bottom:1px solid rgba(255,255,255,0.06); }
          .num-item:nth-child(odd) { border-right:1px solid rgba(255,255,255,0.06); }
          .num-item:nth-child(3),.num-item:nth-child(4) { border-bottom:none; }
          .planes-grid { grid-template-columns:1fr 1fr; max-width:640px; }
          .clientes-inner { grid-template-columns:1fr; gap:40px; }
          .footer-top { flex-direction:column; gap:32px; }
          footer { padding:48px 24px 32px; }
          .quien-grid { grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:600px) {
          .nav-actions .btn-primary { display:none; }
          .hero { padding:96px 16px 56px; }
          .hero h1 { font-size:clamp(28px,8.5vw,40px); letter-spacing:-1px; }
          .hero-sub { font-size:15px; margin-bottom:28px; }
          .hero-badge { font-size:12px; padding:5px 12px; margin-bottom:18px; }
          .hero-ctas { flex-direction:column; align-items:stretch; gap:10px; width:100%; }
          .cta-main,.cta-alt { width:100%; justify-content:center; padding:15px 24px; font-size:15px; }
          .hero-preview { display:none; }
          .feat-grid { grid-template-columns:1fr; }
          .quien-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
          .quien-card { padding:14px 16px; gap:10px; }
          .quien-icon { font-size:26px; }
          .quien-name { font-size:13px; }
          .nums-grid { grid-template-columns:repeat(2,1fr); }
          .num-item { padding:28px 16px; }
          .planes-grid { grid-template-columns:1fr; max-width:100%; }
          .plan-card { padding:24px 18px; }
          .clientes-visual { padding:20px 16px; }
          .biz-btn { padding:6px 10px; font-size:11px; }
          .cta-final-btn { width:100%; justify-content:center; padding:15px 20px; font-size:15px; }
          .footer-top { flex-direction:column; gap:24px; }
          .footer-bottom { flex-direction:column; text-align:center; gap:16px; }
          #funciones,#para-quien,#planes,#clientes,#cta-final { padding:56px 16px; }
          #numeros { padding:56px 16px; }
          footer { padding:40px 16px 28px; }
          .sec-sub { font-size:15px; margin-bottom:32px; }
          .trust-row { gap:16px; }
        }
        @media (max-width:390px) {
          nav { padding:0 12px; }
          .hero { padding:88px 12px 48px; }
          .hero h1 { font-size:28px; }
          .sec-h { font-size:26px; }
          #funciones,#para-quien,#planes,#clientes,#cta-final { padding:48px 12px; }
          #numeros { padding:48px 12px; }
          footer { padding:36px 12px 24px; }
          .quien-grid { gap:6px; }
        }
      `}</style>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          function initReveal(){
            var obs=new IntersectionObserver(function(entries){
              entries.forEach(function(e){ if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);} });
            },{threshold:0.1});
            document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
          }
          function initNav(){
            window.addEventListener('scroll',function(){
              var nav=document.querySelector('nav');
              if(nav) nav.classList.toggle('scrolled',window.scrollY>20);
            },{passive:true});
          }
          function initHamburger(){
            document.addEventListener('click',function(e){
              var hb=e.target.closest('#hamburger');
              var mm=document.getElementById('mobile-menu');
              if(!mm)return;
              if(hb){mm.classList.toggle('open');hb.classList.toggle('open');}
              else if(!e.target.closest('#mobile-menu')){
                mm.classList.remove('open');
                var h=document.getElementById('hamburger');
                if(h)h.classList.remove('open');
              }
            });
            var mmLinks=document.querySelectorAll('#mobile-menu a');
            mmLinks.forEach(function(a){
              a.addEventListener('click',function(){
                var mm=document.getElementById('mobile-menu');
                if(mm)mm.classList.remove('open');
                var h=document.getElementById('hamburger');
                if(h)h.classList.remove('open');
              });
            });
          }
          if(document.readyState==='loading'){
            document.addEventListener('DOMContentLoaded',function(){initReveal();initNav();initHamburger();});
          }else{initReveal();initNav();initHamburger();}
        })();
      ` }} />

      {/* ── NAVBAR ── */}
      <nav>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>

        <div className="nav-links">
          <a href="#funciones">Funciones</a>
          <a href="#para-quien">Para quién</a>
          <a href="#planes">Planes</a>
          <a href="#clientes">Para clientes</a>
        </div>

        <div className="nav-actions">
          <Link href="/auth" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/auth?modo=registro" className="btn-primary">Registrar mi negocio →</Link>
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
        <a href="#clientes">Para clientes</a>
        <Link href="/auth" className="mob-ghost" style={{ color: '#475569', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'block' }}>Iniciar sesión</Link>
        <Link href="/auth?modo=registro" className="mobile-cta">Registrar mi negocio →</Link>
      </div>

      <main>
        {/* ── HERO ── */}
        <section className="hero" id="inicio">
          <div className="hero-blob blob-1" />
          <div className="hero-blob blob-2" />
          <div className="hero-blob blob-3" />
          <div className="hero-blob blob-4" />

          <div className="hero-badge reveal">
            <span className="badge-dot" />
            Ahora en beta — acceso gratuito
          </div>

          <h1 className="reveal rd1">
            Tu negocio,<br />
            <span className="grad">reinventado con IA</span>
          </h1>

          <p className="hero-sub reveal rd2">
            Reservas automáticas, chatbot 24/7, facturación española y mucho más.<br />Todo en una sola app.
          </p>

          <div className="hero-ctas reveal rd3">
            <Link href="/auth?modo=registro" className="cta-main">
              Registrar mi negocio →
            </Link>
            <Link href="/auth?modo=registro&tipo=cliente" className="cta-alt">
              Soy cliente 📲
            </Link>
          </div>

          <div className="hero-preview reveal rd4">
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
                <div className="chat-b chat-in">¿Tenéis hueco mañana a las 5?</div>
                <div className="chat-b chat-out">¡Sí! Te reservo a las 17:00 ✓</div>
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

        {/* ── NÚMEROS ── */}
        <section id="numeros">
          <div className="nums-bg" />
          <div style={{ textAlign: 'center', marginBottom: 56, position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-1px' }} className="reveal">
              Resultados que se notan
            </h2>
          </div>
          <div className="nums-grid">
            {([
              { val: '3h', label: 'ahorradas al día\npor cada negocio' },
              { val: '+30%', label: 'más reservas\ncon el chatbot IA' },
              { val: '24/7', label: 'atención automática\nsin intervención humana' },
              { val: '0€', label: 'en gestores\npara el IVA trimestral' },
            ] as const).map((n, i) => (
              <div key={n.val} className={`num-item reveal rd${(i + 1) as 1|2|3|4}`}>
                <div className="num-val">{n.val}</div>
                <div className="num-label" style={{ whiteSpace: 'pre-line' }}>{n.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FUNCIONES ── */}
        <section id="funciones">
          <div className="sec-center" style={{ marginBottom: 56 }}>
            <span className="sec-tag reveal">Funciones</span>
            <h2 className="sec-h reveal rd1">Una plataforma,<br />todas las herramientas</h2>
            <p className="sec-sub reveal rd2">
              Deja de usar 5 apps distintas. Khepria centraliza todo tu negocio en un panel intuitivo.
            </p>
          </div>
          <div className="feat-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feat-card reveal rd${((i % 4) + 1) as 1|2|3|4}`}>
                <div className="feat-icon" style={{ background: f.color }}>{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PARA QUIÉN ── */}
        <section id="para-quien">
          <div className="sec-center" style={{ marginBottom: 56 }}>
            <span className="sec-tag reveal">Para quién</span>
            <h2 className="sec-h reveal rd1">Hecho para tu sector</h2>
            <p className="sec-sub reveal rd2">
              Khepria se adapta a cualquier negocio de servicios. Si recibes clientes con cita, es para ti.
            </p>
          </div>
          <div className="quien-grid">
            {QUIENES.map((q, i) => (
              <div key={q.name} className={`quien-card reveal rd${((i % 4) + 1) as 1|2|3|4}`}>
                <div className="quien-icon">{q.icon}</div>
                <div className="quien-name">{q.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PLANES ── */}
        <section id="planes">
          <div className="sec-center" style={{ marginBottom: 56 }}>
            <span className="sec-tag reveal">Planes</span>
            <h2 className="sec-h reveal rd1">Elige tu plan</h2>
            <p className="sec-sub reveal rd2">
              Empieza con lo esencial y escala cuando lo necesites. Sin permanencia.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,rgba(212,197,249,0.2),rgba(184,237,212,0.2))', border: '1.5px solid rgba(212,197,249,0.5)', borderRadius: 12, padding: '10px 20px', fontSize: 13, color: '#4F46E5', fontWeight: 600 }} className="reveal rd3">
              🎉 Pago disponible próximamente — acceso gratuito durante la beta
            </div>
          </div>

          <div className="planes-grid">
            {PLANES.map((p, i) => (
              <div key={p.key} className={`plan-card${p.popular ? ' popular' : ''} reveal rd${(i + 1) as 1|2|3|4}`}>
                {p.popular && <div className="popular-badge">Más popular</div>}

                <div className="plan-head">
                  <div className="plan-emoji" style={{ background: p.grad }}>{p.emoji}</div>
                  <div>
                    <div className="plan-name">{p.nombre}</div>
                    <span className="plan-badge-tag" style={{ background: p.color + '33', color: p.colorDark }}>{p.badge}</span>
                  </div>
                </div>

                <div className="plan-price">
                  <span className="plan-price-num">{p.precio}€</span>
                  <span className="plan-price-per">/mes</span>
                </div>

                <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>⚡ <strong>{p.creditos.toLocaleString('es-ES')}</strong> créditos IA/mes</span>
                  <span>👤 {p.trabajadores} trabajador{p.trabajadores !== '1' ? 'es' : ''}</span>
                  {p.negocios !== '1' && <span>🏢 {p.negocios} negocios</span>}
                </div>

                <div className="plan-divider" />

                <div className="plan-feats">
                  {p.funciones.map(feat => (
                    <div key={feat} className="plan-feat">
                      <div className="plan-feat-ck" style={{ background: p.color + '55', color: p.colorDark }}>✓</div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth?modo=registro"
                  className="plan-cta"
                  style={p.popular
                    ? { background: 'linear-gradient(135deg,#6B4FD8,#A78BFA)', color: '#fff', boxShadow: '0 4px 16px rgba(107,79,216,0.3)' }
                    : { background: p.color + '44', color: p.colorDark, border: `1.5px solid ${p.color}` }
                  }
                >
                  Empezar con {p.nombre} →
                </Link>
                <p className="plan-beta-note">Próximamente disponible</p>
              </div>
            ))}
          </div>

          {/* Tabla comparativa */}
          <div className="cmp-wrap reveal">
            <div style={{ textAlign: 'center', margin: '56px 0 24px' }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>Comparativa completa</h3>
            </div>
            <table className="cmp-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: 20, width: '36%' }}>Funcionalidad</th>
                  <th>🌱 Starter</th>
                  <th>🚀 Básico</th>
                  <th className="cmp-th-pop">💎 Pro</th>
                  <th>⚡ Plus</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(row => (
                  <tr key={row.feat}>
                    <td>{row.feat}</td>
                    <CmpCell val={row.s} />
                    <CmpCell val={row.b} />
                    <CmpCell val={row.p} highlight />
                    <CmpCell val={row.pl} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── PARA CLIENTES ── */}
        <section id="clientes">
          <div className="clientes-inner">
            <div>
              <span className="sec-tag reveal">App para clientes</span>
              <h2 className="sec-h reveal rd1" style={{ textAlign: 'left', maxWidth: 440 }}>
                Descubre y reserva<br />en segundos
              </h2>
              <p style={{ fontSize: 17, color: '#64748B', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 440 }} className="reveal rd2">
                La app de Khepria para clientes te permite encontrar los mejores negocios de tu zona y gestionar tus citas desde el móvil.
              </p>
              <div className="clientes-steps">
                {[
                  { n: '1', title: 'Descubre negocios cercanos', desc: 'Filtra por tipo, precio y valoraciones en el mapa de Khepria.' },
                  { n: '2', title: 'Reserva en pocos toques', desc: 'Elige servicio, profesional y horario. Confirmación instantánea.' },
                  { n: '3', title: 'Recordatorios automáticos', desc: 'Recibe aviso 24h antes. Modifica o cancela sin llamar.' },
                  { n: '4', title: 'Fidelización con puntos', desc: 'Acumula puntos en cada visita y canjéalos por descuentos.' },
                ].map((s, i) => (
                  <div key={s.n} className={`step reveal rd${(i + 1) as 1|2|3|4}`}>
                    <div className="step-num">{s.n}</div>
                    <div>
                      <div className="step-title">{s.title}</div>
                      <div className="step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/auth?modo=registro&tipo=cliente" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 36,
                background: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
                color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700,
                padding: '14px 28px', borderRadius: 14, boxShadow: '0 6px 28px rgba(124,58,237,0.22)',
                transition: 'all 0.2s',
              }} className="reveal rd4">
                Crear cuenta de cliente →
              </Link>
            </div>
            <div className="clientes-visual reveal rd2">
              <div className="app-screen">
                <div className="app-header">Negocios cerca de ti 📍</div>
                {[
                  { icon: '✂️', bg: '#DBEAFE', name: 'Peluquería Style', meta: '⭐ 4.9 · 0.3km · Disponible hoy' },
                  { icon: '💅', bg: '#FCE7F3', name: 'Nails & Beauty', meta: '⭐ 4.8 · 0.7km · Próxima cita 16h' },
                  { icon: '🧖', bg: '#DCFCE7', name: 'Spa Relax', meta: '⭐ 4.7 · 1.2km · Disponible hoy' },
                  { icon: '🦷', bg: '#EDE9FE', name: 'Clínica Dental Sol', meta: '⭐ 4.9 · 1.5km · Hoy hasta las 20h' },
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
          <h2 className="reveal">¿Tienes un negocio?<br /><span className="grad">Empieza gratis hoy</span></h2>
          <p className="reveal rd1">Únete a los negocios que ya gestionan todo desde Khepria. Sin permanencia.</p>
          <div className="reveal rd2">
            <Link href="/auth?modo=registro" className="cta-final-btn">
              Registrar mi negocio →
            </Link>
          </div>
          <div className="trust-row reveal rd3">
            {['Sin permanencia', 'Soporte en español', 'Datos en servidores europeos', 'Beta gratuita'].map(t => (
              <div key={t} className="trust-item">
                <span className="trust-check">✓</span> {t}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                    <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
                    <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.75"/>
                    <circle cx="11" cy="11" r="2.2" fill="white"/>
                  </svg>
                </div>
                <span className="footer-logo-text">Khepria</span>
              </div>
              <p className="footer-tagline">La plataforma de gestión inteligente para negocios de servicios en España.</p>
            </div>

            <div>
              <div className="footer-col-title">Funciones</div>
              <div className="footer-links">
                <a href="#funciones">Reservas automáticas</a>
                <a href="#funciones">Chatbot IA</a>
                <a href="#funciones">Facturación española</a>
                <a href="#funciones">Analytics con IA</a>
                <a href="#funciones">Marketing IA</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Plataforma</div>
              <div className="footer-links">
                <a href="#planes">Planes y precios</a>
                <a href="#para-quien">Para negocios</a>
                <a href="#clientes">Para clientes</a>
                <Link href="/auth">Iniciar sesión</Link>
                <Link href="/auth?modo=registro">Registrarse gratis</Link>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Legal</div>
              <div className="footer-links">
                <Link href="/privacidad">Privacidad</Link>
                <Link href="/terminos">Términos</Link>
                <Link href="/cookies">Cookies</Link>
                <Link href="/aviso-legal">Aviso Legal</Link>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Khepria. Todos los derechos reservados.</div>
            <div className="footer-contact">
              <a href="mailto:khepriacontact@gmail.com" className="contact-link" target="_blank" rel="noopener noreferrer">
                {/* Gmail SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
                  <path d="M4 6l8 7 8-7" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                khepriacontact@gmail.com
              </a>
              <a href="https://instagram.com/khepria_es" className="contact-link" target="_blank" rel="noopener noreferrer">
                {/* Instagram SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-footer)" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="4" stroke="url(#ig-footer)" strokeWidth="1.5"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="#E1306C"/>
                  <defs>
                    <linearGradient id="ig-footer" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFDC80"/>
                      <stop offset="30%" stopColor="#F77737"/>
                      <stop offset="65%" stopColor="#C13584"/>
                      <stop offset="100%" stopColor="#833AB4"/>
                    </linearGradient>
                  </defs>
                </svg>
                @khepria_es
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
