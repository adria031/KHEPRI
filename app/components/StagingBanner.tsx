'use client'
export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg,#F59E0B,#D97706)',
      color: '#fff', textAlign: 'center',
      padding: '6px 16px', fontSize: 12, fontWeight: 700,
      letterSpacing: 1,
    }}>
      ⚠️ ENTORNO DE PRUEBAS — khepria-staging.vercel.app — Los cambios aquí NO afectan a producción
    </div>
  )
}
