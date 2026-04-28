'use client'
import { useState } from 'react'
import Link from 'next/link'

const PLANES_UI = [
  {
    key: 'starter',
    nombre: 'Starter',
    precio: '9,99',
    color: '#B8EDD4',
    colorDark: '#2E8A5E',
    grad: 'linear-gradient(135deg,#B8EDD4,#6EE7B7)',
    emoji: '🌱',
    creditos: 100,
    trabajadores: 1,
    funciones: [
      'Dashboard principal',
      'Gestión de negocio',
      'Reservas online',
      'Servicios',
      'Horarios',
      '100 créditos IA / mes',
      '1 trabajador',
    ],
    no: ['Productos', 'Equipo', 'Marketing IA', 'Facturación', 'Analytics', 'Caja', 'Nóminas'],
  },
  {
    key: 'basico',
    nombre: 'Básico',
    precio: '29,99',
    color: '#B8D8F8',
    colorDark: '#1D4ED8',
    grad: 'linear-gradient(135deg,#B8D8F8,#93C5FD)',
    emoji: '🚀',
    creditos: 300,
    trabajadores: 3,
    popular: true,
    funciones: [
      'Todo lo de Starter',
      'Catálogo de productos',
      'Gestión de reseñas',
      'Marketing IA (posts)',
      'Chatbot IA para clientes',
      '300 créditos IA / mes',
      'Hasta 3 trabajadores',
    ],
    no: ['Equipo avanzado', 'Facturación', 'Analytics', 'Caja', 'Nóminas'],
  },
  {
    key: 'pro',
    nombre: 'Pro',
    precio: '59,99',
    color: '#D4C5F9',
    colorDark: '#6B4FD8',
    grad: 'linear-gradient(135deg,#D4C5F9,#A78BFA)',
    emoji: '💎',
    creditos: 1000,
    trabajadores: 5,
    funciones: [
      'Todo lo de Básico',
      'Gestión de equipo',
      'Analytics avanzado',
      'Facturación IA',
      'Caja y TPV',
      'Nóminas',
      '1.000 créditos IA / mes',
      'Hasta 5 trabajadores',
    ],
    no: [],
  },
  {
    key: 'plus',
    nombre: 'Plus',
    precio: '99,99',
    color: '#FDE9A2',
    colorDark: '#C4860A',
    grad: 'linear-gradient(135deg,#FDE9A2,#FCD34D)',
    emoji: '⚡',
    creditos: 5000,
    trabajadores: -1,
    funciones: [
      'Todo lo de Pro',
      'Trabajadores ilimitados',
      '5.000 créditos IA / mes',
      'Soporte prioritario',
      'Onboarding personalizado',
      'API access',
    ],
    no: [],
  },
]

