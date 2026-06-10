'use client'
import { useEffect, useState } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { DashboardShell } from '../DashboardShell'
import { getNegocioActivo } from '../../lib/negocioActivo'
import { PLANES } from '../../lib/planes'
import { CREDITOS_ACCION } from '../../lib/creditos'

const PACKS = [
  {
    id: 'pack_s',
    nombre: 'Pack S',
    creditos: 100,
    precio: '2,99',
    emoji: '⚡',
    color: '#B8D8F8',
    colorDark: '#1D4ED8',
    desc: 'Ideal para usos puntuales',
    popular: false,
  },
  {
    id: 'pack_m',
    nombre: 'Pack M',
    creditos: 500,
    precio: '9,99',
    emoji: '🚀',
    color: '#D4C5F9',
    colorDark: '#6B4FD8',
    desc: 'El más equilibrado',
    popular: true,
  },
  {
    id: 'pack_l',
    nombre: 'Pack L',
    creditos: 2000,
    precio: '29,99',
    emoji: '💎',
    color: '#B8EDD4',
    colorDark: '#2E8A5E',
    desc: 'Para uso intensivo',
    popular: false,
  },
]

const CONSUMOS = [
  { emoji: '🤖', label: 'Chatbot IA', detalle: 'por respuesta', cantidad: CREDITOS_ACCION.chatbot_respuesta },
  { emoji: '📸', label: 'Generar imagen', detalle: 'por imagen', cantidad: 10 },
  { emoji: '📊', label: 'Análisis IA', detalle: 'por análisis', cantidad: CREDITOS_ACCION.analisis_resena },
  { emoji: '✍️', label: 'Generar post', detalle: 'por post', cantidad: CREDITOS_ACCION.post_marketing },
  { emoji: '💡', label: 'Predicción', detalle: 'por predicción', cantidad: CREDITOS_ACCION.prediccion },
  { emoji: '🧾', label: 'OCR factura', detalle: 'por factura', cantidad: 3 },
]

const PLAN_CFG: Record<string, { label: string; color: string; bg: string }> = {
  starter: { label: 'Starter', color: '#2E8A5E', bg: 'rgba(46,138,94,0.1)' },
  basico:  { label: 'Básico',  color: '#1D4ED8', bg: 'rgba(29,78,216,0.1)' },
  pro:     { label: 'Pro',     color: '#6B4FD8', bg: 'rgba(107,79,216,0.1)' },
  plus:    { label: 'Plus',    color: '#C4860A', bg: 'rgba(196,134,10,0.1)' },
  beta:    { label: 'Beta',    color: '#4F46E5', bg: 'rgba(79,70,229,0.1)' },
  agencia: { label: 'Plus',    color: '#C4860A', bg: 'rgba(196,134,10,0.1)' },
}

interface HistorialRow {
  id: string
  cantidad: number
  concepto: string
  created_at: string
}

