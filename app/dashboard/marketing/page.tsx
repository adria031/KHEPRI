'use client'
import { useState, useEffect, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'
import { supabase, getSessionClient } from '../../lib/supabase'
import { descontarCreditos, obtenerCreditos } from '../../lib/creditos'
import { getNegocioActivo, type NegMin } from '../../lib/negocioActivo'
import { DashboardShell } from '../DashboardShell'

// ─── Types ────────────────────────────────────────────────────────────────────

type EstiloType = 'marca' | 'oscuro' | 'claro'
type FuenteType = 'moderna' | 'elegante' | 'bold'
type LayoutType = 'estatico' | 'diagonal' | 'minimalista' | 'bold' | 'elegante'

const PALETAS = [
  { name: 'Índigo',    ppal: '#6B4FD8', sec: '#818CF8' },
  { name: 'Rosa',      ppal: '#EC4899', sec: '#F9A8D4' },
  { name: 'Esmeralda', ppal: '#10B981', sec: '#6EE7B7' },
  { name: 'Ámbar',     ppal: '#F59E0B', sec: '#FCD34D' },
  { name: 'Escarlata', ppal: '#EF4444', sec: '#F87171' },
  { name: 'Cielo',     ppal: '#0EA5E9', sec: '#7DD3FC' },
  { name: 'Nude',      ppal: '#C4860A', sec: '#D4C5F9' },
  { name: 'Noche',     ppal: '#1E293B', sec: '#475569' },
]

const FONT_MAP: Record<FuenteType, string> = {
  moderna:  "'Plus Jakarta Sans', sans-serif",
  elegante: "Georgia, 'Times New Roman', serif",
  bold:     "'Syne', 'Arial Black', sans-serif",
}

type TemplateProps = {
  contenido: { titulo: string; subtitulo: string; dato: string | null; cta: string }
  negocioNombre: string
  colorPpal: string
  colorSec: string
  mostrarLogo: boolean
  mostrarUrl: boolean
  logoUrl: string
  fuente: FuenteType
  estilo: EstiloType
  layout?: LayoutType
}

type Resena = {
  id: string
  valoracion: number
  comentario: string | null
  autor_nombre: string | null
  created_at: string
  respuesta?: string | null
}

type CalSlot = {
  fecha: string
  tipo: string
  tema: string
  caption: string
}

// ─── Template renderers ───────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(184,216,248,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

function BrandHeader({ logoUrl, mostrarLogo, negocioNombre, textColor, hasShadow = false }: {
  logoUrl: string; mostrarLogo: boolean; negocioNombre: string; textColor: string; hasShadow?: boolean
}) {
  if (!mostrarLogo) return null
  return (
    <div style={{ position:'absolute', top:20, left:20, zIndex:10, display:'flex', alignItems:'center', gap:8, maxWidth:'60%' }}>
      {logoUrl && (
        <img src={logoUrl} alt="" crossOrigin="anonymous"
          style={{ width:40, height:40, borderRadius:8, objectFit:'cover', display:'block', flexShrink:0 }} />
      )}
      <span style={{ fontSize:12, fontWeight:700, color:textColor, letterSpacing:'-0.2px', lineHeight:1.2,
        textShadow:hasShadow ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}>
        {negocioNombre}
      </span>
    </div>
  )
}

function TemplatePublicacion({ contenido, negocioNombre, colorPpal, colorSec, mostrarLogo, mostrarUrl, logoUrl, fuente, estilo, layout = 'estatico' }: TemplateProps) {
  const isDark   = estilo !== 'claro'
  const isMarca  = estilo === 'marca'
  const fontTitulo = FONT_MAP[fuente]

  /* ── minimalista ── */
  if (layout === 'minimalista') {
    return (
      <div style={{ width:540, height:540, background:'#FAFAFA', position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'flex-start',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'48px' }}>
        <div style={{ position:'absolute', top:48, left:48, width:44, height:3, background:colorPpal, borderRadius:2 }} />
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor="#374151" />
        <div style={{ position:'relative', zIndex:2, width:'100%' }}>
          {contenido.dato && (
            <div style={{ fontSize:80, fontWeight:900, lineHeight:1, marginBottom:4, letterSpacing:'-3px',
              background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {contenido.dato}
            </div>
          )}
          <div style={{ fontSize:contenido.dato?32:46, fontWeight:800, color:'#0F172A', lineHeight:1.1, marginBottom:10, letterSpacing:'-0.5px', fontFamily:fontTitulo }}>
            {contenido.titulo}
          </div>
          <div style={{ fontSize:15, color:'#64748B', lineHeight:1.5, marginBottom:26 }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'10px 24px', background:colorPpal, borderRadius:6, fontSize:13, fontWeight:700, color:'white' }}>
            {contenido.cta}
          </div>
        </div>
        {mostrarUrl && (
          <div style={{ position:'absolute', bottom:20, right:48, fontSize:11, color:'#CBD5E1', letterSpacing:1.5, textTransform:'uppercase' }}>{negocioNombre}</div>
        )}
      </div>
    )
  }

  /* ── bold ── */
  if (layout === 'bold') {
    return (
      <div style={{ width:540, height:540, background:isMarca?`linear-gradient(135deg,${colorPpal},${colorSec})`:colorPpal, position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'52px' }}>
        <div style={{ position:'absolute', bottom:-80, right:-80, width:420, height:420, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }} />
        <div style={{ position:'absolute', top:-40, right:40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor="rgba(255,255,255,0.9)" hasShadow />
        <div style={{ position:'relative', zIndex:2, width:'100%' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.55)', letterSpacing:3, textTransform:'uppercase', marginBottom:16 }}>{negocioNombre}</div>
          {contenido.dato && (
            <div style={{ fontSize:88, fontWeight:900, lineHeight:0.9, marginBottom:8, letterSpacing:'-4px', color:'white' }}>{contenido.dato}</div>
          )}
          <div style={{ fontSize:contenido.dato?36:52, fontWeight:900, color:'white', lineHeight:1, marginBottom:14, letterSpacing:'-1px', fontFamily:fontTitulo }}>{contenido.titulo}</div>
          <div style={{ fontSize:16, color:'rgba(255,255,255,0.72)', lineHeight:1.4, marginBottom:32 }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'12px 28px', background:'white', borderRadius:8, fontSize:14, fontWeight:800, color:colorPpal }}>{contenido.cta}</div>
        </div>
      </div>
    )
  }

  /* ── elegante ── */
  if (layout === 'elegante') {
    const bgE = isDark ? '#0F0F14' : '#FDFCFB'
    const txtE = isDark ? '#FFFFFF' : '#1C1917'
    const subE = isDark ? 'rgba(255,255,255,0.5)' : '#78716C'
    return (
      <div style={{ width:540, height:540, background:bgE, position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'60px' }}>
        <div style={{ position:'absolute', inset:18, border:`1px solid ${isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.05)'}`, borderRadius:4, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:34, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
          {[colorPpal, colorSec, colorPpal].map((c, i) => (
            <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:c, opacity:0.5 }} />
          ))}
        </div>
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor={isDark?'rgba(255,255,255,0.8)':'#374151'} />
        <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%' }}>
          {contenido.dato && (
            <div style={{ fontSize:64, fontWeight:300, lineHeight:1, marginBottom:8, letterSpacing:'-1px',
              background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {contenido.dato}
            </div>
          )}
          <div style={{ fontSize:contenido.dato?26:34, fontWeight:700, color:txtE, lineHeight:1.2, marginBottom:12, letterSpacing:'0px',
            fontFamily: fuente === 'elegante' ? FONT_MAP.elegante : fontTitulo }}>
            {contenido.titulo}
          </div>
          <div style={{ width:36, height:1, background:colorPpal, margin:'0 auto 14px', opacity:0.4 }} />
          <div style={{ fontSize:14, color:subE, lineHeight:1.6, marginBottom:28 }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'10px 28px', border:`1px solid ${colorPpal}`, borderRadius:2, fontSize:13, fontWeight:600, color:isDark?'white':colorPpal }}>
            {contenido.cta}
          </div>
        </div>
        {mostrarUrl && (
          <div style={{ position:'absolute', bottom:34, left:0, right:0, textAlign:'center', fontSize:10, color:isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)', letterSpacing:2, textTransform:'uppercase' }}>{negocioNombre}</div>
        )}
      </div>
    )
  }

  /* ── diagonal ── */
  if (layout === 'diagonal') {
    const bgD = isDark ? '#080810' : '#F7F9FC'
    const txtD = isDark ? '#FFFFFF' : '#111827'
    return (
      <div style={{ width:540, height:540, background:bgD, position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'52px' }}>
        <div style={{ position:'absolute', top:-120, right:-120, width:520, height:720,
          background:`linear-gradient(135deg,${colorPpal},${colorSec})`,
          transform:'rotate(-15deg)', opacity: isDark ? 0.16 : 0.1, borderRadius:48 }} />
        <div style={{ position:'absolute', bottom:70, right:44, width:3, height:160, background:`linear-gradient(180deg,${colorPpal},transparent)`, borderRadius:2, transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', bottom:50, right:74, width:3, height:100, background:`linear-gradient(180deg,${colorSec},transparent)`, borderRadius:2, transform:'rotate(20deg)' }} />
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor={isDark?'rgba(255,255,255,0.8)':'#374151'} hasShadow={isDark} />
        <div style={{ position:'relative', zIndex:2, width:'80%' }}>
          <div style={{ width:36, height:4, background:`linear-gradient(90deg,${colorPpal},${colorSec})`, borderRadius:2, marginBottom:20 }} />
          {contenido.dato && (
            <div style={{ fontSize:80, fontWeight:900, lineHeight:1, marginBottom:6, letterSpacing:'-3px',
              background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {contenido.dato}
            </div>
          )}
          <div style={{ fontSize:contenido.dato?30:42, fontWeight:800, color:txtD, lineHeight:1.15, marginBottom:12, letterSpacing:'-0.5px', fontFamily:fontTitulo }}>{contenido.titulo}</div>
          <div style={{ fontSize:15, color:isDark?'rgba(255,255,255,0.6)':'#6B7280', lineHeight:1.5, marginBottom:28 }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'11px 26px', background:`linear-gradient(135deg,${colorPpal},${colorSec})`, borderRadius:8, fontSize:13, fontWeight:700, color:'white' }}>{contenido.cta}</div>
        </div>
        {mostrarUrl && (
          <div style={{ position:'absolute', bottom:20, left:52, fontSize:11, color:isDark?'rgba(255,255,255,0.3)':'#9CA3AF', letterSpacing:1.5, textTransform:'uppercase' }}>{negocioNombre}</div>
        )}
      </div>
    )
  }

  /* ── estatico (default) ── */
  const bg         = isMarca ? `linear-gradient(135deg,${colorPpal},${colorSec})` : isDark ? '#080810' : '#F7F9FC'
  const textColor  = isDark ? '#FFFFFF' : '#111827'
  const subColor   = isDark ? 'rgba(255,255,255,0.65)' : '#6B7280'
  const footerColor = isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'
  const ctaBg      = isMarca ? 'rgba(255,255,255,0.22)' : `linear-gradient(135deg,${colorPpal},${colorSec})`
  const ctaBorder  = isMarca ? '1.5px solid rgba(255,255,255,0.35)' : 'none'
  return (
    <div style={{ width:540, height:540, background:bg, position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
      fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'48px' }}>
      <div style={{ position:'absolute', top:-80, left:-80, width:280, height:280, borderRadius:'50%',
        background:`radial-gradient(circle,${isMarca?'rgba(255,255,255,0.15)':hexToRgba(colorSec,isDark?0.45:0.7)} 0%,transparent 70%)`, filter:'blur(30px)' }} />
      <div style={{ position:'absolute', bottom:-60, right:-60, width:240, height:240, borderRadius:'50%',
        background:`radial-gradient(circle,${isMarca?'rgba(255,255,255,0.1)':hexToRgba(colorPpal,isDark?0.35:0.6)} 0%,transparent 70%)`, filter:'blur(25px)' }} />
      <div style={{ position:'absolute', top:'40%', right:-40, width:160, height:160, borderRadius:'50%',
        background:`radial-gradient(circle,${isMarca?'rgba(255,255,255,0.12)':hexToRgba(colorSec,isDark?0.25:0.4)} 0%,transparent 70%)`, filter:'blur(20px)' }} />
      <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor={isDark||isMarca?'rgba(255,255,255,0.85)':'#374151'} hasShadow={isDark||isMarca} />
      <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%' }}>
        {contenido.dato && (
          <div style={{ fontSize:72, fontWeight:900, lineHeight:1, marginBottom:8, letterSpacing:'-2px',
            ...(isMarca ? { color:'white', textShadow:'0 2px 8px rgba(0,0,0,0.15)' }
              : { background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }) }}>
            {contenido.dato}
          </div>
        )}
        <div style={{ fontSize:contenido.dato?28:36, fontWeight:800, color:textColor, lineHeight:1.2, marginBottom:12, letterSpacing:'-0.5px', fontFamily:fontTitulo }}>{contenido.titulo}</div>
        <div style={{ fontSize:16, color:subColor, lineHeight:1.5, marginBottom:32 }}>{contenido.subtitulo}</div>
        <div style={{ display:'inline-block', padding:'12px 28px', background:ctaBg, border:ctaBorder, borderRadius:100, fontSize:14, fontWeight:700, color:'white' }}>{contenido.cta}</div>
      </div>
      {mostrarUrl && (
        <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center', fontSize:12, color:footerColor, letterSpacing:1, textTransform:'uppercase' }}>{negocioNombre}</div>
      )}
    </div>
  )
}

function TemplateHistoria({ contenido, negocioNombre, colorPpal, colorSec, mostrarLogo, mostrarUrl, logoUrl, fuente, estilo, layout = 'estatico' }: TemplateProps) {
  const isDark   = estilo !== 'claro'
  const isMarca  = estilo === 'marca'
  const fontTitulo = FONT_MAP[fuente]

  /* ── minimalista ── */
  if (layout === 'minimalista') {
    return (
      <div style={{ width:303, height:538, background:'#FAFAFA', position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'flex-start',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'8%' }}>
        <div style={{ position:'absolute', top:'8%', left:'8%', width:30, height:3, background:colorPpal, borderRadius:2 }} />
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor="#374151" />
        <div style={{ position:'relative', zIndex:2, width:'100%', overflow:'hidden' }}>
          {contenido.dato && (
            <div style={{ fontSize:'clamp(32px,14cqw,52px)', fontWeight:900, lineHeight:1, marginBottom:4, letterSpacing:'-2px',
              background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {contenido.dato}
            </div>
          )}
          <div style={{ fontSize:contenido.dato?'clamp(14px,5cqw,20px)':'clamp(18px,7cqw,26px)', fontWeight:800, color:'#0F172A', lineHeight:1.1, marginBottom:8, letterSpacing:'-0.5px', fontFamily:fontTitulo, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{contenido.titulo}</div>
          <div style={{ fontSize:'clamp(10px,3.5cqw,14px)', color:'#64748B', lineHeight:1.5, marginBottom:16, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'8px 18px', background:colorPpal, borderRadius:6, fontSize:'clamp(9px,3cqw,12px)', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{contenido.cta}</div>
        </div>
        {mostrarUrl && (
          <div style={{ position:'absolute', bottom:14, right:'8%', fontSize:'clamp(8px,2.5cqw,10px)', color:'#CBD5E1', letterSpacing:1.5, textTransform:'uppercase' }}>{negocioNombre}</div>
        )}
      </div>
    )
  }

  /* ── bold ── */
  if (layout === 'bold') {
    return (
      <div style={{ width:303, height:538, background:isMarca?`linear-gradient(135deg,${colorPpal},${colorSec})`:colorPpal, position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'8%' }}>
        <div style={{ position:'absolute', bottom:-60, right:-60, width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }} />
        <div style={{ position:'absolute', top:-30, right:30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor="rgba(255,255,255,0.9)" hasShadow />
        <div style={{ position:'relative', zIndex:2, width:'100%', overflow:'hidden' }}>
          <div style={{ fontSize:'clamp(8px,2.5cqw,10px)', fontWeight:800, color:'rgba(255,255,255,0.5)', letterSpacing:3, textTransform:'uppercase', marginBottom:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{negocioNombre}</div>
          {contenido.dato && (
            <div style={{ fontSize:'clamp(36px,16cqw,58px)', fontWeight:900, lineHeight:0.9, marginBottom:6, letterSpacing:'-3px', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{contenido.dato}</div>
          )}
          <div style={{ fontSize:contenido.dato?'clamp(15px,6cqw,22px)':'clamp(20px,8cqw,30px)', fontWeight:900, color:'white', lineHeight:1, marginBottom:10, letterSpacing:'-0.8px', fontFamily:fontTitulo, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{contenido.titulo}</div>
          <div style={{ fontSize:'clamp(10px,3.5cqw,14px)', color:'rgba(255,255,255,0.7)', lineHeight:1.4, marginBottom:20, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'8px 20px', background:'white', borderRadius:8, fontSize:'clamp(9px,3cqw,12px)', fontWeight:800, color:colorPpal, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{contenido.cta}</div>
        </div>
      </div>
    )
  }

  /* ── elegante ── */
  if (layout === 'elegante') {
    const bgE = isDark ? '#0F0F14' : '#FDFCFB'
    const txtE = isDark ? '#FFFFFF' : '#1C1917'
    const subE = isDark ? 'rgba(255,255,255,0.5)' : '#78716C'
    return (
      <div style={{ width:303, height:538, background:bgE, position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'8%' }}>
        <div style={{ position:'absolute', inset:12, border:`1px solid ${isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)'}`, borderRadius:4, pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:22, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
          {[colorPpal, colorSec, colorPpal].map((c, i) => (
            <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:c, opacity:0.45 }} />
          ))}
        </div>
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor={isDark?'rgba(255,255,255,0.8)':'#374151'} />
        <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%', overflow:'hidden' }}>
          {contenido.dato && (
            <div style={{ fontSize:'clamp(28px,12cqw,44px)', fontWeight:300, lineHeight:1, marginBottom:6, letterSpacing:'-1px',
              background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {contenido.dato}
            </div>
          )}
          <div style={{ fontSize:contenido.dato?'clamp(13px,5cqw,18px)':'clamp(16px,6cqw,22px)', fontWeight:700, color:txtE, lineHeight:1.2, marginBottom:8, fontFamily: fuente === 'elegante' ? FONT_MAP.elegante : fontTitulo, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{contenido.titulo}</div>
          <div style={{ width:28, height:1, background:colorPpal, margin:'0 auto 10px', opacity:0.4 }} />
          <div style={{ fontSize:'clamp(10px,3.5cqw,13px)', color:subE, lineHeight:1.6, marginBottom:18, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'8px 20px', border:`1px solid ${colorPpal}`, borderRadius:2, fontSize:'clamp(9px,3cqw,12px)', fontWeight:600, color:isDark?'white':colorPpal, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{contenido.cta}</div>
        </div>
        {mostrarUrl && (
          <div style={{ position:'absolute', bottom:22, left:0, right:0, textAlign:'center', fontSize:'clamp(8px,2.5cqw,10px)', color:isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)', letterSpacing:2, textTransform:'uppercase' }}>{negocioNombre}</div>
        )}
      </div>
    )
  }

  /* ── diagonal ── */
  if (layout === 'diagonal') {
    const bgD = isDark ? '#080810' : '#F7F9FC'
    const txtD = isDark ? '#FFFFFF' : '#111827'
    return (
      <div style={{ width:303, height:538, background:bgD, position:'relative', overflow:'hidden',
        display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start',
        fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'8%' }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:460,
          background:`linear-gradient(135deg,${colorPpal},${colorSec})`,
          transform:'rotate(-15deg)', opacity: isDark ? 0.14 : 0.09, borderRadius:30 }} />
        <div style={{ position:'absolute', bottom:50, right:22, width:3, height:120, background:`linear-gradient(180deg,${colorPpal},transparent)`, borderRadius:2, transform:'rotate(20deg)' }} />
        <div style={{ position:'absolute', bottom:40, right:38, width:3, height:80, background:`linear-gradient(180deg,${colorSec},transparent)`, borderRadius:2, transform:'rotate(20deg)' }} />
        <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor={isDark?'rgba(255,255,255,0.8)':'#374151'} hasShadow={isDark} />
        <div style={{ position:'relative', zIndex:2, width:'82%', overflow:'hidden' }}>
          <div style={{ width:28, height:3, background:`linear-gradient(90deg,${colorPpal},${colorSec})`, borderRadius:2, marginBottom:14 }} />
          {contenido.dato && (
            <div style={{ fontSize:'clamp(32px,14cqw,52px)', fontWeight:900, lineHeight:1, marginBottom:4, letterSpacing:'-2px',
              background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {contenido.dato}
            </div>
          )}
          <div style={{ fontSize:contenido.dato?'clamp(13px,5cqw,18px)':'clamp(17px,7cqw,24px)', fontWeight:800, color:txtD, lineHeight:1.1, marginBottom:8, letterSpacing:'-0.5px', fontFamily:fontTitulo, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{contenido.titulo}</div>
          <div style={{ fontSize:'clamp(10px,3.5cqw,13px)', color:isDark?'rgba(255,255,255,0.6)':'#6B7280', lineHeight:1.5, marginBottom:18, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{contenido.subtitulo}</div>
          <div style={{ display:'inline-block', padding:'8px 18px', background:`linear-gradient(135deg,${colorPpal},${colorSec})`, borderRadius:8, fontSize:'clamp(9px,3cqw,12px)', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{contenido.cta}</div>
        </div>
        {mostrarUrl && (
          <div style={{ position:'absolute', bottom:14, left:'8%', fontSize:'clamp(8px,2.5cqw,10px)', color:isDark?'rgba(255,255,255,0.3)':'#9CA3AF', letterSpacing:1.5, textTransform:'uppercase' }}>{negocioNombre}</div>
        )}
      </div>
    )
  }

  /* ── estatico (default) ── */
  const bg          = isMarca ? `linear-gradient(135deg,${colorPpal},${colorSec})` : isDark ? '#080810' : '#F7F9FC'
  const textColor   = isDark ? '#FFFFFF' : '#111827'
  const subColor    = isDark ? 'rgba(255,255,255,0.65)' : '#6B7280'
  const footerColor = isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'
  const ctaBg       = isMarca ? 'rgba(255,255,255,0.22)' : `linear-gradient(135deg,${colorPpal},${colorSec})`
  const ctaBorder   = isMarca ? '1.5px solid rgba(255,255,255,0.35)' : 'none'
  return (
    <div style={{ width:303, height:538, background:bg, position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
      fontFamily:"'Plus Jakarta Sans', sans-serif", padding:'8%' }}>
      <div style={{ position:'absolute', top:-50, left:-40, width:160, height:160, borderRadius:'50%',
        background:`radial-gradient(circle,${isMarca?'rgba(255,255,255,0.15)':hexToRgba(colorSec,isDark?0.5:0.8)} 0%,transparent 70%)`, filter:'blur(20px)' }} />
      <div style={{ position:'absolute', bottom:-40, right:-30, width:140, height:140, borderRadius:'50%',
        background:`radial-gradient(circle,${isMarca?'rgba(255,255,255,0.1)':hexToRgba(colorPpal,isDark?0.4:0.7)} 0%,transparent 70%)`, filter:'blur(15px)' }} />
      <div style={{ position:'absolute', top:'30%', right:-30, width:100, height:100, borderRadius:'50%',
        background:`radial-gradient(circle,${isMarca?'rgba(255,255,255,0.12)':hexToRgba(colorSec,isDark?0.3:0.6)} 0%,transparent 70%)`, filter:'blur(12px)' }} />
      <BrandHeader logoUrl={logoUrl} mostrarLogo={mostrarLogo} negocioNombre={negocioNombre} textColor={isDark||isMarca?'rgba(255,255,255,0.85)':'#374151'} hasShadow={isDark||isMarca} />
      <div style={{ position:'relative', zIndex:2, textAlign:'center', width:'100%', overflow:'hidden' }}>
        {contenido.dato && (
          <div style={{ fontSize:'clamp(32px,14cqw,52px)', fontWeight:900, lineHeight:1, marginBottom:6, letterSpacing:'-2px',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            ...(isMarca ? { color:'white', textShadow:'0 2px 8px rgba(0,0,0,0.15)' }
              : { background:`linear-gradient(135deg,${colorPpal},${colorSec})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }) }}>
            {contenido.dato}
          </div>
        )}
        <div style={{ fontSize:contenido.dato?'clamp(14px,5.5cqw,20px)':'clamp(18px,7cqw,26px)', fontWeight:800, color:textColor, lineHeight:1.2, marginBottom:8, letterSpacing:'-0.5px', fontFamily:fontTitulo, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>{contenido.titulo}</div>
        <div style={{ fontSize:'clamp(10px,3.5cqw,13px)', color:subColor, lineHeight:1.5, marginBottom:20, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{contenido.subtitulo}</div>
        <div style={{ display:'inline-block', padding:'8px 20px', background:ctaBg, border:ctaBorder, borderRadius:100, fontSize:'clamp(9px,3cqw,12px)', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{contenido.cta}</div>
      </div>
      {mostrarUrl && (
        <div style={{ position:'absolute', bottom:16, left:0, right:0, textAlign:'center', fontSize:'clamp(8px,2.5cqw,10px)', color:footerColor, letterSpacing:1.5, textTransform:'uppercase' }}>{negocioNombre}</div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])
  const [negocio, setNegocio]             = useState<NegMin | null>(null)
  const [negocioNombre, setNegocioNombre] = useState('')
  const [negocioId, setNegocioId]         = useState<string | null>(null)
  const [negServicios, setNegServicios]   = useState<string[]>([])
  const [colorPpal, setColorPpal]         = useState('#B8D8F8')
  const [colorSec, setColorSec]           = useState('#D4C5F9')
  const [logoUrl, setLogoUrl]             = useState('')
  const [cargando, setCargando]           = useState(true)

  // ── ADN del negocio ────────────────────────────────────────────────────────
  const [negTono, setNegTono]         = useState('cercano')
  const [negPalabras, setNegPalabras] = useState<string[]>([])
  const [negFrase, setNegFrase]       = useState('')

  // ── Personalización de imagen ─────────────────────────────────────────────
  const [prefsReady, setPrefsReady]   = useState(false)
  const [mostrarLogo, setMostrarLogo] = useState(true)
  const [mostrarUrl, setMostrarUrl]   = useState(true)
  const [fuente, setFuente]           = useState<FuenteType>('moderna')

  // ── Sección 1: Crear contenido ────────────────────────────────────────────
  const [formato, setFormato]         = useState<'publicacion' | 'historia'>('publicacion')
  const [paso, setPaso]               = useState<1 | 2 | 3>(1)
  const [tipoContenido, setTipoContenido] = useState<'promocion' | 'nuevo_servicio' | 'consejo' | 'oferta' | 'presentacion'>('promocion')
  const [servicio, setServicio]       = useState('')
  const [estilo, setEstilo]           = useState<EstiloType>('oscuro')
  const [colorPickerOpen, setColorPickerOpen] = useState<'ppal' | 'sec' | null>(null)
  const [imgContenido, setImgContenido] = useState<{
    titulo: string; subtitulo: string; dato: string | null; cta: string
    descripcion?: string; hashtags?: string[]; layout?: string
  } | null>(null)
  const [generandoImg, setGenerandoImg] = useState(false)
  const [imgError, setImgError]       = useState('')
  const [imgDescargando, setImgDescargando] = useState(false)
  const [descCopiado, setDescCopiado] = useState(false)
  const [hashCopiado, setHashCopiado] = useState(false)

  // ── Sección 2: Responder reseñas ─────────────────────────────────────────
  const [resenas, setResenas]             = useState<Resena[]>([])
  const [respuestas, setRespuestas]       = useState<Record<string, string>>({})
  const [generandoResp, setGenerandoResp] = useState<string | null>(null)
  const [respCopiada, setRespCopiada]     = useState<string | null>(null)

  // ── Sección 3: Calendario mensual ────────────────────────────────────────
  const hoyDate                           = new Date()
  const [calMes, setCalMes]               = useState(hoyDate.getMonth())
  const [calAnio, setCalAnio]             = useState(hoyDate.getFullYear())
  const [calSlots, setCalSlots]           = useState<CalSlot[]>([])
  const [generandoCal, setGenerandoCal]   = useState(false)
  const [calError, setCalError]           = useState('')

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  // ─── Load localStorage prefs ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mk-prefs') || '{}')
      if (saved.mostrarLogo !== undefined) setMostrarLogo(saved.mostrarLogo)
      if (saved.mostrarUrl  !== undefined) setMostrarUrl(saved.mostrarUrl)
      if (['marca','oscuro','claro'].includes(saved.estilo)) setEstilo(saved.estilo as EstiloType)
      if (['moderna','elegante','bold'].includes(saved.fuente)) setFuente(saved.fuente as FuenteType)
    } catch {}
    setPrefsReady(true)
  }, [])

  // ─── Save localStorage prefs (guarded) ───────────────────────────────────
  useEffect(() => {
    if (!prefsReady) return
    localStorage.setItem('mk-prefs', JSON.stringify({ mostrarLogo, mostrarUrl, estilo, fuente }))
  }, [prefsReady, mostrarLogo, mostrarUrl, estilo, fuente])

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { session, db } = await getSessionClient()
      if (!session?.user) { window.location.href = '/auth'; return }
      const { activo, todos } = await getNegocioActivo(session.user.id, session.access_token)
      if (!activo) { window.location.href = '/onboarding'; return }
      setTodosNegocios(todos)
      setNegocio(activo)
      setNegocioNombre(activo.nombre)
      setNegocioId(activo.id)

      const [{ data: svcs }, { data: res }, { data: branding }] = await Promise.all([
        db.from('servicios').select('nombre').eq('negocio_id', activo.id).eq('activo', true).order('nombre'),
        db.from('resenas').select('id, valoracion, comentario, autor_nombre, created_at, respuesta')
          .eq('negocio_id', activo.id).is('respuesta', null).order('created_at', { ascending: false }).limit(20),
        db.from('negocios').select('color_principal, color_secundario, logo_url, tono_comunicacion, palabras_clave, frase_marca').eq('id', activo.id).single(),
      ])
      if (svcs) setNegServicios(svcs.map((s: { nombre: string }) => s.nombre))
      if (res)  setResenas(res as Resena[])
      if (branding) {
        const b = branding as {
          color_principal: string | null; color_secundario: string | null; logo_url: string | null
          tono_comunicacion: string | null; palabras_clave: string[] | null; frase_marca: string | null
        }
        if (b.color_principal)    setColorPpal(b.color_principal)
        if (b.color_secundario)   setColorSec(b.color_secundario)
        if (b.logo_url)           setLogoUrl(b.logo_url)
        if (b.tono_comunicacion)  setNegTono(b.tono_comunicacion)
        if (b.palabras_clave)     setNegPalabras(b.palabras_clave)
        if (b.frase_marca)        setNegFrase(b.frase_marca)
      }
      setCargando(false)
    })()
  }, [])

  // ─── Generar imagen ──────────────────────────────────────────────────────
  async function generarImagen() {
    if (!negocioId) return
    setImgError('')
    setGenerandoImg(true)

    const creditos = await obtenerCreditos(negocioId)
    if (!creditos || creditos.disponibles < 10) {
      setImgError('Necesitas al menos 10 créditos para generar contenido.')
      setGenerandoImg(false)
      return
    }

    const tipoLabel: Record<string, string> = {
      promocion: 'promoción especial', nuevo_servicio: 'nuevo servicio',
      consejo: 'consejo profesional', oferta: 'oferta de temporada',
      presentacion: 'presentación del negocio',
    }
    const tonoLabel: Record<string, string> = {
      profesional: 'profesional y serio',
      cercano:     'cercano y amigable',
      divertido:   'divertido y desenfadado',
      elegante:    'elegante y exclusivo',
    }
    const esHistoria = formato === 'historia'
    const serviciosStr = negServicios.slice(0, 8).join(', ') || 'servicios generales'

    const layoutGuide: Record<string, string> = {
      promocion: 'bold o estatico',
      nuevo_servicio: 'diagonal o elegante',
      consejo: 'minimalista',
      oferta: 'bold o diagonal',
      presentacion: 'elegante o estatico',
    }

    const prompt = `Eres el community manager creativo de "${negocioNombre}"${negocio?.tipo ? `, un negocio de ${negocio.tipo}` : ''} en España.
Tono de comunicación: ${tonoLabel[negTono] ?? negTono}.
${negPalabras.length ? `Palabras clave de la marca: ${negPalabras.join(', ')}.` : ''}
${negFrase ? `Frase de marca: "${negFrase}".` : ''}
Servicios: ${serviciosStr}.
Formato: ${esHistoria ? 'historia vertical Instagram' : 'publicación cuadrada Instagram'}.
Tipo de post: "${tipoLabel[tipoContenido]}"${servicio ? ` — destacando "${servicio}"` : ''}.

INSTRUCCIONES CREATIVAS:
- El título debe ser sorprendente, directo y con carácter propio. Evita clichés como "Descubre", "Transforma", "Potencia".
- El subtítulo debe tener ritmo y ser memorable, no genérico.
- Si hay dato, que sea concreto y creíble (porcentaje, número de clientes, años de experiencia, minutos…).
- La descripción debe sonar humana, no de plantilla. Usa el tono indicado con personalidad real.
- Layout sugerido para este tipo de contenido: ${layoutGuide[tipoContenido] ?? 'estatico'}.

Devuelve SOLO JSON sin markdown:
{
  "titulo": "máximo 4 palabras impactantes",
  "subtitulo": "máximo 8 palabras con ritmo",
  "dato": "cifra concreta o null",
  "cta": "llamada a la acción máximo 4 palabras",
  "descripcion": "caption Instagram máximo 150 palabras, tono ${tonoLabel[negTono] ?? negTono}, con personalidad",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],
  "layout": "uno de: estatico|diagonal|minimalista|bold|elegante"
}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const { text } = await res.json()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      setImgContenido(parsed)
      await descontarCreditos(negocioId, 10, 'crear_contenido_marketing')
      setPaso(3)
    } catch {
      setImgError('Error al generar el contenido. Inténtalo de nuevo.')
    }
    setGenerandoImg(false)
  }

  // ─── Descargar imagen ────────────────────────────────────────────────────
  async function descargarImagen() {
    if (!imgContenido) return
    setImgDescargando(true)
    setImgError('')
    const html2canvas = (await import('html2canvas')).default
    let intentos = 0
    while (intentos < 3) {
      try {
        await document.fonts.ready
        await new Promise(r => setTimeout(r, 1000))
        const element = document.getElementById('render-post')
        if (!element) { intentos++; continue }
        const canvas = await html2canvas(element, {
          scale: 1080 / element.offsetWidth,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          width: element.offsetWidth,
          height: element.offsetHeight,
          windowWidth: element.offsetWidth,
          windowHeight: element.offsetHeight,
        })
        const link = document.createElement('a')
        link.download = `marketing_${formato}_${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        break
      } catch {
        intentos++
        if (intentos === 3) setImgError('No se pudo generar la imagen. Inténtalo de nuevo.')
      }
    }
    setImgDescargando(false)
  }

  // ─── Generar respuesta reseña ────────────────────────────────────────────
  async function generarRespuesta(resena: Resena) {
    if (!negocioId) return
    setGenerandoResp(resena.id)

    const ok = await descontarCreditos(negocioId, 3, 'respuesta_resena')
    if (!ok) { setGenerandoResp(null); return }

    const prompt = `Eres el propietario de "${negocioNombre}", negocio de servicios en España. Responde a esta reseña de forma ${resena.valoracion >= 4 ? 'agradecida y cercana' : 'empática y constructiva'}. Respuesta máximo 3 frases, en español, natural.

Reseña (${resena.valoracion}★): "${resena.comentario ?? 'Sin comentario'}"
Autor: ${resena.autor_nombre ?? 'cliente'}

Devuelve SOLO el texto de la respuesta, sin comillas ni explicaciones.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const { text } = await res.json()
      setRespuestas(prev => ({ ...prev, [resena.id]: text.trim() }))
    } catch { /* ignorar */ }
    setGenerandoResp(null)
  }

  async function guardarRespuesta(resena: Resena) {
    const texto = respuestas[resena.id]
    if (!texto?.trim()) return
    await supabase.from('resenas').update({ respuesta: texto.trim() }).eq('id', resena.id)
    setResenas(prev => prev.filter(r => r.id !== resena.id))
  }

  // ─── Generar calendario ──────────────────────────────────────────────────
  async function generarCalendario() {
    if (!negocioId) return
    setCalError('')
    setGenerandoCal(true)

    const ok = await descontarCreditos(negocioId, 15, 'calendario_marketing')
    if (!ok) {
      setCalError('Necesitas al menos 15 créditos para generar el calendario.')
      setGenerandoCal(false)
      return
    }

    const serviciosStr = negServicios.slice(0, 5).join(', ') || 'servicios generales'
    const mesNombre = MESES[calMes]

    const prompt = `Eres experto en marketing para negocios de servicios en España. Crea un plan de contenido para Instagram para "${negocioNombre}" (servicios: ${serviciosStr}) para ${mesNombre} ${calAnio}. 3 publicaciones por semana, 12 en total.

Devuelve SOLO JSON sin markdown:
{
  "posts": [
    {"semana": 1, "dia": "lunes", "tipo": "Educativo|Promocional|Behind the scenes|Testimonio|Oferta", "tema": "tema corto máx 8 palabras", "caption": "ejemplo de caption máx 40 palabras"},
    ... (12 posts en total, 3 por semana durante 4 semanas)
  ]
}`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const { text } = await res.json()
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      const posts: CalSlot[] = (parsed.posts ?? []).map((p: {
        semana: number; dia: string; tipo: string; tema: string; caption: string
      }) => ({
        fecha: `Sem. ${p.semana} — ${p.dia}`,
        tipo: p.tipo,
        tema: p.tema,
        caption: p.caption,
      }))
      setCalSlots(posts)
    } catch {
      setCalError('Error al generar el calendario. Inténtalo de nuevo.')
    }
    setGenerandoCal(false)
  }

  // ─── Shared template props ────────────────────────────────────────────────
  const tplProps = (c: NonNullable<typeof imgContenido>) => ({
    contenido: c, negocioNombre, colorPpal, colorSec,
    mostrarLogo, mostrarUrl, logoUrl, fuente, estilo,
    layout: (c.layout as LayoutType | undefined) ?? 'estatico',
  })

  // ─── Quick-adjustments pill ───────────────────────────────────────────────
  function PillBtn({ active, colorOverride, onClick, children }: {
    active: boolean; colorOverride?: React.CSSProperties; onClick: () => void; children: React.ReactNode
  }) {
    const base: React.CSSProperties = { padding:'5px 12px', borderRadius:100, border:'1.5px solid', fontSize:12,
      fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }
    const inactive: React.CSSProperties = { background:'white', color:'#6B7280', borderColor:'#E5E7EB' }
    return (
      <button onClick={onClick} style={{ ...base, ...(active ? (colorOverride ?? { background:'#4F46E5', color:'white', borderColor:'#4F46E5' }) : inactive) }}>
        {children}
      </button>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardShell negocio={negocio} todosNegocios={todosNegocios}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .mk-wrap { animation: fadeUp .3s ease; max-width: 900px; }

        /* ── Section card ── */
        .mk-section { background:white; border:1px solid #E8ECF0; border-radius:20px; padding:28px; box-shadow:0 2px 8px rgba(0,0,0,0.04); margin-bottom:20px; }
        .mk-section-head { display:flex; align-items:center; gap:12px; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid #F3F4F6; }
        .mk-section-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
        .mk-section-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#111827; }
        .mk-section-sub { font-size:13px; color:#9CA3AF; margin-top:2px; }

        /* ── Paso selector ── */
        .mk-steps { display:flex; gap:0; margin-bottom:24px; border:1px solid #E5E7EB; border-radius:12px; overflow:hidden; }
        .mk-step { flex:1; padding:10px 14px; font-size:12.5px; font-weight:700; text-align:center; background:#F9FAFB; color:#6B7280; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
        .mk-step.active { background:#4F46E5; color:white; }
        .mk-step:not(:last-child) { border-right:1px solid #E5E7EB; }

        /* ── Format cards ── */
        .mk-format-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; }
        .mk-format-card { border:2px solid #E5E7EB; border-radius:16px; padding:20px; cursor:pointer; transition:all .15s; text-align:center; background:white; }
        .mk-format-card:hover { border-color:#C7D2FE; }
        .mk-format-card.selected { border-color:#4F46E5; background:#EEF2FF; }
        .mk-format-emoji { font-size:36px; display:block; margin-bottom:10px; }
        .mk-format-name { font-size:15px; font-weight:800; color:#111827; margin-bottom:4px; }
        .mk-format-dim { font-size:12px; color:#9CA3AF; }

        /* ── Form fields ── */
        .mk-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px; }
        .mk-field { display:flex; flex-direction:column; gap:5px; }
        .mk-field-full { grid-column:1/-1; }
        .mk-label { font-size:11.5px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.4px; }
        .mk-select, .mk-input { width:100%; padding:9px 12px; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:13px; font-family:inherit; outline:none; background:white; }
        .mk-select:focus, .mk-input:focus { border-color:#4F46E5; }

        /* ── Estilo toggle ── */
        .mk-estilo-row { display:flex; gap:8px; }
        .mk-estilo-btn { flex:1; padding:9px; border-radius:10px; border:1.5px solid #E5E7EB; background:white; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; text-align:center; color:#374151; }
        .mk-estilo-btn:hover { border-color:#C7D2FE; }

        /* ── Generate button ── */
        .mk-gen-btn { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:white; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit; transition:opacity .15s; display:flex; align-items:center; justify-content:center; gap:10px; }
        .mk-gen-btn:hover:not(:disabled) { opacity:0.9; }
        .mk-gen-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .mk-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin .8s linear infinite; }

        /* ── Error box ── */
        .mk-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:10px 14px; font-size:13px; color:#B91C1C; margin-bottom:14px; }

        /* ── Preview step ── */
        .mk-preview-wrap { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
        .mk-preview-img { flex-shrink:0; border-radius:12px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.15); }
        .mk-preview-info { flex:1; min-width:260px; }
        .mk-preview-label { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .mk-copy-area { background:#F8FAFC; border:1px solid #E5E7EB; border-radius:12px; padding:14px; margin-bottom:12px; font-size:13px; color:#374151; line-height:1.6; white-space:pre-wrap; }
        .mk-copy-btn { padding:8px 14px; border-radius:9px; border:1.5px solid #E5E7EB; background:white; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .15s; color:#374151; }
        .mk-copy-btn:hover { border-color:#4F46E5; color:#4F46E5; }
        .mk-copy-btn.copied { background:#ECFDF5; border-color:#6EE7B7; color:#059669; }
        .mk-dl-btn { width:100%; padding:12px; border-radius:12px; border:none; background:#111827; color:white; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:10px; }
        .mk-dl-btn:hover:not(:disabled) { opacity:0.85; }
        .mk-dl-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .mk-restart-btn { width:100%; padding:10px; border-radius:12px; border:1.5px solid #E5E7EB; background:white; font-size:13px; font-weight:700; color:#374151; cursor:pointer; font-family:inherit; transition:all .15s; }
        .mk-restart-btn:hover { border-color:#4F46E5; color:#4F46E5; }

        /* ── Reseñas ── */
        .mk-resena-card { border:1px solid #F0F2F5; border-radius:14px; padding:16px; margin-bottom:12px; }
        .mk-resena-stars { font-size:16px; margin-bottom:6px; }
        .mk-resena-text { font-size:13px; color:#374151; line-height:1.5; margin-bottom:4px; }
        .mk-resena-meta { font-size:11px; color:#9CA3AF; margin-bottom:12px; }
        .mk-resena-resp-area { width:100%; min-height:80px; resize:vertical; border:1.5px solid #E5E7EB; border-radius:10px; padding:10px 12px; font-size:13px; font-family:inherit; outline:none; margin-bottom:8px; }
        .mk-resena-resp-area:focus { border-color:#4F46E5; }
        .mk-resena-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .mk-resena-btn { padding:8px 14px; border-radius:9px; border:none; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity .15s; }
        .mk-resena-btn:hover:not(:disabled) { opacity:0.85; }
        .mk-resena-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .mk-empty { text-align:center; padding:40px 20px; color:#9CA3AF; }
        .mk-empty-icon { font-size:36px; margin-bottom:10px; opacity:0.5; }

        /* ── Calendario ── */
        .mk-cal-controls { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:20px; }
        .mk-cal-select { padding:9px 12px; border:1.5px solid #E5E7EB; border-radius:10px; font-size:13px; font-family:inherit; outline:none; background:white; }
        .mk-cal-select:focus { border-color:#4F46E5; }
        .mk-cal-gen-btn { padding:10px 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#4F46E5,#7C3AED); color:white; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; transition:opacity .15s; }
        .mk-cal-gen-btn:hover:not(:disabled) { opacity:0.9; }
        .mk-cal-gen-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .mk-cal-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
        .mk-cal-slot { border:1px solid #E8ECF0; border-radius:14px; padding:14px; background:white; }
        .mk-cal-slot-date { font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
        .mk-cal-slot-tipo { display:inline-flex; padding:3px 9px; border-radius:100px; font-size:11px; font-weight:700; margin-bottom:8px; }
        .mk-cal-slot-tema { font-size:13px; font-weight:700; color:#111827; margin-bottom:6px; }
        .mk-cal-slot-caption { font-size:12px; color:#6B7280; line-height:1.5; }
        .mk-cal-sem { font-size:12px; font-weight:700; color:#4F46E5; padding:8px 0 4px; }

        /* Type color badges */
        .tipo-Educativo { background:rgba(59,130,246,0.1); color:#1D4ED8; }
        .tipo-Promocional { background:rgba(239,68,68,0.1); color:#B91C1C; }
        .tipo-Behind { background:rgba(52,211,153,0.1); color:#065F46; }
        .tipo-Testimonio { background:rgba(196,134,10,0.1); color:#92400E; }
        .tipo-Oferta { background:rgba(107,79,216,0.1); color:#6B4FD8; }

        @media (max-width:700px) {
          .mk-format-grid { grid-template-columns:1fr 1fr; }
          .mk-form-grid { grid-template-columns:1fr; }
          .mk-preview-wrap { flex-direction:column; }
          .mk-preview-img { align-self:center; }
          .mk-cal-grid { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:480px) {
          .mk-section { padding:18px; }
          .mk-format-grid { grid-template-columns:1fr 1fr; gap:8px; }
          .mk-cal-grid { grid-template-columns:1fr; }
        }

        /* ── Color picker ── */
        .mk-color-trigger { display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border:1.5px solid #E5E7EB; border-radius:10px; background:white; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; color:#374151; transition:all .15s; }
        .mk-color-trigger:hover { border-color:#C7D2FE; }
        .mk-color-swatch { width:22px; height:22px; border-radius:5px; border:1.5px solid rgba(0,0,0,0.1); flex-shrink:0; }
        .mk-color-popup { position:absolute; top:calc(100% + 8px); left:0; z-index:200; background:white; border:1px solid #E5E7EB; border-radius:16px; padding:14px; box-shadow:0 12px 40px rgba(0,0,0,0.15); width:240px; }
        .mk-color-popup .react-colorful { width:100% !important; height:160px !important; border-radius:10px; margin-bottom:12px; }
        .mk-color-popup .react-colorful__saturation { border-radius:10px 10px 0 0; }
        .mk-color-popup .react-colorful__hue { border-radius:0 0 6px 6px; height:14px; }
        .mk-color-popup .react-colorful__pointer { width:18px; height:18px; }
        .mk-paletas-grid { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
        .mk-paleta-chip { width:26px; height:26px; border-radius:6px; border:1.5px solid rgba(0,0,0,0.1); cursor:pointer; flex-shrink:0; transition:transform .1s; }
        .mk-paleta-chip:hover { transform:scale(1.15); border-color:rgba(0,0,0,0.2); }
        .mk-paleta-chip.sel { border:2px solid #111827; transform:scale(1.1); }
        .mk-color-hex { width:100%; margin-top:10px; padding:7px 10px; border:1.5px solid #E5E7EB; border-radius:8px; font-size:13px; font-family:inherit; outline:none; text-transform:uppercase; }
        .mk-color-hex:focus { border-color:#4F46E5; }
      `}</style>

      {/* Off-screen render target for html2canvas */}
      {imgContenido && (
        <div id="render-post" style={{ position:'fixed', left:'-9999px', top:'0px',
          width: formato === 'publicacion' ? '540px' : '303px', height: formato === 'publicacion' ? '540px' : '538px', zIndex:-1 }}>
          {formato === 'publicacion'
            ? <TemplatePublicacion {...tplProps(imgContenido)} />
            : <TemplateHistoria   {...tplProps(imgContenido)} />}
        </div>
      )}

      <div className="mk-wrap">

        {/* ════════════════════════════════════════════════
            SECCIÓN 1 — Crear contenido
        ════════════════════════════════════════════════ */}
        <div className="mk-section">
          <div className="mk-section-head">
            <div className="mk-section-icon" style={{ background:'linear-gradient(135deg,#EEF2FF,#F5F3FF)' }}>🎨</div>
            <div>
              <div className="mk-section-title">Crear contenido</div>
              <div className="mk-section-sub">Genera imágenes para Instagram listas para publicar · 10 créditos</div>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="mk-steps">
            <button className={`mk-step${paso === 1 ? ' active' : ''}`} onClick={() => { setPaso(1); setImgContenido(null) }}>
              1 · Formato
            </button>
            <button className={`mk-step${paso === 2 ? ' active' : ''}`} onClick={() => paso >= 2 && setPaso(2)}>
              2 · Configurar
            </button>
            <button className={`mk-step${paso === 3 ? ' active' : ''}`} onClick={() => paso === 3 && setPaso(3)}>
              3 · Resultado
            </button>
          </div>

          {/* PASO 1: Elegir formato */}
          {paso === 1 && (
            <div>
              <div className="mk-format-grid">
                <div className={`mk-format-card${formato === 'publicacion' ? ' selected' : ''}`} onClick={() => setFormato('publicacion')}>
                  <span className="mk-format-emoji">📸</span>
                  <div className="mk-format-name">Publicación</div>
                  <div className="mk-format-dim">1080 × 1080 px</div>
                </div>
                <div className={`mk-format-card${formato === 'historia' ? ' selected' : ''}`} onClick={() => setFormato('historia')}>
                  <span className="mk-format-emoji">📱</span>
                  <div className="mk-format-name">Historia</div>
                  <div className="mk-format-dim">1080 × 1920 px</div>
                </div>
              </div>
              <button className="mk-gen-btn" onClick={() => setPaso(2)}>
                Continuar con {formato === 'publicacion' ? 'Publicación' : 'Historia'} →
              </button>
            </div>
          )}

          {/* PASO 2: Configurar */}
          {paso === 2 && (
            <div>
              {imgError && <div className="mk-error">{imgError}</div>}
              <div className="mk-form-grid">
                <div className="mk-field">
                  <label className="mk-label">Tipo de contenido</label>
                  <select className="mk-select" value={tipoContenido} onChange={e => setTipoContenido(e.target.value as typeof tipoContenido)}>
                    <option value="promocion">🎉 Promoción especial</option>
                    <option value="nuevo_servicio">✨ Nuevo servicio</option>
                    <option value="consejo">💡 Consejo profesional</option>
                    <option value="oferta">🏷️ Oferta de temporada</option>
                    <option value="presentacion">👋 Presentación</option>
                  </select>
                </div>
                <div className="mk-field">
                  <label className="mk-label">Tono de voz</label>
                  <div style={{padding:'9px 12px', border:'1.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', fontSize:'13px', color:'#6B7280', background:'#F9FAFB', display:'flex', alignItems:'center', gap:'6px'}}>
                    <span>{{profesional:'💼',cercano:'😊',divertido:'🎉',elegante:'✨'}[negTono] ?? '😊'}</span>
                    <span style={{fontWeight:600, color:'#374151'}}>{{profesional:'Profesional y serio',cercano:'Cercano y amigable',divertido:'Divertido y desenfadado',elegante:'Elegante y exclusivo'}[negTono] ?? negTono}</span>
                    <span style={{marginLeft:'auto', fontSize:'11px'}}>desde ADN de marca</span>
                  </div>
                </div>
                <div className="mk-field mk-field-full">
                  <label className="mk-label">Servicio destacado (opcional)</label>
                  {negServicios.length > 0 ? (
                    <select className="mk-select" value={servicio} onChange={e => setServicio(e.target.value)}>
                      <option value="">Sin servicio específico</option>
                      {negServicios.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input className="mk-input" placeholder="Ej: Corte de cabello, Manicura…" value={servicio} onChange={e => setServicio(e.target.value)} />
                  )}
                </div>

                {/* Separator */}
                <div className="mk-field-full" style={{ borderTop:'1px solid #F3F4F6', paddingTop:16 }}>
                  <label className="mk-label" style={{ marginBottom:10, display:'block' }}>Opciones de imagen</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button
                      onClick={() => setMostrarLogo(prev => !prev)}
                      style={{ padding:'8px 16px', borderRadius:10, border:'1.5px solid', fontSize:13, fontWeight:700,
                        cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                        ...(mostrarLogo ? { background:'#ECFDF5', color:'#059669', borderColor:'#6EE7B7' } : { background:'white', color:'#6B7280', borderColor:'#E5E7EB' }) }}>
                      {mostrarLogo ? '✓' : '○'} Logo del negocio
                    </button>
                    <button
                      onClick={() => setMostrarUrl(prev => !prev)}
                      style={{ padding:'8px 16px', borderRadius:10, border:'1.5px solid', fontSize:13, fontWeight:700,
                        cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                        ...(mostrarUrl ? { background:'#ECFDF5', color:'#059669', borderColor:'#6EE7B7' } : { background:'white', color:'#6B7280', borderColor:'#E5E7EB' }) }}>
                      {mostrarUrl ? '✓' : '○'} Nombre del negocio
                    </button>
                  </div>
                </div>

                <div className="mk-field mk-field-full">
                  <label className="mk-label">Fuente del título</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {(['moderna','elegante','bold'] as FuenteType[]).map(f => (
                      <button key={f} onClick={() => setFuente(f)}
                        style={{ flex:1, padding:'8px', borderRadius:10, border:'1.5px solid', fontSize:13, fontWeight:700,
                          cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
                          ...(fuente === f ? { background:'#4F46E5', color:'white', borderColor:'#4F46E5' } : { background:'white', color:'#6B7280', borderColor:'#E5E7EB' }) }}>
                        {f === 'moderna' ? 'Moderna' : f === 'elegante' ? 'Elegante' : 'Bold'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mk-field mk-field-full">
                  <label className="mk-label">Estilo visual</label>
                  <div className="mk-estilo-row">
                    {(['marca','oscuro','claro'] as EstiloType[]).map(e => {
                      const sel = estilo === e
                      const selStyle = sel ? (
                        e === 'oscuro' ? { background:'#080810', color:'white', borderColor:'#080810' } :
                        e === 'claro'  ? { background:'#F7F9FC', color:'#111827', borderColor:'#4F46E5' } :
                        { background:`linear-gradient(135deg,${colorPpal},${colorSec})`, color:'white', borderColor:'transparent' }
                      ) : {}
                      return (
                        <button key={e} className="mk-estilo-btn" style={selStyle} onClick={() => setEstilo(e)}>
                          {e === 'marca' ? '🎨 Mi marca' : e === 'oscuro' ? '🌙 Oscuro' : '☀️ Claro'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
                <div className="mk-field mk-field-full">
                  <label className="mk-label">Colores de la imagen</label>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
                    {/* Color principal */}
                    <div style={{ position:'relative' }}>
                      <button className="mk-color-trigger" onClick={() => setColorPickerOpen(colorPickerOpen === 'ppal' ? null : 'ppal')}>
                        <span className="mk-color-swatch" style={{ background:colorPpal }} />
                        Principal
                      </button>
                      {colorPickerOpen === 'ppal' && (
                        <div className="mk-color-popup">
                          <HexColorPicker color={colorPpal} onChange={setColorPpal} />
                          <div className="mk-paletas-grid">
                            {PALETAS.map(p => (
                              <button key={p.name} title={`${p.name} — ${p.ppal}`}
                                className={`mk-paleta-chip${colorPpal === p.ppal ? ' sel' : ''}`}
                                style={{ background:p.ppal }}
                                onClick={() => { setColorPpal(p.ppal); setColorSec(p.sec) }} />
                            ))}
                          </div>
                          <input className="mk-color-hex" value={colorPpal} onChange={e => setColorPpal(e.target.value)} placeholder="#6B4FD8" />
                        </div>
                      )}
                    </div>
                    {/* Color secundario */}
                    <div style={{ position:'relative' }}>
                      <button className="mk-color-trigger" onClick={() => setColorPickerOpen(colorPickerOpen === 'sec' ? null : 'sec')}>
                        <span className="mk-color-swatch" style={{ background:colorSec }} />
                        Secundario
                      </button>
                      {colorPickerOpen === 'sec' && (
                        <div className="mk-color-popup">
                          <HexColorPicker color={colorSec} onChange={setColorSec} />
                          <div className="mk-paletas-grid">
                            {PALETAS.map(p => (
                              <button key={p.name} title={`${p.name} — ${p.sec}`}
                                className={`mk-paleta-chip${colorSec === p.sec ? ' sel' : ''}`}
                                style={{ background:p.sec }}
                                onClick={() => setColorSec(p.sec)} />
                            ))}
                          </div>
                          <input className="mk-color-hex" value={colorSec} onChange={e => setColorSec(e.target.value)} placeholder="#818CF8" />
                        </div>
                      )}
                    </div>
                    {/* Vista previa */}
                    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1.5px solid #F3F4F6', background:'#F9FAFB' }}>
                      <div style={{ width:16, height:32, borderRadius:'3px 0 0 3px', background:colorPpal }} />
                      <div style={{ width:16, height:32, borderRadius:'0 3px 3px 0', background:colorSec }} />
                      <span style={{ fontSize:11, color:'#9CA3AF', marginLeft:4 }}>Preview</span>
                    </div>
                  </div>
                </div>
              {/* Backdrop to close picker */}
              {colorPickerOpen && (
                <div style={{ position:'fixed', inset:0, zIndex:100 }} onClick={() => setColorPickerOpen(null)} />
              )}
              <button className="mk-gen-btn" onClick={generarImagen} disabled={generandoImg || cargando}>
                {generandoImg ? <><span className="mk-spinner" /> Generando…</> : '✨ Generar con IA — 10 créditos'}
              </button>
            </div>
          )}

          {/* PASO 3: Resultado */}
          {paso === 3 && imgContenido && (
            <div>
              {/* Quick-adjustments toolbar */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16, padding:'10px 14px',
                background:'#F8FAFC', borderRadius:12, border:'1px solid #E5E7EB', alignItems:'center' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.5, marginRight:2 }}>Ajustar:</span>
                {(['marca','oscuro','claro'] as EstiloType[]).map(e => {
                  const sel = estilo === e
                  const overrd = sel ? (
                    e === 'oscuro' ? { background:'#080810', color:'white', borderColor:'#080810' } :
                    e === 'claro'  ? { background:'#F7F9FC', color:'#111827', borderColor:'#4F46E5' } :
                    { background:`linear-gradient(135deg,${colorPpal},${colorSec})`, color:'white', borderColor:'transparent' }
                  ) : undefined
                  return <PillBtn key={e} active={sel} colorOverride={overrd} onClick={() => setEstilo(e)}>
                    {e === 'marca' ? '🎨' : e === 'oscuro' ? '🌙' : '☀️'} {e === 'marca' ? 'Marca' : e === 'oscuro' ? 'Oscuro' : 'Claro'}
                  </PillBtn>
                })}
                <div style={{ width:1, height:16, background:'#E5E7EB', margin:'0 2px' }} />
                {(['moderna','elegante','bold'] as FuenteType[]).map(f => (
                  <PillBtn key={f} active={fuente === f} onClick={() => setFuente(f)}>
                    {f === 'moderna' ? 'Moderna' : f === 'elegante' ? 'Elegante' : 'Bold'}
                  </PillBtn>
                ))}
                <div style={{ width:1, height:16, background:'#E5E7EB', margin:'0 2px' }} />
                <PillBtn active={mostrarLogo} colorOverride={mostrarLogo ? { background:'#ECFDF5', color:'#059669', borderColor:'#6EE7B7' } : undefined} onClick={() => setMostrarLogo(prev => !prev)}>
                  {mostrarLogo ? '✓' : '○'} Logo
                </PillBtn>
                <PillBtn active={mostrarUrl} colorOverride={mostrarUrl ? { background:'#ECFDF5', color:'#059669', borderColor:'#6EE7B7' } : undefined} onClick={() => setMostrarUrl(prev => !prev)}>
                  {mostrarUrl ? '✓' : '○'} Nombre
                </PillBtn>
              </div>

              <div className="mk-preview-wrap">
                {/* Preview miniatura visible */}
                <div className="mk-preview-img" style={{ transform: formato === 'historia' ? 'scale(0.6)' : 'scale(0.55)', transformOrigin:'top left', marginBottom: formato === 'historia' ? -215 : -8 }}>
                  {formato === 'publicacion'
                    ? <TemplatePublicacion {...tplProps(imgContenido)} />
                    : <TemplateHistoria   {...tplProps(imgContenido)} />}
                </div>

                {/* Actions + text */}
                <div className="mk-preview-info">
                  <button className="mk-dl-btn" onClick={descargarImagen} disabled={imgDescargando}>
                    {imgDescargando ? <><span className="mk-spinner" style={{ borderTopColor:'white' }} /> Exportando…</> : '⬇️ Descargar PNG'}
                  </button>

                  {formato === 'publicacion' && imgContenido.descripcion && (
                    <>
                      <div className="mk-preview-label">Descripción</div>
                      <div className="mk-copy-area">{imgContenido.descripcion}</div>
                      <button
                        className={`mk-copy-btn${descCopiado ? ' copied' : ''}`}
                        onClick={() => { navigator.clipboard?.writeText(imgContenido.descripcion ?? ''); setDescCopiado(true); setTimeout(() => setDescCopiado(false), 2000) }}>
                        {descCopiado ? '✓ Copiada' : '📋 Copiar descripción'}
                      </button>
                    </>
                  )}

                  {formato === 'publicacion' && imgContenido.hashtags && imgContenido.hashtags.length > 0 && (
                    <div style={{ marginTop:12 }}>
                      <div className="mk-preview-label">Hashtags</div>
                      <div className="mk-copy-area" style={{ fontSize:12 }}>{imgContenido.hashtags.join(' ')}</div>
                      <button
                        className={`mk-copy-btn${hashCopiado ? ' copied' : ''}`}
                        onClick={() => { navigator.clipboard?.writeText((imgContenido.hashtags ?? []).join(' ')); setHashCopiado(true); setTimeout(() => setHashCopiado(false), 2000) }}>
                        {hashCopiado ? '✓ Copiados' : '# Copiar hashtags'}
                      </button>
                    </div>
                  )}

                  <button className="mk-restart-btn" style={{ marginTop:14 }} onClick={() => { setPaso(1); setImgContenido(null); setImgError('') }}>
                    ↩ Crear otro contenido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            SECCIÓN 2 — Responder reseñas
        ════════════════════════════════════════════════ */}
        <div className="mk-section">
          <div className="mk-section-head">
            <div className="mk-section-icon" style={{ background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }}>⭐</div>
            <div>
              <div className="mk-section-title">Responder reseñas</div>
              <div className="mk-section-sub">Genera respuestas profesionales para reseñas sin contestar · 3 créditos por reseña</div>
            </div>
          </div>

          {cargando ? (
            <div className="mk-empty"><div className="mk-empty-icon">⏳</div><div>Cargando reseñas…</div></div>
          ) : resenas.length === 0 ? (
            <div className="mk-empty">
              <div className="mk-empty-icon">✅</div>
              <div style={{ fontWeight:700, color:'#374151', marginBottom:4 }}>¡Al día!</div>
              <div style={{ fontSize:13 }}>No hay reseñas pendientes de respuesta.</div>
            </div>
          ) : resenas.map(r => {
            const estrellas = '★'.repeat(r.valoracion) + '☆'.repeat(5 - r.valoracion)
            const resp = respuestas[r.id] ?? ''
            return (
              <div key={r.id} className="mk-resena-card">
                <div className="mk-resena-stars" style={{ color: r.valoracion >= 4 ? '#F59E0B' : '#9CA3AF' }}>{estrellas}</div>
                <div className="mk-resena-text">"{r.comentario ?? 'Sin comentario'}"</div>
                <div className="mk-resena-meta">{r.autor_nombre ?? 'Anónimo'} · {new Date(r.created_at).toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}</div>
                <textarea
                  className="mk-resena-resp-area"
                  placeholder="Genera una respuesta con IA o escríbela manualmente…"
                  value={resp}
                  onChange={e => setRespuestas(prev => ({ ...prev, [r.id]: e.target.value }))}
                />
                <div className="mk-resena-actions">
                  <button
                    className="mk-resena-btn"
                    style={{ background:'linear-gradient(135deg,#B8D8F8,#D4C5F9)', color:'#1E3A5F' }}
                    onClick={() => generarRespuesta(r)}
                    disabled={generandoResp === r.id}>
                    {generandoResp === r.id ? '⏳ Generando…' : '🤖 Generar respuesta (3 créditos)'}
                  </button>
                  {resp && (
                    <>
                      <button
                        className="mk-resena-btn"
                        style={{ background: respCopiada === r.id ? '#ECFDF5' : 'white', color: respCopiada === r.id ? '#059669' : '#374151', border:'1.5px solid #E5E7EB' }}
                        onClick={() => { navigator.clipboard?.writeText(resp); setRespCopiada(r.id); setTimeout(() => setRespCopiada(null), 2000) }}>
                        {respCopiada === r.id ? '✓ Copiada' : '📋 Copiar'}
                      </button>
                      <button
                        className="mk-resena-btn"
                        style={{ background:'#059669', color:'white' }}
                        onClick={() => guardarRespuesta(r)}>
                        ✓ Guardar respuesta
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ════════════════════════════════════════════════
            SECCIÓN 3 — Calendario mensual
        ════════════════════════════════════════════════ */}
        <div className="mk-section">
          <div className="mk-section-head">
            <div className="mk-section-icon" style={{ background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)' }}>📅</div>
            <div>
              <div className="mk-section-title">Calendario mensual</div>
              <div className="mk-section-sub">Plan de contenido para Instagram — 12 posts, 3 por semana · 15 créditos</div>
            </div>
          </div>

          <div className="mk-cal-controls">
            <select className="mk-cal-select" value={calMes} onChange={e => setCalMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className="mk-cal-select" value={calAnio} onChange={e => setCalAnio(Number(e.target.value))}>
              {[calAnio - 1, calAnio, calAnio + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="mk-cal-gen-btn" onClick={generarCalendario} disabled={generandoCal || cargando}>
              {generandoCal ? <><span className="mk-spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white' }} /> Generando…</> : '✨ Generar plan del mes — 15 créditos'}
            </button>
          </div>

          {calError && <div className="mk-error">{calError}</div>}

          {calSlots.length > 0 && (() => {
            const TIPO_CLASS: Record<string, string> = {
              'Educativo':'tipo-Educativo', 'Promocional':'tipo-Promocional',
              'Behind the scenes':'tipo-Behind', 'Testimonio':'tipo-Testimonio', 'Oferta':'tipo-Oferta',
            }
            const semanas: CalSlot[][] = [[], [], [], []]
            calSlots.forEach((s, i) => semanas[Math.floor(i / 3)].push(s))
            return (
              <div>
                {semanas.map((sem, si) => sem.length > 0 && (
                  <div key={si}>
                    <div className="mk-cal-sem">Semana {si + 1} — {MESES[calMes]} {calAnio}</div>
                    <div className="mk-cal-grid">
                      {sem.map((slot, idx) => (
                        <div key={idx} className="mk-cal-slot">
                          <div className="mk-cal-slot-date">{slot.fecha}</div>
                          <span className={`mk-cal-slot-tipo ${TIPO_CLASS[slot.tipo] ?? 'tipo-Educativo'}`}>{slot.tipo}</span>
                          <div className="mk-cal-slot-tema">{slot.tema}</div>
                          <div className="mk-cal-slot-caption">"{slot.caption}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {calSlots.length === 0 && !generandoCal && (
            <div className="mk-empty">
              <div className="mk-empty-icon">📋</div>
              <div>Genera tu plan de contenido para {MESES[calMes]} {calAnio}</div>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  )
}
