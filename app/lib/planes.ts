export type PlanKey = 'starter' | 'basico' | 'pro' | 'plus' | 'beta'

export interface PlanConfig {
  nombre: string
  creditos: number
  trabajadores: number   // -1 = ilimitado
  sidebar: string[]      // ['todo'] = acceso total
}

export const PLANES: Record<string, PlanConfig> = {
  starter: {
    nombre: 'Starter',
    creditos: 100,
    trabajadores: 1,
    sidebar: ['dashboard', 'mi-negocio', 'reservas', 'servicios', 'horarios'],
  },
  basico: {
    nombre: 'Básico',
    creditos: 300,
    trabajadores: 3,
    sidebar: [
      'dashboard', 'mi-negocio', 'reservas', 'servicios', 'horarios',
      'productos', 'resenas', 'marketing', 'chatbot',
    ],
  },
  pro: {
    nombre: 'Pro',
    creditos: 1000,
    trabajadores: 5,
    sidebar: [
      'dashboard', 'mi-negocio', 'reservas', 'servicios', 'horarios',
      'productos', 'equipo', 'resenas', 'marketing', 'chatbot',
      'analytics', 'facturacion', 'caja', 'nominas',
    ],
  },
  plus: { nombre: 'Plus', creditos: 5000, trabajadores: -1, sidebar: ['todo'] },
  beta: { nombre: 'Beta', creditos: 2000, trabajadores: -1, sidebar: ['todo'] },
}

export function tieneAcceso(plan: string, key: string): boolean {
  const cfg = PLANES[plan] ?? PLANES.starter
  return cfg.sidebar.includes('todo') || cfg.sidebar.includes(key)
}

// href → sidebar key
export const HREF_KEY: Record<string, string> = {
  '/dashboard':             'dashboard',
  '/dashboard/mi-negocio':  'mi-negocio',
  '/dashboard/reservas':    'reservas',
  '/dashboard/servicios':   'servicios',
  '/dashboard/horarios':    'horarios',
  '/dashboard/productos':   'productos',
  '/dashboard/equipo':      'equipo',
  '/dashboard/chatbot':     'chatbot',
  '/dashboard/facturacion': 'facturacion',
  '/dashboard/marketing':   'marketing',
  '/dashboard/resenas':     'resenas',
  '/dashboard/caja':        'caja',
  '/dashboard/nominas':     'nominas',
  '/dashboard/analytics':   'analytics',
}
