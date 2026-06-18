'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '11px',
        background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

const tiposNegocio = [
  '💈 Peluquería / Barbería', '💅 Estética', '💆 Spa / Masajes', '🏥 Clínica', '🦷 Dentista',
  '👁️ Óptica', '🐾 Veterinaria', '🧘 Yoga / Pilates', '🏋️ Gimnasio', '📸 Fotografía',
  '🎨 Tatuajes', '👗 Moda / Ropa', '🍕 Restaurante', '☕ Cafetería', '🔧 Reparaciones', '📦 Otro'
]

const CREDITOS_POR_PLAN: Record<string, number> = {
  starter: 100, basico: 300, pro: 1000, plus: 5000
}

const planes = [
  {
    id: 'starter', nombre: 'Starter', precio: '9,99€', periodo: '/mes',
    badge: 'Para empezar', color: '#B8EDD4', colorDark: '#2E8A5E',
    trabajadores: '1 trabajador', negocios: '1 negocio', creditos: '100 créditos IA',
    features: [
      'Reservas online 24/7',
      'Ficha pública en el mapa',
      'Chatbot básico',
      'Reseñas automáticas',
      'Estadísticas básicas',
    ],
  },
  {
    id: 'basico', nombre: 'Básico', precio: '29,99€', periodo: '/mes',
    badge: 'Para crecer', color: '#B8D8F8', colorDark: '#1D4ED8',
    trabajadores: 'hasta 3 trabajadores', negocios: '1 negocio', creditos: '300 créditos IA',
    features: [
      'Todo lo del Starter',
      'Chatbot completo (reserva y cancela)',
      'Caja diaria',
      'Productos y stock',
      'Marketing IA básico',
    ],
  },
  {
    id: 'pro', nombre: 'Pro', precio: '59,99€', periodo: '/mes',
    badge: 'Más popular', color: '#D4C5F9', colorDark: '#6B4FD8', popular: true,
    trabajadores: 'hasta 5 trabajadores', negocios: '2 negocios', creditos: '1.000 créditos IA',
    features: [
      'Todo lo del Básico',
      'Marketing IA completo',
      'Analytics avanzado',
      'Facturación e IVA automático',
      'Gestión de equipo',
    ],
  },
  {
    id: 'plus', nombre: 'Plus', precio: '99,99€', periodo: '/mes',
    badge: 'Para escalar', color: '#FDE9A2', colorDark: '#C4860A',
    trabajadores: 'trabajadores ilimitados', negocios: 'hasta 10 negocios', creditos: '5.000 créditos IA',
    features: [
      'Todo lo del Pro',
      'Multi-negocio consolidado',
      'Nóminas y contratos SEPE',
      'Kit para gestor',
      'Soporte prioritario',
    ],
  },
]

