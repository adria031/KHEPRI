'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Suspense } from 'react'

const MapaNegocios = dynamic(() => import('./MapaNegocios'), { ssr: false, loading: () => (
  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#F1F5F9', color:'#94A3B8', fontSize:'14px', fontWeight:600, gap:'8px' }}>
    <span style={{fontSize:'20px'}}>🗺️</span> Cargando mapa...
  </div>
) })

// ─── Datos ────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id:'todos',       label:'Todos',       emoji:'✨' },
  { id:'peluqueria',  label:'Peluquería',  emoji:'💈' },
  { id:'estetica',    label:'Estética',    emoji:'💅' },
  { id:'spa',         label:'Spa',         emoji:'💆' },
  { id:'clinica',     label:'Clínica',     emoji:'🏥' },
  { id:'yoga',        label:'Yoga',        emoji:'🧘' },
  { id:'gimnasio',    label:'Gimnasio',    emoji:'🏋️' },
  { id:'dentista',    label:'Dentista',    emoji:'🦷' },
  { id:'veterinaria', label:'Veterinaria', emoji:'🐾' },
  { id:'restaurante', label:'Restaurante', emoji:'🍕' },
]

const TIPO_CFG: Record<string,{emoji:string;bg:string;grad:string;color:string}> = {
  peluqueria:  {emoji:'💈',bg:'#EFF6FF',grad:'linear-gradient(135deg,#BFDBFE,#93C5FD)',color:'#1D4ED8'},
  barberia:    {emoji:'✂️',bg:'#EFF6FF',grad:'linear-gradient(135deg,#BFDBFE,#93C5FD)',color:'#1D4ED8'},
  estetica:    {emoji:'💅',bg:'#FDF2F8',grad:'linear-gradient(135deg,#FBCFE8,#F9A8D4)',color:'#BE185D'},
  spa:         {emoji:'💆',bg:'#F5F3FF',grad:'linear-gradient(135deg,#DDD6FE,#C4B5FD)',color:'#7C3AED'},
  clinica:     {emoji:'🏥',bg:'#F0FDF4',grad:'linear-gradient(135deg,#BBF7D0,#6EE7B7)',color:'#059669'},
  yoga:        {emoji:'🧘',bg:'#F0FDF4',grad:'linear-gradient(135deg,#BBF7D0,#6EE7B7)',color:'#059669'},
  gimnasio:    {emoji:'🏋️',bg:'#FFFBEB',grad:'linear-gradient(135deg,#FDE68A,#FCD34D)',color:'#D97706'},
  dentista:    {emoji:'🦷',bg:'#FFFBEB',grad:'linear-gradient(135deg,#FDE68A,#FCD34D)',color:'#D97706'},
  veterinaria: {emoji:'🐾',bg:'#F0FDF4',grad:'linear-gradient(135deg,#BBF7D0,#6EE7B7)',color:'#059669'},
  restaurante: {emoji:'🍕',bg:'#FFF7ED',grad:'linear-gradient(135deg,#FED7AA,#FDBA74)',color:'#EA580C'},
}
const TIPO_DEF = {emoji:'🏪',bg:'#F8FAFC',grad:'linear-gradient(135deg,#E2E8F0,#CBD5E1)',color:'#475569'}

