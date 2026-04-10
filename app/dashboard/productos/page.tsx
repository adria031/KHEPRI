'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getSessionClient } from '../../lib/supabase'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { dbMutation } from '../../lib/dbApi'
import { NegocioSelector } from '../NegocioSelector'

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
  { icon: '💰', label: 'Caja', href: '/dashboard/caja' },
]

const IVA_OPTS = [21, 10, 4, 0]
const STOCK_ALERTA = 5

type Producto = {
  id: string
  negocio_id: string
  nombre: string
  descripcion: string | null
  precio: number
  iva: number
  stock: number
  foto_url: string | null
  activo: boolean
  created_at: string
}

type FormData = {
  nombre: string
  descripcion: string
  precio: string
  iva: number
  stock: string
  foto_url: string | null
}

const emptyForm = (): FormData => ({
  nombre: '', descripcion: '', precio: '', iva: 21, stock: '0', foto_url: null,
})

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Productos() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)

  // Modal
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm())
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState<Partial<FormData>>({})
  const [apiError, setApiError] = useState('')

  // Foto
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  // Eliminar
  const [confirmDelete, setConfirmDelete] = useState<Producto | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Filtro
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos' | 'stock'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const cargarProductos = useCallback(async (nid: string) => {
    const { db } = await getSessionClient()
    const { data } = await db
      .from('productos')
      .select('*')
      .eq('negocio_id', nid)
      .order('created_at', { ascending: false })
    if (data) setProductos(data)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { session } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const user = session.user
      const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id, session.access_token)
      if (!neg) { setCargando(false); return }
      setTodosNegocios(todosNegs)
      setNegocioId(neg.id)
      await cargarProductos(neg.id)
      setCargando(false)
    })()
  }, [cargarProductos])

  function abrirAdd() {
    setEditando(null)
    setForm(emptyForm())
    setFotoFile(null)
    setFotoPreview(null)
    setErrores({})
    setModal('add')
  }

  function abrirEdit(p: Producto) {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: String(p.precio),
      iva: p.iva,
      stock: String(p.stock),
      foto_url: p.foto_url,
    })
    setFotoFile(null)
    setFotoPreview(p.foto_url)
    setErrores({})
    setModal('edit')
  }

  function cerrarModal() {
    setModal(null)
    setEditando(null)
    setFotoFile(null)
    setFotoPreview(null)
  }

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function subirFoto(file: File, productoId: string): Promise<string | null> {
    if (!negocioId) return null
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `productos/${negocioId}/${productoId}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true })
    setSubiendoFoto(false)
    if (error) return null
    const { data } = supabase.storage.from('fotos').getPublicUrl(path)
    return data.publicUrl
  }

  function validar(): boolean {
    const e: Partial<FormData> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    const precio = parseFloat(form.precio)
    if (isNaN(precio) || precio < 0) e.precio = 'Precio inválido'
    const stock = parseInt(form.stock)
    if (isNaN(stock) || stock < 0) e.stock = 'Stock inválido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!negocioId || !validar()) return
    setGuardando(true); setApiError('')

    const precio = parseFloat(form.precio)
    const stock = parseInt(form.stock)

    if (modal === 'add') {
      const { data: nuevo, error } = await dbMutation({ op: 'insert', table: 'productos', negocioId: negocioId!, data: {
        negocio_id: negocioId, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null,
        precio, iva: form.iva, stock, foto_url: null, activo: true,
      }})
      if (error || !nuevo) { setApiError(error || 'No se pudo guardar.'); setGuardando(false); return }
      const prod = nuevo as Producto
      let foto_url: string | null = null
      if (fotoFile) foto_url = await subirFoto(fotoFile, prod.id)
      if (foto_url) {
        await dbMutation({ op: 'update', table: 'productos', id: prod.id, negocioId: negocioId!, data: { foto_url } })
      }
      setProductos(prev => [{ ...prod, foto_url }, ...prev])
    } else if (modal === 'edit' && editando) {
      let foto_url = form.foto_url
      if (fotoFile) foto_url = await subirFoto(fotoFile, editando.id)
      const { error } = await dbMutation({ op: 'update', table: 'productos', id: editando.id, negocioId: negocioId!, data: {
        nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null,
        precio, iva: form.iva, stock, foto_url,
      }})
      if (error) { setApiError(error); setGuardando(false); return }
      setProductos(prev => prev.map(p => p.id === editando.id
        ? { ...p, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, precio, iva: form.iva, stock, foto_url }
        : p
      ))
    }

    setGuardando(false)
    cerrarModal()
  }

  async function toggleActivo(p: Producto) {
    const { error } = await dbMutation({ op: 'update', table: 'productos', id: p.id, negocioId: negocioId!, data: { activo: !p.activo } })
    if (!error) setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: !p.activo } : x))
  }

  async function updateStock(p: Producto, delta: number) {
    const nuevo = Math.max(0, p.stock + delta)
    const { error } = await dbMutation({ op: 'update', table: 'productos', id: p.id, negocioId: negocioId!, data: { stock: nuevo } })
    if (!error) setProductos(prev => prev.map(x => x.id === p.id ? { ...x, stock: nuevo } : x))
  }

  async function eliminar() {
    if (!confirmDelete) return
    setEliminando(true)
    await supabase.from('productos').delete().eq('id', confirmDelete.id)
    setProductos(prev => prev.filter(p => p.id !== confirmDelete.id))
    setEliminando(false)
    setConfirmDelete(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const productosFiltrados = productos.filter(p => {
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    if (!matchBusq) return false
    if (filtro === 'activos') return p.activo
    if (filtro === 'inactivos') return !p.activo
    if (filtro === 'stock') return p.stock < STOCK_ALERTA
    return true
  })

  const stockBajo = productos.filter(p => p.activo && p.stock < STOCK_ALERTA).length

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #F7F9FC; --white: #FFFFFF;
          --blue: #B8D8F8; --blue-dark: #1D4ED8; --blue-soft: rgba(184,216,248,0.2);
          --lila: #D4C5F9; --lila-dark: #6B4FD8;
          --green: #B8EDD4; --green-dark: #2E8A5E;
          --yellow: #FDE9A2; --yellow-dark: #92400E;
          --red: #FEE2E2; --red-dark: #DC2626;
          --text: #111827; --text2: #4B5563; --muted: #9CA3AF; --border: rgba(0,0,0,0.08);
        }
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
        .logout-btn:hover { background: var(--red); color: var(--red-dark); border-color: #FCA5A5; }
        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 10px; margin: -10px; }
        .content { padding: 24px 28px; flex: 1; }

        /* Controles */
        .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 1; min-width: 180px; }
        .search-input { width: 100%; padding: 9px 12px 9px 36px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; background: var(--white); }
        .search-input:focus { border-color: var(--blue-dark); }
        .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 14px; pointer-events: none; }
        .filtro-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .filtro-btn { padding: 7px 14px; border-radius: 100px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 12px; font-weight: 600; color: var(--muted); cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .filtro-btn.active { background: var(--text); border-color: var(--text); color: white; }
        .filtro-btn.stock-alert { border-color: #FCA5A5; color: var(--red-dark); }
        .filtro-btn.stock-alert.active { background: var(--red-dark); border-color: var(--red-dark); color: white; }
        .btn-add { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .btn-add:hover { background: #374151; }

        /* Alerta stock */
        .alerta-stock { display: flex; align-items: center; gap: 10px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--yellow-dark); font-weight: 600; }

        /* Stats row */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; }
        .stat-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .stat-val { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }

        /* Grid productos */
        .productos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .prod-card { background: var(--white); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; transition: box-shadow 0.2s; position: relative; }
        .prod-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .prod-card.inactivo { opacity: 0.6; }
        .prod-foto { width: 100%; height: 140px; object-fit: cover; background: var(--bg); display: flex; align-items: center; justify-content: center; font-size: 48px; flex-shrink: 0; }
        .prod-foto img { width: 100%; height: 100%; object-fit: cover; }
        .prod-body { padding: 14px; }
        .prod-nombre { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prod-desc { font-size: 12px; color: var(--muted); margin-bottom: 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 34px; }
        .prod-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .prod-precio { font-size: 16px; font-weight: 800; color: var(--text); }
        .prod-iva { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 100px; background: var(--lila); color: var(--lila-dark); }
        .stock-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .stock-label { font-size: 12px; color: var(--muted); font-weight: 600; flex: 1; }
        .stock-val { font-size: 13px; font-weight: 800; }
        .stock-val.ok { color: var(--green-dark); }
        .stock-val.low { color: var(--red-dark); }
        .stock-badge-low { font-size: 10px; font-weight: 700; background: var(--red); color: var(--red-dark); padding: 2px 7px; border-radius: 100px; }
        .stock-btns { display: flex; gap: 4px; }
        .stock-btn { width: 26px; height: 26px; border-radius: 7px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 15px; font-weight: 700; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; }
        .stock-btn:hover { background: var(--bg); }
        .prod-actions { display: flex; gap: 6px; }
        .prod-btn { flex: 1; padding: 8px; border-radius: 9px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 12px; font-weight: 700; color: var(--text2); cursor: pointer; text-align: center; transition: all 0.15s; }
        .prod-btn:hover { background: var(--bg); }
        .prod-btn.edit:hover { background: var(--blue-soft); color: var(--blue-dark); border-color: var(--blue); }
        .prod-btn.del:hover { background: var(--red); color: var(--red-dark); border-color: #FCA5A5; }
        .toggle-badge { position: absolute; top: 10px; right: 10px; padding: 3px 9px; border-radius: 100px; font-size: 11px; font-weight: 700; cursor: pointer; border: none; font-family: inherit; }
        .toggle-badge.activo { background: rgba(184,237,212,0.9); color: var(--green-dark); }
        .toggle-badge.inactivo { background: rgba(0,0,0,0.07); color: var(--muted); }

        /* Empty */
        .empty-state { text-align: center; padding: 72px 20px; color: var(--muted); }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .empty-desc { font-size: 13px; margin-bottom: 20px; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; justify-content: center; padding: 0; }
        @media (min-width: 640px) { .modal-overlay { align-items: center; padding: 20px; } }
        .modal { background: var(--white); border-radius: 24px 24px 0 0; width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto; }
        @media (min-width: 640px) { .modal { border-radius: 20px; } }
        .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: var(--white); z-index: 1; }
        .modal-title { font-size: 16px; font-weight: 800; color: var(--text); }
        .modal-close { background: none; border: none; cursor: pointer; font-size: 22px; color: var(--muted); line-height: 1; padding: 4px; }
        .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .field input, .field textarea, .field select { padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; background: var(--white); width: 100%; }
        .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--blue-dark); }
        .field input.error, .field textarea.error { border-color: var(--red-dark); }
        .field-error { font-size: 11px; color: var(--red-dark); font-weight: 600; }
        .field textarea { resize: vertical; min-height: 72px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .iva-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .iva-btn { padding: 8px 14px; border-radius: 100px; border: 1.5px solid var(--border); background: var(--white); font-family: inherit; font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; }
        .iva-btn.active { background: var(--lila-dark); border-color: var(--lila-dark); color: white; }

        /* Foto upload */
        .foto-upload { border: 2px dashed var(--border); border-radius: 14px; overflow: hidden; cursor: pointer; transition: border-color 0.2s; }
        .foto-upload:hover { border-color: var(--blue-dark); }
        .foto-preview { width: 100%; height: 160px; object-fit: cover; display: block; }
        .foto-placeholder { height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 600; }

        /* Botones modal */
        .btn-primary { flex: 1; padding: 12px; background: var(--text); color: white; border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-primary:disabled { background: var(--muted); cursor: not-allowed; }
        .btn-cancel { padding: 12px 20px; background: var(--bg); color: var(--text2); border: 1px solid var(--border); border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-danger { flex: 1; padding: 12px; background: var(--red); color: var(--red-dark); border: none; border-radius: 10px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .hamburger { display: flex; }
          .main { margin-left: 0; }
          .topbar { padding: 12px 16px; }
          .content { padding: 16px; }
          .productos-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .field-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .productos-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <input ref={fotoRef} type="file" accept="image/*" style={{display:'none'}} onChange={onFotoChange} />

      <div className="layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo"><KhepriLogo /></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item ${item.href === '/dashboard/productos' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
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
              <span style={{fontSize:'16px', fontWeight:700, color:'#111827'}}>Productos</span>
            </div>
            <button className="btn-add" onClick={abrirAdd}>
              <span style={{fontSize:'18px', lineHeight:1}}>+</span> Añadir producto
            </button>
          </header>

          <main className="content">
            {/* Stats */}
            {!cargando && (
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-label">Total productos</div>
                  <div className="stat-val">{productos.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Activos</div>
                  <div className="stat-val">{productos.filter(p => p.activo).length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Stock bajo</div>
                  <div className="stat-val" style={{color: stockBajo > 0 ? 'var(--red-dark)' : 'inherit'}}>{stockBajo}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Valor stock</div>
                  <div className="stat-val" style={{fontSize:'16px'}}>{fmt(productos.reduce((s, p) => s + p.precio * p.stock, 0))} €</div>
                </div>
              </div>
            )}

            {/* Alerta stock bajo */}
            {stockBajo > 0 && (
              <div className="alerta-stock">
                <span style={{fontSize:'20px'}}>⚠️</span>
                <span>{stockBajo} producto{stockBajo > 1 ? 's' : ''} con stock bajo (menos de {STOCK_ALERTA} unidades)</span>
                <button
                  style={{marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700, color:'var(--yellow-dark)', fontFamily:'inherit', textDecoration:'underline'}}
                  onClick={() => setFiltro('stock')}
                >Ver →</button>
              </div>
            )}

            {/* Toolbar */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Buscar productos..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <div className="filtro-btns">
                <button className={`filtro-btn ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
                <button className={`filtro-btn ${filtro === 'activos' ? 'active' : ''}`} onClick={() => setFiltro('activos')}>Activos</button>
                <button className={`filtro-btn ${filtro === 'inactivos' ? 'active' : ''}`} onClick={() => setFiltro('inactivos')}>Inactivos</button>
                {stockBajo > 0 && (
                  <button className={`filtro-btn stock-alert ${filtro === 'stock' ? 'active' : ''}`} onClick={() => setFiltro('stock')}>
                    ⚠️ Stock bajo ({stockBajo})
                  </button>
                )}
              </div>
            </div>

            {/* Contenido */}
            {cargando ? (
              <div style={{textAlign:'center', padding:'80px', color:'var(--muted)'}}>Cargando...</div>
            ) : productosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{busqueda ? '🔍' : '🛍️'}</div>
                <div className="empty-title">{busqueda ? 'Sin resultados' : 'Sin productos'}</div>
                <div className="empty-desc">{busqueda ? `No hay productos que coincidan con "${busqueda}"` : 'Añade tu primer producto para empezar'}</div>
                {!busqueda && <button className="btn-add" onClick={abrirAdd} style={{margin:'0 auto'}}>+ Añadir producto</button>}
              </div>
            ) : (
              <div className="productos-grid">
                {productosFiltrados.map(p => (
                  <div key={p.id} className={`prod-card ${p.activo ? '' : 'inactivo'}`}>
                    {/* Toggle activo */}
                    <button className={`toggle-badge ${p.activo ? 'activo' : 'inactivo'}`} onClick={() => toggleActivo(p)}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </button>

                    {/* Foto */}
                    <div className="prod-foto">
                      {p.foto_url
                        ? <img src={p.foto_url} alt={p.nombre} />
                        : <span>🛍️</span>
                      }
                    </div>

                    <div className="prod-body">
                      <div className="prod-nombre">{p.nombre}</div>
                      <div className="prod-desc">{p.descripcion || <span style={{fontStyle:'italic'}}>Sin descripción</span>}</div>

                      <div className="prod-meta">
                        <span className="prod-precio">{fmt(p.precio)} €</span>
                        <span className="prod-iva">IVA {p.iva}%</span>
                      </div>

                      {/* Stock */}
                      <div className="stock-row">
                        <span className="stock-label">Stock</span>
                        {p.stock < STOCK_ALERTA && <span className="stock-badge-low">⚠️ Bajo</span>}
                        <span className={`stock-val ${p.stock < STOCK_ALERTA ? 'low' : 'ok'}`}>{p.stock}</span>
                        <div className="stock-btns">
                          <button className="stock-btn" onClick={() => updateStock(p, -1)} disabled={p.stock === 0}>−</button>
                          <button className="stock-btn" onClick={() => updateStock(p, 1)}>+</button>
                        </div>
                      </div>

                      <div className="prod-actions">
                        <button className="prod-btn edit" onClick={() => abrirEdit(p)}>✏️ Editar</button>
                        <button className="prod-btn del" onClick={() => setConfirmDelete(p)}>🗑️ Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MODAL ADD / EDIT ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{modal === 'add' ? 'Añadir producto' : 'Editar producto'}</span>
              <button className="modal-close" onClick={cerrarModal}>×</button>
            </div>
            <div className="modal-body">

              {/* Foto */}
              <div className="field">
                <label>Foto del producto</label>
                <div className="foto-upload" onClick={() => fotoRef.current?.click()}>
                  {fotoPreview
                    ? <img src={fotoPreview} alt="preview" className="foto-preview" />
                    : <div className="foto-placeholder"><span style={{fontSize:'28px'}}>📷</span><span>Toca para subir foto</span></div>
                  }
                </div>
              </div>

              {/* Nombre */}
              <div className="field">
                <label>Nombre *</label>
                <input
                  type="text"
                  className={errores.nombre ? 'error' : ''}
                  placeholder="Ej: Champú hidratante"
                  value={form.nombre}
                  onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                />
                {errores.nombre && <span className="field-error">{errores.nombre}</span>}
              </div>

              {/* Descripción */}
              <div className="field">
                <label>Descripción</label>
                <textarea
                  placeholder="Describe brevemente el producto..."
                  value={form.descripcion}
                  onChange={e => setForm(f => ({...f, descripcion: e.target.value}))}
                />
              </div>

              {/* Precio + Stock */}
              <div className="field-row">
                <div className="field">
                  <label>Precio total (con IVA) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={errores.precio ? 'error' : ''}
                    placeholder="0.00"
                    value={form.precio}
                    onChange={e => setForm(f => ({...f, precio: e.target.value}))}
                  />
                  {errores.precio && <span className="field-error">{errores.precio}</span>}
                </div>
                <div className="field">
                  <label>Stock inicial *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={errores.stock ? 'error' : ''}
                    placeholder="0"
                    value={form.stock}
                    onChange={e => setForm(f => ({...f, stock: e.target.value}))}
                  />
                  {errores.stock && <span className="field-error">{errores.stock}</span>}
                </div>
              </div>

              {/* Tipo IVA */}
              <div className="field">
                <label>Tipo de IVA</label>
                <div className="iva-btns">
                  {IVA_OPTS.map(v => (
                    <button key={v} className={`iva-btn ${form.iva === v ? 'active' : ''}`} onClick={() => setForm(f => ({...f, iva: v}))}>
                      {v}%
                    </button>
                  ))}
                </div>
                {form.precio && !isNaN(parseFloat(form.precio)) && (
                  <span style={{fontSize:'12px', color:'var(--muted)', marginTop:'4px'}}>
                    Base imponible: {fmt(parseFloat(form.precio) / (1 + form.iva / 100))} € · IVA: {fmt(parseFloat(form.precio) - parseFloat(form.precio) / (1 + form.iva / 100))} €
                  </span>
                )}
              </div>

            </div>
            {apiError && <div style={{background:'rgba(254,226,226,0.5)', color:'#DC2626', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:500, marginBottom:'8px'}}>{apiError}</div>}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando || subiendoFoto}>
                {guardando || subiendoFoto ? 'Guardando...' : modal === 'add' ? 'Añadir producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="modal" style={{maxWidth:'400px'}}>
            <div className="modal-header">
              <span className="modal-title">Eliminar producto</span>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{textAlign:'center', padding:'8px 0'}}>
                <div style={{fontSize:'40px', marginBottom:'12px'}}>🗑️</div>
                <div style={{fontSize:'15px', fontWeight:700, color:'var(--text)', marginBottom:'6px'}}>
                  ¿Eliminar &ldquo;{confirmDelete.nombre}&rdquo;?
                </div>
                <div style={{fontSize:'13px', color:'var(--muted)'}}>
                  Esta acción no se puede deshacer. Se eliminará el producto y su foto.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger" onClick={eliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