export default function Onboarding() {
  const [tipoUsuario, setTipoUsuario] = useState<'negocio' | 'cliente' | null>(null)
  const [paso, setPaso] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // Negocio
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [tipoNegocio, setTipoNegocio] = useState('')
  const [planSeleccionado, setPlanSeleccionado] = useState('pro')
  const [colorNegocio, setColorNegocio] = useState('#7C3AED')
  const [mostrarPersonalizarColor, setMostrarPersonalizarColor] = useState(false)

  // Cliente
  const [nombreCliente, setNombreCliente] = useState('')
  const [ciudadCliente, setCiudadCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', session.user.id).single()
      if (profile?.tipo === 'negocio') {
        window.location.href = window.location.origin + '/dashboard'
        return
      }
      if (profile?.tipo === 'cliente') {
        window.location.href = window.location.origin + '/cliente'
        return
      }
    })
  }, [])

  const totalPasosNegocio = 3
  const totalPasosCliente = 2

  const progreso = tipoUsuario === 'negocio'
    ? Math.round((paso / totalPasosNegocio) * 100)
    : Math.round((paso / totalPasosCliente) * 100)

  async function guardarNegocio() {
    setCargando(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No hay sesión activa. Recarga la página.')
      const user = session.user

      // Verificar nombre único entre usuarios distintos
      const { data: nombreExiste } = await supabase
        .from('negocios')
        .select('id, user_id')
        .eq('nombre', nombreNegocio.trim())
        .neq('user_id', user.id)
        .maybeSingle()
      if (nombreExiste) {
        setError('Ya existe un negocio con ese nombre. Por favor elige otro.')
        setCargando(false)
        return
      }

      const creditos_totales = CREDITOS_POR_PLAN[planSeleccionado] ?? 100

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id, tipo: 'negocio', nombre: nombreNegocio, email: user.email,
        plan: planSeleccionado, creditos_totales, creditos_usados: 0,
      })
      if (profileError) throw new Error(`Error al crear el perfil: ${profileError.message}`)
      const hoy = new Date().toISOString().split('T')[0]

      const { data: negocioData, error: negocioError } = await supabase.from('negocios').insert({
        user_id: user.id, nombre: nombreNegocio, tipo: tipoNegocio,
        plan: planSeleccionado, visible: true,
        creditos_totales, creditos_usados: 0, creditos_reset_date: hoy,
        color_principal: colorNegocio,
      }).select('id').single()
      if (negocioError) throw new Error(`Error al crear el negocio: ${negocioError.message}`)

      if (negocioData?.id) {
        supabase.from('trabajadores').insert({
          negocio_id: negocioData.id,
          nombre: nombreNegocio,
          especialidad: 'Propietario',
          activo: true,
          email: user.email,
        }).then(() => {})
      }

      fetch('/api/bienvenida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, nombre: nombreNegocio, tipo: 'negocio', plan: planSeleccionado }),
      }).catch(() => {})

      window.location.href = window.location.origin + '/dashboard'
    } catch (e: any) {
      setError(e.message || 'Error al guardar. Inténtalo de nuevo.')
    }
    setCargando(false)
  }

  async function guardarCliente() {
    setCargando(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No hay sesión activa. Vuelve a registrarte.')
      const user = session.user
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id, tipo: 'cliente', nombre: nombreCliente, email: user.email, telefono: telefonoCliente || null
      })
      if (profErr) throw profErr

      fetch('/api/bienvenida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, nombre: nombreCliente, tipo: 'cliente' }),
      }).catch(() => {})

      window.location.href = window.location.origin + '/cliente'
    } catch (e: any) {
      setError(e.message || 'Error al guardar. Inténtalo de nuevo.')
    }
    setCargando(false)
  }

  const planActual = planes.find(p => p.id === planSeleccionado)

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 32px 20px; }
        .header { width: 100%; max-width: 640px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .progress-bar { width: 100%; max-width: 640px; height: 4px; background: rgba(0,0,0,0.08); border-radius: 100px; margin-bottom: 32px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #B8D8F8, #D4C5F9); border-radius: 100px; transition: width 0.4s ease; }
        .card { background: white; border-radius: 24px; padding: 40px; width: 100%; max-width: 640px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
        .step-label { font-size: 12px; font-weight: 600; color: #9CA3AF; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
        h2 { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 8px; }
        .sub { font-size: 14px; color: #6B7280; margin-bottom: 28px; line-height: 1.5; }
        .field { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        input { width: 100%; padding: 12px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 14px; color: #111827; outline: none; transition: border 0.2s; background: white; }
        input:focus { border-color: #1D4ED8; }
        .btn-primary { width: 100%; padding: 14px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; margin-top: 8px; }
        .btn-primary:hover { background: #374151; }
        .btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; }
        .btn-secondary { width: 100%; padding: 12px; background: transparent; color: #6B7280; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
        .btn-secondary:hover { background: #F7F9FC; }
        .btns { display: flex; gap: 10px; margin-top: 8px; }
        .btns .btn-primary, .btns .btn-secondary { margin-top: 0; }
        .error { background: rgba(251,207,232,0.3); color: #B5467A; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 500; margin-top: 12px; text-align: center; }
        .tipo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
        .tipo-card { border: 2px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: white; }
        .tipo-card:hover { border-color: #B8D8F8; }
        .tipo-card.selected { border-color: #1D4ED8; background: rgba(184,216,248,0.1); }
        .tipo-icon { font-size: 40px; margin-bottom: 12px; }
        .tipo-title { font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 6px; }
        .tipo-desc { font-size: 13px; color: #6B7280; line-height: 1.5; }
        .tipo-negocio-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .tipo-negocio-item { border: 1.5px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 10px 6px; text-align: center; cursor: pointer; font-size: 12px; font-weight: 600; color: #4B5563; transition: all 0.2s; background: white; }
        .tipo-negocio-item:hover { border-color: #B8D8F8; }
        .tipo-negocio-item.selected { border-color: #1D4ED8; background: rgba(184,216,248,0.15); color: #1D4ED8; }
        .planes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 8px; }
        .plan-card { border: 2px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 20px 16px; cursor: pointer; transition: all 0.2s; position: relative; background: white; }
        .plan-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        .plan-popular { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #D4C5F9, #B8D8F8); color: #6B4FD8; font-size: 10px; font-weight: 800; padding: 3px 12px; border-radius: 100px; white-space: nowrap; letter-spacing: 0.3px; }
        .plan-nombre { font-size: 16px; font-weight: 800; margin-bottom: 2px; }
        .plan-precio-wrap { display: flex; align-items: baseline; gap: 2px; margin-bottom: 10px; }
        .plan-precio-num { font-size: 22px; font-weight: 800; }
        .plan-precio-period { font-size: 12px; color: #9CA3AF; font-weight: 500; }
        .plan-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-bottom: 10px; }
        .plan-feature { font-size: 12px; color: #4B5563; padding: 3px 0; display: flex; align-items: center; gap: 6px; }
        .plan-beta-note { background: rgba(184,216,248,0.2); border: 1px solid rgba(184,216,248,0.5); border-radius: 10px; padding: 10px 14px; margin-top: 12px; font-size: 12px; color: #1D4ED8; font-weight: 500; text-align: center; }
        .resumen-box { background: #F7F9FC; border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .resumen-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 14px; }
        .resumen-row:last-child { border-bottom: none; }
        .resumen-label { color: #6B7280; font-weight: 500; }
        .resumen-val { color: #111827; font-weight: 700; }
        @media (max-width: 600px) {
          .card { padding: 28px 20px; }
          .planes-grid { grid-template-columns: 1fr; }
          .tipo-negocio-grid { grid-template-columns: repeat(2, 1fr); }
          h2 { font-size: 20px; }
          input { font-size: 16px; }
        }
        html.dark body, html.dark .page { background: #0d0d0d; }
        html.dark .card { background: #1a1a1a; border-color: rgba(255,255,255,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        html.dark .progress-bar { background: rgba(255,255,255,0.08); }
        html.dark h2 { color: #f9fafb; }
        html.dark .sub, html.dark .step-label { color: #9CA3AF; }
        html.dark label { color: #f9fafb; }
        html.dark input { background: #111111; color: #f9fafb; border-color: rgba(255,255,255,0.1); }
        html.dark input:focus { border-color: #818CF8; }
        html.dark .btn-primary { background: #f9fafb; color: #111827; }
        html.dark .btn-primary:hover { background: #e5e7eb; }
        html.dark .btn-primary:disabled { background: #374151; color: #9CA3AF; }
        html.dark .btn-secondary { color: #9CA3AF; border-color: rgba(255,255,255,0.1); }
        html.dark .btn-secondary:hover { background: #242424; }
        html.dark .error { background: rgba(185,28,28,0.15); color: #FCA5A5; }
        html.dark .tipo-card { border-color: rgba(255,255,255,0.08); background: #1a1a1a; }
        html.dark .tipo-card:hover { border-color: rgba(184,216,248,0.4); }
        html.dark .tipo-card.selected { border-color: #818CF8; background: rgba(129,140,248,0.1); }
        html.dark .tipo-title { color: #f9fafb; }
        html.dark .tipo-desc { color: #9CA3AF; }
        html.dark .tipo-negocio-item { border-color: rgba(255,255,255,0.08); background: #1a1a1a; color: #9CA3AF; }
        html.dark .tipo-negocio-item.selected { border-color: #818CF8; background: rgba(129,140,248,0.12); color: #818CF8; }
        html.dark .plan-card { background: #1a1a1a; border-color: rgba(255,255,255,0.08); }
        html.dark .plan-nombre { color: #f9fafb; }
        html.dark .plan-feature { color: #9CA3AF; }
        html.dark .resumen-box { background: #111111; border-color: rgba(255,255,255,0.08); }
        html.dark .resumen-label { color: #9CA3AF; }
        html.dark .resumen-val { color: #f9fafb; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="page">
        <div className="header">
          <KhepriLogo />
          {tipoUsuario && paso > 0 && (
            <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>
              Paso {paso} de {tipoUsuario === 'negocio' ? totalPasosNegocio : totalPasosCliente}
            </span>
          )}
        </div>

        {tipoUsuario && paso > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progreso}%` }}></div>
          </div>
        )}

        <div className="card">

          {/* ── PASO 0: ¿Negocio o cliente? ── */}
          {paso === 0 && (
            <>
              <div className="step-label">Bienvenido a Khepria</div>
              <h2>¿Cómo vas a usar Khepria?</h2>
              <p className="sub">Cuéntanos quién eres para personalizar tu experiencia.</p>
              <div className="tipo-grid">
                <div
                  className={`tipo-card ${tipoUsuario === 'negocio' ? 'selected' : ''}`}
                  onClick={() => setTipoUsuario('negocio')}
                >
                  <div className="tipo-icon">🏢</div>
                  <div className="tipo-title">Soy un negocio</div>
                  <div className="tipo-desc">Quiero gestionar mis reservas, equipo y automatizar con IA</div>
                </div>
                <div
                  className={`tipo-card ${tipoUsuario === 'cliente' ? 'selected' : ''}`}
                  onClick={() => setTipoUsuario('cliente')}
                >
                  <div className="tipo-icon">👤</div>
                  <div className="tipo-title">Soy un cliente</div>
                  <div className="tipo-desc">Quiero descubrir negocios, reservar citas y comprar productos</div>
                </div>
              </div>
              <button className="btn-primary" onClick={() => setPaso(1)} disabled={!tipoUsuario}>
                Continuar →
              </button>
            </>
          )}

          {/* ── NEGOCIO PASO 1: Nombre + tipo ── */}
          {tipoUsuario === 'negocio' && paso === 1 && (
            <>
              <div className="step-label">Paso 1 de 3</div>
              <h2>Cuéntanos sobre tu negocio</h2>
              <p className="sub">Estos datos aparecerán en tu perfil público y en el chatbot IA.</p>
              <div className="field">
                <label>Nombre del negocio *</label>
                <input
                  type="text"
                  placeholder="Ej: Barber Co."
                  value={nombreNegocio}
                  onChange={e => setNombreNegocio(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Tipo de negocio *</label>
                <div className="tipo-negocio-grid">
                  {tiposNegocio.map(tipo => (
                    <div
                      key={tipo}
                      className={`tipo-negocio-item ${tipoNegocio === tipo ? 'selected' : ''}`}
                      onClick={() => setTipoNegocio(tipo)}
                    >
                      {tipo}
                    </div>
                  ))}
                </div>
              </div>
              {/* ── Color del negocio ── */}
              <div className="field">
                <label>Color del negocio</label>
                <div
                  onClick={() => setColorNegocio('#7C3AED')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12,
                    border: colorNegocio === '#7C3AED' ? '2px solid #7C3AED' : '1.5px solid rgba(0,0,0,0.1)',
                    background: colorNegocio === '#7C3AED' ? 'rgba(124,58,237,0.05)' : '#fff',
                    cursor: 'pointer', marginBottom: 10, transition: 'all 0.2s',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7C3AED', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Predeterminado Khepria</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Recomendado · #7C3AED</div>
                  </div>
                  {colorNegocio === '#7C3AED' && (
                    <div style={{ marginLeft: 'auto', color: '#7C3AED', fontWeight: 800 }}>✓</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarPersonalizarColor(!mostrarPersonalizarColor)}
                  style={{
                    width: '100%', padding: '11px 16px', borderRadius: 12,
                    border: '1.5px dashed rgba(0,0,0,0.12)', background: 'transparent',
                    fontSize: 13, fontWeight: 600, color: '#6B7280',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8, transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >
                  🎨 Personalizar color {mostrarPersonalizarColor ? '▲' : '▼'}
                </button>

                {mostrarPersonalizarColor && (
                  <div style={{ marginTop: 12, padding: 16, background: '#F7F9FF', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10, fontWeight: 600 }}>COLORES PROFESIONALES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {['#4F46E5','#7C3AED','#8B5CF6','#2563EB','#0891B2','#059669','#16A34A','#65A30D','#10B981','#D97706','#EA580C','#DB2777','#DC2626','#E11D48','#475569','#374151'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColorNegocio(c)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%', background: c,
                            border: 'none', cursor: 'pointer',
                            boxShadow: colorNegocio === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : '0 2px 6px rgba(0,0,0,0.15)',
                            transform: colorNegocio === c ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8, fontWeight: 600 }}>COLOR PERSONALIZADO</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={colorNegocio}
                        onChange={e => setColorNegocio(e.target.value)}
                        style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                      />
                      <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{colorNegocio}</span>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: '#F7F9FF', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, fontWeight: 600 }}>VISTA PREVIA</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: colorNegocio, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {tipoNegocio.split(' ')[0] || '🏪'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#0F0F1A', fontSize: 14 }}>{nombreNegocio || 'Tu negocio'}</div>
                      <div style={{ fontSize: 12, color: colorNegocio, fontWeight: 600 }}>● Disponible ahora</div>
                    </div>
                    <div style={{ background: colorNegocio, color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                      Reservar
                    </div>
                  </div>
                </div>
              </div>

              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(0)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(2)} disabled={!nombreNegocio || !tipoNegocio}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── NEGOCIO PASO 2: Plan ── */}
          {tipoUsuario === 'negocio' && paso === 2 && (
            <>
              <div className="step-label">Paso 2 de 3</div>
              <h2>Elige tu plan</h2>
              <p className="sub">Puedes cambiar de plan en cualquier momento desde el dashboard.</p>
              <div className="planes-grid">
                {planes.map(plan => (
                  <div
                    key={plan.id}
                    className={`plan-card`}
                    style={{
                      borderColor: planSeleccionado === plan.id ? plan.colorDark : 'rgba(0,0,0,0.08)',
                      background: planSeleccionado === plan.id ? `${plan.color}30` : 'white'
                    }}
                    onClick={() => setPlanSeleccionado(plan.id)}
                  >
                    {plan.popular && <div className="plan-popular">⭐ Más popular</div>}
                    <div className="plan-nombre" style={{ color: plan.colorDark }}>{plan.nombre}</div>
                    <div className="plan-precio-wrap">
                      <span className="plan-precio-num" style={{ color: plan.colorDark }}>{plan.precio}</span>
                      <span className="plan-precio-period">{plan.periodo}</span>
                    </div>
                    <div className="plan-pill" style={{ background: `${plan.color}50`, color: plan.colorDark }}>
                      {plan.trabajadores} · {plan.creditos}
                    </div>
                    {plan.features.map((f, i) => (
                      <div key={i} className="plan-feature">
                        <span style={{ color: plan.colorDark }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="plan-beta-note" style={{ marginTop: '16px' }}>
                💡 Pago disponible próximamente — acceso gratuito durante la beta
              </div>
              <div className="btns" style={{ marginTop: '16px' }}>
                <button className="btn-secondary" onClick={() => setPaso(1)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(3)}>Continuar →</button>
              </div>
            </>
          )}

          {/* ── NEGOCIO PASO 3: Listo ── */}
          {tipoUsuario === 'negocio' && paso === 3 && (
            <>
              <div className="step-label">Paso 3 de 3</div>
              <h2>¡Todo listo, {nombreNegocio}!</h2>
              <p className="sub">Revisa el resumen de tu cuenta antes de crear el negocio.</p>

              <div className="resumen-box">
                <div className="resumen-row">
                  <span className="resumen-label">Negocio</span>
                  <span className="resumen-val">{nombreNegocio}</span>
                </div>
                <div className="resumen-row">
                  <span className="resumen-label">Tipo</span>
                  <span className="resumen-val">{tipoNegocio}</span>
                </div>
                <div className="resumen-row">
                  <span className="resumen-label">Plan</span>
                  <span className="resumen-val" style={{ color: planActual?.colorDark }}>
                    {planActual?.nombre} — {planActual?.precio}{planActual?.periodo}
                  </span>
                </div>
                <div className="resumen-row">
                  <span className="resumen-label">Créditos IA incluidos</span>
                  <span className="resumen-val">{(CREDITOS_POR_PLAN[planSeleccionado] ?? 100).toLocaleString('es-ES')} créditos/mes</span>
                </div>
                <div className="resumen-row">
                  <span className="resumen-label">Trabajador inicial</span>
                  <span className="resumen-val">Propietario (tú)</span>
                </div>
              </div>

              <div style={{ background: 'rgba(184,216,248,0.15)', border: '1px solid rgba(184,216,248,0.4)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: 500 }}>
                  🤖 El chatbot IA se creará automáticamente con los datos de tu negocio.
                </p>
              </div>

              {error && <div className="error">{error}</div>}
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(2)}>← Atrás</button>
                <button className="btn-primary" onClick={guardarNegocio} disabled={cargando}>
                  {cargando ? 'Creando tu negocio...' : '🚀 Crear mi negocio'}
                </button>
              </div>
            </>
          )}

          {/* ── CLIENTE PASO 1: Perfil ── */}
          {tipoUsuario === 'cliente' && paso === 1 && (
            <>
              <div className="step-label">Paso 1 de 2</div>
              <h2>Tu perfil</h2>
              <p className="sub">Cuéntanos un poco sobre ti para personalizar tu experiencia.</p>
              <div className="field">
                <label>Tu nombre *</label>
                <input
                  type="text"
                  placeholder="María García"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Tu ciudad *</label>
                <input
                  type="text"
                  placeholder="Barcelona"
                  value={ciudadCliente}
                  onChange={e => setCiudadCliente(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Teléfono *</label>
                <input
                  type="tel"
                  placeholder="612 345 678"
                  value={telefonoCliente}
                  onChange={e => setTelefonoCliente(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(0)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(2)} disabled={!nombreCliente || !ciudadCliente || !telefonoCliente}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── CLIENTE PASO 2: Confirmación ── */}
          {tipoUsuario === 'cliente' && paso === 2 && (
            <>
              <div className="step-label">Paso 2 de 2</div>
              <h2>¡Ya casi está!</h2>
              <p className="sub">Estás listo para descubrir negocios increíbles cerca de ti.</p>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗺️</div>
                <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6' }}>
                  Descubre peluquerías, spas, clínicas y mucho más cerca de <strong>{ciudadCliente}</strong>.
                </p>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(1)}>← Atrás</button>
                <button className="btn-primary" onClick={guardarCliente} disabled={cargando}>
                  {cargando ? 'Guardando...' : '🗺️ Explorar negocios'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
