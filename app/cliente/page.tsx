'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Suspense } from 'react'
import { useTheme } from '../components/ThemeProvider'
import { LanguageSelector } from '../components/LanguageSelector'

const MapaNegocios = dynamic(() => import('./MapaNegocios'), { ssr: false, loading: () => (
  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#F1F5F9', color:'#94A3B8', fontSize:'14px', fontWeight:600, gap:'8px' }}>
    <span style={{fontSize:'20px'}}>🗺️</span> Cargando mapa...
  </div>
) })

// ─── Datos ────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id:'peluqueria',  label:'Peluquería',  emoji:'💈' },
  { id:'estetica',    label:'Uñas',        emoji:'💅' },
  { id:'spa',         label:'Spa',         emoji:'💆' },
  { id:'clinica',     label:'Clínica',     emoji:'🏥' },
  { id:'dentista',    label:'Dentista',    emoji:'🦷' },
  { id:'veterinaria', label:'Veterinaria', emoji:'🐾' },
  { id:'yoga',        label:'Yoga',        emoji:'🧘' },
  { id:'gimnasio',    label:'Gimnasio',    emoji:'🏋️' },
  { id:'otros',       label:'Otros',       emoji:'🔧' },
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
  {id:'inicio',    icon:'🏠', label:'Inicio'},
  {id:'mapa',      icon:'🗺️', label:'Mapa'},
  {id:'buscar',    icon:'🔍', label:'Buscar'},
  {id:'favoritos', icon:'❤️', label:'Guardados'},
  {id:'perfil',    icon:'👤', label:'Perfil'},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Negocio      = {id:string;nombre:string;tipo:string;ciudad:string;direccion:string|null;logo_url:string|null;fotos:string[]|null;lat?:number|null;lng?:number|null;descripcion:string|null;visible:boolean|null;creado_en?:string}
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

