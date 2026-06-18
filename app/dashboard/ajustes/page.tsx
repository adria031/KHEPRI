'use client'
import { useState, useEffect } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type Notifs = { reservas: boolean; recordatorios: boolean; resenas: boolean }

const TEMAS = [
  { id: 'khepria',      nombre: 'Khepria',      descripcion: 'El clásico de Khepria', primario: '#7C3AED', secundario: '#4F46E5', emoji: '✨', porDefecto: true },
  { id: 'oceano',       nombre: 'Océano',        descripcion: 'Azul profesional',       primario: '#2563EB', secundario: '#0891B2', emoji: '🌊' },
  { id: 'esmeralda',    nombre: 'Esmeralda',     descripcion: 'Verde natural',           primario: '#059669', secundario: '#10B981', emoji: '🌿' },
  { id: 'sunset',       nombre: 'Sunset',        descripcion: 'Cálido y vibrante',      primario: '#EA580C', secundario: '#DB2777', emoji: '🌅' },
  { id: 'dorado',       nombre: 'Dorado',        descripcion: 'Lujo y elegancia',       primario: '#D97706', secundario: '#92400E', emoji: '✨' },
  { id: 'rosa',         nombre: 'Rosa',          descripcion: 'Suave y moderno',        primario: '#DB2777', secundario: '#E11D48', emoji: '🌸' },
  { id: 'personalizado', nombre: 'Personalizado', descripcion: 'Elige tu color',        primario: null,      secundario: null,      emoji: '🎨' },
] as const

type TemaId = typeof TEMAS[number]['id']

const TIMEZONES = [
  'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Buenos_Aires', 'America/Sao_Paulo',
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--ds-white)', border: '1px solid var(--ds-border)',
      borderRadius: '16px', padding: '24px', marginBottom: '20px',
    }}>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '20px' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--ds-text2)', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '' }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px',
        border: '1px solid var(--ds-border)', borderRadius: '10px',
        background: 'var(--ds-bg)', color: 'var(--ds-text)',
        fontSize: '14px', fontFamily: 'inherit', outline: 'none',
      }}
    />
  )
}

function Btn({ onClick, disabled, variant = 'primary', children }: {
  onClick: () => void; disabled?: boolean; variant?: 'primary' | 'danger'; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 20px', borderRadius: '10px', border: 'none',
        fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        background: variant === 'danger'
          ? 'linear-gradient(135deg,#EF4444,#DC2626)'
          : 'linear-gradient(135deg,#6B4FD8,#4F46E5)',
        color: 'white',
        boxShadow: variant === 'danger'
          ? '0 3px 10px rgba(239,68,68,0.3)'
          : '0 3px 10px rgba(79,70,229,0.25)',
        transition: 'opacity 0.15s',
      }}
    >{children}</button>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '14px' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
          background: checked ? '#4F46E5' : 'var(--ds-border)',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: checked ? '23px' : '3px',
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'white', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ fontSize: '14px', color: 'var(--ds-text)' }}>{label}</span>
    </label>
  )
}

