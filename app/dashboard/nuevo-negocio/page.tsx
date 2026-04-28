'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'

const TIPOS = [
  '💈 Peluquería / Barbería', '💅 Estética', '💆 Spa / Masajes', '🏥 Clínica', '🦷 Dentista',
  '👁️ Óptica', '🐾 Veterinaria', '🧘 Yoga / Pilates', '🏋️ Gimnasio', '📸 Fotografía',
  '🎨 Tatuajes', '👗 Moda / Ropa', '🍕 Restaurante', '☕ Cafetería', '🔧 Reparaciones', '📦 Otro',
]

export default function NuevoNegocio() {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState('basico')

  useEffect(() => {
    getSessionClient().then(({ session }) => {
      if (!session?.user) { window.location.href = '/auth'; return }
      setUserId(session.user.id)
      // Obtener el plan actual del usuario (heredar del primer negocio)
      supabase.from('negocios').select('plan').eq('user_id', session.user.id).limit(1).single()
        .then(({ data }) => { if (data?.plan) setPlan(data.plan) })
    })
  }, [])

  async function crear() {
    if (!nombre.trim()) { setError('El nombre del negocio es obligatorio.'); return }
    if (!tipo) { setError('Selecciona el tipo de negocio.'); return }
    if (!userId) { setError('Error de sesión. Recarga la página e inténtalo de nuevo.'); return }
    setGuardando(true); setError('')

    const { data, error: err } = await supabase
      .from('negocios')
      .insert({ user_id: userId, nombre: nombre.trim(), tipo, plan, visible: true })
      .select('id')
      .single()

    if (err || !data) {
      setError(err?.message || 'No se pudo crear el negocio.')
      setGuardando(false)
      return
    }

    localStorage.setItem('negocio_activo_id', data.id)
    window.location.href = '/dashboard'
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F7F9FC; color: #111827; min-height: 100vh; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }
        .nn-header { background: white; border-bottom: 1px solid rgba(0,0,0,0.07); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; }
        .nn-logo { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: #111827; text-decoration: none; }
        .nn-back { font-size: 13px; font-weight: 600; color: #6B7280; text-decoration: none; }
        .nn-back:hover { color: #111827; }
        .nn-wrap { max-width: 560px; margin: 48px auto; padding: 0 24px 80px; }
        .nn-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .nn-title { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 6px; }
        .nn-sub { font-size: 14px; color: #6B7280; margin-bottom: 28px; }
        .field { margin-bottom: 18px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 7px; }
        .field input { width: 100%; padding: 12px 14px; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 10px; font-family: inherit; font-size: 14px; color: #111827; outline: none; background: white; transition: border-color 0.15s; }
        .field input:focus { border-color: #4F46E5; }
        .tipos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .tipo-btn { padding: 10px 12px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 500; color: #4B5563; background: white; cursor: pointer; text-align: left; transition: all 0.15s; }
        .tipo-btn:hover { border-color: #C7D2FE; }
        .tipo-btn.selected { border-color: #4F46E5; background: #EEF2FF; color: #4F46E5; font-weight: 600; }
        .btn-crear { width: 100%; padding: 14px; background: #111827; color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 24px; transition: background 0.15s; }
        .btn-crear:hover:not(:disabled) { background: #1F2937; }
        .btn-crear:disabled { opacity: 0.5; cursor: not-allowed; }
        .err { background: rgba(254,226,226,0.5); color: #DC2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 12px; }
      `}</style>

      <header className="nn-header">
        <span className="nn-logo">Khepria</span>
        <Link href="/dashboard" className="nn-back">← Volver al dashboard</Link>
      </header>

      <div className="nn-wrap">
        <div className="nn-card">
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏪</div>
          <div className="nn-title">Añadir nuevo negocio</div>
          <div className="nn-sub">Se vinculará a tu cuenta y podrás cambiar entre negocios desde el dashboard.</div>

          <div className="field">
            <label>Nombre del negocio *</label>
            <input
              type="text"
              placeholder="Ej: Peluquería Ana García"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Tipo de negocio *</label>
            <div className="tipos-grid">
              {TIPOS.map(t => (
                <button
                  key={t}
                  className={`tipo-btn ${tipo === t ? 'selected' : ''}`}
                  onClick={() => setTipo(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="err">{error}</div>}

          <button className="btn-crear" onClick={crear} disabled={guardando || !userId}>
            {guardando ? 'Creando negocio...' : 'Crear negocio'}
          </button>
        </div>
      </div>
    </>
  )
}
