export type PlanKey = 'starter' | 'basico' | 'pro' | 'plus' | 'beta'

export interface PlanConfig {
  nombre: string
  precio: number
  creditos: number
  trabajadores: number   // -1 = ilimitado
  negocios: number       // -1 = ilimitado
  badge: string
  funciones: string[]
  sidebar: string[]      // ['todo'] = acceso total
}

export const PLANES: Record<string, PlanConfig> = {
  starter: {
    nombre: 'Starter', precio: 9.99, creditos: 100, trabajadores: 1, negocios: 1,
    badge: 'Para empezar',
    funciones: [
      'Reservas online 24/7',
      'Ficha pública en el mapa',
      'Horarios y servicios',
      'Chatbot básico (responde preguntas)',
      'Recordatorios automáticos 24h',
      'Reseñas automáticas post-cita',
      'Estadísticas básicas',
      'App cliente',
      'Configuración de agenda',
      'Política de cancelación',
    ],
    sidebar: ['dashboard', 'mi-negocio', 'reservas', 'servicios', 'horarios', 'resenas', 'ajustes', 'integraciones'],
  },
  basico: {
    nombre: 'Básico', precio: 29.99, creditos: 300, trabajadores: 3, negocios: 1,
    badge: 'Para crecer',
    funciones: [
      'Todo lo del Starter',
      'Chatbot completo (reserva y cancela)',
      'Importador desde otras apps',
      'Caja diaria',
      'Fidelización con puntos',
      'Lista de espera automática',
      'Descuentos y promociones',
      'Productos y stock',
      'Multiidioma ES/CA/EN',
      'PWA instalable',
      'Marketing IA básico (posts Instagram)',
    ],
    sidebar: ['dashboard', 'mi-negocio', 'reservas', 'servicios', 'horarios', 'resenas', 'productos', 'caja', 'marketing', 'ajustes', 'integraciones'],
  },
  pro: {
    nombre: 'Pro', precio: 59.99, creditos: 1000, trabajadores: 5, negocios: 2,
    badge: 'Más popular',
    funciones: [
      'Todo lo del Básico',
      '2 negocios',
      'Marketing IA completo (posts, estrategias, calendario)',
      'Analytics avanzado con predicciones',
      'Facturación e IVA automático',
      'Modelos fiscales 303 y 130',
      'Asistente fiscal IA',
      'Gestión equipo completa',
      'Contratos SEPE básicos',
      'Detector clientes VIP',
      'Análisis sentimiento reseñas',
    ],
    sidebar: [
      'dashboard', 'mi-negocio', 'reservas', 'servicios', 'horarios', 'resenas',
      'productos', 'caja', 'marketing', 'equipo', 'analytics', 'facturacion', 'nominas', 'chatbot',
      'ajustes', 'integraciones',
    ],
  },
  plus: {
    nombre: 'Plus', precio: 99.99, creditos: 5000, trabajadores: -1, negocios: 10,
    badge: 'Para escalar',
    funciones: [
      'Todo lo del Pro',
      'Hasta 10 negocios',
      'Trabajadores ilimitados',
      'Panel multi-negocio consolidado',
      'Analytics comparativo entre negocios',
      'Nóminas con plantillas SEPE',
      'Contratos SEPE completos',
      'Modelos fiscales 303/130/111/190',
      'Kit para gestor PDF/CSV',
      'Monitor cumplimiento legal',
      'Tap to Pay Stripe',
      'Dominio personalizado',
      'Soporte prioritario',
    ],
    sidebar: ['todo'],
  },
  beta: {
    nombre: 'Beta', precio: 0, creditos: 2000, trabajadores: -1, negocios: 10,
    badge: 'Beta',
    funciones: ['todo'],
    sidebar: ['todo'],
  },
}

export function tieneAcceso(plan: string, key: string): boolean {
  const cfg = PLANES[plan] ?? PLANES.starter
  return cfg.sidebar.includes('todo') || cfg.sidebar.includes(key)
}

/** Verifica si el plan puede crear más negocios dado el número actual */
export function puedeCrearNegocio(plan: string, negociosActuales: number): boolean {
  const cfg = PLANES[plan] ?? PLANES.starter
  if (cfg.negocios === -1) return true
  return negociosActuales < cfg.negocios
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
  '/dashboard/analytics':    'analytics',
  '/dashboard/ajustes':      'ajustes',
  '/dashboard/integraciones': 'integraciones',
}
