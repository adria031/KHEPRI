'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function KhepriLogo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{ fontWeight:800, fontSize:'17px', letterSpacing:'-0.5px', color:'#111827' }}>Khepria</span>
    </div>
  )
}

function Estrellas({ valor, total }: { valor: number; total: number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <div style={{ display:'flex', gap:'2px' }}>
        {[1,2,3,4,5].map(i => (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= Math.round(valor) ? '#F59E0B' : '#E5E7EB'}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ))}
      </div>
      <span style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>{valor.toFixed(1)}</span>
      <span style={{ fontSize:'13px', color:'#9CA3AF' }}>({total} reseñas)</span>
    </div>
  )
}

const diasLabels: Record<string,string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo'
}
const diasOrden = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

type Negocio = {
  id:string; nombre:string; tipo:string; descripcion:string;
  telefono:string; direccion:string; ciudad:string; codigo_postal:string;
  instagram:string; whatsapp:string; facebook:string;
  logo_url:string; fotos:string[]; metodos_pago:string[]|null
}
type Horario = { dia:string; abierto:boolean; hora_apertura:string; hora_cierre:string; hora_apertura2:string|null; hora_cierre2:string|null }
type Servicio = { id:string; nombre:string; duracion:number; precio:number; precio_descuento:number|null; descuento_inicio:string|null; descuento_fin:string|null; categoria?:string|null }
type Resena = { id:string; valoracion:number; texto:string|null; created_at:string; autor_nombre:string|null }

function ofertaActiva(s: Servicio) {
  if (!s.precio_descuento || !s.descuento_inicio || !s.descuento_fin) return false
  const hoy = new Date().toLocaleDateString('en-CA')
  return hoy >= s.descuento_inicio && hoy <= s.descuento_fin
}

function fmtH(h: string) { return h?.slice(0,5) ?? '' }
function horarioTexto(h: Horario) {
  if (!h.abierto) return 'Cerrado'
  const base = `${fmtH(h.hora_apertura)} – ${fmtH(h.hora_cierre)}`
  if (h.hora_apertura2) return `${base} / ${fmtH(h.hora_apertura2)} – ${fmtH(h.hora_cierre2!)}`
  return base
}

const CAT_PALETTE = [
  { bg:'#EFF6FF', color:'#1D4ED8', border:'rgba(191,219,254,0.6)', dot:'#60A5FA' },
  { bg:'#F5F3FF', color:'#6D28D9', border:'rgba(221,214,254,0.6)', dot:'#A78BFA' },
  { bg:'#ECFDF5', color:'#065F46', border:'rgba(167,243,208,0.6)', dot:'#34D399' },
  { bg:'#FFFBEB', color:'#92400E', border:'rgba(253,230,138,0.6)', dot:'#FBBF24' },
  { bg:'#FFF1F2', color:'#9F1239', border:'rgba(254,205,211,0.6)', dot:'#F87171' },
  { bg:'#F0F9FF', color:'#075985', border:'rgba(186,230,253,0.6)', dot:'#38BDF8' },
  { bg:'#F7FEE7', color:'#3F6212', border:'rgba(217,249,157,0.6)', dot:'#86EFAC' },
]

function agruparServicios(servicios: Servicio[]): Record<string, Servicio[]> {
  const grupos: Record<string, Servicio[]> = {}
  for (const s of servicios) {
    const cat = (s.categoria && s.categoria.trim()) ? s.categoria.trim() : 'General'
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push(s)
  }
  // Si todos los servicios son de la misma categoría, no usar accordion
  const claves = Object.keys(grupos)
  if (claves.length <= 1) return { 'todos': servicios }
  return grupos
}

