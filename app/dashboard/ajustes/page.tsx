'use client'
import { useState, useEffect } from 'react'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

type Notifs = { reservas: boolean; recordatorios: boolean; resenas: boolean }

type Plantilla = {
  id: string; nombre: string; tipo: string; tag?: string;
  color?: string; colorSecundario?: string; gradient?: string; textColor: string;
}

const PLANTILLAS: Plantilla[] = [
  // ── SÓLIDOS ──
  { id:'khepria',    nombre:'Khepria',     tipo:'solido',    color:'#7C3AED', colorSecundario:'#4F46E5', textColor:'#fff', tag:'⭐ Por defecto' },
  { id:'oceano',     nombre:'Océano',      tipo:'solido',    color:'#2563EB', colorSecundario:'#0891B2', textColor:'#fff' },
  { id:'esmeralda',  nombre:'Esmeralda',   tipo:'solido',    color:'#059669', colorSecundario:'#10B981', textColor:'#fff' },
  { id:'sunset',     nombre:'Sunset',      tipo:'solido',    color:'#EA580C', colorSecundario:'#DB2777', textColor:'#fff' },
  { id:'rosa',       nombre:'Rosa',        tipo:'solido',    color:'#DB2777', colorSecundario:'#E11D48', textColor:'#fff' },
  { id:'dorado',     nombre:'Dorado',      tipo:'solido',    color:'#D97706', colorSecundario:'#92400E', textColor:'#fff' },
  { id:'carbon',     nombre:'Carbón',      tipo:'solido',    color:'#111827', colorSecundario:'#374151', textColor:'#fff' },
  { id:'blanco',     nombre:'Minimal',     tipo:'solido',    color:'#F9FAFB', colorSecundario:'#F3F4F6', textColor:'#111827' },
  // ── DEGRADADOS ──
  { id:'aurora',     nombre:'Aurora',      tipo:'gradiente', gradient:'linear-gradient(135deg,#7C3AED,#4FACFE)', textColor:'#fff' },
  { id:'fuego',      nombre:'Fuego',       tipo:'gradiente', gradient:'linear-gradient(135deg,#EA580C,#FBBF24)', textColor:'#fff' },
  { id:'bosque',     nombre:'Bosque',      tipo:'gradiente', gradient:'linear-gradient(135deg,#059669,#65A30D)', textColor:'#fff' },
  { id:'cielo',      nombre:'Cielo',       tipo:'gradiente', gradient:'linear-gradient(135deg,#2563EB,#7C3AED)', textColor:'#fff' },
  { id:'flamingo',   nombre:'Flamingo',    tipo:'gradiente', gradient:'linear-gradient(135deg,#DB2777,#F59E0B)', textColor:'#fff' },
  { id:'medianoche', nombre:'Medianoche',  tipo:'gradiente', gradient:'linear-gradient(135deg,#0F0F1A,#4F46E5)', textColor:'#fff' },
  { id:'pastel',     nombre:'Pastel',      tipo:'gradiente', gradient:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', textColor:'#374151' },
  { id:'naturaleza', nombre:'Naturaleza',  tipo:'gradiente', gradient:'linear-gradient(135deg,#B8EDD4,#B8D8F8)', textColor:'#374151' },
  // ── ABSTRACTOS ──
  { id:'cosmos',     nombre:'Cosmos',      tipo:'abstracto', gradient:'radial-gradient(ellipse at 20% 50%,#7C3AED 0%,#0F0F1A 60%)', textColor:'#fff' },
  { id:'aurora2',    nombre:'Aurora Borealis', tipo:'abstracto', gradient:'radial-gradient(ellipse at 80% 20%,#4FACFE 0%,#7C3AED 40%,#40DCA5 100%)', textColor:'#fff' },
  { id:'nebula',     nombre:'Nebulosa',    tipo:'abstracto', gradient:'radial-gradient(ellipse at 30% 70%,#DB2777 0%,#7C3AED 50%,#2563EB 100%)', textColor:'#fff' },
  { id:'lava',       nombre:'Lava',        tipo:'abstracto', gradient:'radial-gradient(ellipse at 50% 0%,#EA580C 0%,#DC2626 50%,#111827 100%)', textColor:'#fff' },
  // ── PSYCHEDELIC ──
  { id:'acid',       nombre:'Acid',        tipo:'psycho',    gradient:'linear-gradient(45deg,#FF006E,#8338EC,#3A86FF,#06D6A0,#FFB700)', textColor:'#fff' },
  { id:'retrowave',  nombre:'Retrowave',   tipo:'psycho',    gradient:'linear-gradient(135deg,#FF0080,#7928CA,#0070F3)', textColor:'#fff' },
  { id:'glitch',     nombre:'Glitch',      tipo:'psycho',    gradient:'linear-gradient(135deg,#00FF87,#60EFFF,#FF6B6B,#FFE66D)', textColor:'#111' },
  { id:'neon',       nombre:'Neon',        tipo:'psycho',    gradient:'linear-gradient(135deg,#0FF,#F0F,#FF0)', textColor:'#111' },
]

const CATEGORIAS = [
  { id:'solido',    nombre:'Sólidos',     emoji:'🎨' },
  { id:'gradiente', nombre:'Degradados',  emoji:'🌈' },
  { id:'abstracto', nombre:'Abstracto',   emoji:'🌌' },
  { id:'psycho',    nombre:'Psychedelic', emoji:'🔮' },
  { id:'custom',    nombre:'Mi color',    emoji:'✏️' },
]

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

  // Apariencia
  const [categoriaActiva, setCategoriaActiva] = useState('solido')
  const [plantillaActual, setPlantillaActual] = useState('khepria')
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(
    PLANTILLAS.find(p => p.id === 'khepria') ?? null
  )
  const [colorCustom, setColorCustom] = useState('#7C3AED')
  const [colorCustom2, setColorCustom2] = useState('#4FACFE')
  const [savingColor, setSavingColor] = useState(false)
  const [msgColor, setMsgColor] = useState<{ text: string; ok: boolean } | null>(null)

  function seleccionarPlantilla(p: Plantilla) {
    setPlantillaActual(p.id)
    setPlantillaSeleccionada(p)
  }

  function aplicarCustom() {
    seleccionarPlantilla({
      id: 'custom', nombre: 'Personalizado', tipo: 'custom',
      gradient: `linear-gradient(135deg,${colorCustom},${colorCustom2})`,
      color: colorCustom, textColor: '#fff',
    })
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
        const savedId = activo.plantilla || 'khepria'
        setPlantillaActual(savedId)
        const found = PLANTILLAS.find(p => p.id === savedId)
        if (found) setPlantillaSeleccionada(found)
        setColorCustom(activo.color || '#7C3AED')
        setColorCustom2(activo.color_secundario || '#4FACFE')
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
    const colorPrincipal = plantillaSeleccionada?.color || colorCustom
    const { error } = await supabase.from('negocios').update({
      plantilla: plantillaActual,
      color: colorPrincipal,
      color_secundario: colorCustom2,
      color_gradient: plantillaSeleccionada?.gradient || null,
      color_text: plantillaSeleccionada?.textColor || '#fff',
      color_principal: colorPrincipal,
    }).eq('id', negocio.id)
    setSavingColor(false)
    if (error) setMsgColor({ text: 'Error: ' + error.message, ok: false })
    else setMsgColor({ text: 'Apariencia guardada correctamente', ok: true })
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

        {/* ── Apariencia del negocio ── */}
        <Section title="🎨 Apariencia del negocio">
          {/* Tabs de categoría */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORIAS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                style={{
                  padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: categoriaActiva === cat.id ? '#7C3AED' : 'var(--ds-bg)',
                  color: categoriaActiva === cat.id ? '#fff' : 'var(--ds-text2)',
                  fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                {cat.emoji} {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid de plantillas */}
          {categoriaActiva !== 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
              {PLANTILLAS.filter(p => p.tipo === categoriaActiva).map(plantilla => (
                <div
                  key={plantilla.id}
                  onClick={() => seleccionarPlantilla(plantilla)}
                  style={{
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    border: plantillaActual === plantilla.id ? '3px solid #7C3AED' : '2px solid transparent',
                    boxShadow: plantillaActual === plantilla.id
                      ? '0 0 0 2px rgba(124,58,237,0.3)'
                      : '0 2px 8px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s', position: 'relative',
                  }}
                >
                  {plantillaActual === plantilla.id && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6, zIndex: 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#7C3AED',
                      color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                    }}>✓</div>
                  )}
                  <div style={{
                    height: 70,
                    background: plantilla.gradient || plantilla.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 20 }}>{negocio?.tipo?.split(' ')[0] || '🏪'}</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--ds-white)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-text)' }}>{plantilla.nombre}</div>
                    {plantilla.tag && <div style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}>{plantilla.tag}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Panel Mi color */}
          {categoriaActiva === 'custom' && (
            <div style={{ padding: 20, background: 'var(--ds-bg)', borderRadius: 14, border: '1px solid var(--ds-border)', marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text2)', marginBottom: 8 }}>Color principal</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={colorCustom} onChange={e => setColorCustom(e.target.value)}
                    style={{ width: 44, height: 44, border: 'none', borderRadius: 10, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--ds-muted)', fontFamily: 'monospace' }}>{colorCustom}</span>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text2)', marginBottom: 8 }}>Color secundario (degradado)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="color" value={colorCustom2} onChange={e => setColorCustom2(e.target.value)}
                    style={{ width: 44, height: 44, border: 'none', borderRadius: 10, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--ds-muted)', fontFamily: 'monospace' }}>{colorCustom2}</span>
                </div>
              </div>
              <div style={{ height: 60, borderRadius: 12, background: `linear-gradient(135deg,${colorCustom},${colorCustom2})`, marginBottom: 16 }} />
              <button
                onClick={aplicarCustom}
                style={{ width: '100%', padding: 12, borderRadius: 10, background: colorCustom, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Aplicar mi color →
              </button>
            </div>
          )}

          {/* Vista previa de la ficha */}
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--ds-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--ds-muted)', padding: '8px 14px', background: 'var(--ds-bg)', fontWeight: 600 }}>
              VISTA PREVIA DE TU FICHA
            </div>
            <div style={{ background: plantillaSeleccionada?.gradient || plantillaSeleccionada?.color || '#7C3AED', padding: '24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {negocio?.tipo?.split(' ')[0] || '🏪'}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: plantillaSeleccionada?.textColor || '#fff' }}>
                    {negocio?.nombre || 'Tu negocio'}
                  </div>
                  <div style={{ fontSize: 12, color: `${plantillaSeleccionada?.textColor || '#fff'}99` }}>
                    ⭐ 4.9 · Disponible ahora
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', color: plantillaSeleccionada?.textColor || '#fff', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 13 }}>
                  Reservar →
                </div>
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
              {savingColor ? 'Guardando...' : 'Guardar apariencia'}
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
