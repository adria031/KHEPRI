'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

function KhepriLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Khepria</span>
    </div>
  )
}

const navItems = [
  { icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { icon: '🏪', label: 'Mi negocio', href: '/dashboard/mi-negocio' },
  { icon: '📅', label: 'Reservas', href: '/dashboard/reservas' },
  { icon: '🔧', label: 'Servicios', href: '/dashboard/servicios' },
  { icon: '⏰', label: 'Horarios', href: '/dashboard/horarios' },
  { icon: '🛍️', label: 'Productos', href: '/dashboard/productos' },
  { icon: '👥', label: 'Equipo', href: '/dashboard/equipo' },
  { icon: '🤖', label: 'Chatbot IA', href: '/dashboard/chatbot' },
  { icon: '🧾', label: 'Facturación', href: '/dashboard/facturacion' },
  { icon: '📱', label: 'Marketing', href: '/dashboard/marketing' },
  { icon: '⭐', label: 'Reseñas', href: '/dashboard/resenas' },
]

export default function MiNegocio() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  const [form, setForm] = useState({
    nombre: '', tipo: '', descripcion: '', telefono: '',
    direccion: '', ciudad: '', codigo_postal: '',
    instagram: '', whatsapp: '', facebook: '', fotos: [] as string[], logo_url: ''
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      const { data } = await supabase.from('negocios').select('*').eq('user_id', user.id).single()
      if (data) {
        setNegocioId(data.id)
        setForm({
          nombre: data.nombre || '',
          tipo: data.tipo || '',
          descripcion: data.descripcion || '',
          telefono: data.telefono || '',
          direccion: data.direccion || '',
          ciudad: data.ciudad || '',
          codigo_postal: data.codigo_postal || '',
          instagram: data.instagram || '',
          whatsapp: data.whatsapp || '',
          facebook: data.facebook || '',
          fotos: data.fotos || [],
          logo_url: data.logo_url || ''
        })
      }
      setCargando(false)
    })
  }, [])

  async function guardar() {
    if (!negocioId) return
    setGuardando(true)
    await supabase.from('negocios').update({
      nombre: form.nombre,
      descripcion: form.descripcion,
      telefono: form.telefono,
      direccion: form.direccion,
      ciudad: form.ciudad,
      codigo_postal: form.codigo_postal,
      instagram: form.instagram,
      whatsapp: form.whatsapp,
      facebook: form.facebook,
      fotos: form.fotos,
      logo_url: form.logo_url
    }).eq('id', negocioId)
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !negocioId) return
    setSubiendo(true)

    const ext = file.name.split('.').pop()
    const path = `negocios/${negocioId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('fotos').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
      const nuevasFotos = [...form.fotos, publicUrl]
      setForm({ ...form, fotos: nuevasFotos })
      await supabase.from('negocios').update({ fotos: nuevasFotos }).eq('id', negocioId)
    }
    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !negocioId) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${negocioId}/logo.${ext}`
    await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    setForm(prev => ({ ...prev, logo_url: publicUrl }))
    await supabase.from('negocios').update({ logo_url: publicUrl }).eq('id', negocioId)
    setSubiendo(false)
    if (logoRef.current) logoRef.current.value = ''
  }

  async function eliminarFoto(url: string) {
    const nuevasFotos = form.fotos.filter(f => f !== url)
    setForm({ ...form, fotos: nuevasFotos })
    await supabase.from('negocios').update({ fotos: nuevasFotos }).eq('id', negocioId)
  }

  function abrirGPS() {
    const dir = encodeURIComponent(`${form.direccion}, ${form.ciudad}`)
    window.open(`https://maps.google.com/?q=${dir}`, '_blank')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #F7F9FC; --white: #FFFFFF; --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2); --lila: #D4C5F9; --lila-dark: #6B4FD8; --green: #B8EDD4; --green-dark: #2E8A5E; --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08); }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s ease; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid var(--border); }
        .sidebar-nav { padding: 12px 10px; flex: 1; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; margin-bottom: 2px; }
        .nav-item:hover { background: var(--bg); color: var(--text); }
        .nav-item.active { background: var(--blue-soft); color: var(--blue-dark); font-weight: 600; }
        .nav-item-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .sidebar-footer { padding: 16px 10px; border-top: 1px solid var(--border); }
        .logout-btn { width: 100%; padding: 9px 12px; background: none; border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; max-width: 800px; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 4px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
        .section { background: var(--white); border: 1px solid var(--border); border-radius: 18px; padding: 24px; margin-bottom: 16px; }
        .section-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field input, .field textarea { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field textarea { resize: vertical; min-height: 100px; line-height: 1.5; }
        .field input:focus, .field textarea:focus { border-color: var(--blue-dark); }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        /* FOTOS */
        .fotos-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
        .foto-item { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
        .foto-item img { width: 100%; height: 100%; object-fit: cover; }
        .foto-delete { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; }
        .foto-add { aspect-ratio: 1; border-radius: 12px; border: 1.5px dashed var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 600; transition: all 0.2s; background: var(--bg); }
        .foto-add:hover { border-color: var(--blue-dark); color: var(--blue-dark); background: var(--blue-soft); }
        .foto-add-icon { font-size: 24px; }

        /* UBICACION */
        .ubicacion-preview { background: #EDF2F8; border-radius: 12px; height: 120px; position: relative; overflow: hidden; border: 1px solid var(--border); margin-top: 12px; display: flex; align-items: center; justify-content: center; }
        .btn-gps { display: flex; align-items: center; gap: 8px; background: var(--blue-dark); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }

        /* PREVIEW LINK */
        .preview-link { display: flex; align-items: center; gap: 8px; background: rgba(184,216,248,0.15); border: 1px solid rgba(184,216,248,0.4); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: var(--blue-dark); font-weight: 600; text-decoration: none; margin-bottom: 16px; }

        /* BOTONES */
        .btn-guardar { background: var(--text); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-guardar:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-guardado { background: var(--green-dark) !important; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .grid2, .grid3 { grid-template-columns: 1fr; }
          .fotos-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/mi-negocio' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-item-icon">{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}><span>🚪</span> Cerrar sesión</button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Mi negocio</span>
            </div>
            <button
              className={`btn-guardar ${guardado ? 'btn-guardado' : ''}`}
              onClick={guardar}
              disabled={guardando || cargando}
            >
              {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar cambios'}
            </button>
          </header>

          <main className="content">
            <div className="page-title">Mi negocio</div>
            <div className="page-sub">Así te verán los clientes en la app</div>

            {negocioId && (
              <Link href={`/negocio/${negocioId}`} className="preview-link" target="_blank">
                👁️ Ver ficha pública de mi negocio →
              </Link>
            )}

            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)'}}>Cargando...</div>
            ) : (
              <>
                {/* INFO BÁSICA */}
                <div className="section">
                  <div className="section-title">🏪 Información básica</div>
                  <div className="field">
                    <label>Nombre del negocio</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Descripción</label>
                    <textarea placeholder="Describe tu negocio, especialidades, ambiente..." value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Teléfono de contacto</label>
                    <input type="tel" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                  </div>
                </div>

                {/* LOGO */}
                <div className="section">
                  <div className="section-title">🎨 Logo del negocio</div>
                  <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                    <div style={{width:'90px', height:'90px', borderRadius:'18px', border:'1.5px solid var(--border)', overflow:'hidden', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      ) : (
                        <span style={{fontSize:'32px'}}>🏪</span>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => logoRef.current?.click()}
                        style={{padding:'9px 18px', background:'var(--text)', color:'white', border:'none', borderRadius:'10px', fontFamily:'inherit', fontSize:'13px', fontWeight:600, cursor:'pointer', display:'block', marginBottom:'8px'}}
                      >
                        {subiendo ? 'Subiendo...' : '📷 Subir logo'}
                      </button>
                      {form.logo_url && (
                        <button
                          onClick={() => { setForm(prev => ({...prev, logo_url: ''})); supabase.from('negocios').update({logo_url: null}).eq('id', negocioId) }}
                          style={{padding:'7px 14px', background:'none', color:'#DC2626', border:'1px solid #FCA5A5', borderRadius:'10px', fontFamily:'inherit', fontSize:'12px', fontWeight:600, cursor:'pointer'}}
                        >
                          Eliminar logo
                        </button>
                      )}
                      <p style={{fontSize:'12px', color:'var(--muted)', marginTop:'6px'}}>JPG, PNG o SVG. Recomendado: cuadrado.</p>
                    </div>
                  </div>
                  <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={subirLogo} />
                </div>

                {/* FOTOS */}
                <div className="section">
                  <div className="section-title">📸 Fotos del local</div>
                  <div className="fotos-grid">
                    {form.fotos.map((url, i) => (
                      <div key={i} className="foto-item">
                        <img src={url} alt={`Foto ${i+1}`} />
                        <button className="foto-delete" onClick={() => eliminarFoto(url)}>✕</button>
                      </div>
                    ))}
                    {form.fotos.length < 8 && (
                      <div className="foto-add" onClick={() => fileRef.current?.click()}>
                        <span className="foto-add-icon">{subiendo ? '⏳' : '📷'}</span>
                        <span>{subiendo ? 'Subiendo...' : 'Añadir foto'}</span>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={subirFoto} />
                  <p style={{fontSize:'12px', color:'var(--muted)'}}>Máximo 8 fotos. Formatos: JPG, PNG, WEBP.</p>
                </div>

                {/* UBICACIÓN */}
                <div className="section">
                  <div className="section-title">📍 Ubicación</div>
                  <div className="field">
                    <label>Dirección</label>
                    <input type="text" placeholder="Calle Mayor, 15" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Ciudad</label>
                      <input type="text" placeholder="Barcelona" value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>Código postal</label>
                      <input type="text" placeholder="08001" value={form.codigo_postal} onChange={e => setForm({...form, codigo_postal: e.target.value})} />
                    </div>
                  </div>
                  {form.direccion && form.ciudad && (
                    <button className="btn-gps" onClick={abrirGPS}>
                      🗺️ Ver en Google Maps
                    </button>
                  )}
                </div>

                {/* REDES SOCIALES */}
                <div className="section">
                  <div className="section-title">📱 Redes sociales</div>
                  <div className="grid3">
                    <div className="field">
                      <label>📸 Instagram</label>
                      <input type="text" placeholder="@tunegocio" value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>💬 WhatsApp</label>
                      <input type="tel" placeholder="+34 600 000 000" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>👤 Facebook</label>
                      <input type="text" placeholder="facebook.com/tunegocio" value={form.facebook} onChange={e => setForm({...form, facebook: e.target.value})} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}