export default function UpgradePage() {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F8FAFC; }
        .up-wrap { min-height: 100vh; background: linear-gradient(160deg,#F0F4FF 0%,#F8FAFC 40%,#F5F0FF 100%); padding: 40px 20px 80px; }
        .up-back { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: #6B7280; font-size: 13px; font-weight: 600; margin-bottom: 32px; padding: 8px 14px; background: white; border-radius: 100px; border: 1px solid #E5E7EB; transition: all 0.15s; }
        .up-back:hover { color: #111827; background: #F3F4F6; }
        .up-hero { text-align: center; margin-bottom: 48px; }
        .up-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg,#D4C5F9,#B8D8F8); color: #4F46E5; padding: 6px 14px; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
        .up-title { font-size: clamp(28px,5vw,42px); font-weight: 800; color: #111827; line-height: 1.15; margin-bottom: 12px; }
        .up-sub { font-size: 16px; color: #6B7280; max-width: 480px; margin: 0 auto; line-height: 1.6; }
        .up-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; max-width: 1080px; margin: 0 auto; }
        .up-card {
          background: white; border-radius: 20px; padding: 28px 24px;
          border: 2px solid transparent; position: relative; overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          display: flex; flex-direction: column; gap: 20px;
        }
        .up-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
        .up-card.popular { border-color: #B8D8F8; box-shadow: 0 8px 24px rgba(29,78,216,0.12); }
        .up-popular-badge {
          position: absolute; top: 16px; right: 16px;
          background: linear-gradient(135deg,#B8D8F8,#93C5FD);
          color: #1D4ED8; font-size: 10px; font-weight: 800;
          padding: 3px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .up-card-emoji { font-size: 32px; width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .up-plan-name { font-size: 20px; font-weight: 800; color: #111827; margin-top: 4px; }
        .up-price { display: flex; align-items: baseline; gap: 4px; }
        .up-price-num { font-size: 36px; font-weight: 800; color: #111827; }
        .up-price-per { font-size: 13px; color: #9CA3AF; font-weight: 500; }
        .up-features { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .up-feat { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #374151; line-height: 1.4; }
        .up-feat-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
        .up-feat-no { color: #D1D5DB; }
        .up-feat-no span { text-decoration: line-through; color: #D1D5DB; }
        .up-divider { height: 1px; background: #F3F4F6; }
        .up-credits { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B7280; background: #F9FAFB; padding: 8px 12px; border-radius: 10px; }
        .up-credits strong { color: #374151; }
        .up-btn {
          width: 100%; padding: 13px; border-radius: 12px; border: none;
          font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
          transition: all 0.15s;
        }
        .up-btn-primary {
          background: linear-gradient(135deg,#6B4FD8,#4F46E5);
          color: white; box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .up-btn-primary:hover { box-shadow: 0 6px 18px rgba(79,70,229,0.45); transform: translateY(-1px); }
        .up-btn-outline {
          background: transparent; color: #6B7280;
          border: 1.5px solid #E5E7EB;
        }
        .up-btn-outline:hover { border-color: #D1D5DB; color: #374151; background: #F9FAFB; }
        .up-soon { font-size: 11px; color: #9CA3AF; text-align: center; margin-top: -8px; }
        .up-faq { max-width: 640px; margin: 64px auto 0; }
        .up-faq-title { font-size: 22px; font-weight: 800; color: #111827; text-align: center; margin-bottom: 24px; }
        .up-faq-item { background: white; border-radius: 14px; padding: 18px 22px; margin-bottom: 10px; border: 1px solid #F3F4F6; }
        .up-faq-q { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 6px; }
        .up-faq-a { font-size: 13px; color: #6B7280; line-height: 1.6; }
        @media (max-width: 640px) {
          .up-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="up-wrap">
        <Link href="/dashboard" className="up-back">
          ← Volver al dashboard
        </Link>

        {/* Hero */}
        <div className="up-hero">
          <div className="up-badge">⚡ Planes Khepria</div>
          <h1 className="up-title">Elige el plan perfecto<br />para tu negocio</h1>
          <p className="up-sub">Todos los planes incluyen reservas online, chatbot IA y panel de gestión. Sin permanencia.</p>
        </div>

        {/* Cards */}
        <div className="up-grid">
          {PLANES_UI.map((plan) => (
            <div
              key={plan.key}
              className={`up-card${plan.popular ? ' popular' : ''}`}
              onMouseEnter={() => setHoveredPlan(plan.key)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={hoveredPlan === plan.key ? { borderColor: plan.color } : {}}
            >
              {plan.popular && <span className="up-popular-badge">Más popular</span>}

              {/* Header */}
              <div>
                <div className="up-card-emoji" style={{ background: plan.grad }}>{plan.emoji}</div>
                <div className="up-plan-name">{plan.nombre}</div>
              </div>

              {/* Price */}
              <div className="up-price">
                <span className="up-price-num">{plan.precio}€</span>
                <span className="up-price-per">/mes</span>
              </div>

              <div className="up-divider" />

              {/* Features */}
              <div className="up-features">
                {plan.funciones.map((f) => (
                  <div key={f} className="up-feat">
                    <span className="up-feat-icon" style={{ color: plan.colorDark }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
                {plan.no.map((f) => (
                  <div key={f} className="up-feat up-feat-no">
                    <span className="up-feat-icon">✕</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Credits pill */}
              <div className="up-credits">
                <span>⚡</span>
                <span><strong>{plan.creditos.toLocaleString()}</strong> créditos IA / mes</span>
                {plan.trabajadores > 0 && (
                  <>
                    <span style={{ color: '#E5E7EB' }}>·</span>
                    <span><strong>{plan.trabajadores}</strong> trabajador{plan.trabajadores > 1 ? 'es' : ''}</span>
                  </>
                )}
                {plan.trabajadores === -1 && (
                  <>
                    <span style={{ color: '#E5E7EB' }}>·</span>
                    <span><strong>∞</strong> trabajadores</span>
                  </>
                )}
              </div>

              {/* CTA */}
              <button
                className={`up-btn ${plan.popular ? 'up-btn-primary' : 'up-btn-outline'}`}
                style={plan.popular ? {} : { borderColor: plan.color, color: plan.colorDark }}
                onClick={() => alert('¡Próximamente! El sistema de pago estará disponible muy pronto.')}
              >
                Contratar {plan.nombre}
              </button>
              <p className="up-soon">Próximamente disponible</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="up-faq">
          <h2 className="up-faq-title">Preguntas frecuentes</h2>
          {[
            {
              q: '¿Puedo cambiar de plan en cualquier momento?',
              a: 'Sí, puedes subir o bajar de plan cuando quieras. El cambio se aplica al inicio del siguiente mes.',
            },
            {
              q: '¿Qué son los créditos IA?',
              a: 'Los créditos IA se consumen cuando usas funciones de inteligencia artificial: chatbot, posts de marketing, análisis de reseñas o asistente fiscal. Se renuevan cada mes.',
            },
            {
              q: '¿Hay permanencia?',
              a: 'No, todos los planes son mensuales y puedes cancelar cuando quieras sin penalización.',
            },
            {
              q: '¿Qué pasa con mis datos si cancelo?',
              a: 'Tus datos se conservan durante 30 días tras la cancelación. Puedes exportarlos en cualquier momento.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="up-faq-item">
              <div className="up-faq-q">{q}</div>
              <div className="up-faq-a">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
