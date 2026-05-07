/**
 * Helpers de localStorage para el negocio activo.
 * No requieren Supabase — leen/escriben directamente en el navegador.
 */

export function getNegocioActivoId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('negocio_activo_id')
}

export function setNegocioActivo(id: string, plan: string, nombre: string) {
  localStorage.setItem('negocio_activo_id', id)
  localStorage.setItem('negocio_activo_plan', plan)
  localStorage.setItem('negocio_activo_nombre', nombre)
}

export function getPlanActivo(): string {
  if (typeof window === 'undefined') return 'starter'
  return localStorage.getItem('negocio_activo_plan') || 'starter'
}

export function getNombreActivo(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('negocio_activo_nombre') || ''
}