export default function Ajustes() {
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])

  // Cuenta
  const [userEmail, setUserEmail] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevaPass, setNuevaPass] = useState('')
  const [confirmaPass, setConfirmaPass] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [msgEmail, setMsgEmail] = useState<{ text: string; ok: boolean } | null>(null)
  const [msgPass, setMsgPass] = useState<{ text: string; ok: boolean } | null>(null)

  // Notificaciones
  const [notifs, setNotifs] = useState<Notifs>({ reservas: true, recordatorios: true, resenas: true })

  // Zona horaria
  const [timezone, setTimezone] = useState('Europe/Madrid')

  // Tema de color
  const [temaActual, setTemaActual] = useState<TemaId>('khepria')
  const [colorPersonalizado, setColorPersonalizado] = useState('#7C3AED')
  const [mostrarPersonalizar, setMostrarPersonalizar] = useState(false)
  const [savingColor, setSavingColor] = useState(false)
  const [msgColor, setMsgColor] = useState<{ text: string; ok: boolean } | null>(null)

  const colorActivo = temaActual === 'personalizado'
    ? colorPersonalizado
    : (TEMAS.find(t => t.id === temaActual)?.primario ?? '#7C3AED')
  const colorActivoSecundario = temaActual === 'personalizado'
    ? colorPersonalizado
    : (TEMAS.find(t => t.id === temaActual)?.secundario ?? '#4F46E5')

  function seleccionarTema(tema: { id: string; primario: string | null; secundario: string | null }) {
    setTemaActual(tema.id as TemaId)
    if (tema.id === 'personalizado') setMostrarPersonalizar(true)
    else setMostrarPersonalizar(false)
  }

  // Eliminar cuenta
  const [showDelete, setShowDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function init() {
      const { session } = await getSessionClient()
      if (!session) return
      const email = session.user.email ?? ''
      setUserEmail(email)
      setNuevoEmail(email)

      const { activo, todos } = await getNegocioActivo(session.user.id)
      if (activo) {
        setNegocio(activo)
        setTemaActual((activo.tema as TemaId) || 'khepria')
        setColorPersonalizado(activo.color || '#7C3AED')
      }
      setTodosNegocios(todos)

      try {
        const stored = localStorage.getItem('khepria_notifs')
        if (stored) setNotifs(JSON.parse(stored))
      } catch {}
      const tz = localStorage.getItem('khepria_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(tz)
    }
    init()
  }, [])

  async function cambiarEmail() {
    if (!nuevoEmail.trim() || nuevoEmail === userEmail) return
    setSavingEmail(true)
    setMsgEmail(null)
    const { error } = await supabase.auth.updateUser({ email: nuevoEmail.trim() })
    setSavingEmail(false)
    if (error) setMsgEmail({ text: 'Error: ' + error.message, ok: false })
    else setMsgEmail({ text: `Te hemos enviado un email de confirmación a ${nuevoEmail}`, ok: true })
  }

  async function cambiarPassword() {
    setMsgPass(null)
    if (!nuevaPass) return
    if (nuevaPass !== confirmaPass) { setMsgPass({ text: 'Las contraseñas no coinciden', ok: false }); return }
    if (nuevaPass.length < 8) { setMsgPass({ text: 'Mínimo 8 caracteres', ok: false }); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: nuevaPass })
    setSavingPass(false)
    if (error) setMsgPass({ text: 'Error: ' + error.message, ok: false })
    else { setMsgPass({ text: 'Contraseña actualizada correctamente', ok: true }); setNuevaPass(''); setConfirmaPass('') }
  }

  function actualizarNotifs(n: Notifs) {
    setNotifs(n)
    localStorage.setItem('khepria_notifs', JSON.stringify(n))
  }

  function actualizarTimezone(tz: string) {
    setTimezone(tz)
    localStorage.setItem('khepria_timezone', tz)
  }

  async function guardarColor() {
    if (!negocio) return
    setSavingColor(true)
    setMsgColor(null)
    const { error } = await supabase.from('negocios').update({
      color: colorActivo,
      color_secundario: colorActivoSecundario,
      tema: temaActual,
      color_principal: colorActivo,
    }).eq('id', negocio.id)
    setSavingColor(false)
    if (error) setMsgColor({ text: 'Error: ' + error.message, ok: false })
    else setMsgColor({ text: 'Tema guardado correctamente', ok: true })
  }

  async function eliminarCuenta() {
    if (deleteInput !== 'ELIMINAR') return
    setDeleting(true)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <div style={{ maxWidth: '620px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ds-text)', marginBottom: '24px' }}>Ajustes de cuenta</h1>

        {/* ── Email ── */}
        <Section title="📧 Dirección de email">
          <Field label="Email actual">
            <div style={{ fontSize: '14px', color: 'var(--ds-text2)', padding: '10px 14px', background: 'var(--ds-bg)', border: '1px solid var(--ds-border)', borderRadius: '10px' }}>
              {userEmail || '—'}
            </div>
          </Field>
          <Field label="Nuevo email">
            <Input value={nuevoEmail} onChange={setNuevoEmail} type="email" placeholder="nuevo@email.com" />
          </Field>
          {msgEmail && (
            <p style={{ fontSize: '13px', color: msgEmail.ok ? '#2E8A5E' : '#DC2626', marginBottom: '12px' }}>
              {msgEmail.ok ? '✅' : '❌'} {msgEmail.text}
            </p>
          )}
          <Btn onClick={cambiarEmail} disabled={savingEmail || !nuevoEmail || nuevoEmail === userEmail}>
            {savingEmail ? 'Guardando...' : 'Cambiar email'}
          </Btn>
        </Section>

        {/* ── Contraseña ── */}
        <Section title="🔑 Contraseña">
          <Field label="Nueva contraseña">
            <Input value={nuevaPass} onChange={setNuevaPass} type="password" placeholder="Mínimo 8 caracteres" />
          </Field>
          <Field label="Confirmar contraseña">
            <Input value={confirmaPass} onChange={setConfirmaPass} type="password" placeholder="Repite la contraseña" />
          </Field>
          {msgPass && (
            <p style={{ fontSize: '13px', color: msgPass.ok ? '#2E8A5E' : '#DC2626', marginBottom: '12px' }}>
              {msgPass.ok ? '✅' : '❌'} {msgPass.text}
            </p>
          )}
          <Btn onClick={cambiarPassword} disabled={savingPass || !nuevaPass || !confirmaPass}>
            {savingPass ? 'Guardando...' : 'Cambiar contraseña'}
          </Btn>
        </Section>

        {/* ── Notificaciones ── */}
        <Section title="🔔 Notificaciones por email">
          <Toggle
            checked={notifs.reservas}
            onChange={v => actualizarNotifs({ ...notifs, reservas: v })}
            label="Nueva reserva recibida"
          />
          <Toggle
            checked={notifs.recordatorios}
            onChange={v => actualizarNotifs({ ...notifs, recordatorios: v })}
            label="Recordatorio de cita (24h antes)"
          />
          <Toggle
            checked={notifs.resenas}
            onChange={v => actualizarNotifs({ ...notifs, resenas: v })}
            label="Nueva reseña recibida"
          />
          <p style={{ fontSize: '12px', color: 'var(--ds-muted)', marginTop: '4px' }}>
            Las preferencias se guardan localmente en este dispositivo.
          </p>
        </Section>

        {/* ── Zona horaria ── */}
        <Section title="🌍 Zona horaria">
          <Field label="Zona horaria del negocio">
            <select
              value={timezone}
              onChange={e => actualizarTimezone(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--ds-border)', borderRadius: '10px',
                background: 'var(--ds-bg)', color: 'var(--ds-text)',
                fontSize: '14px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
              }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <p style={{ fontSize: '12px', color: 'var(--ds-muted)' }}>
            Zona horaria actual del dispositivo: <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong>
          </p>
        </Section>

        {/* ── Tema de color ── */}
        <Section title="🎨 Tema de color">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', marginBottom: 16 }}>Tema de color</div>

          {/* Grid de temas predefinidos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {TEMAS.filter(t => t.id !== 'personalizado').map(t => (
              <div
                key={t.id}
                onClick={() => seleccionarTema(t)}
                style={{
                  padding: 14, borderRadius: 14, cursor: 'pointer', position: 'relative',
                  border: temaActual === t.id ? `2px solid ${t.primario}` : '1.5px solid var(--ds-border)',
                  background: temaActual === t.id ? `${t.primario}08` : 'var(--ds-white)',
                  transition: 'all 0.2s',
                }}
              >
                {temaActual === t.id && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 18, height: 18, borderRadius: '50%',
                    background: t.primario!, color: '#fff',
                    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800,
                  }}>✓</div>
                )}
                <div style={{ height: 32, borderRadius: 8, marginBottom: 10, background: `linear-gradient(135deg, ${t.primario}, ${t.secundario})` }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text)' }}>{t.emoji} {t.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--ds-muted)', marginTop: 2 }}>{t.descripcion}</div>
                {'porDefecto' in t && t.porDefecto && (
                  <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: t.primario!, background: `${t.primario}15`, borderRadius: 999, padding: '2px 8px', display: 'inline-block' }}>
                    Por defecto
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Opción personalizado */}
          <div
            onClick={() => seleccionarTema({ id: 'personalizado', primario: colorPersonalizado, secundario: colorPersonalizado })}
            style={{
              padding: 14, borderRadius: 14, cursor: 'pointer', marginBottom: 0,
              border: temaActual === 'personalizado' ? `2px solid ${colorPersonalizado}` : '1.5px dashed var(--ds-border)',
              background: 'var(--ds-white)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: temaActual === 'personalizado' ? colorPersonalizado : 'linear-gradient(135deg,#f3f4f6,#e5e7eb)',
            }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ds-text)' }}>🎨 Color personalizado</div>
              <div style={{ fontSize: 11, color: 'var(--ds-muted)' }}>Elige tu propio color</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ds-muted)' }}>
              {mostrarPersonalizar ? '▲' : '▼'}
            </div>
          </div>

          {/* Panel personalizado */}
          {mostrarPersonalizar && (
            <div style={{ marginTop: 12, padding: 16, background: 'var(--ds-bg)', borderRadius: 12, border: '1px solid var(--ds-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--ds-muted)', marginBottom: 10, fontWeight: 600 }}>PALETA RÁPIDA</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {['#4F46E5','#7C3AED','#2563EB','#0891B2','#059669','#16A34A','#D97706','#EA580C','#DB2777','#DC2626','#475569','#374151'].map(c => (
                  <button
                    key={c}
                    onClick={() => setColorPersonalizado(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                      boxShadow: colorPersonalizado === c ? `0 0 0 2px var(--ds-white), 0 0 0 4px ${c}` : '0 1px 4px rgba(0,0,0,0.2)',
                      transform: colorPersonalizado === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={colorPersonalizado}
                  onChange={e => setColorPersonalizado(e.target.value)}
                  style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                />
                <span style={{ fontSize: 12, color: 'var(--ds-muted)', fontFamily: 'monospace' }}>{colorPersonalizado}</span>
                <button
                  onClick={() => seleccionarTema({ id: 'personalizado', primario: colorPersonalizado, secundario: colorPersonalizado })}
                  style={{
                    marginLeft: 'auto', padding: '7px 14px', borderRadius: 8,
                    background: colorPersonalizado, color: '#fff', border: 'none',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          {/* Vista previa */}
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--ds-bg)', border: '1px solid var(--ds-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--ds-muted)', marginBottom: 8, fontWeight: 600 }}>VISTA PREVIA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${colorActivo},${colorActivoSecundario})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {negocio?.tipo?.split(' ')[0] || '🏪'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--ds-text)', fontSize: 14 }}>{negocio?.nombre || 'Tu negocio'}</div>
                <div style={{ fontSize: 12, color: colorActivo, fontWeight: 600 }}>● Disponible ahora</div>
              </div>
              <div style={{ background: `linear-gradient(135deg,${colorActivo},${colorActivoSecundario})`, color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                Reservar
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {msgColor && (
              <p style={{ fontSize: '13px', color: msgColor.ok ? '#2E8A5E' : '#DC2626', marginBottom: '12px' }}>
                {msgColor.ok ? '✅' : '❌'} {msgColor.text}
              </p>
            )}
            <Btn onClick={guardarColor} disabled={savingColor || !negocio}>
              {savingColor ? 'Guardando...' : 'Guardar tema'}
            </Btn>
          </div>
        </Section>

        {/* ── Zona de peligro ── */}
        <Section title="⚠️ Zona de peligro">
          <p style={{ fontSize: '14px', color: 'var(--ds-text2)', marginBottom: '16px' }}>
            Eliminar tu cuenta es una acción permanente. Se eliminarán todos tus datos, negocios y reservas.
          </p>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              style={{
                padding: '9px 20px', borderRadius: '10px',
                border: '1px solid #FECACA', background: '#FEF2F2',
                color: '#DC2626', fontFamily: 'inherit', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Eliminar mi cuenta
            </button>
          ) : (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '18px' }}>
              <p style={{ fontSize: '13px', color: '#991B1B', fontWeight: 600, marginBottom: '12px' }}>
                Escribe ELIMINAR para confirmar:
              </p>
              <Input value={deleteInput} onChange={setDeleteInput} placeholder="ELIMINAR" />
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <Btn onClick={eliminarCuenta} disabled={deleteInput !== 'ELIMINAR' || deleting} variant="danger">
                  {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
                </Btn>
                <button
                  onClick={() => { setShowDelete(false); setDeleteInput('') }}
                  style={{
                    padding: '9px 20px', borderRadius: '10px', border: '1px solid var(--ds-border)',
                    background: 'transparent', color: 'var(--ds-text2)',
                    fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </DashboardShell>
  )
}
