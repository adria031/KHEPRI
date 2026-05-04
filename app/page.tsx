import Link from 'next/link'

// ── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '📅', color: '#B8D8F8', dark: '#1D4ED8', title: 'Reservas automáticas 24/7', desc: 'Tus clientes reservan en cualquier momento. Confirmaciones y recordatorios automáticos sin intervención.' },
  { icon: '🤖', color: '#D4C5F9', dark: '#6B4FD8', title: 'Chatbot IA WhatsApp e Instagram', desc: 'Responde consultas, reserva citas y cancela automáticamente sin intervención humana.' },
  { icon: '🧾', color: '#B8EDD4', dark: '#2E8A5E', title: 'Facturación española', desc: 'Facturas con IVA, modelos 303, 130 y 111. Compatible con normativa fiscal española vigente.' },
  { icon: '📊', color: '#FDE9A2', dark: '#C4860A', title: 'Analytics con IA', desc: 'Predicciones de ingresos y recomendaciones accionables para crecer cada mes.' },
  { icon: '📣', color: '#FBCFE8', dark: '#9D174D', title: 'Marketing IA', desc: 'Posts automáticos, estrategias de captación y calendario editorial generados con IA.' },
  { icon: '👥', color: '#B8D8F8', dark: '#1D4ED8', title: 'Equipo y nóminas', desc: 'Gestiona empleados, turnos, nóminas y contratos SEPE desde el panel de control.' },
  { icon: '💰', color: '#B8EDD4', dark: '#2E8A5E', title: 'Caja diaria', desc: 'Control de ingresos y gastos en tiempo real. Cierre automático con resumen del día.' },
  { icon: '⭐', color: '#FDE9A2', dark: '#C4860A', title: 'Reseñas post-cita automáticas', desc: 'Solicita reseñas al finalizar cada visita. Mejora tu reputación sin esfuerzo extra.' },
  { icon: '🗺️', color: '#D4C5F9', dark: '#6B4FD8', title: 'Mapa para clientes', desc: 'Aparece en el mapa de Khepria y atrae nuevos clientes de tu zona.' },
  { icon: '🏷️', color: '#FBCFE8', dark: '#9D174D', title: 'Descuentos inteligentes', desc: 'Crea ofertas dinámicas para maximizar la ocupación en horas valle.' },
  { icon: '📲', color: '#B8EDD4', dark: '#2E8A5E', title: 'Importador desde otras apps', desc: 'Migra clientes, citas y servicios desde Booksy, Fresha, Treatwell y más.' },
  { icon: '🎁', color: '#FDE9A2', dark: '#C4860A', title: 'Fidelización con puntos', desc: 'Premia a clientes habituales con puntos canjeables por descuentos.' },
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
    key: 'starter', nombre: 'Starter', precio: '9,99', emoji: '🌱', badge: 'Para empezar',
    color: '#B8EDD4', colorDark: '#2E8A5E', grad: 'linear-gradient(135deg,#B8EDD4,#6EE7B7)', creditos: 100, trabajadores: '1 trabajador', negocios: '1',
    funciones: ['Reservas online 24/7','Ficha pública en mapa','Chatbot básico','Recordatorios automáticos','Reseñas post-cita','Estadísticas básicas'],
  },
  {
    key: 'basico', nombre: 'Básico', precio: '29,99', emoji: '🚀', badge: 'Para crecer',
    color: '#B8D8F8', colorDark: '#1D4ED8', grad: 'linear-gradient(135deg,#B8D8F8,#93C5FD)', creditos: 300, trabajadores: 'hasta 3', negocios: '1',
    funciones: ['Todo lo del Starter','Chatbot completo','Caja diaria','Importador de apps','Fidelización puntos','Descuentos y promociones'],
  },
  {
    key: 'pro', nombre: 'Pro', precio: '59,99', emoji: '💎', badge: 'Más popular', popular: true,
    color: '#D4C5F9', colorDark: '#6B4FD8', grad: 'linear-gradient(135deg,#D4C5F9,#A78BFA)', creditos: 1000, trabajadores: 'hasta 5', negocios: '2',
    funciones: ['Todo lo del Básico','2 negocios','Gestión de equipo','Marketing IA completo','Analytics avanzado','Facturación e IVA'],
  },
  {
    key: 'plus', nombre: 'Plus', precio: '99,99', emoji: '⚡', badge: 'Para escalar',
    color: '#FDE9A2', colorDark: '#C4860A', grad: 'linear-gradient(135deg,#FDE9A2,#FCD34D)', creditos: 5000, trabajadores: 'ilimitados', negocios: 'hasta 10',
    funciones: ['Todo lo del Pro','Hasta 10 negocios','Nóminas con plantillas SEPE','Contratos SEPE oficiales','Kit para gestor PDF/CSV','Soporte prioritario'],
  },
]

type CmpVal = boolean | string
const COMPARE: { feat: string; s: CmpVal; b: CmpVal; p: CmpVal; pl: CmpVal }[] = [
  { feat: 'Créditos IA/mes',            s: '100',   b: '300',    p: '1.000', pl: '5.000' },
  { feat: 'Trabajadores',               s: '1',     b: '3',      p: '5',     pl: '∞' },
  { feat: 'Negocios',                   s: '1',     b: '1',      p: '2',     pl: '10' },
  { feat: 'Reservas online 24/7',       s: true,    b: true,     p: true,    pl: true },
  { feat: 'Ficha pública en mapa',      s: true,    b: true,     p: true,    pl: true },
  { feat: 'Reseñas automáticas',        s: true,    b: true,     p: true,    pl: true },
  { feat: 'Recordatorios automáticos',  s: true,    b: true,     p: true,    pl: true },
  { feat: 'Chatbot básico',             s: true,    b: true,     p: true,    pl: true },
  { feat: 'Chatbot completo',           s: false,   b: true,     p: true,    pl: true },
  { feat: 'Fidelización con puntos',    s: false,   b: true,     p: true,    pl: true },
  { feat: 'Lista de espera',            s: false,   b: true,     p: true,    pl: true },
  { feat: 'Descuentos y promociones',   s: false,   b: true,     p: true,    pl: true },
  { feat: 'Gestión de equipo',          s: false,   b: false,    p: true,    pl: true },
  { feat: 'Marketing IA',               s: false,   b: false,    p: true,    pl: true },
  { feat: 'Analytics avanzado',         s: false,   b: false,    p: true,    pl: true },
  { feat: 'Caja diaria',                s: false,   b: true,     p: true,    pl: true },
  { feat: 'Facturación e IVA',          s: false,   b: false,    p: true,    pl: true },
  { feat: 'Modelos 303/130',            s: false,   b: false,    p: true,    pl: true },
  { feat: 'Multi-negocio',              s: false,   b: false,    p: '2',     pl: '10' },
  { feat: 'Nóminas y contratos SEPE',   s: false,   b: false,    p: false,   pl: true },
  { feat: 'Soporte prioritario',        s: false,   b: false,    p: false,   pl: true },
]