interface NegCardProps{n:Negocio;abierto:boolean;rating?:number;dist?:number|null;fav:boolean;onFav:()=>void;horsTiene:boolean;onReservar?:(id:string)=>void}
function NegCard({n,abierto,rating,dist,fav,onFav,horsTiene,onReservar}:NegCardProps){
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
          <button className="btn-reservar" onClick={e=>{e.preventDefault();e.stopPropagation();onReservar?onReservar(n.id):(window.location.href=`/negocio/${n.id}`)}}>Reservar →</button>
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
  const{theme,toggle:toggleTheme}=useTheme()

  const[cats,setCats]=useState<string[]>([])
  const[q,setQ]=useState('')
  const[nombre,setNombre]=useState('Usuario')
  const[email,setEmail]=useState('')
  const[userId,setUserId]=useState<string|null>(null)
  const[favs,setFavs]=useState<string[]>([])
  const[negocios,setNegocios]=useState<Negocio[]>([])
  const[cargando,setCargando]=useState(true)
  const[panelOpen,setPanelOpen]=useState(false)
  const[filtro,setFiltro]=useState<Filtro>('ninguno')
  const[pos,setPos]=useState<{lat:number;lng:number}|null>(null)
  const[geoErr,setGeoErr]=useState(false)
  const[hors,setHors]=useState<Record<string,HorarioDB[]>>({})
  const[vals,setVals]=useState<Record<string,number>>({})
  const[reservas,setReservas]=useState<ReservaCliente[]>([])
  const[cancelando,setCancelando]=useState<string|null>(null)
  const[modalReservarNeg,setModalReservarNeg]=useState<string|null>(null)
  const[abiertoFiltro,setAbiertoFiltro]=useState(false)
  const[minRating,setMinRating]=useState(0)
  const[maxDist,setMaxDist]=useState<number|null>(null)
  const[sortBy,setSortBy]=useState<'relevancia'|'valorados'|'cercanos'|'recientes'>('relevancia')
  const[showAdvanced,setShowAdvanced]=useState(false)
  const[serviciosNombres,setServiciosNombres]=useState<Record<string,string[]>>({})


  // ── Geocodificación en background para negocios sin lat/lng ──────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function geocodificarSinCoordenadas(lista: any[]) {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!MAPBOX_TOKEN) return
    const sinCoords = lista.filter(n => n.lat == null || n.lng == null)
    if (!sinCoords.length) return

    for (const n of sinCoords) {
      const query = [n.direccion, n.ciudad].filter(Boolean).join(', ')
      if (!query) continue
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=es`
        )
        const json = await res.json()
        const [lng, lat] = json.features?.[0]?.center ?? []
        if (lng == null || lat == null) continue
        // Actualizar estado local inmediatamente
        setNegocios(prev => prev.map(p => p.id === n.id ? { ...p, lat, lng } : p))
        // Guardar en Supabase en background (sin bloquear)
        supabase.from('negocios').update({ lat, lng }).eq('id', n.id).then(() => {})
      } catch { /* ignorar errores de geocoding individuales */ }
    }
  }

  // Auto-request geolocation on load (quiet — only fires if previously allowed)
  useEffect(()=>{
    navigator.geolocation?.getCurrentPosition(
      p=>setPos({lat:p.coords.latitude,lng:p.coords.longitude}),
      ()=>{},
      {timeout:5000,maximumAge:300000}
    )
  },[])

  useEffect(()=>{
    // Optional auth — no redirect for guests
    supabase.auth.getSession().then(async({data:{session}})=>{
      const user = session?.user
      if(user){
        const userEmail = user.email || ''
        const uid       = user.id
        setNombre(user.user_metadata?.nombre?.split(' ')[0]||userEmail.split('@')[0]||'Usuario')
        setEmail(userEmail)
        setUserId(uid)

        // Cargar favoritos desde Supabase
        try {
          const { data: favsData } = await supabase.from('favoritos').select('negocio_id').eq('user_id', uid)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (favsData) setFavs(favsData.map((f: any) => f.negocio_id))
        } catch {
          try { const lf = localStorage.getItem('favs'); if (lf) setFavs(JSON.parse(lf)) } catch {}
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function normalizeRow(r: any): ReservaCliente {
          return {
            id:r.id, fecha:r.fecha, hora:r.hora, estado:r.estado,
            negocio_id:r.negocio_id,
            negocio_nombre:Array.isArray(r.negocios)?r.negocios[0]?.nombre:r.negocios?.nombre||'Negocio',
            servicio_nombre:Array.isArray(r.servicios)?r.servicios[0]?.nombre:r.servicios?.nombre||'Servicio',
            negocio_tipo:Array.isArray(r.negocios)?r.negocios[0]?.tipo:r.negocios?.tipo||'',
          }
        }
        const seen = new Set<string>()
        const allRows: ReservaCliente[] = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function mergeRows(rows: any[]){ rows.forEach(r=>{if(!seen.has(r.id)){seen.add(r.id);allRows.push(normalizeRow(r))}}) }

        if (userEmail) {
          const { data: byEmail } = await supabase.from('reservas')
            .select('id,fecha,hora,estado,negocio_id,negocios(nombre,tipo),servicios(nombre)')
            .eq('cliente_email', userEmail).order('fecha',{ascending:false}).limit(50)
          if (byEmail) mergeRows(byEmail)
        }
        try {
          const { data: byUid, error: errUid } = await supabase.from('reservas')
            .select('id,fecha,hora,estado,negocio_id,negocios(nombre,tipo),servicios(nombre)')
            .eq('user_id', uid).order('fecha',{ascending:false}).limit(50)
          if (!errUid && byUid) mergeRows(byUid)
        } catch { /* columna user_id no existe — ignorar */ }

        allRows.sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.hora.localeCompare(a.hora))
        setReservas(allRows)
      }
    })

    // Negocios: público, sin auth
    const negKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const negUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL||''}/rest/v1/negocios?visible=eq.true&select=id,nombre,tipo,ciudad,direccion,logo_url,fotos,lat,lng,descripcion,visible,creado_en`
    fetch(negUrl, { headers: { 'apikey': negKey, 'Authorization': `Bearer ${negKey}` } })
      .then(r => r.ok ? r.json() : null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((ns: any) => {
        if (Array.isArray(ns)) { setNegocios(ns); geocodificarSinCoordenadas(ns) }
        setCargando(false)
      })
      .catch(() => setCargando(false))

    // Horarios y reseñas: público
    Promise.all([
      supabase.from('horarios').select('negocio_id,dia,abierto,hora_apertura,hora_cierre,hora_apertura2,hora_cierre2'),
      supabase.from('resenas').select('negocio_id,valoracion'),
      supabase.from('servicios').select('negocio_id,nombre'),
    ]).then(([{data:hs},{data:rs},{data:sv}])=>{
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
      if(sv){
        const snm:Record<string,string[]>={}
        for(const s of sv as{negocio_id:string;nombre:string}[]){
          if(!snm[s.negocio_id])snm[s.negocio_id]=[]
          snm[s.negocio_id].push(s.nombre)
        }
        setServiciosNombres(snm)
      }
    }).catch(()=>{})
  },[])

  async function cancelarReserva(id:string){
    setCancelando(id)
    await supabase.from('reservas').update({estado:'cancelada'}).eq('id',id)
    setReservas(prev=>prev.map(r=>r.id===id?{...r,estado:'cancelada'}:r))
    setCancelando(null)
  }

  const toggleFav=async(negocioId:string)=>{
    const uid=userId
    const adding=!favs.includes(negocioId)
    // Actualizar estado local inmediatamente
    setFavs(p=>adding?[...p,negocioId]:p.filter(f=>f!==negocioId))
    // Persistir
    if(uid){
      if(adding){
        const {error}=await supabase.from('favoritos').insert({user_id:uid,negocio_id:negocioId})
        if(error&&error.code!=='23505') console.error('[favs] insert error:',error)
      } else {
        await supabase.from('favoritos').delete().eq('user_id',uid).eq('negocio_id',negocioId)
      }
    } else {
      // Fallback localStorage si no hay sesión
      try{const nf=favs.filter(f=>f!==negocioId);if(adding)nf.push(negocioId);localStorage.setItem('favs',JSON.stringify(nf))}catch{}
    }
  }

  function handleReservar(negId:string){
    if(!userId){setModalReservarNeg(negId);return}
    window.location.href=`/negocio/${negId}/reservar`
  }

  function toggleCat(id:string){
    setCats(prev=>prev.includes(id)?prev.filter(c=>c!==id):[...prev,id])
  }

  const KNOWN_TIPOS = ['peluqueria','barberia','estetica','spa','clinica','yoga','gimnasio','dentista','veterinaria','restaurante']
  function matchCat(tipo:string, selCats:string[]):boolean{
    if(selCats.length===0) return true
    const nt=normTipo(tipo||'')
    const esOtro=!KNOWN_TIPOS.includes(nt)
    return selCats.some(c=>c==='otros'?esOtro:c===nt)
  }

  const negFiltrados=negocios.filter(n=>{
    const mc=matchCat(n.tipo||'',cats)
    const nq=norm(q)
    const mq=!q||
      norm(n.nombre).includes(nq)||
      norm(n.ciudad||'').includes(nq)||
      norm(n.tipo||'').includes(nq)||
      (serviciosNombres[n.id]||[]).some(s=>norm(s).includes(nq))
    return mc&&mq
  })

  let negMostrados=[...negFiltrados]
  if(filtro==='abierto'||abiertoFiltro) negMostrados=negMostrados.filter(n=>estaAbierto(hors[n.id]||[]))
  if(minRating>0) negMostrados=negMostrados.filter(n=>(vals[n.id]??0)>=minRating)
  if(maxDist!=null&&pos) negMostrados=negMostrados.filter(n=>n.lat&&n.lng&&haversineKm(pos.lat,pos.lng,n.lat,n.lng)<=maxDist)
  const efectSort=sortBy!=='relevancia'?sortBy:filtro==='valorados'?'valorados':filtro==='cercanos'?'cercanos':null
  if(efectSort==='valorados') negMostrados=[...negMostrados].sort((a,b)=>(vals[b.id]??0)-(vals[a.id]??0))
  else if(efectSort==='cercanos'&&pos) negMostrados=[...negMostrados].filter(n=>n.lat&&n.lng).sort((a,b)=>haversineKm(pos.lat,pos.lng,a.lat!,a.lng!)-haversineKm(pos.lat,pos.lng,b.lat!,b.lng!))
  else if(efectSort==='recientes') negMostrados=[...negMostrados].sort((a,b)=>(b.creado_en??'').localeCompare(a.creado_en??''))
  else if(pos) negMostrados=[...negMostrados].sort((a,b)=>{
    if(a.lat&&a.lng&&b.lat&&b.lng) return haversineKm(pos.lat,pos.lng,a.lat,a.lng)-haversineKm(pos.lat,pos.lng,b.lat,b.lng)
    if(a.lat&&a.lng) return -1; if(b.lat&&b.lng) return 1; return 0
  })

  const negValTop=[...negocios].filter(n=>vals[n.id]!=null).sort((a,b)=>(vals[b.id]??0)-(vals[a.id]??0)).slice(0,8)
  const hoyISO=new Date().toISOString().slice(0,10)
  const negRecientes=[...negocios].sort((a,b)=>(b.creado_en??'').localeCompare(a.creado_en??'')).slice(0,8)
  const negCercanos=pos?[...negocios].filter(n=>n.lat&&n.lng).sort((a,b)=>haversineKm(pos.lat,pos.lng,a.lat!,a.lng!)-haversineKm(pos.lat,pos.lng,b.lat!,b.lng!)).slice(0,8):[]
  const proximasReservas=reservas.filter(r=>r.estado==='confirmada'&&r.fecha>=hoyISO).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.hora.localeCompare(b.hora))
  const historialReservas=reservas.filter(r=>r.estado==='cancelada'||r.estado==='completada'||r.fecha<hoyISO)

  function pedirGeo(f:Filtro){
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

  const advancedCount=[abiertoFiltro,minRating>0,maxDist!=null].filter(Boolean).length
  const hayFiltros=!!(q||cats.length>0||filtro!=='ninguno'||abiertoFiltro||minRating>0||maxDist!=null||sortBy!=='relevancia')
  function limpiarAvanzado(){setAbiertoFiltro(false);setMinRating(0);setMaxDist(null);setSortBy('relevancia')}
  function limpiarTodo(){setQ('');setCats([]);setFiltro('ninguno');limpiarAvanzado()}

  const hNow=new Date().getHours()
  const saludo=hNow<12?'Buenos días':hNow<20?'Buenas tardes':'Buenas noches'

  // ─── Render ───

  return(
  <div style={{minHeight:'100vh',background:'#F8FAFC',fontFamily:"'Plus Jakarta Sans',sans-serif",color:'#0F172A'}}>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      html,body{background:#F8FAFC!important;color:#0F172A!important}
      html.dark,html.dark body{background:#0d0d0d!important;color:#f9fafb!important}
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
      .ncard-cover{position:relative;width:100%;aspect-ratio:4/3;background:#F1F5F9;border-radius:22px 22px 0 0}
      .ncard-img{width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease;border-radius:22px 22px 0 0;overflow:hidden;display:block}
      .ncard:hover .ncard-img{transform:scale(1.04)}
      .ncard-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:22px 22px 0 0;overflow:hidden}
      .ncard-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(15,23,42,0.6) 0%,transparent 55%)}
      .badge-open{position:absolute;top:11px;left:11px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(34,197,94,0.9);color:white;backdrop-filter:blur(6px)}
      .badge-closed{position:absolute;top:11px;left:11px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(15,23,42,0.55);color:rgba(255,255,255,0.8);backdrop-filter:blur(6px)}
      .btn-fav{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;transition:transform 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
      .btn-fav:hover{transform:scale(1.18)}
      .ncard-logo{position:absolute;bottom:-16px;left:14px;width:38px;height:38px;border-radius:11px;border:3px solid white;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center}
      .ncard-body{padding:28px 14px 14px}
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
      .est-comp{font-size:11px;font-weight:800;padding:4px 10px;border-radius:100px;background:rgba(99,102,241,0.1);color:#4F46E5}

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
      .bnav-ico{font-size:22px;line-height:1;display:block}
      .bnav-lbl{font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:0.2px}
      .bnav-item.on .bnav-lbl{color:#0F172A}
      .bnav-item.on .bnav-ico{color:#0F172A}
      .bnav-dot{width:4px;height:4px;border-radius:50%;background:#6366F1;margin:1px auto 0}

      /* MAPA BOTTOM SHEET */
      .map-panel{
        position:absolute;bottom:0;left:0;right:0;z-index:10;
        background:white;border-radius:20px 20px 0 0;
        box-shadow:0 -4px 24px rgba(0,0,0,0.12);
        transition:transform 0.35s cubic-bezier(.32,1.25,.6,1);
        max-height:50vh;overflow:hidden;
      }
      .map-panel.collapsed{transform:translateY(calc(100% - 72px));}
      .map-panel-handle{display:flex;flex-direction:column;align-items:center;padding:10px 0 8px;cursor:pointer;user-select:none;}
      .map-panel-pill{width:36px;height:4px;border-radius:2px;background:#E2E8F0;margin-bottom:4px;}
      .map-panel-title{font-size:13px;font-weight:800;color:#0F172A;letter-spacing:-0.2px;}
      .map-panel-list{overflow-y:auto;padding:0 16px 20px;max-height:calc(50vh - 72px);}
      .map-panel-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F1F5F9;cursor:pointer;text-decoration:none;}
      .map-panel-item:last-child{border-bottom:none;}
      .map-panel-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}

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
        /* Map full height minus top + bottom nav */
        .cliente-map-wrap{height:calc(100dvh - 60px - 64px) !important;position:relative;}
      }
      @media(max-width:600px){
        :root{--cols:1}
        .neg-grid{gap:14px}
        .sbar input{font-size:16px}
      }
      /* ── DARK MODE ── */
      html.dark .tnav{background:rgba(13,13,13,0.97);border-color:rgba(255,255,255,0.06)}
      html.dark .tnav-links a{color:#9CA3AF}
      html.dark .tnav-links a:hover,html.dark .tnav-links a.on{color:#f9fafb}
      html.dark .hero{background:linear-gradient(160deg,#0a1628 0%,#110d24 55%,#0a1a14 100%)}
      html.dark .hero-title{color:#f9fafb}
      html.dark .hero-sub{color:#9CA3AF}
      html.dark .sbar{background:#1a1a1a;border-color:rgba(255,255,255,0.1)}
      html.dark .sbar:focus-within{border-color:#818CF8;box-shadow:0 4px 24px rgba(129,140,248,0.15)}
      html.dark .sbar input{color:#f9fafb}
      html.dark .cats-bar{background:#0d0d0d;border-color:rgba(255,255,255,0.06)}
      html.dark .catbtn{color:#9CA3AF}
      html.dark .catbtn:hover{background:#1a1a1a;color:#f9fafb}
      html.dark .catbtn.on{background:#f9fafb;color:#111827;border-color:#f9fafb}
      html.dark .fbar{background:#0d0d0d}
      html.dark .fchip{background:#1a1a1a;border-color:rgba(255,255,255,0.08);color:#9CA3AF}
      html.dark .fchip:hover{border-color:#f9fafb;color:#f9fafb}
      html.dark .fchip.on{background:#f9fafb;border-color:#f9fafb;color:#111827}
      html.dark .content{background:#0d0d0d}
      html.dark .sec-t{color:#f9fafb}
      html.dark .ncard{background:#1a1a1a;border-color:rgba(255,255,255,0.06)}
      html.dark .ncard:hover{box-shadow:0 16px 40px rgba(0,0,0,0.5)}
      html.dark .ncard-nombre{color:#f9fafb}
      html.dark .ncard-logo{border-color:#1a1a1a}
      html.dark .btn-reservar{background:#f9fafb;color:#111827}
      html.dark .btn-reservar:hover{background:#6366F1;color:white}
      html.dark .hn-card{background:#1a1a1a;border-color:rgba(255,255,255,0.06)}
      html.dark .cita-c{background:#1a1a1a;border-color:rgba(255,255,255,0.06)}
      html.dark .rcard{background:#1a1a1a;border-color:rgba(255,255,255,0.06)}
      html.dark .perf-hero{background:linear-gradient(135deg,#0a1628 0%,#110d24 100%);border-color:rgba(99,102,241,0.15)}
      html.dark .perf-menu{background:#1a1a1a;border-color:rgba(255,255,255,0.06)}
      html.dark .perf-item{border-color:rgba(255,255,255,0.04)}
      html.dark .perf-item:hover{background:#242424}
      html.dark .bnav{background:rgba(13,13,13,0.97);border-color:rgba(255,255,255,0.06)}
      html.dark .bnav-lbl{color:#6B7280}
      html.dark .bnav-item.on .bnav-lbl{color:#f9fafb}
      html.dark .Skeleton div{background:#1a1a1a;border-color:rgba(255,255,255,0.06)}
    `}</style>

    {/* ── TOP NAV ── */}
    <div className="tnav">
      <Link href="/" style={{textDecoration:'none'}}><Logo/></Link>
      <div className="tnav-links">
        {TABS.filter(t=>!(['favoritos','perfil'].includes(t.id)&&!userId)).slice(0,4).map(t=>(
          <Link key={t.id} href={`/cliente?tab=${t.id}`} className={tab===t.id?'on':''}>{t.label}</Link>
        ))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <LanguageSelector />
        <button
          onClick={toggleTheme}
          title={theme==='dark'?'Modo claro':'Modo oscuro'}
          style={{width:'36px',height:'36px',borderRadius:'10px',background:'transparent',border:'1.5px solid rgba(0,0,0,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748B',flexShrink:0}}
        >
          {theme==='dark'?(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ):(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        {userId
          ?<Link href="/cliente?tab=perfil" className="tnav-av">{nombre.charAt(0).toUpperCase()}</Link>
          :<a href="/auth" style={{padding:'8px 16px',borderRadius:'10px',background:'#0F172A',color:'white',textDecoration:'none',fontSize:'13px',fontWeight:700,flexShrink:0}}>Entrar</a>
        }
      </div>
    </div>

    <div style={{paddingTop:'60px',minHeight:'100vh'}}>

      {/* ══════════ INICIO ══════════ */}
      {tab==='inicio'&&(
        <div className="fade">
          {/* HERO */}
          <div className="hero">
            <div className="hero-tag">✦ Reserva en segundos</div>
            <div className="hero-title">
              {userId ? `${saludo}, ${nombre}` : '¿Dónde quieres ir hoy?'}
            </div>
            <div className="hero-sub">{userId ? '¿Qué buscas hoy?' : 'Descubre negocios cerca de ti y reserva sin esperas'}</div>
            <div className="sbar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Buscar por nombre o ciudad..." value={q} onChange={e=>setQ(e.target.value)}/>
              {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8',fontSize:'16px',padding:0}}>✕</button>}
            </div>
          </div>

          {/* CATEGORÍAS */}
          <div className="cats-bar">
            <div className="cats-inner">
              <button
                className={`catbtn ${cats.length===0?'on':''}`}
                onClick={()=>setCats([])}
              >
                <span className="ico">✨</span>
                Todos
              </button>
              {CATEGORIAS.map(c=>(
                <button key={c.id} className={`catbtn ${cats.includes(c.id)?'on':''}`} onClick={()=>toggleCat(c.id)}>
                  <span className="ico">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* FILTROS */}
          <div className="fbar">
            <button className={`fchip ${filtro==='abierto'?'on':''}`} onClick={()=>pedirGeo('abierto')}>🟢 Abierto ahora</button>
            <button className={`fchip ${filtro==='valorados'?'on':''}`} onClick={()=>pedirGeo('valorados')}>⭐ Mejor valorados</button>
            <button className={`fchip ${filtro==='cercanos'?'on':''}`} onClick={()=>pedirGeo('cercanos')}>📍 Más cercanos</button>
            {filtro!=='ninguno'&&<button className="fchip" style={{color:'#DC2626',borderColor:'rgba(220,38,38,0.2)'}} onClick={()=>setFiltro('ninguno')}>✕ Limpiar</button>}
          </div>
          {geoErr&&<div className="toast">📍 Activa la ubicación en tu navegador</div>}

          <div className="content">

            {/* CITAS PRÓXIMAS */}
            {proximasReservas.length>0&&!q&&cats.length===0&&(
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

            {/* CERCA DE TI */}
            {pos&&negCercanos.length>0&&!q&&cats.length===0&&filtro==='ninguno'&&(
              <div className="sec">
                <div className="sec-h">
                  <span className="sec-t">📍 Cerca de ti</span>
                </div>
                <div className="hscroll">
                  {negCercanos.map(n=>{
                    const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                    const portada=(n.fotos&&n.fotos[0])||null
                    const dist=haversineKm(pos.lat,pos.lng,n.lat!,n.lng!)
                    return(
                      <Link key={n.id} href={`/negocio/${n.id}`} style={{textDecoration:'none',color:'inherit'}}>
                        <div className="hn-card">
                          {portada?<img src={portada} alt={n.nombre} className="hn-cover"/>:<div className="hn-ph" style={{background:cfg.grad}}>{cfg.emoji}</div>}
                          <div className="hn-body">
                            <div style={{fontSize:'13px',fontWeight:800,color:'#0F172A',marginBottom:'3px'}}>{n.nombre}</div>
                            <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'6px'}}>{n.ciudad||''}</div>
                            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                              <span style={{fontSize:'11px',fontWeight:700,color:'#059669'}}>📍 {dist<1?`${Math.round(dist*1000)}m`:`${dist.toFixed(1)}km`}</span>
                              {vals[n.id]&&<span style={{fontSize:'12px',fontWeight:800,color:'#D97706'}}>⭐ {vals[n.id]}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MEJOR VALORADOS (solo si hay ratings y no hay búsqueda activa) */}
            {negValTop.length>0&&!q&&cats.length===0&&filtro==='ninguno'&&(
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

            {/* RECIÉN LLEGADOS */}
            {negRecientes.length>0&&!q&&cats.length===0&&filtro==='ninguno'&&(
              <div className="sec">
                <div className="sec-h">
                  <span className="sec-t">🆕 Recién llegados</span>
                </div>
                <div className="hscroll">
                  {negRecientes.map(n=>{
                    const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                    const portada=(n.fotos&&n.fotos[0])||null
                    return(
                      <div key={n.id} className="hn-card" style={{cursor:'pointer'}} onClick={()=>window.location.href=`/negocio/${n.id}`}>
                        {portada
                          ?<img src={portada} alt={n.nombre} className="hn-cover"/>
                          :<div className="hn-ph" style={{background:cfg.grad}}>{cfg.emoji}</div>
                        }
                        <div className="hn-body">
                          <div style={{fontSize:'13px',fontWeight:800,color:'#0F172A',marginBottom:'3px'}}>{n.nombre}</div>
                          <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'6px'}}>{n.ciudad||''}</div>
                          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            {vals[n.id]&&<span style={{fontSize:'12px',fontWeight:800,color:'#D97706'}}>⭐ {vals[n.id]}</span>}
                            <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',background:cfg.bg,color:cfg.color}}>{n.tipo?.replace(/^[\p{Emoji}\s]*/u,'').replace(/\s*\/.*/,'').trim()}</span>
                            <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',background:'rgba(99,102,241,0.08)',color:'#6366F1'}}>Nuevo</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* GRID PRINCIPAL */}
            <div className="sec">
              <div className="sec-h">
                <span className="sec-t">
                  {q
                    ? `"${q}"`
                    : cats.length===0
                      ? filtro==='ninguno' ? 'Cerca de ti' : filtro==='abierto' ? 'Abiertos ahora' : filtro==='valorados' ? 'Mejor valorados' : 'Más cercanos'
                      : cats.length===1
                        ? CATEGORIAS.find(c=>c.id===cats[0])?.label??'Negocios'
                        : `${cats.length} categorías`
                  }
                </span>
                <Link href="/cliente?tab=mapa" className="sec-l">Ver en mapa →</Link>
              </div>

              {/* Contador de resultados */}
              {!cargando&&(q||cats.length>0||filtro!=='ninguno')&&(
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',padding:'10px 14px',background:'white',borderRadius:'12px',border:'1px solid #F1F5F9'}}>
                  <span style={{fontSize:'13px',color:'#64748B',fontWeight:600}}>
                    {negMostrados.length===0
                      ? 'Sin resultados'
                      : `${negMostrados.length} negocio${negMostrados.length!==1?'s':''} encontrado${negMostrados.length!==1?'s':''}`
                    }
                  </span>
                  {(q||cats.length>0||filtro!=='ninguno')&&(
                    <button
                      onClick={limpiarTodo}
                      style={{background:'none',border:'none',fontSize:'12px',fontWeight:700,color:'#6366F1',cursor:'pointer',padding:'2px 6px'}}
                    >
                      Limpiar todo ✕
                    </button>
                  )}
                </div>
              )}

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
                  <div style={{fontSize:'14px',color:'#94A3B8',marginBottom:'24px',lineHeight:1.6}}>
                    {q?`No encontramos negocios para "${q}"`:'Ningún negocio coincide con los filtros seleccionados'}
                  </div>
                  <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
                    {q&&<button onClick={()=>setQ('')} style={{padding:'9px 16px',background:'#F1F5F9',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:700,color:'#475569',cursor:'pointer'}}>✕ Limpiar búsqueda</button>}
                    {cats.length>0&&<button onClick={()=>setCats([])} style={{padding:'9px 16px',background:'#F1F5F9',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:700,color:'#475569',cursor:'pointer'}}>✕ Quitar categorías</button>}
                    {filtro!=='ninguno'&&<button onClick={()=>setFiltro('ninguno')} style={{padding:'9px 16px',background:'#F1F5F9',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:700,color:'#475569',cursor:'pointer'}}>✕ Quitar filtros</button>}
                  </div>
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
                      onReservar={handleReservar}
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
        <div className="cliente-map-wrap" style={{height:'calc(100dvh - 60px)',position:'relative'}}>
          <MapaNegocios
            negocios={negocios.map(n=>({id:n.id,nombre:n.nombre,tipo:n.tipo,ciudad:n.ciudad,direccion:n.direccion,logo_url:n.logo_url,lat:n.lat??null,lng:n.lng??null}))}
            valPorNeg={vals}
            userPos={pos}
            abiertoMap={Object.fromEntries(negocios.map(n=>[n.id,estaAbierto(hors[n.id]||[])]))}
          />
          {/* Panel deslizable con lista de negocios */}
          <div className={`map-panel${panelOpen?'':' collapsed'}`}>
            <div className="map-panel-handle" onClick={()=>setPanelOpen(o=>!o)}>
              <div className="map-panel-pill"/>
              <div className="map-panel-title">
                {panelOpen?'▼ Ocultar lista':'▲ ' + negocios.length + ' negocios cerca'}
              </div>
            </div>
            <div className="map-panel-list">
              {negocios.slice(0,10).map(n=>{
                const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                return(
                  <a key={n.id} className="map-panel-item" href={`/negocio/${n.id}`}>
                    <div className="map-panel-ico" style={{background:cfg.grad}}>{cfg.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'14px',fontWeight:800,color:'#0F172A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{n.nombre}</div>
                      <div style={{fontSize:'12px',color:'#94A3B8'}}>{n.tipo} · {n.ciudad}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ BUSCAR ══════════ */}
      {tab==='buscar'&&(
        <div className="fade">
          {/* Barra de búsqueda */}
          <div style={{position:'sticky',top:'60px',zIndex:50,background:'white',borderBottom:'1px solid #F1F5F9',padding:'12px 20px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <div className="sbar" style={{maxWidth:'100%'}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Buscar negocio, ciudad, servicio..." value={q} onChange={e=>setQ(e.target.value)} autoFocus style={{fontSize:'16px'}}/>
              {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8',fontSize:'16px',padding:0}}>✕</button>}
            </div>
          </div>
          {/* Filtros de categoría */}
          <div className="cats-bar" style={{padding:'0 16px'}}>
            <div className="cats-inner">
              <button className={`catbtn ${cats.length===0?'on':''}`} onClick={()=>setCats([])}>
                <span className="ico">✨</span>Todos
              </button>
              {CATEGORIAS.map(c=>(
                <button key={c.id} className={`catbtn ${cats.includes(c.id)?'on':''}`} onClick={()=>toggleCat(c.id)}>
                  <span className="ico">{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>
          {/* Filtros avanzados */}
          <div style={{background:'white',borderBottom:'1px solid #F1F5F9',padding:'8px 16px 10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <button
                onClick={()=>setShowAdvanced(o=>!o)}
                style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'7px 14px',borderRadius:'100px',border:'1.5px solid',borderColor:advancedCount>0?'#6366F1':'#E2E8F0',background:advancedCount>0?'rgba(99,102,241,0.08)':'white',fontSize:'12px',fontWeight:700,color:advancedCount>0?'#6366F1':'#475569',cursor:'pointer',fontFamily:'inherit',flexShrink:0,transition:'all 0.15s'}}
              >
                ⚙️ Filtros{advancedCount>0?` · ${advancedCount}`:''} {showAdvanced?'▲':'▼'}
              </button>
              {advancedCount>0&&(
                <button onClick={limpiarAvanzado} style={{fontSize:'11px',fontWeight:700,color:'#DC2626',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Limpiar ✕</button>
              )}
            </div>
            {showAdvanced&&(
              <div style={{paddingTop:'14px',display:'flex',flexDirection:'column',gap:'16px',paddingBottom:'4px'}}>
                {/* Abierto ahora */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:'13px',fontWeight:700,color:'#0F172A'}}>🟢 Abierto ahora</span>
                  <button
                    onClick={()=>setAbiertoFiltro(o=>!o)}
                    style={{width:'44px',height:'24px',borderRadius:'12px',background:abiertoFiltro?'#6366F1':'#E2E8F0',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}
                  >
                    <div style={{position:'absolute',top:'2px',left:abiertoFiltro?'22px':'2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                  </button>
                </div>
                {/* Valoración mínima */}
                <div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#0F172A',marginBottom:'8px'}}>⭐ Valoración mínima</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {[0,1,2,3,4,5].map(r=>{
                      const active=r>0&&minRating===r
                      return(
                        <button key={r} onClick={()=>setMinRating(active?0:r)} style={{padding:'6px 10px',borderRadius:'10px',border:'1.5px solid',borderColor:active?'#6366F1':'#E2E8F0',background:active?'rgba(99,102,241,0.08)':'white',fontSize:'12px',fontWeight:700,color:active?'#6366F1':'#475569',cursor:'pointer',fontFamily:'inherit'}}>
                          {r===0?'Todos':`${r}⭐+`}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* Distancia */}
                {pos&&(
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#0F172A',marginBottom:'8px'}}>📍 Distancia máxima</div>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      {([null,1,5,10,20] as (number|null)[]).map((d,i)=>{
                        const active=d!=null&&maxDist===d
                        return(
                          <button key={i} onClick={()=>setMaxDist(active?null:d)} style={{padding:'6px 10px',borderRadius:'10px',border:'1.5px solid',borderColor:active?'#6366F1':'#E2E8F0',background:active?'rgba(99,102,241,0.08)':'white',fontSize:'12px',fontWeight:700,color:active?'#6366F1':'#475569',cursor:'pointer',fontFamily:'inherit'}}>
                            {d===null?'Cualquier':`${d}km`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Ordenar por */}
                <div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#0F172A',marginBottom:'8px'}}>↕️ Ordenar por</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {([
                      {v:'relevancia',l:'Relevancia'},
                      {v:'valorados',l:'⭐ Mejor valorados'},
                      {v:'cercanos',l:'📍 Más cercanos'},
                      {v:'recientes',l:'🆕 Más recientes'},
                    ] as {v:string;l:string}[]).map(({v,l})=>(
                      <button key={v} onClick={()=>setSortBy(v as typeof sortBy)} style={{padding:'6px 10px',borderRadius:'10px',border:'1.5px solid',borderColor:sortBy===v?'#6366F1':'#E2E8F0',background:sortBy===v?'rgba(99,102,241,0.08)':'white',fontSize:'12px',fontWeight:700,color:sortBy===v?'#6366F1':'#475569',cursor:'pointer',fontFamily:'inherit'}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Contenido */}
          <div className="content" style={{paddingTop:'16px'}}>
            {!cargando&&!hayFiltros?(
              <>
                {pos&&negCercanos.length>0&&(
                  <div className="sec">
                    <div className="sec-h"><span className="sec-t">📍 Cerca de ti</span></div>
                    <div className="hscroll">
                      {negCercanos.map(n=>{
                        const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                        const portada=(n.fotos&&n.fotos[0])||null
                        const dist=haversineKm(pos.lat,pos.lng,n.lat!,n.lng!)
                        return(
                          <Link key={n.id} href={`/negocio/${n.id}`} style={{textDecoration:'none',color:'inherit'}}>
                            <div className="hn-card">
                              {portada?<img src={portada} alt={n.nombre} className="hn-cover"/>:<div className="hn-ph" style={{background:cfg.grad}}>{cfg.emoji}</div>}
                              <div className="hn-body">
                                <div style={{fontSize:'13px',fontWeight:800,color:'#0F172A',marginBottom:'3px'}}>{n.nombre}</div>
                                <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'6px'}}>{n.ciudad||''}</div>
                                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                  <span style={{fontSize:'11px',fontWeight:700,color:'#059669'}}>📍 {dist<1?`${Math.round(dist*1000)}m`:`${dist.toFixed(1)}km`}</span>
                                  {vals[n.id]&&<span style={{fontSize:'12px',fontWeight:800,color:'#D97706'}}>⭐ {vals[n.id]}</span>}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
                {negValTop.length>0&&(
                  <div className="sec">
                    <div className="sec-h"><span className="sec-t">⭐ Mejor valorados</span></div>
                    <div className="hscroll">
                      {negValTop.map(n=>{
                        const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                        const portada=(n.fotos&&n.fotos[0])||null
                        return(
                          <Link key={n.id} href={`/negocio/${n.id}`} style={{textDecoration:'none',color:'inherit'}}>
                            <div className="hn-card">
                              {portada?<img src={portada} alt={n.nombre} className="hn-cover"/>:<div className="hn-ph" style={{background:cfg.grad}}>{cfg.emoji}</div>}
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
                {negRecientes.length>0&&(
                  <div className="sec">
                    <div className="sec-h"><span className="sec-t">🆕 Recién llegados</span></div>
                    <div className="hscroll">
                      {negRecientes.map(n=>{
                        const cfg=TIPO_CFG[normTipo(n.tipo||'')]||TIPO_DEF
                        const portada=(n.fotos&&n.fotos[0])||null
                        return(
                          <div key={n.id} className="hn-card" style={{cursor:'pointer'}} onClick={()=>window.location.href=`/negocio/${n.id}`}>
                            {portada?<img src={portada} alt={n.nombre} className="hn-cover"/>:<div className="hn-ph" style={{background:cfg.grad}}>{cfg.emoji}</div>}
                            <div className="hn-body">
                              <div style={{fontSize:'13px',fontWeight:800,color:'#0F172A',marginBottom:'3px'}}>{n.nombre}</div>
                              <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'6px'}}>{n.ciudad||''}</div>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                {vals[n.id]&&<span style={{fontSize:'12px',fontWeight:800,color:'#D97706'}}>⭐ {vals[n.id]}</span>}
                                <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',background:cfg.bg,color:cfg.color}}>{n.tipo?.replace(/^[\p{Emoji}\s]*/u,'').replace(/\s*\/.*/,'').trim()}</span>
                                <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',background:'rgba(99,102,241,0.08)',color:'#6366F1'}}>Nuevo</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {!pos&&negocios.length>0&&(
                  <div className="sec">
                    <div className="sec-h"><span className="sec-t">Todos los negocios</span></div>
                    <div className="neg-grid">
                      {negocios.slice(0,12).map(n=>(
                        <NegCard key={n.id} n={n}
                          abierto={estaAbierto(hors[n.id]||[])}
                          rating={vals[n.id]}
                          dist={null}
                          fav={favs.includes(n.id)}
                          onFav={()=>toggleFav(n.id)}
                          horsTiene={(hors[n.id]||[]).length>0}
                          onReservar={handleReservar}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ):(
              <>
                {!cargando&&(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',padding:'10px 14px',background:'white',borderRadius:'12px',border:'1px solid #F1F5F9'}}>
                    <span style={{fontSize:'13px',color:'#64748B',fontWeight:600}}>
                      {negMostrados.length===0?'Sin resultados':`${negMostrados.length} resultado${negMostrados.length!==1?'s':''}`}
                    </span>
                    <button onClick={limpiarTodo} style={{background:'none',border:'none',fontSize:'12px',fontWeight:700,color:'#6366F1',cursor:'pointer'}}>Limpiar ✕</button>
                  </div>
                )}
                {cargando?(
                  <Skeleton/>
                ):negMostrados.length===0?(
                  <div className="empty">
                    <div className="empty-ico" style={{background:'#F1F5F9'}}>🔍</div>
                    <div style={{fontSize:'20px',fontWeight:900,color:'#0F172A',marginBottom:'8px'}}>Sin resultados</div>
                    <div style={{fontSize:'14px',color:'#94A3B8',marginBottom:'20px'}}>{q?`No hay negocios para "${q}"`:'Prueba otros filtros'}</div>
                    <button onClick={limpiarTodo} style={{padding:'10px 20px',background:'#F1F5F9',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:700,color:'#475569',cursor:'pointer'}}>Limpiar filtros</button>
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
                        onReservar={handleReservar}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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
              {historialReservas.length>0&&(
                <>
                  <div style={{fontSize:'13px',fontWeight:800,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.8px',margin:'24px 0 12px'}}>Historial</div>
                  {historialReservas.map(r=>{
                    const cfg=TIPO_CFG[normTipo(r.negocio_tipo||'')]||TIPO_DEF
                    const estadoBadge=r.estado==='cancelada'
                      ?<span className="est-canc">Cancelada</span>
                      :r.estado==='completada'
                        ?<span className="est-comp">Completada</span>
                        :<span className="est-comp">Pasada</span>
                    return(
                      <div key={r.id} className="rcard" style={{opacity:0.7}}>
                        <div className="rcard-head">
                          <div className="rcard-ico" style={{background:cfg.grad,filter:'grayscale(0.3)'}}>{cfg.emoji}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'15px',fontWeight:800,color:'#0F172A',marginBottom:'2px'}}>{r.negocio_nombre}</div>
                            <div style={{fontSize:'13px',color:'#64748B',marginBottom:'4px'}}>{r.servicio_nombre}</div>
                            <div style={{fontSize:'12px',fontWeight:700,color:'#94A3B8'}}>📅 {formatFecha(r.fecha)} · {r.hora?.slice(0,5)}</div>
                          </div>
                          {estadoBadge}
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
          {!userId?(
            <div className="empty" style={{paddingTop:'60px'}}>
              <div className="empty-ico" style={{background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)',fontSize:'44px'}}>❤️</div>
              <div style={{fontSize:'22px',fontWeight:900,color:'#0F172A',marginBottom:'8px',letterSpacing:'-0.4px'}}>Guarda tus favoritos</div>
              <div style={{fontSize:'14px',color:'#64748B',lineHeight:1.6,maxWidth:'260px',margin:'0 auto 28px'}}>Inicia sesión para guardar negocios y acceder desde cualquier dispositivo</div>
              <div style={{display:'flex',flexDirection:'column',gap:'10px',maxWidth:'240px',margin:'0 auto'}}>
                <a href="/auth" style={{display:'block',padding:'14px',background:'#0F172A',color:'white',borderRadius:'14px',textDecoration:'none',fontSize:'15px',fontWeight:800,textAlign:'center'}}>Iniciar sesión</a>
                <a href="/auth?mode=signup" style={{display:'block',padding:'14px',background:'#F1F5F9',color:'#0F172A',borderRadius:'14px',textDecoration:'none',fontSize:'15px',fontWeight:700,textAlign:'center'}}>Registrarse gratis</a>
              </div>
            </div>
          ):favs.length===0?(
            <div className="empty">
              <div className="empty-ico" style={{background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)'}}>❤️</div>
              <div style={{fontSize:'21px',fontWeight:900,color:'#0F172A',marginBottom:'8px'}}>Sin favoritos aún</div>
              <div style={{fontSize:'14px',color:'#94A3B8'}}>Pulsa 🤍 en cualquier negocio para guardarlo</div>
            </div>
          ):(
            <>
              <div style={{marginBottom:'24px'}}>
                <div style={{fontSize:'26px',fontWeight:900,color:'#0F172A',letterSpacing:'-0.6px',marginBottom:'4px'}}>Guardados</div>
                <div style={{fontSize:'14px',color:'#64748B'}}>{favs.length} negocio{favs.length!==1?'s':''} guardado{favs.length!==1?'s':''}</div>
              </div>
              <div className="neg-grid">
                {negocios.filter(n=>favs.includes(n.id)).map(n=>(
                  <NegCard key={n.id} n={n}
                    abierto={estaAbierto(hors[n.id]||[])}
                    rating={vals[n.id]}
                    dist={pos&&n.lat&&n.lng?haversineKm(pos.lat,pos.lng,n.lat,n.lng):null}
                    fav={true}
                    onFav={()=>toggleFav(n.id)}
                    horsTiene={(hors[n.id]||[]).length>0}
                    onReservar={handleReservar}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ PERFIL ══════════ */}
      {tab==='perfil'&&!userId&&(
        <div className="content fade">
          <div className="empty" style={{paddingTop:'60px'}}>
            <div className="perf-av" style={{width:'88px',height:'88px',fontSize:'36px',margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(99,102,241,0.2)'}}>?</div>
            <div style={{fontSize:'22px',fontWeight:900,color:'#0F172A',marginBottom:'8px',letterSpacing:'-0.4px'}}>Tu perfil Khepria</div>
            <div style={{fontSize:'14px',color:'#64748B',lineHeight:1.6,maxWidth:'260px',margin:'0 auto 28px'}}>Inicia sesión para ver tus reservas, favoritos y mucho más</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',maxWidth:'240px',margin:'0 auto'}}>
              <a href="/auth" style={{display:'block',padding:'14px',background:'#0F172A',color:'white',borderRadius:'14px',textDecoration:'none',fontSize:'15px',fontWeight:800,textAlign:'center'}}>Iniciar sesión</a>
              <a href="/auth?mode=signup" style={{display:'block',padding:'14px',background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)',color:'#1D4ED8',borderRadius:'14px',textDecoration:'none',fontSize:'15px',fontWeight:800,textAlign:'center'}}>Crear cuenta gratis</a>
            </div>
          </div>
        </div>
      )}
      {tab==='perfil'&&userId&&(
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
              {label:'Completadas',val:historialReservas.filter(r=>r.estado!=='cancelada').length,color:'#059669',bg:'#F0FDF4'},
            ].map((s,i)=>(
              <div key={i} style={{background:s.bg,borderRadius:'16px',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:900,color:s.color,marginBottom:'2px'}}>{s.val}</div>
                <div style={{fontSize:'11px',fontWeight:700,color:s.color,opacity:0.7,textTransform:'uppercase',letterSpacing:'0.5px'}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="perf-menu">
            {[
              {icon:'📅',label:'Mis reservas',sub:'Ver historial completo',bg:'#EFF6FF',href:'/cliente/perfil?s=reservas'},
              {icon:'❤️',label:'Favoritos',sub:`${favs.length} negocios guardados`,bg:'#FDF2F8',href:'/cliente/perfil?s=favoritos'},
              {icon:'⭐',label:'Mis reseñas',sub:'Valora tus visitas',bg:'#FFFBEB',href:'/cliente/perfil?s=resenas'},
              {icon:'🎁',label:'Puntos y cupones',sub:'Tus beneficios',bg:'#F0FDF4',href:'/cliente/perfil?s=puntos'},
              {icon:'🔔',label:'Notificaciones',sub:'Avisos y recordatorios',bg:'#F5F3FF',href:'/cliente/perfil?s=notifs'},
              {icon:'⚙️',label:'Configuración',sub:'Cuenta y privacidad',bg:'#F8FAFC',href:'/cliente/perfil'},
            ].map((item,i)=>(
              <Link key={i} href={item.href} className="perf-item" style={{textDecoration:'none'}}>
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

    {/* MODAL RESERVAR SIN SESIÓN */}
    {modalReservarNeg&&(
      <div
        style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
        onClick={()=>setModalReservarNeg(null)}
      >
        <div
          style={{background:'white',borderRadius:'24px',padding:'32px 28px',maxWidth:'360px',width:'100%',textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}
          onClick={e=>e.stopPropagation()}
        >
          <div style={{fontSize:'44px',marginBottom:'12px'}}>🔐</div>
          <div style={{fontSize:'20px',fontWeight:900,color:'#0F172A',letterSpacing:'-0.4px',marginBottom:'8px'}}>Para reservar necesitas cuenta</div>
          <div style={{fontSize:'14px',color:'#64748B',lineHeight:1.6,marginBottom:'24px'}}>Crea tu cuenta gratuita o inicia sesión para reservar en segundos.</div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <a
              href={`/auth?redirect=/negocio/${modalReservarNeg}/reservar`}
              style={{display:'block',padding:'14px',background:'#0F172A',color:'white',borderRadius:'14px',textDecoration:'none',fontSize:'15px',fontWeight:800}}
            >
              Crear cuenta gratis
            </a>
            <a
              href={`/auth?mode=login&redirect=/negocio/${modalReservarNeg}/reservar`}
              style={{display:'block',padding:'14px',background:'#F1F5F9',color:'#0F172A',borderRadius:'14px',textDecoration:'none',fontSize:'15px',fontWeight:700}}
            >
              Iniciar sesión
            </a>
          </div>
          <button
            onClick={()=>setModalReservarNeg(null)}
            style={{marginTop:'16px',background:'none',border:'none',color:'#94A3B8',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}
          >
            Cancelar
          </button>
        </div>
      </div>
    )}

    {/* ── BOTTOM NAV ── */}
    <div className="bnav">
      <div className="bnav-inner">
        {TABS.map(t=>{
          const requiresLogin=['favoritos','perfil'].includes(t.id)
          const locked=requiresLogin&&!userId
          return(
            <Link key={t.id} href={`/cliente?tab=${t.id}`} className={`bnav-item ${tab===t.id?'on':''}`}>
              <span className="bnav-ico">{t.icon}</span>
              <span className="bnav-lbl" style={{color:locked?'#CBD5E1':undefined}}>
                {t.label}{locked?' 🔒':''}
              </span>
              {tab===t.id&&<div className="bnav-dot"/>}
            </Link>
          )
        })}
      </div>
    </div>
  </div>
  )
}


export default function ClientePage(){
  return(<Suspense><ClienteContent/></Suspense>)
}
