'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'



export default function MiNegocio() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio] = useState<NegMin | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [apiError, setApiError] = useState('')
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [copiado,   setCopiado]   = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  // Importar desde otra app
  const [importModal, setImportModal] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importando, setImportando] = useState(false)
  const [importError, setImportError] = useState('')
  const [importData, setImportData] = useState<{
    nombre?: string; descripcion?: string; telefono?: string;
    direccion?: string; ciudad?: string; codigo_postal?: string;
    instagram?: string; whatsapp?: string; facebook?: string;
    servicios?: { nombre: string; precio: number | null; duracion: number | null }[];
    horarios?: { dia: string; abierto: boolean; hora_apertura: string; hora_cierre: string }[];
  } | null>(null)

  const [form, setForm] = useState({
    nombre: '', tipo: '', descripcion: '', telefono: '',
    direccion: '', ciudad: '', codigo_postal: '',
    instagram: '', whatsapp: '', facebook: '', fotos: [] as string[], logo_url: '',
    horas_cancelacion: 24 as number,
    confirmacion_automatica: true as boolean,
    mensaje_cancelacion: '',
    metodos_pago: ['efectivo'] as string[],
    visible: true as boolean,
    // Configuración de agenda
    intervalo_agenda: 15 as number,
    margen_servicio: 0 as number,
    max_reservas_simultaneas: 1 as number,
    antelacion_minima: 60 as number,
    antelacion_maxima: 43200 as number,
  })

  const fileRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: negActivo, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!negActivo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todosNegs)
      setNegocio(negActivo)
      const { data } = await db.from('negocios').select('*').eq('id', negActivo.id).single()
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
          logo_url: data.logo_url || '',
          horas_cancelacion: data.horas_cancelacion ?? 24,
          confirmacion_automatica: data.confirmacion_automatica ?? true,
          mensaje_cancelacion: data.mensaje_cancelacion || '',
          metodos_pago: data.metodos_pago || ['efectivo'],
          visible: data.visible ?? true,
          intervalo_agenda: data.intervalo_agenda ?? 15,
          margen_servicio: data.margen_servicio ?? 0,
          max_reservas_simultaneas: data.max_reservas_simultaneas ?? 1,
          antelacion_minima: data.antelacion_minima ?? 60,
          antelacion_maxima: data.antelacion_maxima ?? 43200,
        })
      }
      setCargando(false)
    })()
  }, [])

  async function geocodificar(direccion: string, ciudad: string): Promise<{ lat: number; lng: number } | null> {
    const query = [direccion, ciudad, 'España'].filter(Boolean).join(', ')
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || !query.trim()) return null
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=es&limit=1&language=es`
      )
      const data = await res.json()
      const coords = data?.features?.[0]?.center
      if (!coords) return null
      return { lng: coords[0], lat: coords[1] }
    } catch {
      return null
    }
  }

  async function guardar() {
    if (!negocioId) return
    setGuardando(true); setApiError('')

    // Geocodificar si hay dirección o ciudad
    let coords: { lat: number; lng: number } | null = null
    if (form.direccion || form.ciudad) {
      coords = await geocodificar(form.direccion, form.ciudad)
    }

    const { error } = await supabase
      .from('negocios')
      .update({
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
        logo_url: form.logo_url,
        horas_cancelacion: form.horas_cancelacion,
        confirmacion_automatica: form.confirmacion_automatica,
        mensaje_cancelacion: form.mensaje_cancelacion || null,
        metodos_pago: form.metodos_pago,
        visible: form.visible,
        intervalo_agenda: form.intervalo_agenda,
        margen_servicio: form.margen_servicio,
        max_reservas_simultaneas: form.max_reservas_simultaneas,
        antelacion_minima: form.antelacion_minima,
        antelacion_maxima: form.antelacion_maxima,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      })
      .eq('id', negocioId)
    if (error) {
      console.error('[mi-negocio] guardar:', error.message, error.details, error.hint)
      setApiError(error.message || 'Error al guardar')
      setGuardando(false)
      return
    }
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
      const { error: errFotos } = await supabase.from('negocios').update({ fotos: nuevasFotos }).eq('id', negocioId)
      if (errFotos) console.error('[mi-negocio] update fotos:', errFotos)
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
    const { error: uploadErr } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    if (uploadErr) {
      alert('Error al subir logo: ' + uploadErr.message)
      setSubiendo(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
    setForm(prev => ({ ...prev, logo_url: publicUrl }))
    const { error: errLogo } = await supabase.from('negocios').update({ logo_url: publicUrl }).eq('id', negocioId)
    if (errLogo) console.error('[mi-negocio] update logo:', errLogo)
    setSubiendo(false)
    if (logoRef.current) logoRef.current.value = ''
  }

  async function analizarImport() {
    if (!importUrl.trim()) return
    setImportLoading(true); setImportError(''); setImportData(null)
    try {
      const res = await fetch('/api/importar-negocio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const json = await res.json()
      if (json.error) { setImportError(json.error); setImportLoading(false); return }
      setImportData(json.data)
    } catch (e: unknown) {
      setImportError((e as Error).message)
    }
    setImportLoading(false)
  }

  async function aplicarImport() {
    if (!importData || !negocioId) return
    setImportando(true)

    // 1. Actualizar campos básicos en el form y en Supabase
    const camposBasicos = {
      nombre: importData.nombre || form.nombre,
      descripcion: importData.descripcion || form.descripcion,
      telefono: importData.telefono || form.telefono,
      direccion: importData.direccion || form.direccion,
      ciudad: importData.ciudad || form.ciudad,
      codigo_postal: importData.codigo_postal || form.codigo_postal,
      instagram: importData.instagram || form.instagram,
      whatsapp: importData.whatsapp || form.whatsapp,
      facebook: importData.facebook || form.facebook,
    }
    setForm(prev => ({ ...prev, ...camposBasicos }))
    await supabase.from('negocios').update(camposBasicos).eq('id', negocioId)

    // 2. Guardar servicios
    if (importData.servicios && importData.servicios.length > 0) {
      const nuevosServicios = importData.servicios.map(s => ({
        negocio_id: negocioId,
        nombre: s.nombre,
        precio: s.precio ?? 0,
        duracion: s.duracion ?? 30,
        iva: 21,
        activo: true,
      }))
      await supabase.from('servicios').insert(nuevosServicios)
    }

    // 3. Guardar horarios
    if (importData.horarios && importData.horarios.length > 0) {
      for (const h of importData.horarios) {
        await supabase.from('horarios').upsert({
          negocio_id: negocioId,
          dia: h.dia,
          abierto: h.abierto,
          hora_apertura: h.hora_apertura || '09:00',
          hora_cierre: h.hora_cierre || '18:00',
          hora_apertura2: null,
          hora_cierre2: null,
        }, { onConflict: 'negocio_id,dia' })
      }
    }

    setImportando(false)
    setImportModal(false)
    setImportData(null)
    setImportUrl('')
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  async function eliminarFoto(url: string) {
    const nuevasFotos = form.fotos.filter(f => f !== url)
    setForm({ ...form, fotos: nuevasFotos })
    const { error: errDelFoto } = await supabase.from('negocios').update({ fotos: nuevasFotos }).eq('id', negocioId)
    if (errDelFoto) console.error('[mi-negocio] update fotos (eliminar):', errDelFoto)
  }

  function abrirGPS() {
    const dir = encodeURIComponent(`${form.direccion}, ${form.ciudad}`)
    window.open(`https://maps.google.com/?q=${dir}`, '_blank')
  }


  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
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
        /* EMBED */
        .embed-box { background: #1E293B; border-radius: 12px; padding: 14px 16px; font-family: 'Courier New', monospace; font-size: 11.5px; color: #94A3B8; line-height: 1.7; white-space: pre-wrap; word-break: break-all; border: 1px solid rgba(255,255,255,0.06); }
        .btn-copy { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: none; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; }
        .btn-copy:hover { background: var(--blue-soft); color: var(--blue-dark); border-color: var(--blue-dark); }
        .btn-copy.copied { background: rgba(184,237,212,0.2); color: var(--green-dark); border-color: var(--green-dark); }

        /* POLÍTICA DE RESERVAS */
        .policy-opts { display: flex; gap: 8px; flex-wrap: wrap; }
        .policy-opt { padding: 9px 20px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 100px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; }
        .policy-opt:hover { border-color: var(--text); color: var(--text); }
        .policy-opt.active { background: var(--text); border-color: var(--text); color: white; }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-top: 1px solid var(--border); }
        .toggle-label { font-size: 14px; font-weight: 600; color: var(--text); }
        .toggle-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .toggle { position: relative; width: 44px; height: 26px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track { position: absolute; inset: 0; background: var(--border); border-radius: 100px; cursor: pointer; transition: background 0.2s; border: 1.5px solid rgba(0,0,0,0.1); }
        .toggle input:checked + .toggle-track { background: #111827; border-color: #111827; }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: white; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); pointer-events: none; }
        .toggle input:checked ~ .toggle-thumb { transform: translateX(18px); }
        .pago-opts { display: flex; flex-direction: column; gap: 10px; }
        .pago-opt { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; background: white; }
        .pago-opt.active { border-color: var(--blue-dark); background: var(--blue-soft); }
        .pago-opt-left { display: flex; align-items: center; gap: 10px; }
        .pago-opt-icon { font-size: 20px; }
        .pago-opt-name { font-size: 14px; font-weight: 600; color: var(--text); }
        .pago-opt-desc { font-size: 12px; color: var(--muted); }
        .pago-check { width: 20px; height: 20px; border-radius: 6px; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .pago-opt.active .pago-check { background: var(--blue-dark); border-color: var(--blue-dark); color: white; font-size: 12px; }

        /* IMPORT MODAL */
        .import-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .import-modal { background: white; border-radius: 20px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; padding: 28px; }
        .import-title { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
        .import-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; line-height: 1.5; }
        .import-url-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .import-url-input { flex: 1; padding: 11px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
        .import-url-input:focus { border-color: var(--blue-dark); }
        .btn-analizar { padding: 11px 20px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .btn-analizar:disabled { background: var(--muted); cursor: not-allowed; }
        .import-platforms { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .import-platform-tag { padding: 4px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 100px; font-size: 12px; color: var(--text2); font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .import-platform-tag:hover { background: var(--blue-soft); color: var(--blue-dark); border-color: var(--blue-dark); }
        .import-data-section { border: 1.5px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
        .import-data-header { padding: 12px 16px; background: var(--bg); font-size: 13px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 6px; }
        .import-field-row { padding: 10px 16px; border-top: 1px solid var(--border); display: grid; grid-template-columns: 110px 1fr; gap: 8px; align-items: start; }
        .import-field-label { font-size: 12px; font-weight: 600; color: var(--muted); padding-top: 2px; }
        .import-field-val { font-size: 13px; color: var(--text); line-height: 1.5; word-break: break-word; }
        .import-servicios-list { font-size: 12px; color: var(--text2); line-height: 2; }
        .import-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .btn-import-cancel { padding: 11px 20px; background: none; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; }
        .btn-import-apply { padding: 11px 24px; background: var(--blue-dark); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .btn-importar-abrir { display: flex; align-items: center; gap: 7px; padding: 9px 16px; background: none; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; margin-bottom: 16px; }
        .btn-importar-abrir:hover { background: var(--blue-soft); color: var(--blue-dark); border-color: var(--blue-dark); }

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
          .import-url-row { flex-direction: column; }
          .import-field-row { grid-template-columns: 90px 1fr; }
        }
      `}</style>

            <div className="page-title">Mi negocio</div>
            <div className="page-sub">Así te verán los clientes en la app</div>

            {negocioId && (
              <Link href={`/negocio/${negocioId}`} className="preview-link" target="_blank">
                👁️ Ver ficha pública de mi negocio →
              </Link>
            )}

            <button className="btn-importar-abrir" onClick={() => { setImportModal(true); setImportData(null); setImportError(''); setImportUrl('') }}>
              📥 Importar datos desde otra app
            </button>

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

                {/* ── CONFIGURACIÓN DE AGENDA ── */}
                <div className="section">
                  <div className="section-title">🗓️ Configuración de agenda</div>

                  {/* Intervalo entre citas */}
                  <div className="field" style={{marginBottom:'18px'}}>
                    <label style={{marginBottom:'10px',display:'block'}}>Intervalo entre citas</label>
                    <div className="policy-opts">
                      {([{v:10,l:'10 min'},{v:15,l:'15 min'},{v:20,l:'20 min'},{v:30,l:'30 min'}] as const).map(o=>(
                        <button key={o.v} className={`policy-opt ${form.intervalo_agenda===o.v?'active':''}`} onClick={()=>setForm({...form,intervalo_agenda:o.v})}>{o.l}</button>
                      ))}
                    </div>
                    <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'8px'}}>Cada cuánto tiempo se ofrecen nuevos huecos en la agenda.</p>
                  </div>

                  {/* Margen entre servicios */}
                  <div className="field" style={{marginBottom:'18px'}}>
                    <label style={{marginBottom:'10px',display:'block'}}>Tiempo de preparación entre servicios</label>
                    <div className="policy-opts">
                      {([{v:0,l:'Sin margen'},{v:5,l:'5 min'},{v:10,l:'10 min'},{v:15,l:'15 min'},{v:20,l:'20 min'}] as const).map(o=>(
                        <button key={o.v} className={`policy-opt ${form.margen_servicio===o.v?'active':''}`} onClick={()=>setForm({...form,margen_servicio:o.v})}>{o.l}</button>
                      ))}
                    </div>
                    <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'8px'}}>Tiempo extra reservado tras cada servicio para preparar el siguiente.</p>
                  </div>

                  {/* Máximo simultáneas */}
                  <div className="field" style={{marginBottom:'18px'}}>
                    <label>Máximo de reservas simultáneas</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.max_reservas_simultaneas}
                      onChange={e=>setForm({...form,max_reservas_simultaneas:Math.max(1,parseInt(e.target.value)||1)})}
                      style={{width:'120px'}}
                    />
                    <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'4px'}}>Número de citas que pueden coincidir al mismo tiempo (útil con varios trabajadores).</p>
                  </div>

                  {/* Antelación mínima */}
                  <div className="field" style={{marginBottom:'18px'}}>
                    <label style={{marginBottom:'10px',display:'block'}}>Antelación mínima para reservar</label>
                    <div className="policy-opts">
                      {([{v:60,l:'1h'},{v:120,l:'2h'},{v:360,l:'6h'},{v:720,l:'12h'},{v:1440,l:'24h'}] as const).map(o=>(
                        <button key={o.v} className={`policy-opt ${form.antelacion_minima===o.v?'active':''}`} onClick={()=>setForm({...form,antelacion_minima:o.v})}>{o.l}</button>
                      ))}
                    </div>
                    <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'8px'}}>Los clientes no podrán reservar con menos de {form.antelacion_minima<120?`${form.antelacion_minima} minutos`:form.antelacion_minima<1440?`${form.antelacion_minima/60} horas`:'24 horas'} de antelación.</p>
                  </div>

                  {/* Antelación máxima */}
                  <div className="field" style={{marginBottom:0}}>
                    <label style={{marginBottom:'10px',display:'block'}}>Antelación máxima para reservar</label>
                    <div className="policy-opts">
                      {([{v:10080,l:'1 semana'},{v:20160,l:'2 semanas'},{v:43200,l:'1 mes'},{v:129600,l:'3 meses'}] as const).map(o=>(
                        <button key={o.v} className={`policy-opt ${form.antelacion_maxima===o.v?'active':''}`} onClick={()=>setForm({...form,antelacion_maxima:o.v})}>{o.l}</button>
                      ))}
                    </div>
                    <p style={{fontSize:'12px',color:'var(--muted)',marginTop:'8px'}}>Los clientes solo podrán reservar dentro de este horizonte.</p>
                  </div>
                </div>

                {/* ── POLÍTICA DE RESERVAS ── */}
                <div className="section">
                  <div className="section-title">📋 Política de reservas</div>

                  <div className="field" style={{marginBottom:'18px'}}>
                    <label style={{marginBottom:'10px', display:'block'}}>Tiempo mínimo para cancelar</label>
                    <div className="policy-opts">
                      {([
                        { value: 1,  label: '1h' },
                        { value: 2,  label: '2h' },
                        { value: 6,  label: '6h' },
                        { value: 12, label: '12h' },
                        { value: 24, label: '24h' },
                        { value: 48, label: '48h' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          className={`policy-opt ${form.horas_cancelacion === opt.value ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, horas_cancelacion: opt.value })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p style={{fontSize:'12px', color:'var(--muted)', marginTop:'8px'}}>
                      Los clientes podrán cancelar hasta {form.horas_cancelacion === 1 ? '1 hora' : `${form.horas_cancelacion} horas`} antes de la cita.
                    </p>
                  </div>

                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Negocio visible para clientes</div>
                      <div className="toggle-sub">
                        {form.visible
                          ? 'Tu negocio aparece en el mapa y los clientes pueden reservar'
                          : 'Tu negocio está oculto — no aparece en el mapa ni acepta reservas'}
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={form.visible}
                        onChange={e => setForm({ ...form, visible: e.target.checked })}
                      />
                      <div className="toggle-track" style={form.visible ? { background: '#16A34A', borderColor: '#16A34A' } : {}} />
                      <div className="toggle-thumb" />
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div>
                      <div className="toggle-label">Confirmación automática</div>
                      <div className="toggle-sub">
                        {form.confirmacion_automatica
                          ? 'Las reservas se confirman al instante sin revisión manual'
                          : 'Debes aprobar cada reserva manualmente antes de confirmarla'}
                      </div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={form.confirmacion_automatica}
                        onChange={e => setForm({ ...form, confirmacion_automatica: e.target.checked })}
                      />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>

                  <div className="field" style={{marginTop:'18px', marginBottom:0}}>
                    <label>Mensaje al cancelar <span style={{fontWeight:400, color:'var(--muted)'}}>(opcional)</span></label>
                    <textarea
                      placeholder="Ej: Lamentamos que hayas tenido que cancelar. Si lo deseas puedes reservar de nuevo cuando quieras. ¡Te esperamos!"
                      value={form.mensaje_cancelacion}
                      onChange={e => setForm({ ...form, mensaje_cancelacion: e.target.value })}
                      style={{minHeight:'80px'}}
                    />
                    <p style={{fontSize:'12px', color:'var(--muted)', marginTop:'4px'}}>Este mensaje se mostrará al cliente cuando cancele una cita.</p>
                  </div>
                </div>

                {/* ── MÉTODOS DE PAGO ── */}
                <div className="section">
                  <div className="section-title">💳 Métodos de pago aceptados</div>
                  <div className="pago-opts">
                    {([
                      { id: 'pago_app',  icon: '📱', name: 'Pago por app',  desc: 'Los clientes pagan online al reservar' },
                      { id: 'efectivo',  icon: '💵', name: 'Efectivo',       desc: 'Pago en mano en el local' },
                      { id: 'datafono',  icon: '💳', name: 'Datáfono',       desc: 'Tarjeta de crédito o débito' },
                    ] as const).map(m => {
                      const activo = form.metodos_pago.includes(m.id)
                      return (
                        <div
                          key={m.id}
                          className={`pago-opt ${activo ? 'active' : ''}`}
                          onClick={() => setForm(prev => ({
                            ...prev,
                            metodos_pago: activo
                              ? prev.metodos_pago.filter(x => x !== m.id)
                              : [...prev.metodos_pago, m.id]
                          }))}
                        >
                          <div className="pago-opt-left">
                            <span className="pago-opt-icon">{m.icon}</span>
                            <div>
                              <div className="pago-opt-name">{m.name}</div>
                              <div className="pago-opt-desc">{m.desc}</div>
                            </div>
                          </div>
                          <div className="pago-check">{activo ? '✓' : ''}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── WIDGET EMBEBIBLE ── */}
                {negocioId && (
                  <div className="section">
                    <div className="section-title">🔗 Widget de reservas</div>
                    <p style={{fontSize:'13px', color:'var(--muted)', marginBottom:'14px', lineHeight:1.6}}>
                      Copia este código HTML y pégalo en cualquier página de tu web para añadir un botón de reservas directamente.
                    </p>
                    <div className="embed-box">{`<iframe
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://khepria.vercel.app'}/widget/${negocioId}"
  width="100%"
  height="600"
  frameborder="0"
  style="border:none; border-radius:12px; box-shadow:0 2px 16px rgba(0,0,0,0.08);"
  title="Reservar cita"
></iframe>`}</div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', flexWrap:'wrap'}}>
                      <button
                        className={`btn-copy ${copiado ? 'copied' : ''}`}
                        onClick={() => {
                          const code = `<iframe\n  src="${window.location.origin}/widget/${negocioId}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border:none; border-radius:12px; box-shadow:0 2px 16px rgba(0,0,0,0.08);"\n  title="Reservar cita"\n></iframe>`
                          navigator.clipboard.writeText(code).then(() => {
                            setCopiado(true)
                            setTimeout(() => setCopiado(false), 2500)
                          })
                        }}
                      >
                        {copiado ? '✓ Copiado' : '📋 Copiar código'}
                      </button>
                      <a
                        href={`/widget/${negocioId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{fontSize:'13px', fontWeight:600, color:'var(--blue-dark)', textDecoration:'none'}}
                      >
                        Ver preview →
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

      {/* IMPORTAR MODAL */}
      {importModal && (
        <div className="import-overlay" onClick={e => { if (e.target === e.currentTarget) setImportModal(false) }}>
          <div className="import-modal">
            <div className="import-title">📥 Importar desde otra app</div>
            <div className="import-sub">Pega la URL de tu negocio en Fresha, Treatwell, Booksy, Google Maps o Instagram. Khepria extraerá los datos automáticamente.</div>

            <div style={{marginBottom:'10px'}}>
              <div style={{fontSize:'12px', fontWeight:600, color:'var(--muted)', marginBottom:'6px'}}>Plataformas compatibles:</div>
              <div className="import-platforms">
                {['fresha.com', 'treatwell.es', 'booksy.com', 'google.com/maps', 'instagram.com'].map(p => (
                  <span key={p} className="import-platform-tag" onClick={() => setImportUrl('https://' + p + '/')}>{p}</span>
                ))}
              </div>
            </div>

            <div className="import-url-row">
              <input
                className="import-url-input"
                type="url"
                placeholder="https://www.fresha.com/providers/tu-negocio-..."
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analizarImport()}
              />
              <button className="btn-analizar" onClick={analizarImport} disabled={importLoading || !importUrl.trim()}>
                {importLoading ? '⏳ Analizando...' : '🔍 Analizar'}
              </button>
            </div>

            {importError && (
              <div style={{padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:'10px', fontSize:'13px', color:'#DC2626', marginBottom:'16px'}}>
                {importError}
              </div>
            )}

            {importData && (
              <>
                {/* Datos básicos */}
                <div className="import-data-section" style={{marginBottom:'12px'}}>
                  <div className="import-data-header">📋 Información básica</div>
                  {[
                    { label: 'Nombre', val: importData.nombre },
                    { label: 'Descripción', val: importData.descripcion },
                    { label: 'Teléfono', val: importData.telefono },
                    { label: 'Dirección', val: importData.direccion },
                    { label: 'Ciudad', val: importData.ciudad },
                    { label: 'Código postal', val: importData.codigo_postal },
                    { label: 'Instagram', val: importData.instagram },
                    { label: 'WhatsApp', val: importData.whatsapp },
                    { label: 'Facebook', val: importData.facebook },
                  ].filter(f => f.val).map(f => (
                    <div key={f.label} className="import-field-row">
                      <span className="import-field-label">{f.label}</span>
                      <span className="import-field-val">{f.val}</span>
                    </div>
                  ))}
                </div>

                {/* Servicios */}
                {importData.servicios && importData.servicios.length > 0 && (
                  <div className="import-data-section" style={{marginBottom:'12px'}}>
                    <div className="import-data-header">🔧 Servicios ({importData.servicios.length})</div>
                    <div style={{padding:'0 16px'}}>
                      <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
                        <thead>
                          <tr style={{borderBottom:'1px solid var(--border)'}}>
                            <th style={{textAlign:'left', padding:'8px 0', color:'var(--muted)', fontWeight:600, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px'}}>Servicio</th>
                            <th style={{textAlign:'right', padding:'8px 0', color:'var(--muted)', fontWeight:600, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px'}}>Precio</th>
                            <th style={{textAlign:'right', padding:'8px 0', color:'var(--muted)', fontWeight:600, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px'}}>Duración</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importData.servicios.map((s, i) => (
                            <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                              <td style={{padding:'8px 0', color:'var(--text)', fontWeight:500}}>{s.nombre}</td>
                              <td style={{padding:'8px 0', textAlign:'right', color:'var(--text)'}}>{s.precio != null ? `${s.precio}€` : '—'}</td>
                              <td style={{padding:'8px 0', textAlign:'right', color:'var(--muted)'}}>{s.duracion != null ? `${s.duracion} min` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Horarios */}
                {importData.horarios && importData.horarios.length > 0 && (
                  <div className="import-data-section" style={{marginBottom:'12px'}}>
                    <div className="import-data-header">⏰ Horarios ({importData.horarios.length} días)</div>
                    <div style={{padding:'0 16px'}}>
                      {importData.horarios.map((h, i) => (
                        <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i < importData.horarios!.length - 1 ? '1px solid var(--border)' : 'none', fontSize:'13px'}}>
                          <span style={{fontWeight:600, color:'var(--text)', textTransform:'capitalize'}}>{h.dia}</span>
                          <span style={{color: h.abierto ? 'var(--text)' : 'var(--muted)'}}>
                            {h.abierto ? `${h.hora_apertura} – ${h.hora_cierre}` : 'Cerrado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p style={{fontSize:'12px', color:'var(--muted)', marginBottom:'14px', lineHeight:1.5}}>
                  Se importará toda la información básica, servicios y horarios. Los servicios se añadirán a los existentes.
                </p>
                <div className="import-actions">
                  <button className="btn-import-cancel" onClick={() => setImportModal(false)}>Cancelar</button>
                  <button className="btn-import-apply" onClick={aplicarImport} disabled={importando}>
                    {importando ? '⏳ Importando...' : '✓ Confirmar e importar'}
                  </button>
                </div>
              </>
            )}

            {!importData && (
              <div className="import-actions">
                <button className="btn-import-cancel" onClick={() => setImportModal(false)}>Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}