function CmpCell({ val, highlight }: { val: CmpVal; highlight?: boolean }) {
  const bg = highlight ? 'rgba(212,197,249,0.1)' : 'transparent'
  const border = '1px solid rgba(255,255,255,0.04)'
  if (typeof val === 'boolean') return (
    <td style={{ padding: '11px 0', textAlign: 'center', background: bg, borderBottom: border, fontSize: 15 }}>
      {val ? <span style={{ color: '#4ADE80', fontWeight: 800 }}>✓</span> : <span style={{ color: '#334155' }}>—</span>}
    </td>
  )
  return (
    <td style={{ padding: '11px 8px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: highlight ? '#C4B5FD' : '#94A3B8', background: bg, borderBottom: border }}>
      {val}
    </td>
  )
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;overflow-x:hidden;}
        body{font-family:'Plus Jakarta Sans',sans-serif;background:#080810;color:#F1F5F9;overflow-x:hidden;line-height:1.6;width:100%;}
        main,section,header,footer{overflow-x:hidden;width:100%;}
        a{color:inherit;text-decoration:none;}

        /* ── NAVBAR ── */
        #navbar{
          position:fixed;top:0;left:0;right:0;z-index:200;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 48px;height:68px;
          transition:background 0.3s,box-shadow 0.3s,backdrop-filter 0.3s;
        }
        #navbar.scrolled{
          background:rgba(8,8,16,0.85);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          box-shadow:0 1px 0 rgba(255,255,255,0.06),0 8px 32px rgba(0,0,0,0.4);
        }
        .nav-links{display:flex;align-items:center;gap:2px;}
        .nav-links a{color:#94A3B8;font-size:14px;font-weight:500;padding:8px 14px;border-radius:8px;transition:all 0.15s;}
        .nav-links a:hover{color:#F1F5F9;background:rgba(255,255,255,0.06);}
        .nav-actions{display:flex;align-items:center;gap:8px;}
        .btn-ghost{color:#94A3B8;font-size:14px;font-weight:600;padding:8px 16px;border-radius:10px;transition:all 0.15s;}
        .btn-ghost:hover{color:#F1F5F9;background:rgba(255,255,255,0.08);}
        .btn-primary{
          background:linear-gradient(135deg,#6B4FD8,#4F46E5);color:#fff;
          font-size:14px;font-weight:700;padding:9px 22px;border-radius:100px;
          transition:all 0.2s;white-space:nowrap;
          box-shadow:0 4px 20px rgba(107,79,216,0.35);
        }
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(107,79,216,0.5);filter:brightness(1.08);}

        .hamburger{display:none;background:none;border:none;cursor:pointer;padding:8px;color:#F1F5F9;flex-direction:column;gap:5px;align-items:center;justify-content:center;}
        .hamburger span{display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transition:all 0.3s;}
        .hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
        .hamburger.open span:nth-child(2){opacity:0;}
        .hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
        #mobile-menu{
          display:none;position:fixed;top:68px;left:0;right:0;
          background:#0d0d1a;border-bottom:1px solid rgba(255,255,255,0.08);
          padding:16px 24px 28px;flex-direction:column;gap:2px;
          box-shadow:0 20px 60px rgba(0,0,0,0.5);z-index:190;
        }
        #mobile-menu.open{display:flex;}
        #mobile-menu a{color:#C4C4D4;font-size:16px;font-weight:600;padding:13px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:block;transition:color 0.15s;}
        #mobile-menu a:hover{color:#F1F5F9;}
        .mobile-cta{margin-top:14px;background:linear-gradient(135deg,#6B4FD8,#4F46E5);color:#fff !important;text-align:center;padding:14px !important;border-radius:14px;border-bottom:none !important;font-size:15px;font-weight:700;}

        /* ── HERO ── */
        #hero{
          position:relative;overflow:hidden;min-height:100vh;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          text-align:center;padding:140px 24px 100px;background:#080810;
        }

        /* dot grid */
        #hero::before{
          content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
          background-image:radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px);
          background-size:32px 32px;
          -webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 40%,transparent 100%);
          mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,#000 40%,transparent 100%);
        }

        /* blobs */
        .blob{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;will-change:transform;}
        .blob-1{width:650px;height:650px;top:-200px;left:-150px;background:radial-gradient(circle,rgba(184,216,248,0.22) 0%,transparent 70%);animation:blobFloat1 12s ease-in-out infinite;}
        .blob-2{width:550px;height:550px;top:-100px;right:-100px;background:radial-gradient(circle,rgba(212,197,249,0.25) 0%,transparent 70%);animation:blobFloat2 15s ease-in-out infinite;}
        .blob-3{width:500px;height:500px;bottom:-80px;left:25%;background:radial-gradient(circle,rgba(184,237,212,0.18) 0%,transparent 70%);animation:blobFloat3 18s ease-in-out infinite;}
        .blob-4{width:350px;height:350px;bottom:100px;right:5%;background:radial-gradient(circle,rgba(253,233,162,0.15) 0%,transparent 70%);animation:blobFloat1 10s ease-in-out infinite reverse;}
        .blob-5{width:300px;height:300px;top:30%;left:8%;background:radial-gradient(circle,rgba(251,207,232,0.12) 0%,transparent 70%);animation:blobFloat2 13s ease-in-out infinite 3s;}

        @keyframes blobFloat1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.07)}66%{transform:translate(-25px,25px) scale(0.96)}}
        @keyframes blobFloat2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,35px) scale(1.1)}}
        @keyframes blobFloat3{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(25px,-35px) scale(1.05)}80%{transform:translate(-30px,15px) scale(0.94)}}

        /* particles */
        .particle{position:absolute;border-radius:50%;pointer-events:none;opacity:0;animation:particleFade var(--dur,6s) ease-in-out infinite var(--delay,0s);}
        @keyframes particleFade{0%{opacity:0;transform:translateY(0) scale(0.5)}20%{opacity:var(--op,0.6)}80%{opacity:var(--op,0.6)}100%{opacity:0;transform:translateY(-120px) scale(1.2)}}

        /* badge */
        .hero-badge{
          display:inline-flex;align-items:center;gap:8px;position:relative;z-index:1;
          background:rgba(107,79,216,0.15);border:1px solid rgba(212,197,249,0.3);
          color:#C4B5FD;font-size:13px;font-weight:700;padding:7px 18px;border-radius:100px;
          margin-bottom:32px;backdrop-filter:blur(8px);
        }
        .badge-pulse{width:7px;height:7px;border-radius:50%;background:#A78BFA;animation:pulseDot 2s ease-in-out infinite;}
        @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.7)}70%{box-shadow:0 0 0 8px rgba(167,139,250,0)}}

        /* title */
        .hero-title{
          font-family:'Syne',sans-serif;font-size:clamp(44px,7.5vw,96px);
          font-weight:800;line-height:1.0;letter-spacing:-3px;
          color:#F8FAFC;max-width:1000px;margin-bottom:28px;position:relative;z-index:1;
        }
        .hero-grad{
          background:linear-gradient(135deg,#93C5FD 0%,#C4B5FD 30%,#6EE7B7 60%,#93C5FD 100%);
          background-size:300% 300%;
          -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;
          animation:gradShift 6s ease infinite;
          display:inline;
        }
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

        .hero-word-wrap{display:inline-block;overflow:hidden;vertical-align:bottom;}
        .hero-words{display:flex;flex-direction:column;animation:wordCycle 8s ease infinite;}
        @keyframes wordCycle{
          0%,20%{transform:translateY(0)}
          25%,45%{transform:translateY(-1.05em)}
          50%,70%{transform:translateY(-2.1em)}
          75%,95%{transform:translateY(-3.15em)}
          100%{transform:translateY(-4.2em)}
        }

        .hero-sub{font-size:clamp(17px,2.2vw,22px);color:#94A3B8;max-width:600px;margin-bottom:48px;position:relative;z-index:1;font-weight:400;line-height:1.55;}
        .hero-cta{
          position:relative;z-index:1;display:inline-flex;align-items:center;gap:10px;
          background:linear-gradient(135deg,#6B4FD8,#4F46E5);color:#fff;
          font-size:17px;font-weight:700;padding:18px 44px;border-radius:18px;
          transition:all 0.25s;box-shadow:0 8px 40px rgba(107,79,216,0.4);
          margin-bottom:80px;
        }
        .hero-cta:hover{transform:translateY(-3px);box-shadow:0 14px 56px rgba(107,79,216,0.55);filter:brightness(1.08);}
        .cta-glow{animation:ctaGlow 3s ease-in-out infinite;}
        @keyframes ctaGlow{0%,100%{box-shadow:0 8px 40px rgba(107,79,216,0.4)}50%{box-shadow:0 8px 60px rgba(107,79,216,0.65)}}

        /* hero cards preview */
        .hero-preview{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1;max-width:880px;}
        .preview-card{
          background:rgba(255,255,255,0.04);backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.1);border-radius:20px;
          padding:20px 24px;flex:1;min-width:200px;text-align:left;
          transition:transform 0.3s,border-color 0.3s,background 0.3s;
        }
        .preview-card:hover{transform:translateY(-6px);border-color:rgba(212,197,249,0.3);background:rgba(255,255,255,0.07);}
        .pc-icon{font-size:24px;margin-bottom:12px;}
        .pc-label{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;}
        .pc-val{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#F1F5F9;}
        .pc-sub{font-size:12px;color:#64748B;margin-top:3px;}
        .pc-green{color:#4ADE80;font-weight:700;}
        .chat-b{padding:8px 13px;border-radius:14px;font-size:12px;font-weight:500;max-width:175px;line-height:1.4;}
        .chat-in{background:rgba(255,255,255,0.08);color:#C4C4D4;align-self:flex-start;}
        .chat-out{background:linear-gradient(135deg,#6B4FD8,#4F46E5);color:#fff;align-self:flex-end;border-radius:14px 14px 4px 14px;}

        /* scroll arrow */
        .scroll-arrow{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);z-index:1;display:flex;flex-direction:column;align-items:center;gap:4px;animation:arrowBounce 2s ease-in-out infinite;opacity:0.5;}
        @keyframes arrowBounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}

        /* ── REVEAL ── */
        .reveal{opacity:0;transform:translateY(30px);transition:opacity 0.65s ease,transform 0.65s ease;}
        .reveal.visible{opacity:1;transform:translateY(0);}
        .rd1{transition-delay:0.1s}.rd2{transition-delay:0.2s}.rd3{transition-delay:0.3s}.rd4{transition-delay:0.4s}.rd5{transition-delay:0.5s}

        /* ── SECTION COMMON ── */
        .sec-pad{padding:110px 48px;}
        .sec-dark{background:#080810;}
        .sec-mid{background:#0d0d1a;}
        .sec-light{background:#F8FAFC;color:#0F172A;}
        .sec-light .sec-tag{color:#6B4FD8;background:rgba(107,79,216,0.08);}
        .sec-light .sec-h{color:#0F172A;}
        .sec-light .sec-sub{color:#64748B;}
        .sec-tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#A78BFA;background:rgba(167,139,250,0.12);padding:6px 14px;border-radius:100px;margin-bottom:16px;}
        .sec-h{font-family:'Syne',sans-serif;font-size:clamp(30px,5vw,54px);font-weight:800;letter-spacing:-1.5px;color:#F8FAFC;line-height:1.05;margin-bottom:16px;}
        .sec-sub{font-size:17px;color:#64748B;max-width:560px;margin:0 auto 60px;line-height:1.6;}
        .sec-center{text-align:center;}
        .max{max-width:1200px;margin:0 auto;}

        /* ── STATS ── */
        #stats{background:linear-gradient(135deg,#0d0d1a 0%,#120d20 50%,#0d1a14 100%);padding:100px 48px;position:relative;overflow:hidden;}
        #stats::before{content:'';position:absolute;inset:0;opacity:0.06;background:radial-gradient(ellipse 60% 80% at 20% 50%,#60A5FA 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 80% 50%,#A78BFA 0%,transparent 60%);pointer-events:none;}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);max-width:1000px;margin:0 auto;position:relative;z-index:1;}
        .stat-item{text-align:center;padding:48px 24px;border-right:1px solid rgba(255,255,255,0.05);}
        .stat-item:last-child{border-right:none;}
        .stat-val{font-family:'Syne',sans-serif;font-size:clamp(44px,6.5vw,80px);font-weight:800;letter-spacing:-2px;line-height:1;background:linear-gradient(135deg,#93C5FD,#C4B5FD,#6EE7B7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px;}
        .stat-label{font-size:15px;color:#64748B;font-weight:500;line-height:1.5;white-space:pre-line;}

        /* ── FEATURES ── */
        #funciones{padding:110px 48px;background:#F8FAFC;color:#0F172A;}
        .feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1200px;margin:0 auto;}
        .feat-card{
          background:#fff;border-radius:22px;padding:26px;
          border:1.5px solid rgba(0,0,0,0.06);transition:all 0.3s;cursor:default;
          position:relative;overflow:hidden;
        }
        .feat-card::after{content:'';position:absolute;inset:0;border-radius:22px;opacity:0;transition:opacity 0.3s;pointer-events:none;}
        .feat-card:hover{transform:translateY(-6px);box-shadow:0 20px 60px rgba(0,0,0,0.1);}
        .feat-card:hover::after{opacity:1;}
        .feat-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:18px;transition:transform 0.3s;}
        .feat-card:hover .feat-icon{transform:scale(1.1) rotate(-5deg);}
        .feat-title{font-size:15px;font-weight:700;color:#0F172A;margin-bottom:8px;}
        .feat-desc{font-size:13px;color:#64748B;line-height:1.6;}

        /* ── PARA QUIÉN ── */
        #para-quien{padding:110px 48px;background:#0d0d1a;}
        .quien-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:900px;margin:0 auto;}
        .quien-card{
          display:flex;align-items:center;gap:16px;padding:22px 24px;
          border-radius:20px;background:rgba(255,255,255,0.04);
          border:1.5px solid rgba(255,255,255,0.07);
          transition:all 0.25s;cursor:default;
        }
        .quien-card:hover{
          background:rgba(212,197,249,0.08);border-color:rgba(212,197,249,0.25);
          transform:translateY(-3px);box-shadow:0 12px 40px rgba(107,79,216,0.12);
        }
        .quien-icon{font-size:34px;flex-shrink:0;transition:transform 0.3s;}
        .quien-card:hover .quien-icon{animation:iconBounce 0.6s ease;}
        @keyframes iconBounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}70%{transform:translateY(-4px)}}
        .quien-name{font-size:15px;font-weight:700;color:#C4C4D4;}
        .quien-card:hover .quien-name{color:#F1F5F9;}

        /* ── DEMO VISUAL ── */
        #demo{padding:110px 48px;background:#F8FAFC;color:#0F172A;}
        .demo-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
        .demo-steps{display:flex;flex-direction:column;gap:32px;}
        .step{display:flex;align-items:flex-start;gap:18px;}
        .step-num{width:42px;height:42px;border-radius:12px;flex-shrink:0;background:linear-gradient(135deg,#6B4FD8,#4F46E5);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#fff;}
        .step-title{font-size:16px;font-weight:700;color:#0F172A;margin-bottom:4px;}
        .step-desc{font-size:14px;color:#64748B;line-height:1.55;}
        .phone-wrap{display:flex;justify-content:center;position:relative;}
        .phone{
          width:280px;background:#1a1a2e;border-radius:36px;padding:16px 12px;
          box-shadow:0 40px 100px rgba(0,0,0,0.25),0 0 0 1px rgba(255,255,255,0.06);
          position:relative;overflow:hidden;
        }
        .phone-bar{display:flex;justify-content:space-between;align-items:center;padding:0 8px 14px;font-size:11px;color:#475569;}
        .phone-header{text-align:center;padding:10px 0 16px;border-bottom:1px solid rgba(255,255,255,0.06);}
        .phone-header-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#F1F5F9;}
        .phone-header-sub{font-size:11px;color:#475569;margin-top:2px;}
        .phone-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:12px 14px;margin:8px 0;display:flex;align-items:center;gap:12px;transition:all 0.3s;}
        .phone-card:hover{background:rgba(212,197,249,0.08);border-color:rgba(212,197,249,0.2);}
        .phone-av{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .phone-biz-name{font-size:13px;font-weight:700;color:#F1F5F9;}
        .phone-biz-meta{font-size:11px;color:#475569;margin-top:1px;}
        .phone-btn{margin-left:auto;padding:5px 12px;border-radius:8px;background:linear-gradient(135deg,#6B4FD8,#4F46E5);color:#fff;font-size:11px;font-weight:700;white-space:nowrap;}
        .phone-ping{width:8px;height:8px;background:#4ADE80;border-radius:50%;animation:ping 2s ease-in-out infinite;}
        @keyframes ping{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}}

        /* ── PLANES ── */
        #planes{padding:110px 48px;background:#080810;}
        .planes-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:1200px;margin:0 auto;align-items:start;}
        .plan-card{
          background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.08);
          border-radius:26px;padding:30px 24px;transition:all 0.3s;position:relative;
          display:flex;flex-direction:column;gap:20px;backdrop-filter:blur(4px);
        }
        .plan-card:hover{transform:translateY(-6px);background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.15);}
        .plan-card.popular{border-color:rgba(212,197,249,0.35);background:rgba(212,197,249,0.05);}
        .plan-card.popular:hover{border-color:rgba(212,197,249,0.5);}
        .plan-glow{
          position:absolute;inset:-2px;border-radius:27px;pointer-events:none;
          background:linear-gradient(135deg,rgba(107,79,216,0.4),rgba(167,139,250,0.2),rgba(107,79,216,0.4));
          background-size:300% 300%;opacity:0;transition:opacity 0.3s;
          animation:glowPulse 3s ease infinite;
        }
        .plan-card.popular .plan-glow{opacity:1;}
        @keyframes glowPulse{0%,100%{background-position:0% 50%;filter:blur(6px)}50%{background-position:100% 50%;filter:blur(10px)}}
        .popular-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6B4FD8,#A78BFA);color:#fff;font-size:11px;font-weight:800;padding:4px 18px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;box-shadow:0 4px 16px rgba(107,79,216,0.4);}
        .plan-emoji-wrap{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;}
        .plan-name{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;color:#F1F5F9;}
        .plan-badge-tag{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px;margin-top:4px;}
        .plan-price-num{font-family:'Syne',sans-serif;font-size:38px;font-weight:800;color:#F1F5F9;}
        .plan-price-per{font-size:14px;color:#475569;}
        .plan-divider{height:1px;background:rgba(255,255,255,0.07);}
        .plan-feat{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:#94A3B8;line-height:1.45;margin-bottom:8px;}
        .plan-feat-ck{flex-shrink:0;width:17px;height:17px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;margin-top:1px;}
        .plan-cta{
          display:block;text-align:center;padding:13px;border-radius:14px;
          font-size:14px;font-weight:700;transition:all 0.2s;cursor:pointer;font-family:inherit;
        }
        .plan-note{font-size:11px;color:#334155;text-align:center;margin-top:-10px;}

        /* Compare table */
        .cmp-wrap{max-width:1200px;margin:64px auto 0;overflow-x:auto;}
        .cmp-table{width:100%;border-collapse:collapse;min-width:580px;background:rgba(255,255,255,0.03);border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);}
        .cmp-table thead th{padding:15px 12px;font-size:13px;font-weight:800;color:#94A3B8;background:rgba(255,255,255,0.04);text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);}
        .cmp-table thead th:first-child{text-align:left;padding-left:20px;}
        .cmp-table tbody td:first-child{text-align:left;padding-left:20px;font-size:13px;color:#64748B;font-weight:500;padding-top:11px;padding-bottom:11px;}
        .cmp-th-pop{color:#C4B5FD !important;background:rgba(212,197,249,0.08) !important;}
        .beta-banner{display:inline-flex;align-items:center;gap:10px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);color:#4ADE80;font-size:13px;font-weight:600;padding:10px 20px;border-radius:12px;}

        /* ── CTA FINAL ── */
        #cta-final{
          padding:130px 48px;text-align:center;position:relative;overflow:hidden;
          background:linear-gradient(160deg,#0a0420 0%,#080810 40%,#02100a 100%);
        }
        #cta-final::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px);background-size:28px 28px;pointer-events:none;}
        .cta-blob-1{position:absolute;width:500px;height:500px;top:-150px;left:-100px;background:radial-gradient(circle,rgba(107,79,216,0.2) 0%,transparent 70%);filter:blur(60px);animation:blobFloat1 12s ease-in-out infinite;pointer-events:none;}
        .cta-blob-2{position:absolute;width:400px;height:400px;bottom:-100px;right:-50px;background:radial-gradient(circle,rgba(74,222,128,0.12) 0%,transparent 70%);filter:blur(60px);animation:blobFloat2 10s ease-in-out infinite;pointer-events:none;}
        #cta-final h2{font-family:'Syne',sans-serif;font-size:clamp(34px,6vw,72px);font-weight:800;letter-spacing:-2px;color:#F8FAFC;margin-bottom:20px;line-height:1.0;position:relative;z-index:1;}
        #cta-final p{font-size:19px;color:#64748B;margin-bottom:52px;position:relative;z-index:1;}
        .cta-final-btn{
          display:inline-flex;align-items:center;gap:10px;
          background:linear-gradient(135deg,#6B4FD8,#4F46E5);color:#fff;
          font-size:18px;font-weight:700;padding:20px 52px;border-radius:20px;
          transition:all 0.25s;position:relative;z-index:1;
          animation:ctaGlow 3s ease-in-out infinite;
        }
        .cta-final-btn:hover{transform:translateY(-4px);filter:brightness(1.1);}
        .trust-row{margin-top:52px;display:flex;gap:32px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;}
        .trust-item{display:flex;align-items:center;gap:8px;color:#475569;font-size:14px;font-weight:500;}
        .trust-check{color:#4ADE80;font-weight:800;}

        /* ── FOOTER ── */
        footer{background:#060608;padding:60px 48px 42px;border-top:1px solid rgba(255,255,255,0.05);}
        .footer-inner{max-width:1200px;margin:0 auto;}
        .footer-top{display:flex;justify-content:space-between;align-items:flex-start;gap:48px;margin-bottom:44px;flex-wrap:wrap;}
        .footer-logo-text{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;color:#F8FAFC;letter-spacing:-0.4px;}
        .footer-tagline{font-size:13px;color:#334155;margin-top:8px;max-width:220px;line-height:1.5;}
        .footer-col-title{font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:14px;}
        .footer-links{display:flex;flex-direction:column;gap:9px;}
        .footer-links a{color:#475569;font-size:14px;transition:color 0.15s;}
        .footer-links a:hover{color:#94A3B8;}
        .footer-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:28px;border-top:1px solid rgba(255,255,255,0.05);flex-wrap:wrap;gap:14px;}
        .footer-copy{font-size:13px;color:#334155;}
        .footer-social{display:flex;gap:12px;align-items:center;}
        .social-link{display:inline-flex;align-items:center;gap:8px;color:#475569;font-size:13px;font-weight:500;transition:all 0.15s;padding:7px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);}
        .social-link:hover{color:#94A3B8;border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.03);}

        /* ── RESPONSIVE ── */
        @media(max-width:1100px){
          .feat-grid{grid-template-columns:repeat(3,1fr);}
          .planes-grid{grid-template-columns:repeat(2,1fr);}
          .quien-grid{grid-template-columns:repeat(3,1fr);}
          .stats-grid{grid-template-columns:repeat(2,1fr);}
          .stat-item{border-right:none;border-bottom:1px solid rgba(255,255,255,0.05);}
          .stat-item:nth-child(odd){border-right:1px solid rgba(255,255,255,0.05);}
          .stat-item:nth-child(3),.stat-item:nth-child(4){border-bottom:none;}
        }
        @media(max-width:900px){
          #navbar{padding:0 24px;}
          .nav-links,.nav-actions .btn-ghost{display:none;}
          .hamburger{display:flex;}
          .sec-pad,.sec-pad{padding:80px 24px;}
          #hero{padding:120px 24px 80px;}
          #funciones,#para-quien,#demo,#planes,#cta-final,#stats{padding:80px 24px;}
          .demo-inner{grid-template-columns:1fr;gap:48px;}
          .planes-grid{grid-template-columns:1fr 1fr;}
          footer{padding:48px 24px 32px;}
          .footer-top{flex-direction:column;gap:32px;}
        }
        @media(max-width:640px){
          .nav-actions .btn-primary{display:none;}
          #hero{padding:104px 16px 60px;}
          .hero-title{font-size:clamp(36px,10vw,52px);letter-spacing:-1.5px;}
          .hero-sub{font-size:16px;}
          .hero-cta{font-size:15px;padding:15px 32px;margin-bottom:56px;}
          .hero-preview{display:none;}
          .feat-grid{grid-template-columns:1fr 1fr;}
          .quien-grid{grid-template-columns:repeat(2,1fr);}
          .stats-grid{grid-template-columns:repeat(2,1fr);}
          .planes-grid{grid-template-columns:1fr;}
          .demo-inner{gap:36px;}
          .phone{width:240px;}
          #cta-final h2{font-size:clamp(28px,7vw,44px);}
          .cta-final-btn{font-size:15px;padding:16px 32px;}
          .trust-row{gap:16px;}
          .footer-bottom{flex-direction:column;text-align:center;}
          #funciones,#para-quien,#demo,#planes,#cta-final,#stats{padding:64px 16px;}
          footer{padding:40px 16px 28px;}
        }
        @media(max-width:420px){
          #navbar{padding:0 12px;}
          .feat-grid{grid-template-columns:1fr;}
          .quien-grid{grid-template-columns:1fr 1fr;gap:8px;}
          .hero-title{font-size:34px;letter-spacing:-1px;}
        }
      `}</style>

      {/* ── SCRIPTS ── */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          // Navbar scroll
          function initNav(){
            var nav=document.getElementById('navbar');
            window.addEventListener('scroll',function(){if(nav)nav.classList.toggle('scrolled',window.scrollY>30);},{passive:true});
          }
          // Reveal on scroll
          function initReveal(){
            var obs=new IntersectionObserver(function(entries){
              entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});
            },{threshold:0.12});
            document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
          }
          // Hamburger
          function initMenu(){
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
            document.querySelectorAll('#mobile-menu a').forEach(function(a){
              a.addEventListener('click',function(){
                var mm=document.getElementById('mobile-menu');
                if(mm)mm.classList.remove('open');
                var h=document.getElementById('hamburger');
                if(h)h.classList.remove('open');
              });
            });
          }
          // Counters
          function animateCounter(el,target,suffix,prefix,duration){
            var start=0,startTime=null;
            function step(ts){
              if(!startTime)startTime=ts;
              var prog=Math.min((ts-startTime)/duration,1);
              var ease=1-Math.pow(1-prog,4);
              var current=Math.round(ease*target);
              el.textContent=(prefix||'')+current.toLocaleString('es-ES')+(suffix||'');
              if(prog<1)requestAnimationFrame(step);
              else el.textContent=(prefix||'')+target.toLocaleString('es-ES')+(suffix||'');
            }
            requestAnimationFrame(step);
          }
          function initCounters(){
            var items=document.querySelectorAll('.stat-val[data-target]');
            if(!items.length)return;
            var obs=new IntersectionObserver(function(entries){
              entries.forEach(function(e){
                if(e.isIntersecting){
                  var el=e.target;
                  var target=parseInt(el.getAttribute('data-target'));
                  var suffix=el.getAttribute('data-suffix')||'';
                  var prefix=el.getAttribute('data-prefix')||'';
                  animateCounter(el,target,suffix,prefix,2000);
                  obs.unobserve(el);
                }
              });
            },{threshold:0.5});
            items.forEach(function(el){obs.observe(el);});
          }
          if(document.readyState==='loading'){
            document.addEventListener('DOMContentLoaded',function(){initNav();initReveal();initMenu();initCounters();});
          }else{initNav();initReveal();initMenu();initCounters();}
        })();
      ` }} />

      {/* ── NAVBAR ── */}
      <nav id="navbar">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#B8D8F8 0%,#D4C5F9 50%,#B8EDD4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.4"/><path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.75"/><circle cx="11" cy="11" r="2.2" fill="white"/></svg>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: '-0.4px', color: '#F8FAFC' }}>Khepria</span>
        </Link>

        <div className="nav-links">
          <a href="#funciones">Funciones</a>
          <a href="#para-quien">Para quién</a>
          <a href="#planes">Planes</a>
        </div>

        <div className="nav-actions">
          <Link href="/auth" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/auth" className="btn-primary">Empezar gratis →</Link>
          <button id="hamburger" className="hamburger" aria-label="Menú">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div id="mobile-menu">
        <a href="#funciones">Funciones</a>
        <a href="#para-quien">Para quién</a>
        <a href="#planes">Planes</a>
        <Link href="/auth" style={{ color: '#94A3B8', fontWeight: 500 }}>Iniciar sesión</Link>
        <Link href="/auth" className="mobile-cta">Empezar gratis →</Link>
      </div>

      <main>
        {/* ── HERO ── */}
        <section id="hero">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
          <div className="blob blob-5" />

          {/* floating particles */}
          {[
            { top:'20%',left:'12%',size:6,color:'rgba(184,216,248,0.7)',dur:'7s',delay:'0s',op:'0.7' },
            { top:'60%',left:'7%',size:4,color:'rgba(212,197,249,0.8)',dur:'9s',delay:'1.5s',op:'0.6' },
            { top:'35%',right:'10%',size:5,color:'rgba(184,237,212,0.7)',dur:'8s',delay:'3s',op:'0.65' },
            { top:'70%',right:'15%',size:7,color:'rgba(253,233,162,0.6)',dur:'11s',delay:'0.5s',op:'0.5' },
            { top:'50%',left:'22%',size:3,color:'rgba(251,207,232,0.8)',dur:'6s',delay:'2s',op:'0.6' },
            { top:'25%',right:'25%',size:4,color:'rgba(184,216,248,0.6)',dur:'10s',delay:'4s',op:'0.55' },
          ].map((p, i) => (
            <div key={i} className="particle" style={{
              top: p.top, left: (p as { left?: string }).left, right: (p as { right?: string }).right,
              width: p.size, height: p.size, background: p.color,
              ['--dur' as never]: p.dur, ['--delay' as never]: p.delay, ['--op' as never]: p.op,
            } as React.CSSProperties} />
          ))}

          <div className="hero-badge reveal">
            <span className="badge-pulse" />
            Ahora en beta — acceso gratuito
          </div>

          <h1 className="hero-title reveal rd1">
            Tu negocio,<br />
            <span className="hero-grad">reinventado</span><br />
            con IA
          </h1>

          <p className="hero-sub reveal rd2">
            Reservas automáticas, chatbot 24/7, facturación española<br className="br-hide" /> y mucho más. Todo en una sola plataforma.
          </p>

          <Link href="/auth" className="hero-cta cta-glow reveal rd3">
            Empezar gratis →
          </Link>

          <div className="hero-preview">
            <div className="preview-card reveal rd2">
              <div className="pc-icon">📅</div>
              <div className="pc-label">Reservas hoy</div>
              <div className="pc-val">12 citas</div>
              <div className="pc-sub"><span className="pc-green">↑ 4</span> más que ayer</div>
            </div>
            <div className="preview-card reveal rd3">
              <div className="pc-icon">💬</div>
              <div className="pc-label">Chatbot activo 24/7</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
                <div className="chat-b chat-in">¿Tenéis hueco mañana a las 5?</div>
                <div className="chat-b chat-out">¡Sí! Te reservo a las 17:00 ✓</div>
              </div>
            </div>
            <div className="preview-card reveal rd4">
              <div className="pc-icon">📊</div>
              <div className="pc-label">Ingresos este mes</div>
              <div className="pc-val">2.840 €</div>
              <div className="pc-sub"><span className="pc-green">↑ 32%</span> vs mes anterior</div>
            </div>
          </div>

          <div className="scroll-arrow">
            <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom,transparent,rgba(255,255,255,0.2))' }} />
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ opacity: 0.5 }}>
              <path d="M1 1l7 7 7-7" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>

        {/* ── STATS ── */}
        <section id="stats">
          <div style={{ textAlign: 'center', marginBottom: 64, position: 'relative', zIndex: 1 }}>
            <h2 className="sec-h reveal" style={{ marginBottom: 0 }}>Resultados que se notan</h2>
          </div>
          <div className="stats-grid reveal">
            <div className="stat-item">
              <div className="stat-val" data-target="3" data-suffix="h">3h</div>
              <div className="stat-label">{'ahorradas al día\npor cada negocio'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-val" data-target="30" data-prefix="+" data-suffix="%">+30%</div>
              <div className="stat-label">{'más reservas\ncon el chatbot IA'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">24/7</div>
              <div className="stat-label">{'atención automática\nsin intervención humana'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-val" data-target="0" data-suffix="€">0€</div>
              <div className="stat-label">{'en gestores para\ntu IVA trimestral'}</div>
            </div>
          </div>
        </section>

        {/* ── FUNCIONES ── */}
        <section id="funciones">
          <div className="sec-center sec-light" style={{ marginBottom: 64 }}>
            <span className="sec-tag reveal">Funciones</span>
            <h2 className="sec-h reveal rd1">Una plataforma,<br />todas las herramientas</h2>
            <p className="sec-sub reveal rd2">Deja de usar 5 apps distintas. Khepria centraliza todo tu negocio en un panel intuitivo.</p>
          </div>
          <div className="feat-grid max">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feat-card reveal rd${((i % 4) + 1) as 1|2|3|4}`}
                style={{ ['--hover-shadow' as never]: `0 20px 60px ${f.color}40` } as React.CSSProperties}>
                <div className="feat-icon" style={{ background: f.color + '55' }}>{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PARA QUIÉN ── */}
        <section id="para-quien">
          <div className="sec-center" style={{ marginBottom: 64 }}>
            <span className="sec-tag reveal">Para quién</span>
            <h2 className="sec-h reveal rd1">Hecho para tu sector</h2>
            <p className="sec-sub reveal rd2">Si recibes clientes con cita, Khepria es para ti. Funciona en todos los sectores de servicios.</p>
          </div>
          <div className="quien-grid max">
            {QUIENES.map((q, i) => (
              <div key={q.name} className={`quien-card reveal rd${((i % 3) + 1) as 1|2|3}`}>
                <div className="quien-icon">{q.icon}</div>
                <div className="quien-name">{q.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DEMO VISUAL ── */}
        <section id="demo">
          <div className="demo-inner">
            <div>
              <span className="sec-tag reveal" style={{ color: '#6B4FD8', background: 'rgba(107,79,216,0.08)' }}>App para clientes</span>
              <h2 className="sec-h reveal rd1" style={{ textAlign: 'left', color: '#0F172A', maxWidth: 460 }}>
                Descubre y reserva<br />en segundos
              </h2>
              <p style={{ fontSize: 17, color: '#64748B', lineHeight: 1.6, margin: '0 0 44px', maxWidth: 460 }} className="reveal rd2">
                La app de Khepria conecta negocios con clientes. Mapa en tiempo real, reserva en 3 toques, recordatorios automáticos.
              </p>
              <div className="demo-steps">
                {[
                  { n: '1', title: 'Descubre negocios cerca', desc: 'Filtra por tipo, precio y valoraciones en el mapa interactivo.' },
                  { n: '2', title: 'Reserva en pocos toques', desc: 'Elige servicio, profesional y hora. Confirmación al instante.' },
                  { n: '3', title: 'Recordatorios automáticos', desc: 'Aviso 24h antes. Modifica o cancela sin llamar.' },
                  { n: '4', title: 'Fidelización con puntos', desc: 'Acumula puntos y canjéalos por descuentos en futuras visitas.' },
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
              <Link href="/auth" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 40,
                background: 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                padding: '14px 30px', borderRadius: 14, boxShadow: '0 6px 28px rgba(107,79,216,0.25)',
              }} className="reveal rd4">
                Empezar gratis →
              </Link>
            </div>

            {/* Phone mockup */}
            <div className="phone-wrap reveal rd2">
              <div className="phone">
                <div className="phone-bar">
                  <span>9:41</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <div className="phone-ping" />
                    <span style={{ fontSize: 10 }}>●●●</span>
                  </div>
                </div>
                <div className="phone-header">
                  <div className="phone-header-title">📍 Cerca de ti</div>
                  <div className="phone-header-sub">Madrid · Actualizado ahora</div>
                </div>
                {[
                  { icon: '✂️', bg: 'rgba(184,216,248,0.15)', name: 'Peluquería Style', meta: '⭐ 4.9 · 0.3km · Disponible hoy' },
                  { icon: '💅', bg: 'rgba(251,207,232,0.15)', name: 'Nails & Beauty', meta: '⭐ 4.8 · 0.7km · 16:00 libre' },
                  { icon: '🧖', bg: 'rgba(184,237,212,0.15)', name: 'Spa Relax', meta: '⭐ 4.7 · 1.2km · Disponible hoy' },
                  { icon: '🦷', bg: 'rgba(212,197,249,0.15)', name: 'Clínica Dental Sol', meta: '⭐ 4.9 · 1.5km · Hoy hasta 20h' },
                ].map(b => (
                  <div key={b.name} className="phone-card">
                    <div className="phone-av" style={{ background: b.bg }}>{b.icon}</div>
                    <div>
                      <div className="phone-biz-name">{b.name}</div>
                      <div className="phone-biz-meta">{b.meta}</div>
                    </div>
                    <div className="phone-btn">Reservar</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PLANES ── */}
        <section id="planes">
          <div className="sec-center" style={{ marginBottom: 64 }}>
            <span className="sec-tag reveal">Planes</span>
            <h2 className="sec-h reveal rd1">Elige tu plan</h2>
            <p className="sec-sub reveal rd2">Empieza con lo esencial y escala cuando lo necesites. Sin permanencia.</p>
            <div className="beta-banner reveal rd3">
              🎉 Pago disponible próximamente — acceso gratuito durante la beta
            </div>
          </div>

          <div className="planes-grid max">
            {PLANES.map((p, i) => (
              <div key={p.key} className={`plan-card${p.popular ? ' popular' : ''} reveal rd${(i + 1) as 1|2|3|4}`}>
                {p.popular && <div className="plan-glow" />}
                {p.popular && <div className="popular-badge">Más popular</div>}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div className="plan-emoji-wrap" style={{ background: p.grad }}>{p.emoji}</div>
                    <div style={{ marginTop: 12 }}>
                      <div className="plan-name">{p.nombre}</div>
                      <span className="plan-badge-tag" style={{ background: p.color + '20', color: p.color }}>{p.badge}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span className="plan-price-num">{p.precio}€</span>
                    <span className="plan-price-per">/mes</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>⚡ <strong style={{ color: '#64748B' }}>{p.creditos.toLocaleString('es-ES')}</strong> créditos IA/mes</span>
                    <span>👤 {p.trabajadores}</span>
                    {p.negocios !== '1' && <span>🏢 {p.negocios} negocios</span>}
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <div>
                    {p.funciones.map(feat => (
                      <div key={feat} className="plan-feat">
                        <div className="plan-feat-ck" style={{ background: p.color + '22', color: p.color }}>✓</div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/auth"
                    className="plan-cta"
                    style={p.popular
                      ? { background: 'linear-gradient(135deg,#6B4FD8,#A78BFA)', color: '#fff', boxShadow: '0 6px 24px rgba(107,79,216,0.4)' }
                      : { background: p.color + '18', color: p.color, border: `1.5px solid ${p.color}40` }
                    }
                  >
                    Empezar con {p.nombre} →
                  </Link>
                  <p className="plan-note">Próximamente disponible</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="cmp-wrap reveal">
            <div style={{ textAlign: 'center', margin: '64px 0 24px' }}>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>Comparativa completa</h3>
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

        {/* ── CTA FINAL ── */}
        <section id="cta-final">
          <div className="cta-blob-1" />
          <div className="cta-blob-2" />
          <h2 className="reveal">¿Tienes un negocio?<br /><span className="hero-grad">Empieza gratis hoy</span></h2>
          <p className="reveal rd1">Únete a los negocios que ya gestionan todo desde Khepria. Sin permanencia, sin tarjeta.</p>
          <div className="reveal rd2">
            <Link href="/auth" className="cta-final-btn">
              Empezar gratis →
            </Link>
          </div>
          <div className="trust-row reveal rd3">
            {['Sin permanencia', 'Beta gratuita', 'Datos en Europa', 'Soporte en español'].map(t => (
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
                  <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/><path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.75"/><circle cx="11" cy="11" r="2.2" fill="white"/></svg>
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
                <a href="#funciones">Marketing IA</a>
              </div>
            </div>

            <div>
              <div className="footer-col-title">Plataforma</div>
              <div className="footer-links">
                <a href="#planes">Planes y precios</a>
                <a href="#para-quien">Para negocios</a>
                <Link href="/auth">Iniciar sesión</Link>
                <Link href="/auth">Registrarse gratis</Link>
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
            <div className="footer-social">
              <a href="mailto:khepriacontact@gmail.com" className="social-link" target="_blank" rel="noopener noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
                  <path d="M2 6l10 7 10-7" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                khepriacontact@gmail.com
              </a>
              <a href="https://instagram.com/khepria_es" className="social-link" target="_blank" rel="noopener noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#igf)" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="4" stroke="url(#igf)" strokeWidth="1.5"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="#E1306C"/>
                  <defs>
                    <linearGradient id="igf" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
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