export default function FichaNegocio() {
  const params = useParams()
  const id = params?.id as string
  const [negocio, setNegocio] = useState<Negocio|null>(null)
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [resenas, setResenas] = useState<Resena[]>([])
  const [fotoActiva, setFotoActiva] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [grupoAbierto, setGrupoAbierto] = useState<string|null>(null)

  const hoyDia = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date().getDay()]

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('negocios').select('*').eq('id', id).single(),
      supabase.from('horarios').select('*').eq('negocio_id', id),
      supabase.from('servicios').select('*').eq('negocio_id', id).eq('activo', true),
      supabase.from('resenas').select('*').eq('negocio_id', id).order('created_at', { ascending: false }),
    ]).then(([{data:neg},{data:hor},{data:ser},{data:res}]) => {
      if (neg) setNegocio(neg)
      if (hor) setHorarios(hor)
      if (ser) {
        setServicios(ser)
        const grupos = agruparServicios(ser)
        setGrupoAbierto(Object.keys(grupos)[0])
      }
      if (res) setResenas(res)
      setCargando(false)
    })
  }, [id])

  function abrirGPS() {
    if (!negocio) return
    window.open(`https://maps.google.com/?q=${encodeURIComponent(`${negocio.direccion}, ${negocio.ciudad}`)}`, '_blank')
  }

  const fotos = negocio?.fotos?.filter(Boolean) ?? []
  const horarioHoy = horarios.find(h => h.dia === hoyDia)
  const mediaVal = resenas.length ? resenas.reduce((a,r) => a + r.valoracion, 0) / resenas.length : 0
  const grupos = servicios.length ? agruparServicios(servicios) : {}

  if (cargando) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFF',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.6"/><circle cx="11" cy="11" r="2.5" fill="white"/></svg>
        </div>
        <div style={{color:'#9CA3AF',fontSize:'14px',fontWeight:500}}>Cargando...</div>
      </div>
    </div>
  )

  if (!negocio) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFF',fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'56px',marginBottom:'16px'}}>🔍</div>
        <div style={{fontSize:'20px',fontWeight:800,color:'#111827',marginBottom:'8px'}}>Negocio no encontrado</div>
        <Link href="/cliente" style={{color:'#6366F1',textDecoration:'none',fontSize:'14px',fontWeight:600}}>← Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { background:#F8FAFF !important; font-family:'Plus Jakarta Sans',sans-serif; color:#111827; }

        /* NAV */
        .nav { position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.92); backdrop-filter:blur(20px); border-bottom:1px solid rgba(0,0,0,0.06); padding:14px 40px; display:flex; align-items:center; justify-content:space-between; }
        .btn-cita-nav { background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border:none; padding:12px 24px; border-radius:100px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(99,102,241,0.35); transition:transform 0.15s,box-shadow 0.15s; }
        .btn-cita-nav:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.45); }

        /* HERO */
        .hero { position:relative; height:380px; background:linear-gradient(135deg,#EEF2FF,#F5F3FF,#EDE9FE); overflow:hidden; }
        .hero img { width:100%; height:100%; object-fit:cover; }
        .hero-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 60%); }
        .hero-grad { width:100%; height:100%; display:flex; align-items:center; justify-content:center; position:relative; }
        .hero-grad-circles { position:absolute; inset:0; overflow:hidden; }
        .gc1 { position:absolute; width:320px; height:320px; border-radius:50%; background:radial-gradient(circle,rgba(184,216,248,0.5),transparent 70%); top:-60px; left:-60px; }
        .gc2 { position:absolute; width:280px; height:280px; border-radius:50%; background:radial-gradient(circle,rgba(212,197,249,0.5),transparent 70%); bottom:-40px; right:-40px; }
        .gc3 { position:absolute; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,rgba(184,237,212,0.4),transparent 70%); top:40px; right:100px; }
        .foto-nav-dots { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:2; }
        .foto-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.5); border:none; cursor:pointer; padding:0; transition:all 0.2s; }
        .foto-dot.act { background:white; width:20px; border-radius:100px; }
        .foto-btn { position:absolute; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.9); border:none; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; box-shadow:0 2px 12px rgba(0,0,0,0.15); z-index:2; transition:transform 0.15s; }
        .foto-btn:hover { transform:translateY(-50%) scale(1.08); }
        .foto-btn-l { left:16px; }
        .foto-btn-r { right:16px; }
        .foto-count { position:absolute; bottom:20px; right:20px; background:rgba(0,0,0,0.55); color:white; font-size:12px; font-weight:600; padding:4px 10px; border-radius:100px; backdrop-filter:blur(6px); z-index:2; }

        /* LAYOUT */
        .wrap { max-width:1000px; margin:0 auto; padding:0 24px; }
        .profile-block { padding:32px 0 28px; border-bottom:1px solid rgba(0,0,0,0.06); margin-bottom:32px; }
        .profile-top { display:flex; align-items:flex-end; gap:20px; margin-bottom:16px; }
        .logo-bubble { width:80px; height:80px; border-radius:20px; border:3px solid white; overflow:hidden; background:white; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:-44px; box-shadow:0 8px 24px rgba(0,0,0,0.12); position:relative; z-index:2; }
        .logo-bubble img { width:100%; height:100%; object-fit:cover; }
        .profile-name { font-size:32px; font-weight:800; color:#111827; letter-spacing:-0.8px; line-height:1.1; }
        .profile-tipo { display:inline-flex; align-items:center; gap:6px; background:rgba(99,102,241,0.08); color:#6366F1; font-size:12px; font-weight:700; padding:4px 12px; border-radius:100px; margin-bottom:10px; letter-spacing:0.3px; }
        .profile-meta { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:12px; }
        .meta-chip { display:inline-flex; align-items:center; gap:5px; font-size:13px; color:#4B5563; font-weight:500; }
        .badge-open { background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(52,211,153,0.12)); color:#059669; padding:5px 12px; border-radius:100px; font-size:12px; font-weight:700; border:1px solid rgba(16,185,129,0.2); }
        .badge-closed { background:rgba(0,0,0,0.05); color:#9CA3AF; padding:5px 12px; border-radius:100px; font-size:12px; font-weight:700; }

        /* GRID */
        .page-grid { display:grid; grid-template-columns:1fr 320px; gap:28px; padding-bottom:60px; align-items:start; }

        /* CARD */
        .card { background:white; border:1px solid rgba(0,0,0,0.06); border-radius:20px; padding:28px; margin-bottom:16px; box-shadow:0 2px 12px rgba(0,0,0,0.04); }
        .card-title { font-size:13px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:1px; margin-bottom:18px; }
        .descripcion { font-size:15px; color:#374151; line-height:1.75; }

        /* SERVICIOS ACCORDION */
        .grupo-wrap { margin-bottom:8px; border-radius:14px; overflow:hidden; border:1px solid rgba(0,0,0,0.06); }
        .grupo-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; cursor:pointer; user-select:none; transition:opacity 0.15s; }
        .grupo-header:hover { opacity:0.85; }
        .grupo-izq { display:flex; align-items:center; gap:10px; }
        .grupo-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
        .grupo-nombre { font-size:14px; font-weight:700; }
        .grupo-count { font-size:11px; font-weight:600; padding:2px 8px; border-radius:100px; background:rgba(0,0,0,0.07); color:inherit; opacity:0.7; }
        .grupo-arrow { font-size:14px; transition:transform 0.22s; opacity:0.6; }
        .grupo-arrow.open { transform:rotate(180deg); }
        .grupo-body { background:white; padding:0 16px; }
        .servicio-item { display:flex; align-items:center; justify-content:space-between; padding:13px 0; border-bottom:1px solid rgba(0,0,0,0.04); }
        .servicio-item:last-child { border-bottom:none; }
        .serv-info { flex:1; }
        .serv-nombre { font-size:14px; font-weight:600; color:#111827; margin-bottom:3px; }
        .serv-dur { font-size:12px; color:#9CA3AF; display:flex; align-items:center; gap:4px; }
        .serv-precio-wrap { text-align:right; }
        .serv-precio { font-size:16px; font-weight:800; color:#111827; }
        .serv-precio-old { font-size:12px; color:#9CA3AF; text-decoration:line-through; font-weight:600; }
        .serv-precio-oferta { font-size:16px; font-weight:800; color:#EF4444; }
        .oferta-badge { display:inline-flex; align-items:center; gap:3px; background:rgba(239,68,68,0.1); color:#EF4444; border-radius:100px; font-size:10px; font-weight:700; padding:2px 8px; margin-left:8px; vertical-align:middle; }

        /* HORARIOS */
        .horario-item { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; margin-bottom:4px; }
        .horario-item.hoy { background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08)); border:1px solid rgba(99,102,241,0.15); }
        .horario-dia-txt { font-size:13px; font-weight:600; color:#374151; }
        .horario-item.hoy .horario-dia-txt { color:#6366F1; font-weight:700; }
        .horario-hoy-pill { font-size:10px; font-weight:700; background:#6366F1; color:white; padding:2px 7px; border-radius:100px; margin-left:8px; }
        .horario-hora-txt { font-size:13px; color:#4B5563; font-weight:500; }
        .horario-cerrado { color:#D1D5DB; }

        /* VALORACIONES */
        .val-media { display:flex; align-items:center; gap:20px; padding:20px 0; border-bottom:1px solid rgba(0,0,0,0.06); margin-bottom:20px; }
        .val-numero { font-size:52px; font-weight:800; color:#111827; letter-spacing:-2px; line-height:1; }
        .val-resena-item { padding:16px 0; border-bottom:1px solid rgba(0,0,0,0.05); }
        .val-resena-item:last-child { border-bottom:none; }
        .val-resena-autor { font-size:13px; font-weight:700; color:#111827; margin-bottom:4px; display:flex; align-items:center; gap:8px; }
        .val-resena-fecha { font-size:11px; color:#9CA3AF; font-weight:400; }
        .val-resena-texto { font-size:13px; color:#4B5563; line-height:1.6; margin-top:6px; }

        /* REDES */
        .redes-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .red-chip { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:100px; border:1.5px solid rgba(0,0,0,0.08); background:white; font-family:inherit; font-size:13px; font-weight:600; color:#111827; text-decoration:none; transition:all 0.15s; }
        .red-chip:hover { background:#F8FAFF; border-color:#6366F1; color:#6366F1; transform:translateY(-1px); }

        /* STICKY RIGHT */
        .sticky-col { position:sticky; top:80px; }
        .cita-card { background:linear-gradient(135deg,#6366F1,#8B5CF6); border-radius:20px; padding:24px; margin-bottom:14px; box-shadow:0 8px 28px rgba(99,102,241,0.3); }
        .cita-card-title { font-size:18px; font-weight:800; color:white; margin-bottom:4px; }
        .cita-card-sub { font-size:13px; color:rgba(255,255,255,0.75); margin-bottom:20px; }
        .btn-reservar { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:16px; background:white; color:#6366F1; border:none; border-radius:14px; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; text-decoration:none; box-shadow:0 4px 14px rgba(0,0,0,0.12); transition:transform 0.15s; }
        .btn-reservar:hover { transform:scale(1.02); }
        .btn-wa { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:13px; background:#25D366; color:white; border:none; border-radius:14px; font-family:inherit; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; margin-top:10px; transition:opacity 0.15s; }
        .btn-wa:hover { opacity:0.92; }
        .side-card { background:white; border:1px solid rgba(0,0,0,0.06); border-radius:20px; overflow:hidden; margin-bottom:14px; box-shadow:0 2px 12px rgba(0,0,0,0.04); }
        .side-card-body { padding:20px; }
        .side-label { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }
        .mapa-bg { height:110px; background:linear-gradient(135deg,#EEF2FF,#F5F3FF); position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .mapa-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(99,102,241,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.07) 1px,transparent 1px); background-size:20px 20px; }
        .mapa-pin { position:relative; font-size:32px; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.15)); }
        .dir-txt { font-size:13px; color:#4B5563; line-height:1.6; margin-bottom:14px; }
        .btn-gps { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:11px; background:#6366F1; color:white; border:none; border-radius:12px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity 0.15s; }
        .btn-gps:hover { opacity:0.9; }
        .pago-chips { display:flex; flex-wrap:wrap; gap:7px; }
        .pago-chip { display:inline-flex; align-items:center; gap:5px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.15); color:#6366F1; padding:6px 12px; border-radius:100px; font-size:12px; font-weight:600; }

        /* MOBILE CTA FIXED */
        .mobile-cta { display:none; position:fixed; bottom:0; left:0; right:0; padding:16px 20px; background:rgba(255,255,255,0.95); backdrop-filter:blur(12px); border-top:1px solid rgba(0,0,0,0.08); z-index:90; }
        .mobile-cta a { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:15px; background:linear-gradient(135deg,#6366F1,#8B5CF6); color:white; border-radius:14px; font-family:inherit; font-size:16px; font-weight:800; text-decoration:none; box-shadow:0 4px 16px rgba(99,102,241,0.35); }

        @media (max-width: 768px) {
          .nav { padding:12px 20px; }
          .btn-cita-nav { display:none; }
          .hero { height:260px; }
          .wrap { padding:0 16px; }
          .profile-name { font-size:24px; }
          .logo-bubble { width:64px; height:64px; margin-top:-36px; }
          .page-grid { grid-template-columns:1fr; }
          .sticky-col { position:static; display:none; }
          .mobile-cta { display:block; }
          body { padding-bottom:88px; }
          .card { padding:20px; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* NAV */}
      <nav className="nav">
        <Link href="/cliente" style={{textDecoration:'none'}}><KhepriLogo /></Link>
        <Link href={`/negocio/${id}/reservar`} className="btn-cita-nav">
          <span>📅</span> Pedir cita
        </Link>
      </nav>

      {/* HERO */}
      <div className="hero">
        {fotos.length > 0 ? (
          <>
            <img src={fotos[fotoActiva]} alt="Foto del local"/>
            <div className="hero-overlay"/>
            {fotos.length > 1 && (
              <>
                <button className="foto-btn foto-btn-l" onClick={() => setFotoActiva(i => (i-1+fotos.length)%fotos.length)}>‹</button>
                <button className="foto-btn foto-btn-r" onClick={() => setFotoActiva(i => (i+1)%fotos.length)}>›</button>
                <div className="foto-nav-dots">
                  {fotos.map((_,i) => <button key={i} className={`foto-dot ${i===fotoActiva?'act':''}`} onClick={() => setFotoActiva(i)}/>)}
                </div>
                <div className="foto-count">{fotoActiva+1} / {fotos.length}</div>
              </>
            )}
          </>
        ) : (
          <div className="hero-grad">
            <div className="hero-grad-circles">
              <div className="gc1"/><div className="gc2"/><div className="gc3"/>
            </div>
          </div>
        )}
      </div>

      <div className="wrap">
        {/* PERFIL */}
        <div className="profile-block">
          <div className="profile-top">
            {negocio.logo_url && (
              <div className="logo-bubble">
                <img src={negocio.logo_url} alt="Logo"/>
              </div>
            )}
            <div style={{flex:1, paddingTop: negocio.logo_url ? '0' : '16px'}}>
              <div className="profile-tipo">{negocio.tipo}</div>
              <div className="profile-name">{negocio.nombre}</div>
            </div>
          </div>
          <div className="profile-meta">
            {negocio.ciudad && <span className="meta-chip">📍 {negocio.ciudad}</span>}
            {negocio.telefono && <span className="meta-chip">📞 {negocio.telefono}</span>}
            {resenas.length > 0 && (
              <Estrellas valor={mediaVal} total={resenas.length}/>
            )}
            {horarioHoy && (
              <span className={horarioHoy.abierto ? 'badge-open' : 'badge-closed'}>
                {horarioHoy.abierto ? '● Abierto ahora' : '● Cerrado ahora'}
              </span>
            )}
          </div>
        </div>

        <div className="page-grid">
          {/* COLUMNA IZQUIERDA */}
          <div>

            {/* DESCRIPCIÓN */}
            {negocio.descripcion && (
              <div className="card">
                <div className="card-title">Sobre nosotros</div>
                <p className="descripcion">{negocio.descripcion}</p>
              </div>
            )}

            {/* SERVICIOS */}
            {servicios.length > 0 && (
              <div className="card">
                <div className="card-title">Servicios y precios</div>
                {(() => {
                  const esUnica = Object.keys(grupos).length === 1
                  return Object.entries(grupos).map(([grupo, items], gi) => {
                    const pal = CAT_PALETTE[gi % CAT_PALETTE.length]
                    const abierto = grupoAbierto === grupo
                    const listaServicios = (
                      <div className={esUnica ? '' : 'grupo-body'}>
                        {items.map(s => (
                          <div key={s.id} className="servicio-item">
                            <div className="serv-info">
                              <div className="serv-nombre">
                                {s.nombre}
                                {ofertaActiva(s) && <span className="oferta-badge">🏷 OFERTA</span>}
                              </div>
                              <div className="serv-dur">⏱ {s.duracion} min</div>
                            </div>
                            <div className="serv-precio-wrap">
                              {ofertaActiva(s) ? (
                                <>
                                  <div className="serv-precio-old">€{s.precio.toFixed(2)}</div>
                                  <div className="serv-precio-oferta">€{s.precio_descuento!.toFixed(2)}</div>
                                </>
                              ) : (
                                <div className="serv-precio">€{s.precio.toFixed(2)}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )

                    if (esUnica) return <div key={grupo}>{listaServicios}</div>

                    return (
                      <div key={grupo} className="grupo-wrap" style={{ borderColor: pal.border }}>
                        <div
                          className="grupo-header"
                          style={{ background: pal.bg, color: pal.color }}
                          onClick={() => setGrupoAbierto(abierto ? null : grupo)}
                        >
                          <div className="grupo-izq">
                            <span className="grupo-dot" style={{ background: pal.dot }} />
                            <span className="grupo-nombre" style={{ color: pal.color }}>{grupo}</span>
                            <span className="grupo-count">{items.length} servicio{items.length !== 1 ? 's' : ''}</span>
                          </div>
                          <svg
                            className={`grupo-arrow ${abierto ? 'open' : ''}`}
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                          >
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {abierto && listaServicios}
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* HORARIOS */}
            {horarios.length > 0 && (
              <div className="card">
                <div className="card-title">Horario</div>
                {diasOrden.map(dia => {
                  const h = horarios.find(x => x.dia === dia)
                  const esHoy = dia === hoyDia
                  return (
                    <div key={dia} className={`horario-item ${esHoy?'hoy':''}`}>
                      <span className="horario-dia-txt">
                        {diasLabels[dia]}
                        {esHoy && <span className="horario-hoy-pill">Hoy</span>}
                      </span>
                      <span className={`horario-hora-txt ${(!h||!h.abierto)?'horario-cerrado':''}`}>
                        {h ? horarioTexto(h) : 'Cerrado'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* VALORACIONES */}
            {resenas.length > 0 && (
              <div className="card">
                <div className="card-title">Valoraciones</div>
                <div className="val-media">
                  <div className="val-numero">{mediaVal.toFixed(1)}</div>
                  <div>
                    <Estrellas valor={mediaVal} total={resenas.length}/>
                    <div style={{fontSize:'13px',color:'#9CA3AF',marginTop:'6px'}}>Puntuación media</div>
                  </div>
                </div>
                {resenas.slice(0,4).map(r => (
                  <div key={r.id} className="val-resena-item">
                    <div className="val-resena-autor">
                      {r.autor_nombre || 'Cliente'}
                      <span className="val-resena-fecha">
                        {new Date(r.created_at).toLocaleDateString('es-ES', {day:'numeric',month:'long',year:'numeric'})}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:'2px',marginBottom:'4px'}}>
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i<=r.valoracion?'#F59E0B':'#E5E7EB'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    {r.texto && <p className="val-resena-texto">{r.texto}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* REDES */}
            {(negocio.instagram || negocio.whatsapp || negocio.facebook) && (
              <div className="card">
                <div className="card-title">Encuéntranos en</div>
                <div className="redes-grid">
                  {negocio.instagram && (
                    <a href={`https://instagram.com/${negocio.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="red-chip">📸 Instagram</a>
                  )}
                  {negocio.whatsapp && (
                    <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" rel="noreferrer" className="red-chip">💬 WhatsApp</a>
                  )}
                  {negocio.facebook && (
                    <a href={negocio.facebook.startsWith('http') ? negocio.facebook : `https://${negocio.facebook}`} target="_blank" rel="noreferrer" className="red-chip">👤 Facebook</a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA */}
          <div className="sticky-col">

            {/* RESERVAR */}
            <div className="cita-card">
              <div className="cita-card-title">Reserva tu cita</div>
              <div className="cita-card-sub">Elige servicio, día y hora en segundos</div>
              <Link href={`/negocio/${id}/reservar`} className="btn-reservar">
                📅 Pedir cita online
              </Link>
              {negocio.whatsapp && (
                <a href={`https://wa.me/${negocio.whatsapp.replace(/\s+/g,'').replace('+','')}`} target="_blank" rel="noreferrer" className="btn-wa">
                  💬 Reservar por WhatsApp
                </a>
              )}
            </div>

            {/* UBICACIÓN */}
            {(negocio.direccion || negocio.ciudad) && (
              <div className="side-card">
                <div className="mapa-bg">
                  <div className="mapa-grid"/>
                  <span className="mapa-pin">📍</span>
                </div>
                <div className="side-card-body">
                  <div className="side-label">Ubicación</div>
                  <div className="dir-txt">
                    {negocio.direccion && <div>{negocio.direccion}</div>}
                    {negocio.ciudad && <div>{negocio.ciudad}{negocio.codigo_postal ? `, ${negocio.codigo_postal}` : ''}</div>}
                  </div>
                  <button className="btn-gps" onClick={abrirGPS}>🗺️ Cómo llegar</button>
                </div>
              </div>
            )}

            {/* MÉTODOS DE PAGO */}
            {negocio.metodos_pago && negocio.metodos_pago.length > 0 && (
              <div className="side-card">
                <div className="side-card-body">
                  <div className="side-label">Métodos de pago</div>
                  <div className="pago-chips">
                    {negocio.metodos_pago.map(m => {
                      const info: Record<string,{icon:string;label:string}> = {
                        pago_app:{icon:'📱',label:'Pago por app'},
                        efectivo:{icon:'💵',label:'Efectivo'},
                        datafono:{icon:'💳',label:'Datáfono'},
                      }
                      const {icon,label} = info[m] ?? {icon:'💰',label:m}
                      return <span key={m} className="pago-chip">{icon} {label}</span>
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FIXED CTA */}
      <div className="mobile-cta">
        <Link href={`/negocio/${id}/reservar`}>📅 Pedir cita</Link>
      </div>
    </>
  )
}