export default function CreditosPage() {
  const [negocio, setNegocio] = useState<import('../../lib/negocioActivo').NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<import('../../lib/negocioActivo').NegMin[]>([])
  const [creditos, setCreditos] = useState<{ totales: number; usados: number; disponibles: number; pct: number } | null>(null)
  const [plan, setPlan] = useState<string>('starter')
  const [planFechaInicio, setPlanFechaInicio] = useState<string | null>(null)
  const [historial, setHistorial] = useState<HistorialRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    async function load() {
      const { session, db } = await getSessionClient()
      if (!session) { setCargando(false); return }
      const user = session.user

      const { activo: neg, todos } = await getNegocioActivo(user.id, session.access_token)

      setNegocio(neg)
      setTodosNegocios(todos)

      const { data: profile } = await db
        .from('profiles')
        .select('plan, creditos_totales, creditos_usados, plan_fecha_inicio')
        .eq('id', user.id)
        .single()

      if (profile) {
        const planFinal = (neg?.plan ?? profile.plan ?? 'starter').toLowerCase()
        setPlan(planFinal)
        setPlanFechaInicio(profile.plan_fecha_inicio ?? null)

        const creditosCorrectos = PLANES[planFinal]?.creditos ?? 100
        const totales     = creditosCorrectos
        const usados      = profile.creditos_usados ?? 0
        const disponibles = Math.max(0, totales - usados)
        const pct         = totales > 0 ? Math.round((disponibles / totales) * 100) : 0
        setCreditos({ totales, usados, disponibles, pct })
      }

      if (neg?.id) {
        const { data: hist } = await db
          .from('historial_creditos')
          .select('id, cantidad, concepto, created_at')
          .eq('negocio_id', neg.id)
          .order('created_at', { ascending: false })
          .limit(20)
        setHistorial((hist ?? []) as HistorialRow[])
      }

      setCargando(false)
    }
    load()
  }, [])

  const planInfo = PLAN_CFG[plan] ?? PLAN_CFG.basico
  const barColor = creditos
    ? creditos.pct > 50 ? '#22C55E' : creditos.pct > 20 ? '#F59E0B' : '#EF4444'
    : '#22C55E'

  const fechaRenovacion = planFechaInicio
    ? (() => {
        const d = new Date(planFechaInicio + 'T00:00:00')
        const hoy = new Date()
        d.setFullYear(hoy.getFullYear())
        d.setMonth(hoy.getMonth())
        if (d <= hoy) d.setMonth(d.getMonth() + 1)
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
      })()
    : null

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        .cr-page { max-width: 900px; margin: 0 auto; padding: 0 4px 40px; }
        .cr-header { margin-bottom: 28px; }
        .cr-header h1 { font-size: 26px; font-weight: 800; color: var(--foreground); margin: 0 0 6px; letter-spacing: -0.5px; }
        .cr-header p  { font-size: 14px; color: var(--muted); margin: 0; }

        .cr-balance { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px 28px; margin-bottom: 28px; }
        .cr-balance-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
        .cr-balance-left h2 { font-size: 15px; font-weight: 600; color: var(--muted); margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; }
        .cr-balance-nums { font-size: 38px; font-weight: 900; color: var(--foreground); letter-spacing: -1px; line-height: 1; }
        .cr-balance-nums span { font-size: 16px; font-weight: 500; color: var(--muted); }
        .cr-plan-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .cr-bar-wrap { background: var(--surface); border-radius: 8px; height: 10px; overflow: hidden; }
        .cr-bar-fill { height: 100%; border-radius: 8px; transition: width 0.6s ease; }
        .cr-bar-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: var(--muted); }
        .cr-renovacion { margin-top: 14px; font-size: 12px; color: var(--muted); }

        .cr-section-title { font-size: 18px; font-weight: 700; color: var(--foreground); margin: 0 0 6px; }
        .cr-section-sub   { font-size: 13px; color: var(--muted); margin: 0 0 18px; }

        .cr-consumos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 36px; }
        .cr-consumo-card  { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
        .cr-consumo-emoji { font-size: 22px; flex-shrink: 0; }
        .cr-consumo-label { font-size: 13px; font-weight: 600; color: var(--foreground); }
        .cr-consumo-det   { font-size: 12px; color: var(--muted); }
        .cr-consumo-qty   { margin-left: auto; font-size: 15px; font-weight: 800; color: #4F46E5; flex-shrink: 0; }

        .cr-packs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 36px; }
        .cr-pack-card { background: var(--card); border: 2px solid var(--border); border-radius: 16px; padding: 24px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; transition: box-shadow 0.2s, border-color 0.2s; cursor: default; }
        .cr-pack-card.popular { border-color: #7C3AED; box-shadow: 0 4px 20px rgba(124,58,237,0.15); }
        .cr-popular-badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg,#7C3AED,#4F46E5); color: white; font-size: 11px; font-weight: 700; padding: 3px 14px; border-radius: 20px; white-space: nowrap; }
        .cr-pack-emoji { font-size: 36px; margin-bottom: 8px; }
        .cr-pack-nombre { font-size: 16px; font-weight: 800; color: var(--foreground); margin-bottom: 4px; }
        .cr-pack-creditos { font-size: 28px; font-weight: 900; color: #4F46E5; letter-spacing: -0.5px; margin-bottom: 2px; }
        .cr-pack-creditos span { font-size: 13px; font-weight: 500; color: var(--muted); }
        .cr-pack-desc { font-size: 12px; color: var(--muted); margin-bottom: 18px; }
        .cr-pack-btn { width: 100%; padding: 11px; border-radius: 10px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .cr-pack-btn:hover { opacity: 0.85; }

        .cr-historial { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .cr-historial-head { padding: 18px 24px 14px; border-bottom: 1px solid var(--border); }
        .cr-historial-head h3 { font-size: 15px; font-weight: 700; color: var(--foreground); margin: 0; }
        .cr-historial-empty { padding: 40px 24px; text-align: center; color: var(--muted); font-size: 14px; }
        .cr-hist-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid var(--border); gap: 12px; }
        .cr-hist-row:last-child { border-bottom: none; }
        .cr-hist-concepto { font-size: 14px; color: var(--foreground); flex: 1; }
        .cr-hist-fecha { font-size: 12px; color: var(--muted); white-space: nowrap; }
        .cr-hist-qty { font-size: 14px; font-weight: 700; color: #EF4444; white-space: nowrap; }

        .cr-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .cr-modal { background: var(--card); border-radius: 20px; padding: 36px 32px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .cr-modal h3 { font-size: 20px; font-weight: 800; color: var(--foreground); margin: 12px 0 10px; }
        .cr-modal p  { font-size: 14px; color: var(--muted); line-height: 1.6; margin: 0 0 10px; }
        .cr-modal a  { color: #4F46E5; }
        .cr-modal-btn { margin-top: 20px; background: linear-gradient(135deg,#4F46E5,#7C3AED); color: white; border: none; border-radius: 10px; padding: 12px 32px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%; }

        @media (max-width: 700px) {
          .cr-consumos-grid { grid-template-columns: 1fr 1fr; }
          .cr-packs-grid    { grid-template-columns: 1fr; }
          .cr-balance-nums  { font-size: 30px; }
        }
        @media (max-width: 480px) {
          .cr-consumos-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cr-page">
        <div className="cr-header">
          <h1>⚡ Créditos Khepria</h1>
          <p>Los créditos se usan para funciones de IA: chatbot, marketing, analytics y más</p>
        </div>

        {/* Balance actual */}
        {cargando ? (
          <div className="cr-balance" style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Cargando créditos…</span>
          </div>
        ) : creditos ? (
          <div className="cr-balance">
            <div className="cr-balance-top">
              <div className="cr-balance-left">
                <h2>Créditos disponibles</h2>
                <div className="cr-balance-nums">
                  {creditos.disponibles.toLocaleString('es-ES')}
                  <span> / {creditos.totales.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div
                className="cr-plan-badge"
                style={{ background: planInfo.bg, color: planInfo.color }}
              >
                <span>Plan {planInfo.label}</span>
              </div>
            </div>
            <div className="cr-bar-wrap">
              <div
                className="cr-bar-fill"
                style={{ width: `${creditos.pct}%`, background: barColor }}
              />
            </div>
            <div className="cr-bar-meta">
              <span>{creditos.usados.toLocaleString('es-ES')} créditos usados</span>
              <span style={{ color: barColor, fontWeight: 600 }}>{creditos.pct}% disponible</span>
            </div>
            {fechaRenovacion && (
              <div className="cr-renovacion">
                🔄 Se renuevan el <strong>{fechaRenovacion}</strong> con tu plan {planInfo.label}
              </div>
            )}
          </div>
        ) : null}

        {/* ¿Qué consumen los créditos? */}
        <p className="cr-section-title">¿Qué consumen los créditos?</p>
        <p className="cr-section-sub">Cada acción de IA descuenta créditos de tu saldo mensual</p>
        <div className="cr-consumos-grid">
          {CONSUMOS.map(c => (
            <div key={c.label} className="cr-consumo-card">
              <span className="cr-consumo-emoji">{c.emoji}</span>
              <div>
                <div className="cr-consumo-label">{c.label}</div>
                <div className="cr-consumo-det">{c.detalle}</div>
              </div>
              <span className="cr-consumo-qty">{c.cantidad} cr.</span>
            </div>
          ))}
        </div>

        {/* Comprar packs */}
        <p className="cr-section-title">Añade créditos a tu cuenta</p>
        <p className="cr-section-sub">Los créditos comprados no caducan nunca</p>
        <div className="cr-packs-grid">
          {PACKS.map(pack => (
            <div key={pack.id} className={`cr-pack-card${pack.popular ? ' popular' : ''}`}>
              {pack.popular && <span className="cr-popular-badge">Más popular</span>}
              <div className="cr-pack-emoji">{pack.emoji}</div>
              <div className="cr-pack-nombre">{pack.nombre}</div>
              <div className="cr-pack-creditos">
                {pack.creditos.toLocaleString('es-ES')}
                <span> créditos</span>
              </div>
              <div className="cr-pack-desc">{pack.desc}</div>
              <button
                className="cr-pack-btn"
                style={{
                  background: `linear-gradient(135deg, ${pack.color}, ${pack.colorDark}22)`,
                  color: pack.colorDark,
                  border: `1.5px solid ${pack.colorDark}33`,
                }}
                onClick={() => setModalAbierto(true)}
              >
                Comprar por {pack.precio}€
              </button>
            </div>
          ))}
        </div>

        {/* Historial */}
        <div className="cr-historial">
          <div className="cr-historial-head">
            <h3>Historial de créditos</h3>
          </div>
          {historial.length === 0 ? (
            <div className="cr-historial-empty">Aún no hay movimientos de créditos</div>
          ) : (
            historial.map(row => (
              <div key={row.id} className="cr-hist-row">
                <span className="cr-hist-concepto">{row.concepto}</span>
                <span className="cr-hist-fecha">
                  {new Date(row.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="cr-hist-qty">−{row.cantidad}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Próximamente */}
      {modalAbierto && (
        <div className="cr-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="cr-modal" onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 48 }}>🚀</span>
            <h3>Pagos próximamente</h3>
            <p>Estamos configurando el sistema de pagos. Muy pronto podrás comprar créditos directamente desde aquí.</p>
            <p>
              ¿Necesitas más créditos ahora? Escríbenos a{' '}
              <a href="mailto:khepriacontact@gmail.com">khepriacontact@gmail.com</a>
            </p>
            <button className="cr-modal-btn" onClick={() => setModalAbierto(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
