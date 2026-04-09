'use client'
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Confirm() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data }) => {
        const user = data.session?.user ?? data.user
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('tipo').eq('id', user.id).single()
          if (profile?.tipo === 'negocio') window.location.href = window.location.origin + '/dashboard'
          else if (profile?.tipo === 'cliente') window.location.href = window.location.origin + '/cliente'
          else window.location.href = window.location.origin + '/onboarding'
        } else {
          window.location.href = window.location.origin + '/onboarding'
        }
      })
    } else {
      window.location.href = window.location.origin + '/auth'
    }
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Plus Jakarta Sans, sans-serif', background:'#F7F9FC', flexDirection:'column', gap:'12px' }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'linear-gradient(135deg, #B8D8F8, #D4C5F9, #B8EDD4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L19 11L11 19L3 11Z" fill="white" opacity="0.5"/>
          <path d="M11 6L16 11L11 16L6 11Z" fill="white" opacity="0.7"/>
          <circle cx="11" cy="11" r="2" fill="white"/>
        </svg>
      </div>
      <p style={{color:'#6B7280', fontSize:'15px', fontWeight:500}}>Iniciando sesión...</p>
    </div>
  )
}