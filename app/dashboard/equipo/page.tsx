'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { dbMutation } from '../../lib/dbApi'
import { DashboardShell } from '../DashboardShell'



type Trabajador = {
  id: string
  nombre: string
  especialidad: string
  foto_url: string | null
  email: string | null
  telefono: string | null
  activo: boolean
}

type FormState = {
  nombre: string
  especialidad: string
  foto_url: string | null
  email: string
  telefono: string
}

export default function Equipo() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Trabajador | null>(null)
  const [form, setForm] = useState<FormState>({ nombre: '', especialidad: '', foto_url: null, email: '', telefono: '' })
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!neg) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todosNegs)
      setNegocio(neg)
      setNegocioId(neg.id)
      const { data } = await db.from('trabajadores').select('*').eq('negocio_id', neg.id).order('nombre')
      setTrabajadores(data || [])
      setCargando(false)
    })()
  }, [])

  function abrirModal(t?: Trabajador) {
    if (t) {
      setEditando(t)
      setForm({ nombre: t.nombre, especialidad: t.especialidad || '', foto_url: t.foto_url, email: t.email || '', telefono: t.telefono || '' })
      setFotoPreview(t.foto_url)
    } else {
      setEditando(null)
      setForm({ nombre: '', especialidad: '', foto_url: null, email: '', telefono: '' })
      setFotoPreview(null)
    }
    setFotoArchivo(null)
    setError('')
    setModal(true)
  }

  function cerrarModal() {
    setModal(false)
    setFotoArchivo(null)
    setFotoPreview(null)
  }

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoArchivo(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function subirFoto(file: File): Promise<string | null> {
    if (!negocioId) return null
    const ext = file.name.split('.').pop()
    const path = `trabajadores/${negocioId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('fotos').getPublicUrl(path)
    return data.publicUrl
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!editando && !form.email.trim()) { setError('El email es obligatorio para enviar la invitación.'); return }
    setGuardando(true); setError('')

    let foto_url = form.foto_url
    if (fotoArchivo) {
      const url = await subirFoto(fotoArchivo)
      if (url) foto_url = url
      else { setError('Error al subir la foto. Los demás datos se guardarán igualmente.') }
    }

    const datos = {
      nombre: form.nombre.trim(),
      especialidad: form.especialidad.trim(),
      foto_url,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
    }

    if (editando) {
      const { error: err } = await dbMutation({ op: 'update', table: 'trabajadores', id: editando.id, negocioId: negocioId!, data: datos })
      if (err) { setError(err); setGuardando(false); return }
      setTrabajadores(prev => prev.map(t => t.id === editando.id ? { ...t, ...datos } : t))
    } else {
      const { data, error: err } = await dbMutation({ op: 'insert', table: 'trabajadores', negocioId: negocioId!, data: { ...datos, negocio_id: negocioId, activo: true } })
      if (err || !data) { setError(err || 'No se pudo guardar.'); setGuardando(false); return }
      setTrabajadores(prev => [...prev, data as Trabajador])

      // Enviar email de invitación
      if (datos.email) {
        try {
          await fetch('/api/invitar-empleado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: datos.email,
              nombreEmpleado: datos.nombre,
              nombreNegocio: negocio?.nombre || 'tu negocio',
              negocioId,
            }),
          })
        } catch {
          // No bloquear si falla el email
        }
      }
    }

    setGuardando(false)
    cerrarModal()
  }

  async function toggleActivo(t: Trabajador) {
    const { error } = await dbMutation({ op: 'update', table: 'trabajadores', id: t.id, negocioId: negocioId!, data: { activo: !t.activo } })
    if (!error) setTrabajadores(prev => prev.map(x => x.id === t.id ? { ...x, activo: !t.activo } : x))
  }

  async function eliminar(t: Trabajador) {
    if (!confirm(`¿Eliminar a ${t.nombre}? Esta acción no se puede deshacer.`)) return
    const { error } = await dbMutation({ op: 'delete', table: 'trabajadores', id: t.id, negocioId: negocioId! })
    if (!error) setTrabajadores(prev => prev.filter(x => x.id !== t.id))
  }


  function iniciales(nombre: string) {
    return nombre.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  }

  const activos = trabajadores.filter(t => t.activo).length

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --green-dark: #2E8A5E; --green-soft: rgba(184,237,212,0.2);
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform 0.3s ease; }
        .sidebar-logo { padding: 20px 18px; border-bottom: 1px solid var(--border); }
        .sidebar-nav { padding: 12px 10px; flex: 1; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; margin-bottom: 2px; transition: all 0.2s; }
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
        .content { padding: 24px 28px; flex: 1; }

        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
        .page-sub { font-size: 14px; color: var(--muted); margin-top: 2px; }
        .btn-nuevo { background: var(--text); color: white; border: none; padding: 10px 18px; border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }

        .equipo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

        .trabajador-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 20px 18px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; transition: box-shadow 0.2s; }
        .trabajador-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .trabajador-card.inactivo { opacity: 0.55; }
        .card-actions { position: absolute; top: 12px; right: 12px; display: flex; gap: 4px; }
        .btn-icon { background: var(--bg); border: none; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }
        .btn-icon:hover { background: rgba(0,0,0,0.08); }
        @media (max-width: 768px) { .btn-icon { width: 44px; height: 44px; font-size: 18px; } }

        .avatar { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 12px; object-fit: cover; border: 3px solid rgba(0,0,0,0.06); }
        .avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 12px; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: var(--blue-dark); flex-shrink: 0; }
        .trabajador-nombre { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
        .trabajador-esp { font-size: 13px; color: var(--text2); margin-bottom: 10px; min-height: 18px; }
        .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; }
        .badge-activo { background: var(--green-soft); color: var(--green-dark); }
        .badge-inactivo { background: rgba(0,0,0,0.06); color: var(--muted); }

        .empty { text-align: center; padding: 60px 20px; background: var(--white); border: 1px solid var(--border); border-radius: 16px; }
        .empty-emoji { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .empty-sub { font-size: 14px; color: var(--muted); }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 20px; padding: 28px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 22px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .field input { width: 100%; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: white; -webkit-appearance: none; }
        .field input:focus { border-color: var(--blue-dark); }

        .foto-area { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .foto-preview { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); flex-shrink: 0; }
        .foto-preview-placeholder { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #B8D8F8, #D4C5F9); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: var(--blue-dark); flex-shrink: 0; border: 2px solid var(--border); }
        .btn-foto { padding: 8px 14px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; }
        .btn-foto:hover { border-color: var(--blue-dark); color: var(--blue-dark); }

        .modal-btns { display: flex; gap: 10px; margin-top: 22px; }
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-secondary { flex: 1; padding: 12px; background: transparent; color: var(--text2); border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
        .error-msg { background: rgba(251,207,232,0.3); color: #B5467A; padding: 10px; border-radius: 8px; font-size: 13px; margin-top: 10px; text-align: center; }

        @media (max-width: 1024px) { .equipo-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; } .hamburger { display: flex; }
          .main { margin-left: 0; } .topbar { padding: 12px 16px; } .content { padding: 16px; }
          .equipo-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) { .equipo-grid { grid-template-columns: 1fr; } }
      `}</style>

            <div className="page-header">
              <div>
                <div className="page-title">Mi equipo</div>
                <div className="page-sub">
                  {cargando ? 'Cargando...' : `${trabajadores.length} miembro${trabajadores.length !== 1 ? 's' : ''} · ${activos} activo${activos !== 1 ? 's' : ''}`}
                </div>
              </div>
              <button className="btn-nuevo" onClick={() => abrirModal()}>+ Añadir miembro</button>
            </div>

            {cargando ? (
              <div style={{textAlign:'center', padding:'60px', color:'var(--muted)', fontSize:'14px'}}>Cargando...</div>
            ) : trabajadores.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">👥</div>
                <div className="empty-title">Sin miembros en el equipo</div>
                <div className="empty-sub">Añade a los profesionales de tu negocio para asignarlos a reservas</div>
              </div>
            ) : (
              <div className="equipo-grid">
                {trabajadores.map(t => (
                  <div key={t.id} className={`trabajador-card ${!t.activo ? 'inactivo' : ''}`}>
                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => abrirModal(t)} title="Editar">✏️</button>
                      <button className="btn-icon" onClick={() => toggleActivo(t)} title={t.activo ? 'Desactivar' : 'Activar'}>
                        {t.activo ? '👁️' : '🙈'}
                      </button>
                      <button className="btn-icon" onClick={() => eliminar(t)} title="Eliminar">🗑️</button>
                    </div>

                    {t.foto_url
                      ? <img src={t.foto_url} alt={t.nombre} className="avatar" />
                      : <div className="avatar-placeholder">{iniciales(t.nombre)}</div>
                    }

                    <div className="trabajador-nombre">{t.nombre}</div>
                    <div className="trabajador-esp">{t.especialidad || '—'}</div>
                    {t.email && (
                      <div style={{fontSize:'12px', color:'var(--muted)', marginBottom:'8px', wordBreak:'break-all'}}>{t.email}</div>
                    )}
                    <span className={`badge ${t.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            )}

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-title">{editando ? 'Editar miembro' : 'Nuevo miembro'}</div>

            <div className="field">
              <label>Nombre *</label>
              <input
                type="text"
                placeholder="Ej: Ana López"
                value={form.nombre}
                onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Especialidad <span style={{fontWeight:400, color:'var(--muted)'}}>· opcional</span></label>
              <input
                type="text"
                placeholder="Ej: Colorista, Masajista, Esteticista..."
                value={form.especialidad}
                onChange={e => setForm(f => ({...f, especialidad: e.target.value}))}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Teléfono <span style={{fontWeight:400, color:'var(--muted)'}}>· opcional</span></label>
              <input
                type="tel"
                placeholder="Ej: +34 600 000 000"
                value={form.telefono}
                onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Email {!editando && <span style={{color:'#EF4444'}}>*</span>} {editando && <span style={{fontWeight:400, color:'var(--muted)'}}>· opcional al editar</span>}</label>
              <input
                type="email"
                placeholder="empleado@email.com"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                autoComplete="off"
              />
              {!editando && (
                <div style={{fontSize:'12px', color:'var(--muted)', marginTop:'5px'}}>
                  Se enviará una invitación a este correo para que cree su cuenta.
                </div>
              )}
            </div>

            {/* Foto */}
            <div style={{marginBottom:'14px'}}>
              <div style={{fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'8px'}}>
                Foto <span style={{fontWeight:400, color:'var(--muted)'}}>· opcional</span>
              </div>
              <div className="foto-area">
                {fotoPreview
                  ? <img src={fotoPreview} alt="Preview" className="foto-preview" />
                  : <div className="foto-preview-placeholder">
                      {form.nombre ? iniciales(form.nombre) : '👤'}
                    </div>
                }
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{display:'none'}}
                    onChange={onFotoChange}
                  />
                  <button className="btn-foto" onClick={() => fileRef.current?.click()}>
                    {fotoPreview ? '📷 Cambiar foto' : '📷 Subir foto'}
                  </button>
                  {fotoPreview && (
                    <button
                      className="btn-foto"
                      style={{marginTop:'6px', display:'block'}}
                      onClick={() => { setFotoPreview(null); setFotoArchivo(null); setForm(f => ({...f, foto_url: null})) }}
                    >
                      🗑️ Quitar foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="modal-btns">
              <button className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