const TABS = [
  {id:'inicio',   icon:'⊞',  label:'Inicio'},
  {id:'mapa',     icon:'◎',  label:'Mapa'},
  {id:'reservas', icon:'◷',  label:'Reservas'},
  {id:'favoritos',icon:'♡',  label:'Guardados'},
  {id:'perfil',   icon:'◯',  label:'Perfil'},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Negocio      = {id:string;nombre:string;tipo:string;ciudad:string;logo_url:string|null;fotos:string[]|null;lat?:number|null;lng?:number|null;descripcion:string|null;visible:boolean|null}
type ReservaCliente = {id:string;fecha:string;hora:string;estado:string;negocio_id:string;negocio_nombre:string;servicio_nombre:string;negocio_tipo:string}
type HorarioDB    = {negocio_id:string;dia:string;abierto:boolean;hora_apertura:string;hora_cierre:string;hora_apertura2:string|null;hora_cierre2:string|null}
type Filtro       = 'ninguno'|'abierto'|'valorados'|'cercanos'

const DIAS = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']

function norm(s:string){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'') }
function normTipo(t:string):string {
  const s=norm(t)
  if(s.includes('peluq')||s.includes('barber')) return 'peluqueria'
  if(s.includes('estet')||s.includes('beauty')) return 'estetica'
  if(s.includes('spa')||s.includes('masaj'))    return 'spa'
  if(s.includes('clinic')||s.includes('medic')) return 'clinica'
  if(s.includes('yoga')||s.includes('pilates')) return 'yoga'
  if(s.includes('gimnas'))                      return 'gimnasio'
  if(s.includes('dentis')||s.includes('dental'))return 'dentista'
  if(s.includes('veterin'))                     return 'veterinaria'
  if(s.includes('restaur')||s.includes('cafet'))return 'restaurante'
  return s
}
function toMins(t:string){const[h,m]=t.split(':').map(Number);return h*60+m}
function estaAbierto(hs:HorarioDB[]):boolean{
  const now=new Date(),dia=DIAS[now.getDay()],min=now.getHours()*60+now.getMinutes()
  const h=hs.find(h=>h.dia===dia&&h.abierto);if(!h)return false
  const t1=h.hora_apertura&&h.hora_cierre&&min>=toMins(h.hora_apertura)&&min<toMins(h.hora_cierre)
  const t2=h.hora_apertura2&&h.hora_cierre2&&min>=toMins(h.hora_apertura2)&&min<toMins(h.hora_cierre2)
  return !!(t1||t2)
}
function haversineKm(la1:number,lo1:number,la2:number,lo2:number){
  const R=6371,r=(x:number)=>x*Math.PI/180
  const a=Math.sin(r(la2-la1)/2)**2+Math.cos(r(la1))*Math.cos(r(la2))*Math.sin(r(lo2-lo1)/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
function formatFecha(s:string){
  const[y,m,d]=s.split('-').map(Number)
  return new Date(y,m-1,d).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Logo(){
  return(
    <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
      <div style={{width:'32px',height:'32px',borderRadius:'10px',background:'linear-gradient(135deg,#B8D8F8,#D4C5F9,#B8EDD4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <span style={{fontWeight:800,fontSize:'16px',letterSpacing:'-0.5px',color:'#0F172A'}}>Khepria</span>
    </div>
  )
}

function Skeleton(){
  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(var(--cols,3),1fr)',gap:'18px'}}>
      {[1,2,3,4,5,6].map(i=>(
        <div key={i} style={{borderRadius:'20px',overflow:'hidden',background:'white',border:'1px solid #F1F5F9'}}>
          <div style={{width:'100%',aspectRatio:'4/3',background:'linear-gradient(90deg,#F8FAFC 25%,#F1F5F9 50%,#F8FAFC 75%)',backgroundSize:'400% 100%',animation:'sk 1.6s ease infinite'}}/>
          <div style={{padding:'20px 14px 14px'}}>
            <div style={{height:'13px',borderRadius:'6px',background:'#F1F5F9',marginBottom:'8px',width:'65%'}}/>
            <div style={{height:'11px',borderRadius:'6px',background:'#F8FAFC',width:'45%'}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

interface NegCardProps{n:Negocio;abierto:boolean;rating?:number;dist?:number|null;fav:boolean;onFav:()=>void;horsTiene:boolean}
function NegCard({n,abierto,rating,dist,fav,onFav,horsTiene}:NegCardProps){
  const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
  const portada=(n.fotos&&n.fotos[0])||null
  const tipoLimpio=n.tipo?.replace(/^[\p{Emoji}\s]*/u,'').replace(/\s*\/\s*.*/,'').trim()||n.tipo
  return(
    <Link href={`/negocio/${n.id}`} style={{display:'block',textDecoration:'none',color:'inherit'}}>
      <div className="ncard">
        <div className="ncard-cover">
          {portada
            ?<img src={portada} alt={n.nombre} className="ncard-img"/>
            :<div className="ncard-ph" style={{background:cfg.grad}}><span style={{fontSize:'54px'}}>{cfg.emoji}</span></div>
          }
          {portada&&<div className="ncard-overlay"/>}
          {horsTiene&&(
            <span className={abierto?'badge-open':'badge-closed'}>
              <span style={{width:'6px',height:'6px',borderRadius:'50%',background:abierto?'#4ADE80':'rgba(255,255,255,0.5)',display:'inline-block'}}/>
              {abierto?'Abierto':'Cerrado'}
            </span>
          )}
          <button className="btn-fav" onClick={e=>{e.preventDefault();e.stopPropagation();onFav()}}>
            <span style={{fontSize:'15px'}}>{fav?'❤️':'🤍'}</span>
          </button>
          <div className="ncard-logo" style={{background:n.logo_url?'white':cfg.bg}}>
            {n.logo_url?<img src={n.logo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'16px'}}>{cfg.emoji}</span>}
          </div>
        </div>
        <div className="ncard-body">
          <div className="ncard-nombre">{n.nombre}</div>
          <div className="ncard-row">
            <span className="ncard-tipo" style={{background:cfg.bg,color:cfg.color}}>{tipoLimpio}</span>
            {n.ciudad&&<span className="ncard-ciudad">📍 {n.ciudad}</span>}
          </div>
          <div className="ncard-row" style={{marginBottom:'12px'}}>
            {rating!=null&&<span className="ncard-rating">⭐ {rating}</span>}
            {dist!=null&&<span className="ncard-dist">{dist<1?`${Math.round(dist*1000)}m`:`${dist.toFixed(1)}km`}</span>}
          </div>
          <Link href={`/negocio/${n.id}`} className="btn-reservar" onClick={e=>e.stopPropagation()}>Reservar →</Link>
        </div>
      </div>
    </Link>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function ClienteContent(){
  const router=useRouter()
  const searchParams=useSearchParams()
  const tab=(searchParams?.get('tab')||'inicio') as string

  const[cat,setCat]=useState('todos')
  const[q,setQ]=useState('')
  const[nombre,setNombre]=useState('Usuario')
  const[email,setEmail]=useState('')
  const[favs,setFavs]=useState<string[]>([])
  const[negocios,setNegocios]=useState<Negocio[]>([])
  const[cargando,setCargando]=useState(true)
  const[filtro,setFiltro]=useState<Filtro>('ninguno')
  const[pos,setPos]=useState<{lat:number;lng:number}|null>(null)
  const[geoErr,setGeoErr]=useState(false)
  const[hors,setHors]=useState<Record<string,HorarioDB[]>>({})
  const[vals,setVals]=useState<Record<string,number>>({})
  const[reservas,setReservas]=useState<ReservaCliente[]>([])
  const[cancelando,setCancelando]=useState<string|null>(null)

  useEffect(()=>{
    supabase.auth.getUser().then(async({data:{user}})=>{
      if(!user){window.location.href='/auth';return}
      setNombre(user.user_metadata?.nombre?.split(' ')[0]||user.email?.split('@')[0]||'Usuario')
      setEmail(user.email||'')
      const{data:rd}=await supabase
        .from('reservas')
        .select('id,fecha,hora,estado,negocio_id,negocios(nombre,tipo),servicios(nombre)')
        .eq('cliente_email',user.email)
        .order('fecha',{ascending:true})
        .limit(20)
      if(rd) setReservas((rd as any[]).map(r=>({
        id:r.id,fecha:r.fecha,hora:r.hora,estado:r.estado,
        negocio_id:r.negocio_id,
        negocio_nombre:r.negocios?.nombre||'Negocio',
        servicio_nombre:r.servicios?.nombre||'Servicio',
        negocio_tipo:r.negocios?.tipo||'',
      })))
    })
    Promise.all([
      supabase.from('negocios').select('id,nombre,tipo,ciudad,logo_url,fotos,descripcion,visible'),
      supabase.from('horarios').select('negocio_id,dia,abierto,hora_apertura,hora_cierre,hora_apertura2,hora_cierre2'),
      supabase.from('resenas').select('negocio_id,valoracion'),
    ]).then(([{data:ns},{data:hs},{data:rs}])=>{
      if(ns) setNegocios(ns.filter((n:any)=>n.visible!==false))
      if(hs){
        const m:Record<string,HorarioDB[]>={}
        for(const h of hs as HorarioDB[]){if(!m[h.negocio_id])m[h.negocio_id]=[];m[h.negocio_id].push(h)}
        setHors(m)
      }
      if(rs){
        const sums:Record<string,{t:number;c:number}>={}
        for(const r of rs as{negocio_id:string;valoracion:number}[]){
          if(!sums[r.negocio_id])sums[r.negocio_id]={t:0,c:0}
          sums[r.negocio_id].t+=r.valoracion;sums[r.negocio_id].c++
        }
        const avg:Record<string,number>={}
        for(const[id,s]of Object.entries(sums))avg[id]=Math.round((s.t/s.c)*10)/10
        setVals(avg)
      }
      setCargando(false)
    })
  },[])

  async function cancelarReserva(id:string){
    setCancelando(id)
    await supabase.from('reservas').update({estado:'cancelada'}).eq('id',id)
    setReservas(prev=>prev.map(r=>r.id===id?{...r,estado:'cancelada'}:r))
    setCancelando(null)
  }

  const toggleFav=(id:string)=>setFavs(p=>p.includes(id)?p.filter(f=>f!==id):[...p,id])

  const negFiltrados=negocios.filter(n=>{
    const mc=cat==='todos'||normTipo(n.tipo||'')===cat
    const mq=!q||norm(n.nombre).includes(norm(q))
    return mc&&mq
  })

  let negMostrados=[...negFiltrados]
  if(filtro==='abierto')   negMostrados=negMostrados.filter(n=>estaAbierto(hors[n.id]||[]))
  else if(filtro==='valorados') negMostrados=[...negMostrados].sort((a,b)=>(vals[b.id]??0)-(vals[a.id]??0))
  else if(filtro==='cercanos'&&pos) negMostrados=[...negMostrados].filter(n=>n.lat&&n.lng).sort((a,b)=>haversineKm(pos.lat,pos.lng,a.lat!,a.lng!)-haversineKm(pos.lat,pos.lng,b.lat!,b.lng!))

  const negValTop=[...negocios].filter(n=>vals[n.id]!=null).sort((a,b)=>(vals[b.id]??0)-(vals[a.id]??0)).slice(0,8)
  const proximasReservas=reservas.filter(r=>r.estado!=='cancelada'&&r.fecha>=new Date().toISOString().slice(0,10))

  function pedir geo(f:Filtro){
    if(filtro===f){setFiltro('ninguno');return}
    if(f==='cercanos'){
      if(pos){setFiltro('cercanos');return}
      navigator.geolocation?.getCurrentPosition(
        p=>{setPos({lat:p.coords.latitude,lng:p.coords.longitude});setFiltro('cercanos')},
        ()=>{setGeoErr(true);setTimeout(()=>setGeoErr(false),3000)},
        {timeout:8000}
      );return
    }
    setFiltro(f)
  }

  const hNow=new Date().getHours()
  const saludo=hNow<12?'Buenos días':hNow<20?'Buenas tardes':'Buenas noches'

  // ─── Render ───

  return(
  <div style={{minHeight:'100vh',background:'#F8FAFC',fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#0F172A'}}>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      html,body{background:#F8FAFC!important;color:#0F172A!important;color-scheme:light only!important}
      :root{--cols:3}
      @keyframes sk{0%{background-position:400% 0}100%{background-position:-400% 0}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      .fade{animation:fadeUp 0.3s ease}

      /* TOP NAV */
      .tnav{position:fixed;top:0;left:0;right:0;z-index:200;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;background:rgba(248,250,252,0.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,0.06)}
      .tnav-links{display:flex;gap:24px}
      .tnav-links a{color:#64748B;text-decoration:none;font-size:14px;font-weight:600;transition:color 0.15s}
      .tnav-links a:hover,.tnav-links a.on{color:#0F172A}
      .tnav-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#B8D8F8,#D4C5F9);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#1D4ED8;text-decoration:none;flex-shrink:0}

      /* HERO */
      .hero{padding:40px 48px 36px;background:linear-gradient(160deg,#EFF6FF 0%,#F5F3FF 55%,#ECFDF5 100%);position:relative;overflow:hidden}
      .hero::before{content:'';position:absolute;top:-80px;right:-40px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(184,216,248,0.6) 0%,transparent 65%);pointer-events:none}
      .hero::after{content:'';position:absolute;bottom:-60px;left:5%;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(212,197,249,0.5) 0%,transparent 65%);pointer-events:none}
      .hero-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#7C3AED;background:rgba(124,58,237,0.08);padding:5px 12px;border-radius:100px;margin-bottom:12px;letter-spacing:0.3px}
      .hero-title{font-size:clamp(24px,3.5vw,38px);font-weight:900;color:#0F172A;letter-spacing:-1px;line-height:1.15;margin-bottom:6px}
      .hero-sub{font-size:15px;color:#64748B;font-weight:500;margin-bottom:24px}
      .sbar{display:flex;align-items:center;gap:10px;background:white;border:1.5px solid rgba(0,0,0,0.08);border-radius:18px;padding:14px 18px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;transition:all 0.2s}
      .sbar:focus-within{border-color:#6366F1;box-shadow:0 4px 24px rgba(99,102,241,0.15)}
      .sbar input{flex:1;border:none;background:transparent;font-family:inherit;font-size:15px;color:#0F172A;outline:none;font-weight:500}
      .sbar input::placeholder{color:#94A3B8;font-weight:400}

      /* CATS */
      .cats-bar{background:white;border-bottom:1px solid #F1F5F9;padding:0 48px}
      .cats-inner{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:12px 0}
      .cats-inner::-webkit-scrollbar{display:none}
      .catbtn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:16px;border:1.5px solid transparent;background:none;font-family:inherit;font-size:11px;font-weight:800;color:#64748B;white-space:nowrap;flex-shrink:0;cursor:pointer;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.4px}
      .catbtn .ico{font-size:24px;line-height:1}
      .catbtn:hover{background:#F8FAFC;color:#0F172A}
      .catbtn.on{background:#0F172A;color:white;border-color:#0F172A}

      /* FILTERS */
      .fbar{padding:10px 48px;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;background:#F8FAFC}
      .fbar::-webkit-scrollbar{display:none}
      .fchip{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:100px;border:1.5px solid #E2E8F0;background:white;font-family:inherit;font-size:12px;font-weight:700;color:#475569;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all 0.15s}
      .fchip:hover{border-color:#0F172A;color:#0F172A}
      .fchip.on{background:#0F172A;border-color:#0F172A;color:white}

      /* CONTENT */
      .content{padding:28px 48px 120px}
      .sec{margin-bottom:36px}
      .sec-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
      .sec-t{font-size:20px;font-weight:900;color:#0F172A;letter-spacing:-0.5px}
      .sec-l{font-size:13px;color:#6366F1;font-weight:700;text-decoration:none}
      .sec-l:hover{color:#4F46E5}

      /* HORIZONTAL SCROLL CARDS */
      .hscroll{display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px}
      .hscroll::-webkit-scrollbar{display:none}

      /* CITA MINI CARD */
      .cita-c{background:white;border:1px solid #F1F5F9;border-radius:18px;padding:16px;min-width:186px;flex-shrink:0;box-shadow:0 2px 10px rgba(0,0,0,0.05)}

      /* NEG CARD */
      .ncard{background:white;border-radius:22px;overflow:hidden;border:1px solid #F1F5F9;box-shadow:0 2px 14px rgba(0,0,0,0.06);transition:transform 0.22s cubic-bezier(.34,1.56,.64,1),box-shadow 0.22s}
      .ncard:hover{transform:translateY(-5px);box-shadow:0 16px 40px rgba(0,0,0,0.12)}
      .ncard-cover{position:relative;width:100%;aspect-ratio:4/3;overflow:hidden;background:#F1F5F9}
      .ncard-img{width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease}
      .ncard:hover .ncard-img{transform:scale(1.04)}
      .ncard-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
      .ncard-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,23,42,0.6) 0%,transparent 55%)}
      .badge-open{position:absolute;top:11px;left:11px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(34,197,94,0.9);color:white;backdrop-filter:blur(6px)}
      .badge-closed{position:absolute;top:11px;left:11px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(15,23,42,0.55);color:rgba(255,255,255,0.8);backdrop-filter:blur(6px)}
      .btn-fav{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:transform 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
      .btn-fav:hover{transform:scale(1.18)}
      .ncard-logo{position:absolute;bottom:-16px;left:14px;width:38px;height:38px;border-radius:11px;border:3px solid white;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center}
      .ncard-body{padding:24px 14px 14px}
      .ncard-nombre{font-size:15px;font-weight:800;color:#0F172A;margin-bottom:6px;line-height:1.3;letter-spacing:-0.2px}
      .ncard-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px}
      .ncard-tipo{font-size:11px;font-weight:700;padding:3px 8px;border-radius:100px}
      .ncard-ciudad{font-size:12px;color:#94A3B8;font-weight:500}
      .ncard-rating{font-size:12px;font-weight:800;color:#D97706}
      .ncard-dist{font-size:12px;color:#94A3B8;font-weight:500}
      .btn-reservar{display:block;width:100%;padding:11px;background:#0F172A;color:white;border:none;border-radius:13px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;transition:background 0.15s;letter-spacing:-0.1px}
      .btn-reservar:hover{background:#6366F1}

      /* HORIZONTAL NEG CARD (top valorados) */
      .hn-card{background:white;border:1px solid #F1F5F9;border-radius:18px;overflow:hidden;min-width:220px;flex-shrink:0;box-shadow:0 2px 10px rgba(0,0,0,0.05);transition:transform 0.2s}
      .hn-card:hover{transform:translateY(-3px)}
      .hn-cover{width:100%;height:130px;object-fit:cover;display:block}
      .hn-ph{width:100%;height:130px;display:flex;align-items:center;justify-content:center;font-size:42px}
      .hn-body{padding:12px}

      /* RESERVA CARD */
      .rcard{background:white;border:1px solid #F1F5F9;border-radius:20px;padding:18px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.04)}
      .rcard-head{display:flex;align-items:center;gap:14px;margin-bottom:14px}
      .rcard-ico{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
      .rcard-actions{display:flex;gap:8px}
      .btn-cancel{padding:9px 16px;border-radius:11px;border:1.5px solid #FCA5A5;background:rgba(254,202,202,0.3);color:#DC2626;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s}
      .btn-cancel:hover{background:#FEE2E2;border-color:#F87171}
      .btn-repetir{padding:9px 16px;border-radius:11px;border:none;background:#0F172A;color:white;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:background 0.15s}
      .btn-repetir:hover{background:#6366F1}

      /* BADGE ESTADO */
      .est-conf{font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(34,197,94,0.1);color:#059669}
      .est-pend{font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(251,191,36,0.15);color:#D97706}
      .est-canc{font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(239,68,68,0.1);color:#DC2626}

      /* PERFIL */
      .perf-hero{background:linear-gradient(135deg,#EFF6FF 0%,#F5F3FF 100%);border-radius:24px;padding:28px;margin-bottom:18px;display:flex;align-items:center;gap:18px;border:1px solid rgba(99,102,241,0.08)}
      .perf-av{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#B8D8F8,#D4C5F9);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#1D4ED8;flex-shrink:0;box-shadow:0 6px 20px rgba(99,102,241,0.25)}
      .perf-menu{background:white;border:1px solid #F1F5F9;border-radius:20px;overflow:hidden;margin-bottom:14px}
      .perf-item{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid #F8FAFC;text-decoration:none;transition:background 0.12s}
      .perf-item:last-child{border-bottom:none}
      .perf-item:hover{background:#F8FAFC}

      /* EMPTY */
      .empty{text-align:center;padding:80px 20px}
      .empty-ico{width:92px;height:92px;border-radius:28px;display:flex;align-items:center;justify-content:center;font-size:44px;margin:0 auto 20px}

      /* GRID */
      .neg-grid{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:20px}

      /* TOAST */
      .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#0F172A;color:white;padding:11px 22px;border-radius:100px;font-size:13px;font-weight:700;z-index:300;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,0.25);pointer-events:none}

      /* BOTTOM NAV */
      .bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,0.97);border-top:1px solid #F1F5F9;z-index:200;backdrop-filter:blur(20px)}
      .bnav-inner{display:flex;align-items:center;padding:6px 0 max(10px,env(safe-area-inset-bottom))}
      .bnav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;text-decoration:none}
      .bnav-ico{font-size:9px;font-weight:900;letter-spacing:-0.5px;color:#94A3B8;line-height:1}
      .bnav-lbl{font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:0.2px}
      .bnav-item.on .bnav-lbl{color:#0F172A}
      .bnav-item.on .bnav-ico{color:#0F172A}
      .bnav-dot{width:4px;height:4px;border-radius:50%;background:#6366F1;margin:1px auto 0}

      /* RESPONSIVE */
      @media(max-width:1200px){:root{--cols:2}}
      @media(max-width:900px){
        .tnav{padding:0 20px}
        .tnav-links{display:none}
        .hero{padding:24px 20px 28px}
        .cats-bar{padding:0 20px}
        .fbar{padding:8px 20px}
        .content{padding:20px 20px 110px}
        .bnav{display:block}
      }
      @media(max-width:600px){
        :root{--cols:1}
        .neg-grid{gap:14px}
        .sbar input{font-size:16px}
      }
    `}</style>

    {/* ── TOP NAV ── */}
    <div className="tnav">
      <Link href="/" style={{textDecoration:'none'}}><Logo/></Link>
      <div className="tnav-links">
        {TABS.slice(0,4).map(t=>(
          <Link key={t.id} href={`/cliente?tab=${t.id}`} className={tab===t.id?'on':''}>{t.label}</Link>
        ))}
      </div>
      <Link href="/cliente?tab=perfil" className="tnav-av">{nombre.charAt(0).toUpperCase()}</Link>
    </div>

    <div style={{paddingTop:'60px',minHeight:'100vh'}}>

      {/* ══════════ INICIO ══════════ */}
      {tab==='inicio'&&(
        <div className="fade">
          {/* HERO */}
          <div className="hero">
            <div className="hero-tag">✦ Reserva en segundos</div>
            <div className="hero-title">
              {saludo}, {nombre}
            </div>
            <div className="hero-sub">¿Qué buscas hoy?</div>
            <div className="sbar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Buscar negocios..." value={q} onChange={e=>setQ(e.target.value)}/>
              {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8',fontSize:'16px',padding:0}}>✕</button>}
            </div>
          </div>

          {/* CATEGORÍAS */}
          <div className="cats-bar">
            <div className="cats-inner">
              {CATEGORIAS.map(c=>(
                <button key={c.id} className={`catbtn ${cat===c.id?'on':''}`} onClick={()=>setCat(c.id)}>
                  <span className="ico">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* FILTROS */}
          <div className="fbar">
            <button className={`fchip ${filtro==='abierto'?'on':''}`} onClick={()=>pedir geo('abierto')}>🟢 Abierto ahora</button>
            <button className={`fchip ${filtro==='valorados'?'on':''}`} onClick={()=>pedir geo('valorados')}>⭐ Mejor valorados</button>
            <button className={`fchip ${filtro==='cercanos'?'on':''}`} onClick={()=>pedir geo('cercanos')}>📍 Más cercanos</button>
            {filtro!=='ninguno'&&<button className="fchip" style={{color:'#DC2626',borderColor:'rgba(220,38,38,0.2)'}} onClick={()=>setFiltro('ninguno')}>✕ Limpiar</button>}
          </div>
          {geoErr&&<div className="toast">📍 Activa la ubicación en tu navegador</div>}

          <div className="content">

            {/* CITAS PRÓXIMAS */}
            {proximasReservas.length>0&&!q&&cat==='todos'&&(
              <div className="sec">
                <div className="sec-h">
                  <span className="sec-t">Tus próximas citas</span>
                  <Link href="/cliente?tab=reservas" className="sec-l">Ver todas →</Link>
                </div>
                <div className="hscroll">
                  {proximasReservas.slice(0,5).map(r=>{
                    const cfg=TIPO_CFG[normTipo(r.negocio_tipo||'')]||TIPO_DEF
                    return(
                      <div key={r.id} className="cita-c">
                        <div style={{width:'40px',height:'40px',borderRadius:'13px',background:cfg.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',marginBottom:'10px'}}>{cfg.emoji}</div>
                        <div style={{fontSize:'13px',fontWeight:800,color:'#0F172A',marginBottom:'2px'}}>{r.negocio_nombre}</div>
                        <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'10px'}}>{r.servicio_nombre}</div>
                        <div style={{fontSize:'11px',fontWeight:700,padding:'5px 10px',borderRadius:'9px',background:cfg.bg,color:cfg.color,display:'inline-flex',alignItems:'center',gap:'4px'}}>📅 {formatFecha(r.fecha)} · {r.hora}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MEJOR VALORADOS (solo si hay ratings y no hay búsqueda activa) */}
            {negValTop.length>0&&!q&&cat==='todos'&&filtro==='ninguno'&&(
              <div className="sec">
                <div className="sec-h">
                  <span className="sec-t">⭐ Mejor valorados</span>
                </div>
                <div className="hscroll">
                  {negValTop.map(n=>{
                    const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                    const portada=(n.fotos&&n.fotos[0])||null
                    return(
                      <Link key={n.id} href={`/negocio/${n.id}`} style={{textDecoration:'none',color:'inherit'}}>
                        <div className="hn-card">
                          {portada
                            ?<img src={portada} alt={n.nombre} className="hn-cover"/>
                            :<div className="hn-ph" style={{background:cfg.grad}}>{cfg.emoji}</div>
                          }
                          <div className="hn-body">
                            <div style={{fontSize:'13px',fontWeight:800,color:'#0F172A',marginBottom:'3px'}}>{n.nombre}</div>
                            <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'6px'}}>{n.ciudad||''}</div>
                            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                              <span style={{fontSize:'12px',fontWeight:800,color:'#D97706'}}>⭐ {vals[n.id]}</span>
                              <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',background:cfg.bg,color:cfg.color}}>{n.tipo?.replace(/^[\p{Emoji}\s]*/u,'').replace(/\s*\/.*/,'').trim()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* GRID PRINCIPAL */}
            <div className="sec">
              <div className="sec-h">
                <span className="sec-t">
                  {q?`"${q}"`:cat==='todos'?'Cerca de ti':CATEGORIAS.find(c=>c.id===cat)?.label}
                </span>
                <Link href="/cliente?tab=mapa" className="sec-l">Ver en mapa →</Link>
              </div>

              {cargando?(
                <Skeleton/>
              ):negocios.length===0?(
                <div className="empty">
                  <div className="empty-ico" style={{background:'linear-gradient(135deg,#EFF6FF,#F5F3FF)'}}>🏙️</div>
                  <div style={{fontSize:'21px',fontWeight:900,color:'#0F172A',marginBottom:'8px',letterSpacing:'-0.5px'}}>Descubre negocios cerca de ti</div>
                  <div style={{fontSize:'14px',color:'#94A3B8',lineHeight:1.6,maxWidth:'260px',margin:'0 auto'}}>Pronto habrá más negocios disponibles en tu zona</div>
                </div>
              ):negMostrados.length===0?(
                <div className="empty">
                  <div className="empty-ico" style={{background:'#F1F5F9'}}>🔍</div>
                  <div style={{fontSize:'20px',fontWeight:900,color:'#0F172A',marginBottom:'8px'}}>Sin resultados</div>
                  <div style={{fontSize:'14px',color:'#94A3B8'}}>Prueba con otro nombre o categoría</div>
                </div>
              ):(
                <div className="neg-grid">
                  {negMostrados.map(n=>(
                    <NegCard key={n.id} n={n}
                      abierto={estaAbierto(hors[n.id]||[])}
                      rating={vals[n.id]}
                      dist={pos&&n.lat&&n.lng?haversineKm(pos.lat,pos.lng,n.lat,n.lng):null}
                      fav={favs.includes(n.id)}
                      onFav={()=>toggleFav(n.id)}
                      horsTiene={(hors[n.id]||[]).length>0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MAPA ══════════ */}
      {tab==='mapa'&&(
        <div style={{height:'calc(100vh - 60px)'}}>
          <MapaNegocios
            negocios={negocios.filter(n=>n.lat&&n.lng).map(n=>({id:n.id,nombre:n.nombre,tipo:n.tipo,ciudad:n.ciudad,logo_url:n.logo_url,lat:n.lat!,lng:n.lng!}))}
            valPorNeg={vals}
            userPos={pos}
          />
        </div>
      )}

      {/* ══════════ RESERVAS ══════════ */}
      {tab==='reservas'&&(
        <div className="content fade">
          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'26px',fontWeight:900,color:'#0F172A',letterSpacing:'-0.6px',marginBottom:'4px'}}>Mis reservas</div>
            <div style={{fontSize:'14px',color:'#64748B'}}>Historial completo de citas</div>
          </div>

          {reservas.length===0?(
            <div className="empty">
              <div className="empty-ico" style={{background:'linear-gradient(135deg,#EFF6FF,#F5F3FF)'}}>📅</div>
              <div style={{fontSize:'21px',fontWeight:900,color:'#0F172A',marginBottom:'8px'}}>Sin reservas aún</div>
              <div style={{fontSize:'14px',color:'#94A3B8',marginBottom:'24px'}}>Reserva una cita en cualquier negocio</div>
              <Link href="/cliente?tab=inicio" style={{display:'inline-block',padding:'14px 28px',background:'#0F172A',color:'white',borderRadius:'14px',textDecoration:'none',fontSize:'14px',fontWeight:800}}>Explorar negocios</Link>
            </div>
          ):(
            <>
              {/* Próximas */}
              {proximasReservas.length>0&&(
                <>
                  <div style={{fontSize:'13px',fontWeight:800,color:'#6366F1',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'12px'}}>Próximas</div>
                  {proximasReservas.map(r=>{
                    const cfg=TIPO_CFG[normTipo(r.negocio_tipo||'')]||TIPO_DEF
                    return(
                      <div key={r.id} className="rcard">
                        <div className="rcard-head">
                          <div className="rcard-ico" style={{background:cfg.grad}}>{cfg.emoji}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'15px',fontWeight:800,color:'#0F172A',marginBottom:'2px'}}>{r.negocio_nombre}</div>
                            <div style={{fontSize:'13px',color:'#64748B',marginBottom:'4px'}}>{r.servicio_nombre}</div>
                            <div style={{fontSize:'12px',fontWeight:700,color:'#6366F1'}}>📅 {formatFecha(r.fecha)} · {r.hora}</div>
                          </div>
                          <span className="est-conf">Confirmada</span>
                        </div>
                        <div className="rcard-actions">
                          <button className="btn-cancel" onClick={()=>cancelarReserva(r.id)} disabled={cancelando===r.id}>
                            {cancelando===r.id?'..':'Cancelar'}
                          </button>
                          <Link href={`/negocio/${r.negocio_id}/reservar`} className="btn-repetir">Repetir →</Link>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
              {/* Pasadas/canceladas */}
              {reservas.filter(r=>r.estado==='cancelada'||r.fecha<new Date().toISOString().slice(0,10)).length>0&&(
                <>
                  <div style={{fontSize:'13px',fontWeight:800,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.8px',margin:'24px 0 12px'}}>Historial</div>
                  {reservas.filter(r=>r.estado==='cancelada'||r.fecha<new Date().toISOString().slice(0,10)).map(r=>{
                    const cfg=TIPO_CFG[normTipo(r.negocio_tipo||'')]||TIPO_DEF
                    const esCancelada=r.estado==='cancelada'
                    return(
                      <div key={r.id} className="rcard" style={{opacity:0.65}}>
                        <div className="rcard-head">
                          <div className="rcard-ico" style={{background:cfg.grad,filter:'grayscale(0.3)'}}>{cfg.emoji}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'15px',fontWeight:800,color:'#0F172A',marginBottom:'2px'}}>{r.negocio_nombre}</div>
                            <div style={{fontSize:'13px',color:'#64748B',marginBottom:'4px'}}>{r.servicio_nombre}</div>
                            <div style={{fontSize:'12px',fontWeight:700,color:'#94A3B8'}}>📅 {formatFecha(r.fecha)} · {r.hora}</div>
                          </div>
                          <span className={esCancelada?'est-canc':'est-pend'} style={{opacity:1}}>{esCancelada?'Cancelada':'Completada'}</span>
                        </div>
                        <div className="rcard-actions">
                          <Link href={`/negocio/${r.negocio_id}/reservar`} className="btn-repetir">Repetir →</Link>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ FAVORITOS ══════════ */}
      {tab==='favoritos'&&(
        <div className="content fade">
          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'26px',fontWeight:900,color:'#0F172A',letterSpacing:'-0.6px',marginBottom:'4px'}}>Guardados</div>
            <div style={{fontSize:'14px',color:'#64748B'}}>Tus negocios favoritos</div>
          </div>
          {favs.length===0?(
            <div className="empty">
              <div className="empty-ico" style={{background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)'}}>❤️</div>
              <div style={{fontSize:'21px',fontWeight:900,color:'#0F172A',marginBottom:'8px'}}>Sin favoritos aún</div>
              <div style={{fontSize:'14px',color:'#94A3B8'}}>Pulsa 🤍 en cualquier negocio para guardarlo</div>
            </div>
          ):(
            <div className="neg-grid">
              {negocios.filter(n=>favs.includes(n.id)).map(n=>(
                <NegCard key={n.id} n={n}
                  abierto={estaAbierto(hors[n.id]||[])}
                  rating={vals[n.id]}
                  dist={null}
                  fav={true}
                  onFav={()=>toggleFav(n.id)}
                  horsTiene={(hors[n.id]||[]).length>0}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ PERFIL ══════════ */}
      {tab==='perfil'&&(
        <div className="content fade">
          <div className="perf-hero">
            <div className="perf-av">{nombre.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{fontSize:'21px',fontWeight:900,color:'#0F172A',letterSpacing:'-0.4px',marginBottom:'3px'}}>{nombre}</div>
              {email&&<div style={{fontSize:'13px',color:'#64748B',marginBottom:'6px'}}>{email}</div>}
              <div style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'12px',fontWeight:700,color:'#6366F1',background:'rgba(99,102,241,0.08)',padding:'4px 10px',borderRadius:'100px'}}>✦ Cliente Khepria</div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'20px'}}>
            {[
              {label:'Reservas',val:reservas.filter(r=>r.estado!=='cancelada').length,color:'#6366F1',bg:'#F5F3FF'},
              {label:'Favoritos',val:favs.length,color:'#BE185D',bg:'#FDF2F8'},
              {label:'Completadas',val:reservas.filter(r=>r.fecha<new Date().toISOString().slice(0,10)&&r.estado!=='cancelada').length,color:'#059669',bg:'#F0FDF4'},
            ].map((s,i)=>(
              <div key={i} style={{background:s.bg,borderRadius:'16px',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:900,color:s.color,marginBottom:'2px'}}>{s.val}</div>
                <div style={{fontSize:'11px',fontWeight:700,color:s.color,opacity:0.7,textTransform:'uppercase',letterSpacing:'0.5px'}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="perf-menu">
            {[
              {icon:'📅',label:'Mis reservas',sub:'Ver historial completo',bg:'#EFF6FF',tab:'reservas'},
              {icon:'❤️',label:'Favoritos',sub:`${favs.length} negocios guardados`,bg:'#FDF2F8',tab:'favoritos'},
              {icon:'⭐',label:'Mis reseñas',sub:'Valora tus visitas',bg:'#FFFBEB',tab:''},
              {icon:'🎁',label:'Puntos y cupones',sub:'Tus beneficios',bg:'#F0FDF4',tab:''},
              {icon:'🔔',label:'Notificaciones',sub:'Avisos y recordatorios',bg:'#F5F3FF',tab:''},
              {icon:'⚙️',label:'Configuración',sub:'Cuenta y privacidad',bg:'#F8FAFC',tab:''},
            ].map((item,i)=>(
              <Link key={i} href={item.tab?`/cliente?tab=${item.tab}`:'#'} className="perf-item" style={{textDecoration:'none'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'12px',background:item.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>{item.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:700,color:'#0F172A',marginBottom:'1px'}}>{item.label}</div>
                  <div style={{fontSize:'12px',color:'#94A3B8'}}>{item.sub}</div>
                </div>
                <span style={{color:'#E2E8F0',fontSize:'20px'}}>›</span>
              </Link>
            ))}
          </div>

          <button
            style={{display:'block',width:'100%',padding:'16px',background:'rgba(239,68,68,0.07)',color:'#DC2626',border:'none',borderRadius:'18px',fontSize:'15px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',letterSpacing:'-0.2px'}}
            onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>

    {/* ── BOTTOM NAV ── */}
    <div className="bnav">
      <div className="bnav-inner">
        {TABS.map(t=>(
          <Link key={t.id} href={`/cliente?tab=${t.id}`} className={`bnav-item ${tab===t.id?'on':''}`}>
            <span className="bnav-ico">{t.icon}</span>
            <span className="bnav-lbl">{t.label}</span>
            {tab===t.id&&<div className="bnav-dot"/>}
          </Link>
        ))}
      </div>
    </div>
  </div>
  )
}

// ─── pedir geo helper (inside component scope, extracted for readability) ─────
// Note: defined inline above as `function pedir geo` — TypeScript will see it fine
// since it's hoisted. Actually we can't have spaces in function name. Let's keep it
// as `handleFiltro` inline.

export default function ClientePage(){
  return(<Suspense><ClienteContent/></Suspense>)
}
