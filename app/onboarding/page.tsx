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

const planes = [
  {
    id: 'basico', nombre: 'Básico', precio: 'Precio próximamente', color: '#B8D8F8', colorDark: '#1D4ED8',
    features: ['Gestión de reservas', 'Chatbot básico', 'Perfil en el mapa', 'Hasta 10 servicios']
  },
  {
    id: 'pro', nombre: 'Pro', precio: 'Precio próximamente', color: '#D4C5F9', colorDark: '#6B4FD8', popular: true,
    features: ['Todo lo del Básico', 'E-commerce de productos', 'Facturación española', 'Analytics con IA', 'Marketing y fidelización', 'Servicios ilimitados']
  },
  {
    id: 'agencia', nombre: 'Plus', precio: 'Precio próximamente', color: '#B8EDD4', colorDark: '#2E8A5E',
    features: ['Todo lo del Pro', 'Hasta 10 negocios', 'Panel multi-sede', 'Soporte prioritario', 'API personalizada']
  }
]

export default function Onboarding() {
  const [cargandoSesion, setCargandoSesion] = useState(false)
  const [tipoUsuario, setTipoUsuario] = useState<'negocio' | 'cliente' | null>(null)
  const [paso, setPaso] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // Negocio
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [tipoNegocio, setTipoNegocio] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [instagram, setInstagram] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [facebook, setFacebook] = useState('')
  const [planSeleccionado, setPlanSeleccionado] = useState('pro')

  // Cliente
  const [nombreCliente, setNombreCliente] = useState('')
  const [ciudadCliente, setCiudadCliente] = useState('')

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
      // Sin perfil → quedar en onboarding
    })
  }, [])

  const totalPasosNegocio = 4
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

      // profiles must exist before negocios (FK: negocios.user_id -> profiles.id)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id, tipo: 'negocio', nombre: nombreNegocio, email: user.email
      })
      if (profileError) {
        console.error('[onboarding] profile upsert error:', profileError.code, profileError.message, profileError.hint)
        throw new Error(`Error al crear el perfil: ${profileError.message} (código: ${profileError.code})`)
      }

      const { data: negocioData, error: negocioError } = await supabase.from('negocios').insert({
        user_id: user.id, nombre: nombreNegocio, tipo: tipoNegocio,
        direccion, ciudad, codigo_postal: codigoPostal, telefono,
        instagram, whatsapp, facebook, plan: planSeleccionado, visible: true
      }).select('id').single()
      if (negocioError) {
        console.error('[onboarding] negocio insert error:', negocioError.code, negocioError.message, negocioError.details, negocioError.hint)
        throw new Error(`Error al crear el negocio: ${negocioError.message} (código: ${negocioError.code})`)
      }

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
        body: JSON.stringify({ email: user.email, nombre: nombreNegocio, tipo: 'negocio' }),
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
      const { error: profErr } = await supabase.from('profiles').upsert({ id: user.id, tipo: 'cliente', nombre: nombreCliente, email: user.email })
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

  if (cargandoSesion) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F9FC', fontFamily:'Plus Jakarta Sans, sans-serif', flexDirection:'column', gap:'12px' }}>
        <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
            <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
            <circle cx="11" cy="11" r="2" fill="white"/>
          </svg>
        </div>
        <p style={{color:'#9CA3AF', fontSize:'14px'}}>Cargando...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 32px 20px; }
        .header { width: 100%; max-width: 600px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .progress-bar { width: 100%; max-width: 600px; height: 4px; background: rgba(0,0,0,0.08); border-radius: 100px; margin-bottom: 32px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #B8D8F8, #D4C5F9); border-radius: 100px; transition: width 0.4s ease; }
        .card { background: white; border-radius: 24px; padding: 40px; width: 100%; max-width: 600px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
        .step-label { font-size: 12px; font-weight: 600; color: #9CA3AF; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
        h2 { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 8px; }
        .sub { font-size: 14px; color: #6B7280; margin-bottom: 28px; }
        .field { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px; }
        input, select { width: 100%; padding: 12px 14px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 12px; font-family: inherit; font-size: 14px; color: #111827; outline: none; transition: border 0.2s; background: white; -webkit-appearance: none; }
        input:focus, select:focus { border-color: #1D4ED8; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
        .planes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; }
        .plan-card { border: 2px solid rgba(0,0,0,0.08); border-radius: 18px; padding: 20px 16px; cursor: pointer; transition: all 0.2s; position: relative; }
        .plan-card:hover { transform: translateY(-2px); }
        .plan-popular { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #D4C5F9; color: #6B4FD8; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; }
        .plan-nombre { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
        .plan-precio { font-size: 13px; color: #9CA3AF; margin-bottom: 14px; }
        .plan-feature { font-size: 12px; color: #4B5563; padding: 3px 0; display: flex; align-items: center; gap: 6px; }
        @media (max-width: 600px) {
          .card { padding: 28px 20px; }
          .planes-grid { grid-template-columns: 1fr; }
          .tipo-negocio-grid { grid-template-columns: repeat(2, 1fr); }
          .grid2 { grid-template-columns: 1fr; }
          h2 { font-size: 20px; }
          input, select { font-size: 16px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="page">
        <div className="header">
          <KhepriLogo />
          {tipoUsuario && paso > 0 && (
            <span style={{fontSize:'13px', color:'#9CA3AF', fontWeight:500}}>
              Paso {paso} de {tipoUsuario === 'negocio' ? totalPasosNegocio : totalPasosCliente}
            </span>
          )}
        </div>

        {tipoUsuario && paso > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{width:`${progreso}%`}}></div>
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

          {/* ── NEGOCIO PASO 1: Elegir plan ── */}
          {tipoUsuario === 'negocio' && paso === 1 && (
            <>
              <div className="step-label">Paso 1 de 4</div>
              <h2>Elige tu plan</h2>
              <p className="sub">Los precios se definirán próximamente. Puedes cambiar de plan en cualquier momento.</p>
              <div className="planes-grid">
                {planes.map(plan => (
                  <div
                    key={plan.id}
                    className={`plan-card ${planSeleccionado === plan.id ? 'selected' : ''}`}
                    style={{
                      borderColor: planSeleccionado === plan.id ? plan.colorDark : 'rgba(0,0,0,0.08)',
                      background: planSeleccionado === plan.id ? `${plan.color}20` : 'white'
                    }}
                    onClick={() => setPlanSeleccionado(plan.id)}
                  >
                    {plan.popular && <div className="plan-popular">⭐ Popular</div>}
                    <div className="plan-nombre" style={{color: plan.colorDark}}>{plan.nombre}</div>
                    <div className="plan-precio">{plan.precio}</div>
                    {plan.features.map((f, i) => (
                      <div key={i} className="plan-feature">
                        <span style={{color: plan.colorDark}}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(0)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(2)}>Continuar →</button>
              </div>
            </>
          )}

          {/* ── NEGOCIO PASO 2: Nombre / tipo / teléfono ── */}
          {tipoUsuario === 'negocio' && paso === 2 && (
            <>
              <div className="step-label">Paso 2 de 4</div>
              <h2>Información básica</h2>
              <p className="sub">Cuéntanos sobre tu negocio.</p>
              <div className="field">
                <label>Nombre del negocio *</label>
                <input
                  type="text"
                  placeholder="Ej: Barber Co."
                  value={nombreNegocio}
                  onChange={e => setNombreNegocio(e.target.value)}
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
              <div className="field">
                <label>Teléfono de contacto</label>
                <input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                />
              </div>
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(1)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(3)} disabled={!nombreNegocio || !tipoNegocio}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── NEGOCIO PASO 3: Ubicación ── */}
          {tipoUsuario === 'negocio' && paso === 3 && (
            <>
              <div className="step-label">Paso 3 de 4</div>
              <h2>Ubicación</h2>
              <p className="sub">Los clientes te encontrarán en el mapa gracias a tu dirección.</p>
              <div className="field">
                <label>Dirección</label>
                <input
                  type="text"
                  placeholder="Calle Mayor, 15"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                />
              </div>
              <div className="grid2">
                <div className="field">
                  <label>Ciudad *</label>
                  <input
                    type="text"
                    placeholder="Barcelona"
                    value={ciudad}
                    onChange={e => setCiudad(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Código postal</label>
                  <input
                    type="text"
                    placeholder="08001"
                    value={codigoPostal}
                    onChange={e => setCodigoPostal(e.target.value)}
                  />
                </div>
              </div>
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(2)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(4)} disabled={!ciudad}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {/* ── NEGOCIO PASO 4: Redes sociales + crear negocio ── */}
          {tipoUsuario === 'negocio' && paso === 4 && (
            <>
              <div className="step-label">Paso 4 de 4</div>
              <h2>Redes sociales</h2>
              <p className="sub">Opcionales. El chatbot IA las usará para atender mejor a tus clientes.</p>
              <div className="field">
                <label>📸 Instagram</label>
                <input
                  type="text"
                  placeholder="@tunegocio"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                />
              </div>
              <div className="field">
                <label>💬 WhatsApp</label>
                <input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
              </div>
              <div className="field">
                <label>👤 Facebook</label>
                <input
                  type="text"
                  placeholder="facebook.com/tunegocio"
                  value={facebook}
                  onChange={e => setFacebook(e.target.value)}
                />
              </div>
              <div style={{background:'rgba(184,216,248,0.15)', border:'1px solid rgba(184,216,248,0.4)', borderRadius:'12px', padding:'14px', marginTop:'4px', marginBottom:'16px'}}>
                <p style={{fontSize:'13px', color:'#1D4ED8', fontWeight:500}}>
                  🤖 El chatbot IA se creará automáticamente con toda la información de tu negocio.
                </p>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(3)}>← Atrás</button>
                <button className="btn-primary" onClick={guardarNegocio} disabled={cargando}>
                  {cargando ? 'Guardando...' : '🚀 Crear mi negocio'}
                </button>
              </div>
            </>
          )}

          {/* ── CLIENTE PASO 1: Perfil ── */}
          {tipoUsuario === 'cliente' && paso === 1 && (
            <>
              <div className="step-label">Paso 1 de 2</div>
              <h2>Tu perfil</h2>
              <p className="sub">Cuéntanos un poco sobre ti.</p>
              <div className="field">
                <label>Tu nombre *</label>
                <input
                  type="text"
                  placeholder="María García"
                  value={nombreCliente}
                  onChange={e => setNombreCliente(e.target.value)}
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
              <div className="btns">
                <button className="btn-secondary" onClick={() => setPaso(0)}>← Atrás</button>
                <button className="btn-primary" onClick={() => setPaso(2)} disabled={!nombreCliente || !ciudadCliente}>
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
              <div style={{textAlign:'center', padding:'24px 0'}}>
                <div style={{fontSize:'64px', marginBottom:'16px'}}>🗺️</div>
                <p style={{fontSize:'15px', color:'#4B5563', lineHeight:'1.6'}}>
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
